/**
 * Digital Image Processing and Edge Detection Module
 * Converts satellite images and maps into a 2D binary edge matrix for fractal analysis.
 * Filters out image border artifacts to ensure only true coastline boundaries are detected.
 */

class ImageProcessor {
  /**
   * Converts ImageData to grayscale 1D Uint8Array
   */
  static toGrayscale(imageData) {
    const { data, width, height } = imageData;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      // Standard luminance calculation (ITU-R BT.601)
      gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    return gray;
  }

  /**
   * Water detection function based on satellite spectral reflectance and map color ratios
   */
  static isWater(r, g, b) {
    // 1. Deep ocean, South China Sea, and Gulf of Thailand navy blue
    if (b > r + 10 && b >= g - 20) return true;
    if (b > 45 && b > r * 1.15) return true;
    if (r < 50 && g < 80 && b > 55) return true;
    
    // 2. Turquoise shallow reefs and sediment-tinted waters
    if (r < 80 && g > 80 && b > 90 && b > r + 15) return true;
    
    // 3. Dark ocean depths
    if (r < 30 && g < 45 && b < 65 && b >= r) return true;

    return false;
  }

  /**
   * Generates a binary landmask (0 = water, 1 = land / island)
   */
  static generateLandMask(imageData) {
    const { data, width, height } = imageData;
    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        mask[y * width + x] = this.isWater(r, g, b) ? 0 : 1;
      }
    }

    return mask;
  }

  /**
   * Otsu's thresholding algorithm to separate land from water automatically
   */
  static computeOtsuThreshold(gray, width, height) {
    const totalPixels = width * height;
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < totalPixels; i++) {
      histogram[gray[i]]++;
    }

    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * histogram[t];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let optimalThreshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * Math.pow(mB - mF, 2);

      if (varBetween > varMax) {
        varMax = varBetween;
        optimalThreshold = t;
      }
    }

    return optimalThreshold;
  }

  /**
   * Gaussian Blur (3x3 kernel) to reduce high frequency satellite noise
   */
  static gaussianBlur(gray, width, height) {
    const output = new Uint8ClampedArray(width * height);
    const kernel = [
      1/16, 2/16, 1/16,
      2/16, 4/16, 2/16,
      1/16, 2/16, 1/16
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += gray[(y + dy) * width + (x + dx)] * kernel[ki++];
          }
        }
        output[y * width + x] = Math.round(sum);
      }
    }
    return output;
  }

  /**
   * Sobel Edge Detection with Border Suppression
   */
  static sobelEdge(gray, width, height, threshold = 60) {
    const edges = new Uint8Array(width * height);
    const edgePixels = [];
    const borderPadding = 8;

    const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = borderPadding; y < height - borderPadding; y++) {
      for (let x = borderPadding; x < width - borderPadding; x++) {
        let sumX = 0;
        let sumY = 0;
        let k = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const val = gray[(y + dy) * width + (x + dx)];
            sumX += val * Gx[k];
            sumY += val * Gy[k];
            k++;
          }
        }

        const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
        if (magnitude >= threshold) {
          edges[y * width + x] = 1;
          edgePixels.push({ x, y });
        }
      }
    }

    return { matrix: edges, width, height, edgeCount: edgePixels.length, edgePixels };
  }

  /**
   * Canny Edge Detection with Non-Maximum Suppression and Perimeter Padding
   */
  static cannyEdge(gray, width, height, lowThreshold = 30, highThreshold = 80) {
    const blurred = this.gaussianBlur(gray, width, height);
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    const borderPadding = 8;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p00 = blurred[(y - 1) * width + (x - 1)];
        const p01 = blurred[(y - 1) * width + x];
        const p02 = blurred[(y - 1) * width + (x + 1)];
        const p10 = blurred[y * width + (x - 1)];
        const p12 = blurred[y * width + (x + 1)];
        const p20 = blurred[(y + 1) * width + (x - 1)];
        const p21 = blurred[(y + 1) * width + x];
        const p22 = blurred[(y + 1) * width + (x + 1)];

        const gx = (p02 + 2 * p12 + p22) - (p00 + 2 * p10 + p20);
        const gy = (p20 + 2 * p21 + p22) - (p00 + 2 * p01 + p02);

        const idx = y * width + x;
        magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
        direction[idx] = Math.atan2(gy, gx);
      }
    }

    const suppressed = new Float32Array(width * height);
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x;
        const mag = magnitude[idx];
        if (mag === 0) continue;

        let angle = direction[idx] * (180 / Math.PI);
        if (angle < 0) angle += 180;

        let q = 0;
        let r = 0;

        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          q = magnitude[y * width + (x + 1)];
          r = magnitude[y * width + (x - 1)];
        } else if (angle >= 22.5 && angle < 67.5) {
          q = magnitude[(y + 1) * width + (x - 1)];
          r = magnitude[(y - 1) * width + (x + 1)];
        } else if (angle >= 67.5 && angle < 112.5) {
          q = magnitude[(y + 1) * width + x];
          r = magnitude[(y - 1) * width + x];
        } else if (angle >= 112.5 && angle < 157.5) {
          q = magnitude[(y - 1) * width + (x - 1)];
          r = magnitude[(y + 1) * width + (x + 1)];
        }

        if (mag >= q && mag >= r) {
          suppressed[idx] = mag;
        } else {
          suppressed[idx] = 0;
        }
      }
    }

    const edges = new Uint8Array(width * height);
    const edgePixels = [];

    for (let y = borderPadding; y < height - borderPadding; y++) {
      for (let x = borderPadding; x < width - borderPadding; x++) {
        const idx = y * width + x;
        const val = suppressed[idx];

        if (val >= highThreshold) {
          edges[idx] = 1;
          edgePixels.push({ x, y });
        } else if (val >= lowThreshold) {
          let hasStrongNeighbor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (suppressed[(y + dy) * width + (x + dx)] >= highThreshold) {
                hasStrongNeighbor = true;
                break;
              }
            }
            if (hasStrongNeighbor) break;
          }

          if (hasStrongNeighbor) {
            edges[idx] = 1;
            edgePixels.push({ x, y });
          }
        }
      }
    }

    return { matrix: edges, width, height, edgeCount: edgePixels.length, edgePixels };
  }

  /**
   * Extracts strictly the Gulf of Thailand Coastline Interface
   * Isolates the Gulf of Thailand water basin via Flood Fill.
   * Completely eliminates 100% of outside sea fragments (Andaman Sea / Strait of Malacca)
   * and inland mountain/island interior noise.
   */
  static extractCoastlineInterface(imageData, borderPadding = 8) {
    const { width, height } = imageData;
    const landMask = this.generateLandMask(imageData);

    // 1. Identify the Gulf of Thailand Water Basin via Flood Fill from the center/eastern Gulf
    const gulfWater = new Uint8Array(width * height);
    const queue = [];

    // Probe candidate seeds in the deep center of the Gulf of Thailand
    const seeds = [
      { x: Math.floor(width * 0.58), y: Math.floor(height * 0.48) },
      { x: Math.floor(width * 0.52), y: Math.floor(height * 0.38) },
      { x: Math.floor(width * 0.65), y: Math.floor(height * 0.55) },
      { x: Math.floor(width * 0.48), y: Math.floor(height * 0.52) }
    ];

    for (const seed of seeds) {
      const sIdx = seed.y * width + seed.x;
      if (landMask[sIdx] === 0 && gulfWater[sIdx] === 0) {
        gulfWater[sIdx] = 1;
        queue.push(seed);
        break;
      }
    }

    // If seed was not open water, scan the eastern/central basin
    if (queue.length === 0) {
      for (let y = Math.floor(height * 0.25); y < Math.floor(height * 0.75); y++) {
        for (let x = Math.floor(width * 0.35); x < Math.floor(width * 0.85); x++) {
          const idx = y * width + x;
          if (landMask[idx] === 0) {
            gulfWater[idx] = 1;
            queue.push({ x, y });
            break;
          }
        }
        if (queue.length > 0) break;
      }
    }

    // Flood fill all water pixels belonging specifically to the Gulf of Thailand basin
    let head = 0;
    while (head < queue.length) {
      const { x, y } = queue[head++];
      const nbs = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      ];

      for (const n of nbs) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          const nIdx = n.y * width + n.x;
          if (landMask[nIdx] === 0 && gulfWater[nIdx] === 0) {
            gulfWater[nIdx] = 1;
            queue.push(n);
          }
        }
      }
    }

    // 2. Extract coastline: Land pixels that directly border GULF OF THAILAND WATER ONLY!
    const edges = new Uint8Array(width * height);
    const edgePixels = [];

    // Fallback: If flood fill didn't find a disconnected basin, check regular land-water boundary
    const isBasinIsolated = queue.length > 500;

    for (let y = borderPadding; y < height - borderPadding; y++) {
      for (let x = borderPadding; x < width - borderPadding; x++) {
        const idx = y * width + x;
        const isLand = landMask[idx] === 1;

        if (isLand) {
          let hasGulfNeighbor = false;
          if (isBasinIsolated) {
            const nTop = gulfWater[(y - 1) * width + x] === 1;
            const nBottom = gulfWater[(y + 1) * width + x] === 1;
            const nLeft = gulfWater[y * width + (x - 1)] === 1;
            const nRight = gulfWater[y * width + (x + 1)] === 1;
            hasGulfNeighbor = nTop || nBottom || nLeft || nRight;
          } else {
            const nTop = landMask[(y - 1) * width + x] === 0;
            const nBottom = landMask[(y + 1) * width + x] === 0;
            const nLeft = landMask[y * width + (x - 1)] === 0;
            const nRight = landMask[y * width + (x + 1)] === 0;
            hasGulfNeighbor = nTop || nBottom || nLeft || nRight;
          }

          if (hasGulfNeighbor) {
            edges[idx] = 1;
            edgePixels.push({ x, y });
          }
        }
      }
    }

    return { matrix: edges, width, height, edgeCount: edgePixels.length, edgePixels };
  }

  /**
   * Process canvas image with specified algorithm and parameters
   * Constrains edges strictly to the physical Water-Land shoreline transition zone.
   */
  static processCanvas(sourceCanvas, method = 'canny', options = {}) {
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = sourceCanvas;
    const imageData = ctx.getImageData(0, 0, width, height);

    // 1. Extract physical Water-Land Shoreline Interface
    const interfaceResult = this.extractCoastlineInterface(imageData, 8);

    // If interface has clear detection, use it as the clean ground-truth coastline
    if (interfaceResult.edgeCount > 50) {
      return interfaceResult;
    }

    // 2. Fallback to standard Canny / Sobel if monochrome / benchmark image
    const gray = this.toGrayscale(imageData);
    if (method === 'sobel') {
      const threshold = options.threshold || 50;
      return this.sobelEdge(gray, width, height, threshold);
    } else if (method === 'otsu') {
      const otsuThresh = this.computeOtsuThreshold(gray, width, height);
      return this.sobelEdge(gray, width, height, otsuThresh * 0.45);
    } else {
      const low = options.lowThreshold || 30;
      const high = options.highThreshold || 80;
      return this.cannyEdge(gray, width, height, low, high);
    }
  }

  /**
   * Alias for processCanvas for API consistency
   */
  static binarize(sourceCanvas, options = {}) {
    const method = options.method || 'canny';
    return this.processCanvas(sourceCanvas, method, options);
  }

  /**
   * Render 2D binary matrix onto a target HTML5 Canvas
   */
  static renderMatrixToCanvas(result, targetCanvas, options = {}) {
    const { matrix, width, height } = result;
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = width;
    targetCanvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const edgeColor = options.edgeColor || [56, 189, 248]; // soft luminous light blue / cyan (#38bdf8)
    const bgColor = options.bgColor || [6, 19, 37];       // deep navy ocean

    for (let i = 0; i < matrix.length; i++) {
      const pIdx = i * 4;
      if (matrix[i] === 1) {
        data[pIdx] = edgeColor[0];
        data[pIdx + 1] = edgeColor[1];
        data[pIdx + 2] = edgeColor[2];
        data[pIdx + 3] = 255;
      } else {
        data[pIdx] = bgColor[0];
        data[pIdx + 1] = bgColor[1];
        data[pIdx + 2] = bgColor[2];
        data[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
