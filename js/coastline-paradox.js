/**
 * Coastline Paradox (ปรากฏการณ์ข้อขัดแย้งความยาวชายฝั่ง) & Richardson Effect Simulator
 * Demonstrates how measured coastline length L(ε) increases as the ruler scale ε decreases.
 */

class CoastlineParadoxSimulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.coastlinePoints = [];
    this.rulerSize = 40; // in pixels
    this.measurementHistory = [];
  }

  /**
   * Set coastline points from ordered polyline or binary edge
   */
  setCoastlinePoints(points) {
    if (!points || points.length === 0) return;
    this.coastlinePoints = points;
    this.calculateHistory();
  }

  /**
   * Pre-calculate measurements across a full range of ruler sizes for the Richardson plot
   */
  calculateHistory() {
    this.measurementHistory = [];
    if (this.coastlinePoints.length < 2) return;

    const rulerSizes = [250, 200, 160, 120, 90, 64, 48, 32, 24, 16, 10, 6, 4];
    
    rulerSizes.forEach(r => {
      const res = this.measureWithRuler(r);
      if (res.segments.length > 0) {
        this.measurementHistory.push({
          rulerSize: r,
          segmentCount: res.segments.length,
          totalLength: res.totalLength,
          logRuler: Math.log(r),
          logLength: Math.log(res.totalLength)
        });
      }
    });
  }

  /**
   * Walk along coastline points with fixed ruler step size
   */
  measureWithRuler(rulerSize) {
    if (this.coastlinePoints.length < 2) {
      return { segments: [], totalLength: 0 };
    }

    const segments = [];
    let currentIdx = 0;
    let currentPt = this.coastlinePoints[0];

    while (currentIdx < this.coastlinePoints.length - 1) {
      let foundNext = false;
      
      // Step forward until distance >= rulerSize
      for (let i = currentIdx + 1; i < this.coastlinePoints.length; i++) {
        const nextPt = this.coastlinePoints[i];
        const dx = nextPt.x - currentPt.x;
        const dy = nextPt.y - currentPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= rulerSize || i === this.coastlinePoints.length - 1) {
          segments.push({
            p1: { x: currentPt.x, y: currentPt.y },
            p2: { x: nextPt.x, y: nextPt.y },
            length: dist
          });
          currentPt = nextPt;
          currentIdx = i;
          foundNext = true;
          break;
        }
      }

      if (!foundNext) break;
    }

    const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
    return { segments, totalLength };
  }

  /**
   * Render the coastline and interactive ruler steps on canvas
   */
  render(currentRulerSize = this.rulerSize) {
    this.rulerSize = currentRulerSize;
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (this.coastlinePoints.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('กรุณาเลือกหรือประมวลผลแนวชายฝั่งเพื่อจำลอง Coastline Paradox', width / 2, height / 2);
      return { totalLength: 0, segmentCount: 0 };
    }

    // 2. Draw actual natural coastline (dimmed green / cyan)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.coastlinePoints[0].x, this.coastlinePoints[0].y);
    for (let i = 1; i < this.coastlinePoints.length; i++) {
      ctx.lineTo(this.coastlinePoints[i].x, this.coastlinePoints[i].y);
    }
    ctx.stroke();

    // 3. Measure with current ruler size
    const result = this.measureWithRuler(this.rulerSize);

    // 4. Draw ruler segments with vibrant color & glow
    ctx.save();
    ctx.strokeStyle = '#f59e0b'; // amber gold
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 6;

    for (let i = 0; i < result.segments.length; i++) {
      const seg = result.segments[i];
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();

      // Draw ruler endpoints / compass marks
      ctx.fillStyle = '#ef4444'; // red pin
      ctx.beginPath();
      ctx.arc(seg.p1.x, seg.p1.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Last endpoint
    if (result.segments.length > 0) {
      const lastSeg = result.segments[result.segments.length - 1];
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lastSeg.p2.x, lastSeg.p2.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Draw stats overlay badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 14, 260, 68, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`ขนาดไม้วัด (Ruler ε): ${this.rulerSize} px`, 24, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`จำนวนช่วงไม้วัด: ${result.segments.length} ท่อน`, 24, 52);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`ความยาวรวมที่วัดได้ L(ε): ${result.totalLength.toFixed(1)} px`, 24, 70);

    return result;
  }
}
