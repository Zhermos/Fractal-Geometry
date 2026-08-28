/**
 * Ordinary Least Squares (OLS) Linear Regression & Statistical Engine
 * Calculates Fractal Dimension D, R^2, Standard Error, t-statistic, and p-value.
 */

class OLSRegression {
  /**
   * Fit linear regression y = D*x + C from box counting scales
   * x = ln(1 / r) or ln(maxDim / boxSize)
   * y = ln(N(r))
   */
  static fit(scaleResults) {
    if (!scaleResults || scaleResults.length < 2) {
      return null;
    }

    const n = scaleResults.length;
    const x = [];
    const y = [];
    const dataPoints = [];

    for (let i = 0; i < n; i++) {
      const pt = scaleResults[i];
      const xi = pt.logInvRatio !== undefined ? pt.logInvRatio : (pt.x !== undefined ? pt.x : Math.log(1 / (pt.boxSize || 1)));
      const yi = pt.logCount !== undefined ? pt.logCount : (pt.y !== undefined ? pt.y : Math.log(pt.count || 1));
      x.push(xi);
      y.push(yi);
      dataPoints.push({
        boxSize: pt.boxSize || 1,
        x: xi,
        y: yi,
        count: pt.count || Math.exp(yi)
      });
    }

    // Means
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    // Variances & Covariance
    let ssXX = 0;
    let ssYY = 0;
    let ssXY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      ssXX += dx * dx;
      ssYY += dy * dy;
      ssXY += dx * dy;
    }

    if (ssXX === 0) {
      return null;
    }

    // Slope D (Fractal Dimension) & Intercept C
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;

    // Fitted values, Residuals, SS_res, SS_tot
    let ssRes = 0;
    const residuals = [];
    const fittedPoints = [];

    for (let i = 0; i < n; i++) {
      const yHat = slope * x[i] + intercept;
      const res = y[i] - yHat;
      residuals.push(res);
      ssRes += res * res;
      fittedPoints.push({
        boxSize: dataPoints[i].boxSize,
        x: x[i],
        y: y[i],
        yHat: yHat,
        residual: res
      });
    }

    // R-squared (Coefficient of Determination)
    let r2 = ssYY > 0 ? 1 - (ssRes / ssYY) : 1;
    if (r2 < 0) r2 = 0;
    if (r2 > 1) r2 = 1;

    // Adjusted R^2
    const df = n - 2;
    const adjR2 = df > 0 ? 1 - (1 - r2) * (n - 1) / df : r2;

    // Standard Error of Residuals and Slope
    const residualVariance = df > 0 ? ssRes / df : 0;
    const standardErrorResidual = Math.sqrt(residualVariance);
    const standardErrorSlope = ssXX > 0 ? Math.sqrt(residualVariance / ssXX) : 0;

    // t-statistic for H0: slope = 0
    const tStat = standardErrorSlope > 0 ? slope / standardErrorSlope : 999;

    // Two-tailed p-value calculation using Student's t distribution
    const pValue = this.calculateTDistPValue(Math.abs(tStat), df);

    // Physical & Erosion Risk Interpretation
    const interpretation = this.interpretFractalDimension(slope, r2, pValue);

    return {
      slope: slope,                      // Fractal Dimension D
      fractalDimension: slope,
      intercept: intercept,              // ln(k)
      r2: r2,                            // Coefficient of Determination
      adjR2: adjR2,
      ssRes: ssRes,
      ssTot: ssYY,
      ssReg: ssYY - ssRes,
      standardError: standardErrorSlope, // SE(D)
      tStat: tStat,
      pValue: pValue,
      df: df,
      n: n,
      dataPoints: fittedPoints,
      interpretation: interpretation
    };
  }

  /**
   * Approximate two-tailed p-value for Student's t-distribution
   */
  static calculateTDistPValue(t, df) {
    if (df <= 0) return 0.0001;
    if (isNaN(t) || t === Infinity) return 0.00001;

    // Transform t to x for regularized incomplete beta function
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;

    // Incomplete beta approximation
    const ibeta = this.regularizedIncompleteBeta(x, a, b);
    return Math.max(0, Math.min(1, ibeta));
  }

  /**
   * Continued fraction approximation for regularized incomplete beta function I_x(a, b)
   */
  static regularizedIncompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Factors in front of continued fraction: (x^a * (1-x)^b) / (a * Beta(a,b))
    const lnBeta = this.lnGamma(a) + this.lnGamma(b) - this.lnGamma(a + b);
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

    // Lentz continued fraction method
    const maxIter = 100;
    const eps = 1e-8;
    let f = 1.0;
    let c = 1.0;
    let d = 0.0;

    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      
      // Even step
      let numerator = -(a + m - 1) * (a + b + m - 1) * x / ((a + m2 - 2) * (a + m2 - 1));
      d = 1.0 + numerator * d;
      if (Math.abs(d) < eps) d = eps;
      c = 1.0 + numerator / c;
      if (Math.abs(c) < eps) c = eps;
      d = 1.0 / d;
      f *= c * d;

      // Odd step
      numerator = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
      d = 1.0 + numerator * d;
      if (Math.abs(d) < eps) d = eps;
      c = 1.0 + numerator / c;
      if (Math.abs(c) < eps) c = eps;
      d = 1.0 / d;
      const delta = c * d;
      f *= delta;

      if (Math.abs(delta - 1.0) < eps) break;
    }

    return front * f;
  }

  /**
   * Log-gamma function (Stirling / Lanczos approximation)
   */
  static lnGamma(z) {
    const c = [
      76.18009172947146,
      -86.50532032941677,
      24.01409824083091,
      -1.231739572450155,
      0.001208650973866179,
      -0.000005395239384953
    ];
    let y = z;
    let x = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      ser += c[j] / ++y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  /**
   * Generate qualitative and erosion risk interpretation based on D, R^2, p-value
   */
  static interpretFractalDimension(D, r2, pValue) {
    let complexity = '';
    let erosionRisk = '';
    let riskLevel = 'med'; // 'low', 'med', 'high'
    let explanation = '';
    let statisticalValidity = '';

    // Statistical validation
    if (r2 >= 0.98 && pValue < 0.01) {
      statisticalValidity = `มีนัยสำคัญทางสถิติสูงมาก (R² = ${(r2*100).toFixed(2)}%, p < 0.01) โครงสร้างความซับซ้อนเป็นคุณสมบัติแฟร็กทัลที่แท้จริง ไม่ได้เกิดจากสัญญาณรบกวน (Noise)`;
    } else if (r2 >= 0.90) {
      statisticalValidity = `มีความสัมพันธ์เชิงเส้นที่ดี (R² = ${(r2*100).toFixed(2)}%, p = ${pValue.toFixed(4)})`;
    } else {
      statisticalValidity = `ความสัมพันธ์เชิงเส้นต่ำ (R² = ${(r2*100).toFixed(2)}%) อาจมีสัญญาณรบกวนในภาพถ่ายหรือขอบภาพไม่ต่อเนื่อง`;
    }

    // Fractal Dimension classification
    if (D < 1.08) {
      complexity = 'ความซับซ้อนต่ำมาก (Very Low Roughness / Quasi-1D)';
      erosionRisk = 'ความเสี่ยงตามโครงสร้างต่ำ (Low Morphological Risk) แต่ขึ้นกับสภาพตะกอนหน้าหาด';
      riskLevel = 'low';
      explanation = `แนวชายฝั่งมีลักษณะค่อนข้างเรียบตรง (D ≈ ${D.toFixed(3)}) คล้ายเส้นเรขาคณิตยูคลิด คลื่นทะเลจะซัดเข้าปะทะแนวตรงสม่ำเสมอ`;
    } else if (D < 1.20) {
      complexity = 'ความซับซ้อนปานกลาง (Moderate Roughness / Delta & Mudflats)';
      erosionRisk = 'ความเสี่ยงการกัดเซาะวิกฤตสูงในพื้นที่ดินเลนและสันดอน (Severe Vulnerability)';
      riskLevel = 'high';
      explanation = `แนวชายฝั่งมีส่วนเว้าโค้งและร่องน้ำสาขา (D ≈ ${D.toFixed(3)}) เช่น บริเวณอ่าวไทยตอนบน การเปลี่ยนแปลงสมดุลตะกอน (Sediment Budget) จะทำให้พื้นที่ชายฝั่งสูญหายอย่างรวดเร็ว`;
    } else if (D < 1.35) {
      complexity = 'ความซับซ้อนสูง (High Roughness / Spits & Estuaries)';
      erosionRisk = 'ความเสี่ยงสูงบริเวณหัวแหลมและสันดอนจะงอย (High Spit Dynamic Risk)';
      riskLevel = 'high';
      explanation = `แนวชายฝั่งมีการแตกกิ่งก้าน มีแหลมและอ่าวสลับกันอย่างซับซ้อน (D ≈ ${D.toFixed(3)}) เช่น แหลมตะลุมพุกหรืออ่าวไทยฝั่งตะวันออก มีการรวมตัวของพลังงานคลื่น (Wave Convergence) บริเวณหัวแหลม`;
    } else {
      complexity = 'ความซับซ้อนสูงมาก (Extremely Jagged / Island Archipelago)';
      erosionRisk = 'พลังงานคลื่นสลายตัวสูง (High Wave Energy Dissipation)';
      riskLevel = 'med';
      explanation = `ชายฝั่งเว้าแหว่งสูงมากและมีหมู่เกาะซับซ้อน (D ≈ ${D.toFixed(3)}) โครงสร้างแฟร็กทัลช่วยกระจายและสลายพลังงานคลื่น (Wave Attenuation) ได้ดีตามธรรมชาติ`;
    }

    return {
      complexity,
      erosionRisk,
      riskLevel,
      explanation,
      statisticalValidity
    };
  }
}
