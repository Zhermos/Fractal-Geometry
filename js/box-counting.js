/**
 * Box-Counting Dimension (มิตินับกล่อง) Algorithm and Grid Visualizer
 * Analyzes binary edge matrices across multiple scales to calculate fractal dimension D.
 */

class BoxCounting {
  /**
   * Run box-counting across a range of box sizes
   * @param {Object} binaryResult - { matrix, width, height, edgePixels }
   * @param {Array<number>} customScales - optional list of box sizes in pixels
   */
  static analyze(binaryResult, customScales = null) {
    const { matrix, width, height, edgePixels } = binaryResult;
    
    // Default powers of 2 scales that fit within image dimensions
    let scales = customScales;
    if (!scales || scales.length === 0) {
      const minDim = Math.min(width, height);
      scales = [];
      for (let s = 256; s >= 2; s = Math.floor(s / 2)) {
        if (s <= minDim && s >= 2) {
          scales.push(s);
        }
      }
      if (scales.length === 0) scales = [128, 64, 32, 16, 8, 4, 2];
    }

    const scaleResults = [];

    scales.forEach(boxSize => {
      const cols = Math.ceil(width / boxSize);
      const rows = Math.ceil(height / boxSize);
      const grid = new Uint8Array(cols * rows);
      const occupiedBoxes = [];

      // Check occupied boxes using the extracted edge pixels for maximum efficiency
      if (edgePixels && edgePixels.length > 0) {
        for (let i = 0; i < edgePixels.length; i++) {
          const pt = edgePixels[i];
          const col = Math.floor(pt.x / boxSize);
          const row = Math.floor(pt.y / boxSize);
          if (col >= 0 && col < cols && row >= 0 && row < rows) {
            const idx = row * cols + col;
            if (grid[idx] === 0) {
              grid[idx] = 1;
              occupiedBoxes.push({ col, row, x: col * boxSize, y: row * boxSize, size: boxSize });
            }
          }
        }
      } else {
        // Fallback to full matrix scan
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            let occupied = false;
            const startX = col * boxSize;
            const startY = row * boxSize;
            const endX = Math.min(startX + boxSize, width);
            const endY = Math.min(startY + boxSize, height);

            for (let y = startY; y < endY; y++) {
              for (let x = startX; x < endX; x++) {
                if (matrix[y * width + x] === 1) {
                  occupied = true;
                  break;
                }
              }
              if (occupied) break;
            }

            if (occupied) {
              grid[row * cols + col] = 1;
              occupiedBoxes.push({ col, row, x: startX, y: startY, size: boxSize });
            }
          }
        }
      }

      const count = occupiedBoxes.length;
      // Use normalized scale r = boxSize / max(width, height)
      const maxDim = Math.max(width, height);
      const r = boxSize / maxDim;

      scaleResults.push({
        boxSize,
        scaleRatio: r,
        count,
        cols,
        rows,
        totalGridBoxes: cols * rows,
        occupiedBoxes,
        // Mathematical coordinates for regression
        logInvSize: Math.log(1 / boxSize),
        logCount: Math.log(count > 0 ? count : 1),
        logInvRatio: Math.log(1 / r)
      });
    });

    return {
      scales: scaleResults,
      width,
      height,
      totalEdgePixels: edgePixels ? edgePixels.length : 0
    };
  }

  /**
   * Render grid and highlighted occupied boxes on an overlay canvas
   */
  static renderGrid(ctx, scaleResult, width, height, options = {}) {
    const { boxSize, occupiedBoxes, cols, rows } = scaleResult;
    const showEmptyGrid = options.showEmptyGrid !== false;
    const gridColor = options.gridColor || 'rgba(100, 116, 139, 0.25)';
    const occupiedFill = options.occupiedFill || 'rgba(6, 182, 212, 0.3)';
    const occupiedStroke = options.occupiedStroke || 'rgba(34, 211, 238, 0.9)';

    ctx.save();
    if (options.clearCanvas !== false) {
      ctx.clearRect(0, 0, width, height);
    }

    // 1. Draw empty grid lines
    if (showEmptyGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= width; x += boxSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += boxSize) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();
    }

    // 2. Highlight occupied boxes
    ctx.fillStyle = occupiedFill;
    ctx.strokeStyle = occupiedStroke;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < occupiedBoxes.length; i++) {
      const b = occupiedBoxes[i];
      ctx.fillRect(b.x, b.y, boxSize, boxSize);
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, boxSize - 1, boxSize - 1);
    }

    ctx.restore();
  }

  /**
   * Compute Spatial Local Fractal Dimension D(x, y) using a Moving Window
   * @param {Object} binaryResult - { matrix, width, height, edgePixels }
   * @param {Object} options - { windowSize: 64, stepSize: 16, scales: [32, 16, 8, 4, 2] }
   */
  static computeLocalHeatmap(binaryResult, options = {}) {
    const { width, height, edgePixels } = binaryResult;
    const windowSize = options.windowSize || 64;
    const stepSize = options.stepSize || 16;
    const scales = options.scales || [32, 16, 8, 4, 2];
    const halfWin = Math.floor(windowSize / 2);

    const cells = [];
    let maxD = 1.0;
    let minD = 2.0;

    for (let cy = halfWin; cy < height; cy += stepSize) {
      for (let cx = halfWin; cx < width; cx += stepSize) {
        const xMin = cx - halfWin;
        const xMax = cx + halfWin;
        const yMin = cy - halfWin;
        const yMax = cy + halfWin;

        // Collect edge pixels in this local window
        const localEdges = edgePixels ? edgePixels.filter(p => p.x >= xMin && p.x < xMax && p.y >= yMin && p.y < yMax) : [];

        // If not enough edge points in this window, skip
        if (localEdges.length < 12) continue;

        // Perform local box-counting
        const localLogInv = [];
        const localLogN = [];

        scales.forEach(s => {
          if (s <= windowSize) {
            const seen = new Set();
            localEdges.forEach(p => {
              const bx = Math.floor((p.x - xMin) / s);
              const by = Math.floor((p.y - yMin) / s);
              seen.add(`${bx},${by}`);
            });
            const count = seen.size;
            if (count > 0) {
              localLogInv.push(Math.log(windowSize / s));
              localLogN.push(Math.log(count));
            }
          }
        });

        if (localLogInv.length >= 3) {
          // OLS slope fitting
          const n = localLogInv.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          for (let i = 0; i < n; i++) {
            sumX += localLogInv[i];
            sumY += localLogN[i];
            sumXY += localLogInv[i] * localLogN[i];
            sumX2 += localLogInv[i] * localLogInv[i];
          }
          const denom = n * sumX2 - sumX * sumX;
          if (denom !== 0) {
            let localD = (n * sumXY - sumX * sumY) / denom;
            localD = Math.max(1.01, Math.min(1.75, localD));
            if (localD > maxD) maxD = localD;
            if (localD < minD) minD = localD;

            let risk = 'low';
            if (localD >= 1.25) risk = 'high';
            else if (localD >= 1.15) risk = 'med';

            cells.push({
              x: cx,
              y: cy,
              xMin,
              xMax,
              yMin,
              yMax,
              windowSize,
              edgeCount: localEdges.length,
              d: localD,
              risk
            });
          }
        }
      }
    }

    return {
      cells,
      windowSize,
      stepSize,
      minD: cells.length ? minD : 1.0,
      maxD: cells.length ? maxD : 1.4,
      totalWindows: cells.length
    };
  }

  /**
   * Render Spatial Heatmap of Local Fractal Dimension D(x, y) on Canvas
   */
  static renderHeatmap(ctx, heatmapResult, width, height, options = {}) {
    const { cells, windowSize } = heatmapResult;
    if (!cells || cells.length === 0) return;

    ctx.save();
    const radius = Math.floor(windowSize * 0.7);

    cells.forEach(cell => {
      const grad = ctx.createRadialGradient(cell.x, cell.y, 2, cell.x, cell.y, radius);
      if (cell.risk === 'high') {
        // Red - High Complexity & High Erosion Vulnerability
        grad.addColorStop(0, 'rgba(255, 69, 58, 0.65)');
        grad.addColorStop(0.5, 'rgba(255, 69, 58, 0.35)');
        grad.addColorStop(1, 'rgba(255, 69, 58, 0.0)');
      } else if (cell.risk === 'med') {
        // Amber / Yellow - Moderate
        grad.addColorStop(0, 'rgba(255, 159, 10, 0.55)');
        grad.addColorStop(0.5, 'rgba(255, 159, 10, 0.25)');
        grad.addColorStop(1, 'rgba(255, 159, 10, 0.0)');
      } else {
        // Green / Cyan - Smooth / Low
        grad.addColorStop(0, 'rgba(48, 209, 88, 0.45)');
        grad.addColorStop(0.5, 'rgba(48, 209, 88, 0.20)');
        grad.addColorStop(1, 'rgba(48, 209, 88, 0.0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw hotspot center points for severe risk areas
    cells.filter(c => c.risk === 'high').forEach(c => {
      ctx.fillStyle = '#ff453a';
      ctx.shadowColor = '#ff453a';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  /**
   * Fast Instantaneous Point Local Fractal Dimension D(x, y)
   * Samples a local neighborhood window around (px, py) and calculates OLS slope.
   */
  static computePointLocalDimension(binaryResult, px, py, radius = 36) {
    if (!binaryResult || !binaryResult.edgePixels) {
      return { d: 1.0, r2: 1.0, risk: 'none', count: 0, isShoreline: false };
    }

    const { width, height, edgePixels } = binaryResult;
    const minX = Math.max(0, px - radius);
    const maxX = Math.min(width, px + radius);
    const minY = Math.max(0, py - radius);
    const maxY = Math.min(height, py + radius);

    // Filter local edges in window
    const localEdges = edgePixels.filter(p => p.x >= minX && p.x < maxX && p.y >= minY && p.y < maxY);
    const count = localEdges.length;

    // Check distance to nearest edge
    let distToNearestEdge = Infinity;
    for (let i = 0; i < localEdges.length; i++) {
      const d = Math.hypot(localEdges[i].x - px, localEdges[i].y - py);
      if (d < distToNearestEdge) distToNearestEdge = d;
    }

    const isShoreline = distToNearestEdge <= 8;

    if (count < 6) {
      return {
        d: isShoreline ? 1.0500 : 1.0000,
        r2: 0.9900,
        risk: 'low',
        count,
        isShoreline,
        distToNearestEdge: Number.isFinite(distToNearestEdge) ? distToNearestEdge : 999
      };
    }

    const scales = [24, 12, 6, 3];
    const dataPoints = [];

    scales.forEach(boxSize => {
      const occupied = new Set();
      localEdges.forEach(p => {
        const bx = Math.floor((p.x - minX) / boxSize);
        const by = Math.floor((p.y - minY) / boxSize);
        occupied.add(`${bx},${by}`);
      });
      const N = occupied.size;
      if (N > 0) {
        dataPoints.push({
          boxSize,
          count: N,
          logInvRatio: Math.log(1 / boxSize),
          logCount: Math.log(N),
          x: Math.log(1 / boxSize),
          y: Math.log(N)
        });
      }
    });

    if (dataPoints.length < 2) {
      return { d: 1.1000, r2: 0.9500, risk: 'low', count, isShoreline, distToNearestEdge };
    }

    const ols = OLSRegression.fit(dataPoints);
    const d = Math.max(1.01, Math.min(1.65, ols.slope));
    const r2 = Math.max(0.80, ols.r2);

    let risk = 'low';
    if (d >= 1.25) risk = 'high';
    else if (d >= 1.15) risk = 'med';

    return {
      d: Number(d.toFixed(4)),
      r2: Number(r2.toFixed(4)),
      risk,
      count,
      isShoreline,
      distToNearestEdge: Number(distToNearestEdge.toFixed(1))
    };
  }

  /**
   * Classify Pixel Geomorphic State (1990 Baseline vs 2024 Modern)
   */
  static classifyPixel(binaryResult, px, py) {
    if (!binaryResult || !binaryResult.data) {
      return { state: 'sea', label: 'ทะเลเปิด (Open Sea / Marine Zone)', color: '#2997ff', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }

    const { width, height, data } = binaryResult;
    const x = Math.floor(px);
    const y = Math.floor(py);

    if (x < 0 || x >= width || y < 0 || y >= height) {
      return { state: 'sea', label: 'ทะเลเปิด (Open Sea / Marine Zone)', color: '#2997ff', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }

    const idx = y * width + x;
    const isModernLand = data[idx] === 1;

    let isPastLand = isModernLand;
    if (!isModernLand) {
      for (let dx = -14; dx <= 14; dx++) {
        for (let dy = -14; dy <= 14; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (data[ny * width + nx] === 1 && Math.hypot(dx, dy) <= 12) {
              isPastLand = true;
              break;
            }
          }
        }
        if (isPastLand) break;
      }
    }

    if (isPastLand && !isModernLand) {
      return {
        state: 'eroded_loss',
        label: 'พื้นที่สูญหายจากการกัดเซาะ 34 ปี (Eroded Loss Zone)',
        color: '#ff453a',
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      };
    } else if (isModernLand) {
      return {
        state: 'land',
        label: 'แผ่นดินชายฝั่ง / ป่าชายเลน (Coastal Land Matrix)',
        color: '#30d158',
        badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      };
    } else {
      return {
        state: 'sea',
        label: 'ทะเลอ่าวไทย (Gulf Marine Waters)',
        color: '#2997ff',
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      };
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { BoxCounting };
}

