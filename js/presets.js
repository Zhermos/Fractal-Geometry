/**
 * Presets and synthetic shape generators for Gulf of Thailand regions
 * and benchmark fractal structures.
 */

const PRESETS = {
  // --- Gulf of Thailand Full Map & Regional Zones ---
  whole_gulf: {
    id: 'whole_gulf',
    name: '🇹🇭 อ่าวไทยทั้งอ่าว (Entire Gulf of Thailand)',
    category: 'อ่าวไทย (Gulf of Thailand)',
    description: 'ภาพรวมแนวชายฝั่งรอบอ่าวไทยทั้งหมด ครอบคลุมตั้งแต่ตราด-ระยอง-ชลบุรี, อ่าวไทยตอนบน (กทม.-สมุทรปราการ), เพชรบุรี-ประจวบฯ, สุราษฎร์ฯ, แหลมตะลุมพุก จนถึงสงขลาและนราธิวาส พร้อมหมู่เกาะหลัก',
    historicalD: 1.218,
    historicalR2: 0.995,
    erosionRisk: 'Severe to High (วิกฤตสูงตามแนวเลนและสันดอน)',
    riskLevel: 'high',
    generate(ctx, width, height) {
      // 1. Deep Ocean Background
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      // 2. Mainland Polygon wrapping around the Gulf
      ctx.fillStyle = '#166534';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;

      ctx.beginPath();
      // Outer bounding box covering outside land (top-left, top-right, bottom-right, bottom-left)
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height * 0.78); // Trat border
      
      // Eastern Coastline (Trat -> Chanthaburi -> Rayong -> Chonburi)
      const eastPts = [
        { x: width * 0.88, y: height * 0.78 }, // Trat / Cambodia border
        { x: width * 0.82, y: height * 0.68 }, // Trat Bay
        { x: width * 0.80, y: height * 0.58 }, // Chanthaburi
        { x: width * 0.73, y: height * 0.48 }, // Rayong
        { x: width * 0.66, y: height * 0.40 }, // Sattahip / Pattaya headland
        { x: width * 0.64, y: height * 0.28 }, // Chonburi
        { x: width * 0.58, y: height * 0.20 }, // Bang Pakong river mouth
        
        // Upper Gulf (Bight of Bangkok / Chao Phraya Delta)
        { x: width * 0.50, y: height * 0.18 }, // Samut Prakan / Chao Phraya
        { x: width * 0.43, y: height * 0.18 }, // Samut Sakhon (Tha Chin)
        { x: width * 0.38, y: height * 0.22 }, // Samut Songkhram (Mae Klong)
        { x: width * 0.35, y: height * 0.28 }, // Phetchaburi
        
        // Western Coast (Hua Hin -> Prachuap -> Chumphon)
        { x: width * 0.36, y: height * 0.36 }, // Cha-am / Hua Hin
        { x: width * 0.38, y: height * 0.43 }, // Sam Roi Yot headland
        { x: width * 0.34, y: height * 0.52 }, // Prachuap Bay
        { x: width * 0.32, y: height * 0.60 }, // Bang Saphan
        { x: width * 0.30, y: height * 0.68 }, // Chumphon
        
        // Southern Coast (Surat Thani -> Nakhon -> Songkhla -> Pattani)
        { x: width * 0.36, y: height * 0.75 }, // Bandon Bay (Surat Thani)
        { x: width * 0.46, y: height * 0.78 }, // Laem Talumphuk curved spit!
        { x: width * 0.43, y: height * 0.84 }, // Nakhon Si Thammarat
        { x: width * 0.38, y: height * 0.90 }, // Songkhla Lagoon inlet
        { x: width * 0.45, y: height * 0.94 }, // Pattani spit
        { x: width * 0.42, y: height }         // Narathiwat / Malaysia border
      ];

      // Trace the Gulf coastline
      for (let i = 0; i < eastPts.length; i++) {
        ctx.lineTo(eastPts[i].x, eastPts[i].y);
      }

      ctx.lineTo(0, height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // 3. Add Micro Fractal Roughness along the entire coastline
      addCoastlineRoughness(ctx, eastPts, 4, 12, 0.45);

      // 4. Draw Major Islands in the Gulf
      // Eastern Islands: Koh Chang, Koh Kood, Koh Samet
      drawIsland(ctx, width * 0.84, height * 0.72, 14, 22, 0.5); // Koh Chang
      drawIsland(ctx, width * 0.87, height * 0.82, 10, 15, 0.4); // Koh Kood
      drawIsland(ctx, width * 0.71, height * 0.49, 7, 12, 0.4);  // Koh Samet

      // Western / Southern Islands: Koh Samui, Koh Phangan, Koh Tao
      drawIsland(ctx, width * 0.42, height * 0.72, 12, 11, 0.5); // Koh Samui
      drawIsland(ctx, width * 0.43, height * 0.67, 9, 8, 0.4);   // Koh Phangan
      drawIsland(ctx, width * 0.40, height * 0.62, 6, 6, 0.4);   // Koh Tao

      // Songkhla Inner Lake
      ctx.fillStyle = '#061325';
      ctx.beginPath();
      ctx.ellipse(width * 0.33, height * 0.89, 14, 28, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  upper_gulf: {
    id: 'upper_gulf',
    name: 'อ่าวไทยตอนบน (Upper Gulf / Bight of Bangkok)',
    category: 'อ่าวไทย (Gulf of Thailand)',
    description: 'พื้นที่รูปตัว ก ครอบคลุมปากแม่น้ำเจ้าพระยา บางปะกง ท่าจีน และแม่กลอง เป็นดินเลนความซับซ้อนปานกลาง มีอัตราการกัดเซาะรุนแรง',
    historicalD: 1.194,
    historicalR2: 0.992,
    erosionRisk: 'Severe (วิกฤตสูง)',
    riskLevel: 'high',
    generate(ctx, width, height) {
      // Draw background ocean & land
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#166534';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;

      ctx.beginPath();
      // Start from top-left (Phetchaburi/Samut Songkhram coast)
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(width * 0.18, height * 0.65);
      
      // Upper curve (Samut Sakhon / Chao Phraya river mouth)
      ctx.bezierCurveTo(
        width * 0.25, height * 0.35,
        width * 0.38, height * 0.25,
        width * 0.50, height * 0.25
      );
      
      // River mouth indents (Bang Pakong / Samut Prakan)
      ctx.bezierCurveTo(
        width * 0.62, height * 0.25,
        width * 0.75, height * 0.38,
        width * 0.82, height * 0.65
      );
      ctx.lineTo(width, height * 0.75);
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Add fractal micro-roughness along the mudflat delta
      addCoastlineRoughness(ctx, [
        {x: 0, y: height * 0.7},
        {x: width * 0.18, y: height * 0.65},
        {x: width * 0.35, y: height * 0.30},
        {x: width * 0.50, y: height * 0.25},
        {x: width * 0.65, y: height * 0.30},
        {x: width * 0.82, y: height * 0.65},
        {x: width, y: height * 0.75}
      ], 4, 18, 0.45);
    }
  },

  eastern_gulf: {
    id: 'eastern_gulf',
    name: 'อ่าวไทยฝั่งตะวันออก (Eastern Gulf - ชลบุรี-ระยอง-ตราด)',
    category: 'อ่าวไทย (Gulf of Thailand)',
    description: 'มีลักษณะเป็นหัวแหลม อ่าวเว้า และหมู่เกาะ (เกาะช้าง, เกาะกูด, เกาะเสม็ด) มีความขรุขระและเว้าแหว่งสูง',
    historicalD: 1.286,
    historicalR2: 0.995,
    erosionRisk: 'Moderate to High (ปานกลาง-สูง)',
    riskLevel: 'med',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      // Jagged eastern coastline running top-left to bottom-right
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(width * 0.15, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(width * 0.7, height);
      
      const pts = [
        {x: width * 0.15, y: 0},
        {x: width * 0.25, y: height * 0.2},
        {x: width * 0.18, y: height * 0.35}, // Laem Chabang / Sattahip indent
        {x: width * 0.38, y: height * 0.45},
        {x: width * 0.30, y: height * 0.60}, // Rayong bay
        {x: width * 0.52, y: height * 0.75}, // Chanthaburi
        {x: width * 0.45, y: height * 0.88}, // Trat estuary
        {x: width * 0.70, y: height}
      ];

      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Micro roughness and islands
      addCoastlineRoughness(ctx, pts, 5, 24, 0.55);

      // Draw archipelago islands (Koh Chang, Koh Kood, Koh Samet)
      drawIsland(ctx, width * 0.32, height * 0.78, 22, 14, 0.6);
      drawIsland(ctx, width * 0.38, height * 0.90, 16, 10, 0.5);
      drawIsland(ctx, width * 0.22, height * 0.48, 12, 7, 0.4);
    }
  },

  western_gulf: {
    id: 'western_gulf',
    name: 'อ่าวไทยฝั่งตะวันตก (Western Gulf - เพชรบุรี-ประจวบฯ)',
    category: 'อ่าวไทย (Gulf of Thailand)',
    description: 'แนวชายหาดยาวต่อเนื่อง ชายฝั่งค่อนข้างตรง มีหัวหิน ชะอำ อ่าวมะนาว มีความซับซ้อนเชิงแฟร็กทัลน้อยกว่าฝั่งตะวันออก',
    historicalD: 1.112,
    historicalR2: 0.998,
    erosionRisk: 'Moderate (ปานกลาง)',
    riskLevel: 'med',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      // Land on left side, ocean on right
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.45, 0);
      
      const pts = [
        {x: width * 0.45, y: 0},
        {x: width * 0.42, y: height * 0.25},
        {x: width * 0.46, y: height * 0.45},
        {x: width * 0.40, y: height * 0.65}, // Khao Sam Roi Yot headland
        {x: width * 0.48, y: height * 0.75},
        {x: width * 0.43, y: height * 0.90},
        {x: width * 0.45, y: height}
      ];

      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      addCoastlineRoughness(ctx, pts, 4, 12, 0.35);
    }
  },

  southern_gulf: {
    id: 'southern_gulf',
    name: 'อ่าวไทยฝั่งใต้ (Southern Gulf - นครศรีฯ-สงขลา-ปัตตานี)',
    category: 'อ่าวไทย (Gulf of Thailand)',
    description: 'มีลักษณะธรณีสัณฐานเด่นชัด เช่น แหลมตะลุมพุก (Spit) ทะเลสาบสงขลา (Lagoon) และอ่าวปัตตานี มีการสะสมและพัดพามวลตะกอนสูง',
    historicalD: 1.238,
    historicalR2: 0.994,
    erosionRisk: 'Severe (วิกฤตสูงตามแนวสันดอน)',
    riskLevel: 'high',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      // Mainland on the left
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.38, 0);

      const pts = [
        {x: width * 0.38, y: 0},
        {x: width * 0.36, y: height * 0.20},
        {x: width * 0.58, y: height * 0.32}, // Laem Talumphuk curved spit!
        {x: width * 0.54, y: height * 0.38},
        {x: width * 0.35, y: height * 0.42},
        {x: width * 0.38, y: height * 0.60},
        {x: width * 0.32, y: height * 0.72}, // Songkhla lake inlet
        {x: width * 0.42, y: height * 0.85},
        {x: width * 0.50, y: height * 0.92}, // Pattani spit
        {x: width * 0.44, y: height}
      ];

      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Spit and lagoon details
      addCoastlineRoughness(ctx, pts, 4, 16, 0.48);

      // Songkhla inner lake
      ctx.fillStyle = '#061325';
      ctx.beginPath();
      ctx.ellipse(width * 0.22, height * 0.72, 28, 55, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // --- Synthetic Benchmarks for Mathematical Validation ---
  straight_line: {
    id: 'straight_line',
    name: 'เส้นตรงมาตรฐาน (Straight Line - D ≈ 1.000)',
    category: 'รูปทรงมาตรฐาน (Mathematical Benchmark)',
    description: 'เส้นเรขาคณิตยูคลิด 1 มิติ เพื่อทดสอบความเที่ยงตรงของอัลกอริทึม ค่าทฤษฎี D = 1.0000',
    historicalD: 1.000,
    historicalR2: 1.000,
    erosionRisk: 'N/A (Benchmark)',
    riskLevel: 'low',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, width * 0.5, height);

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      ctx.lineTo(width * 0.5, height);
      ctx.stroke();
    }
  },

  koch_curve: {
    id: 'koch_curve',
    name: 'เส้นโค้งค็อค (Koch Snowflake Curve - ทฤษฎี D = ln4/ln3 ≈ 1.2618)',
    category: 'รูปทรงมาตรฐาน (Mathematical Benchmark)',
    description: 'แฟร็กทัลคลาสสิกของ Helge von Koch มีความคล้ายตัวเองสมบูรณ์ทุกสเกล ค่าทฤษฎี D = ln(4)/ln(3) ≈ 1.2618595',
    historicalD: 1.262,
    historicalR2: 0.999,
    erosionRisk: 'N/A (Benchmark)',
    riskLevel: 'med',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#166534';
      ctx.lineWidth = 2;

      const p1 = { x: width * 0.08, y: height * 0.65 };
      const p2 = { x: width * 0.92, y: height * 0.65 };

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      drawKochLine(ctx, p1, p2, 5);
      
      // Close bottom to fill land
      ctx.lineTo(width * 0.92, 0);
      ctx.lineTo(width * 0.08, 0);
      ctx.closePath();
      ctx.fill();

      // Stroke coastline
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      drawKochLine(ctx, p1, p2, 5);
      ctx.stroke();
    }
  },

  fractal_coast_mid: {
    id: 'fractal_coast_mid',
    name: 'ชายฝั่งแฟร็กทัลสังเคราะห์ (Fractal Coastline - D ≈ 1.22)',
    category: 'การจำลองทางคณิตศาสตร์ (Synthesized)',
    description: 'แนวชายฝั่งจำลองด้วยกระบวนการ Fractional Brownian Motion (FBM) มีการกระจายตัวของอ่าวและหัวแหลมระดับปานกลาง',
    historicalD: 1.225,
    historicalR2: 0.996,
    erosionRisk: 'Moderate Risk',
    riskLevel: 'med',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      const pts = generateFBMCoastline(0, height * 0.5, width, height * 0.5, 6, 0.72, 90);
      
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  },

  fractal_coast_high: {
    id: 'fractal_coast_high',
    name: 'ชายฝั่งขรุขระสูงมาก (Highly Jagged Coastline - D ≈ 1.42)',
    category: 'การจำลองทางคณิตศาสตร์ (Synthesized)',
    description: 'แนวชายฝั่งจำลองความขรุขระสูงมาก มีลักษณะของร่องน้ำ ลำน้ำสาขา และแหลมหักมุมซับซ้อน D > 1.35',
    historicalD: 1.418,
    historicalR2: 0.993,
    erosionRisk: 'High Dynamic / Complex Dissipation',
    riskLevel: 'high',
    generate(ctx, width, height) {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, width, height);

      const pts = generateFBMCoastline(0, height * 0.5, width, height * 0.5, 7, 0.52, 130);
      
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }
};

// Helper: Recursive Koch curve generator
function drawKochLine(ctx, p1, p2, depth) {
  if (depth === 0) {
    ctx.lineTo(p2.x, p2.y);
    return;
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const a = { x: p1.x + dx / 3, y: p1.y + dy / 3 };
  const c = { x: p1.x + 2 * dx / 3, y: p1.y + 2 * dy / 3 };

  // 60-degree equilateral peak
  const sin60 = Math.sin(-Math.PI / 3);
  const cos60 = Math.cos(-Math.PI / 3);
  const bx = a.x + (dx / 3) * cos60 - (dy / 3) * sin60;
  const by = a.y + (dx / 3) * sin60 + (dy / 3) * cos60;
  const b = { x: bx, y: by };

  drawKochLine(ctx, p1, a, depth - 1);
  drawKochLine(ctx, a, b, depth - 1);
  drawKochLine(ctx, b, c, depth - 1);
  drawKochLine(ctx, c, p2, depth - 1);
}

// Helper: Fractional Brownian Motion Coastline generator
function generateFBMCoastline(x1, y1, x2, y2, depth, hurst = 0.6, roughness = 80) {
  let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];

  for (let i = 0; i < depth; i++) {
    const nextPoints = [];
    const scale = roughness * Math.pow(0.5, i * hurst);

    for (let j = 0; j < points.length - 1; j++) {
      const p1 = points[j];
      const p2 = points[j + 1];
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);

      // Seeded-like displacement
      const offset = (Math.random() - 0.5) * 2 * scale;
      const mid = { x: mx + nx * offset, y: my + ny * offset };

      nextPoints.push(p1);
      nextPoints.push(mid);
    }
    nextPoints.push(points[points.length - 1]);
    points = nextPoints;
  }

  return points;
}

// Helper: Add natural micro roughness along polyline
function addCoastlineRoughness(ctx, mainPts, depth, roughness, hurst) {
  ctx.save();
  ctx.strokeStyle = '#22c55e';
  ctx.fillStyle = '#166534';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < mainPts.length - 1; i++) {
    const p1 = mainPts[i];
    const p2 = mainPts[i + 1];
    const subPts = generateFBMCoastline(p1.x, p1.y, p2.x, p2.y, depth, hurst, roughness);
    
    ctx.beginPath();
    ctx.moveTo(subPts[0].x, subPts[0].y);
    for (let j = 1; j < subPts.length; j++) {
      ctx.lineTo(subPts[j].x, subPts[j].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Helper: Draw natural island shape
function drawIsland(ctx, cx, cy, rx, ry, roughness) {
  ctx.save();
  ctx.fillStyle = '#15803d';
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const rNoise = 1 + (Math.sin(theta * 3) * 0.15 + Math.cos(theta * 5) * 0.1) * roughness;
    const x = cx + Math.cos(theta) * rx * rNoise;
    const y = cy + Math.sin(theta) * ry * rNoise;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
