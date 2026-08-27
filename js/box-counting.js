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

    // 3. Draw scale label badge on top-left of canvas
    if (options.showBadge !== false) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(10, 10, 200, 52, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(`สเกลกล่อง (ε): ${boxSize} px`, 20, 30);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`กล่องที่ครอบทับ N(ε): ${occupiedBoxes.length} กล่อง`, 20, 50);
    }

    ctx.restore();
  }
}
