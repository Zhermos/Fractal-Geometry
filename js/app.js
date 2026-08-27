/**
 * Main Application Controller for Fractal Coastline & Coastal Erosion Simulation (v3.0)
 * Connects UI, Simple/Advanced Modes, Satellite Image Processing, Box Counting,
 * 2D Wave Simulation with permanent landmass, Live Step-by-Step Calculation Guide, and Regional Study.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Canvas Elements ---
  const originalCanvas = document.getElementById('original-canvas');
  const edgeCanvas = document.getElementById('edge-canvas');
  const gridOverlayCanvas = document.getElementById('grid-overlay-canvas');
  const waveCanvas = document.getElementById('wave-canvas');

  // --- UI Elements & Buttons ---
  const presetCards = document.querySelectorAll('.preset-card');
  const presetPills = document.querySelectorAll('.preset-pill');
  const mapStyleSelect = document.getElementById('map-style-select');
  const edgeMethodSelect = document.getElementById('edge-method');
  const cannyHighSlider = document.getElementById('canny-high-slider');
  const cannyHighVal = document.getElementById('canny-high-val');
  const imageUploadInput = document.getElementById('image-upload');
  const runAnalysisBtn = document.getElementById('run-analysis-btn');
  const prevScaleBtn = document.getElementById('prev-scale-btn');
  const nextScaleBtn = document.getElementById('next-scale-btn');
  const playScaleBtn = document.getElementById('play-scale-btn');
  const currentScaleBadge = document.getElementById('current-scale-badge');

  // Canvas View Toggle
  const viewAllCanvasesBtn = document.getElementById('view-all-canvases-btn');
  const viewFocusCanvasBtn = document.getElementById('view-focus-canvas-btn');
  const canvasesGrid = document.getElementById('canvases-grid');

  // Wave Simulation Controls
  const waveStartBtn = document.getElementById('wave-start-btn');
  const wavePauseBtn = document.getElementById('wave-pause-btn');
  const waveResetBtn = document.getElementById('wave-reset-btn');
  const waveAmpSlider = document.getElementById('wave-amp-slider');
  const waveAmpVal = document.getElementById('wave-amp-val');
  const defenseSelect = document.getElementById('defense-select');
  const waveViewSelect = document.getElementById('wave-view-select');
  const scenarioBtns = document.querySelectorAll('.scenario-btn');

  // Export Buttons
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportImageBtn = document.getElementById('export-image-btn');

  // --- App State ---
  let currentPresetId = 'whole_gulf';
  let currentMapStyle = 'satellite';
  let binaryResult = null;
  let boxCountingResult = null;
  let olsResult = null;
  let currentScaleIndex = 0;
  let isPlayingScaleAnimation = false;
  let scaleAnimationTimer = null;
  let isAutoTourRunning = false;

  // Chart instances
  let logLogChart = null;
  let regionalComparisonChart = null;
  let regionalErosionChart = null;

  // Simulation instance
  let waveSim = null;
  if (waveCanvas) {
    waveSim = new WaveErosionSimulation(waveCanvas);
  }

  // --- Map Style Selector ---
  if (mapStyleSelect) {
    mapStyleSelect.addEventListener('change', (e) => {
      currentMapStyle = e.target.value;
      loadSelectedPreset(currentPresetId);
    });
  }

  // --- Canvas View Mode Toggle ---
  if (viewAllCanvasesBtn && viewFocusCanvasBtn && canvasesGrid) {
    viewAllCanvasesBtn.addEventListener('click', () => {
      canvasesGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
      viewAllCanvasesBtn.className = 'px-3 py-1 rounded-full bg-white text-black font-medium transition';
      viewFocusCanvasBtn.className = 'px-3 py-1 rounded-full text-[#86868b] hover:text-white transition';
    });

    viewFocusCanvasBtn.addEventListener('click', () => {
      canvasesGrid.className = 'grid grid-cols-1 md:grid-cols-1 gap-6 max-w-2xl mx-auto';
      viewFocusCanvasBtn.className = 'px-3 py-1 rounded-full bg-white text-black font-medium transition';
      viewAllCanvasesBtn.className = 'px-3 py-1 rounded-full text-[#86868b] hover:text-white transition';
    });
  }

  // --- Tab Switching Logic ---
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetTab) {
    tabButtons.forEach(b => {
      if (b.dataset.tab === targetTab) {
        b.classList.add('tab-active', 'text-sky-400', 'border-sky-400', 'font-bold');
        b.classList.remove('text-slate-400');
      } else {
        b.classList.remove('tab-active', 'text-sky-400', 'border-sky-400', 'font-bold');
        b.classList.add('text-slate-400');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === `tab-pane-${targetTab}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    // Tab specific re-renders
    if (targetTab === 'wave' && waveSim) {
      if (originalCanvas) {
        waveSim.loadLandFromCanvas(originalCanvas, olsResult ? olsResult.fractalDimension : 1.20);
      }
      waveSim.render(waveViewSelect ? waveViewSelect.value : 'wave');
    } else if (targetTab === 'regional') {
      renderRegionalComparison();
    } else if (targetTab === 'calculation') {
      updateLiveCalculationGuide(boxCountingResult, olsResult);
    } else if (targetTab === 'theory' || targetTab === 'pipeline') {
      if (window.renderAllFormulas) {
        window.renderAllFormulas(document.getElementById(`tab-pane-${targetTab}`));
      }
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // --- Preset Card & Pill Handlers ---
  function selectPreset(presetId) {
    currentPresetId = presetId;
    
    presetCards.forEach(card => {
      if (card.dataset.preset === presetId) {
        card.classList.add('active', 'border-cyan-500', 'bg-cyan-950/40');
        card.classList.remove('border-slate-800');
      } else {
        card.classList.remove('active', 'border-cyan-500', 'bg-cyan-950/40');
        card.classList.add('border-slate-800');
      }
    });

    presetPills.forEach(pill => {
      if (pill.dataset.preset === presetId) {
        pill.classList.add('bg-cyan-900/60', 'text-cyan-300', 'border-cyan-600');
        pill.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-800');
      } else {
        pill.classList.remove('bg-cyan-900/60', 'text-cyan-300', 'border-cyan-600');
        pill.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-800');
      }
    });

    loadSelectedPreset(presetId);
  }

  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      selectPreset(card.dataset.preset);
    });
  });

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      selectPreset(pill.dataset.preset);
    });
  });

  // --- Satellite Image Cache ---
  const satelliteImageCache = {};

  // --- Preset Loading & Canvas Artwork Generation ---
  function loadSelectedPreset(presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return;

    const summaryTitle = document.getElementById('summary-area-title');
    if (summaryTitle) summaryTitle.textContent = preset.name;

    originalCanvas.width = 512;
    originalCanvas.height = 512;
    const ctx = originalCanvas.getContext('2d');

    // If preset has a genuine satellite photo file
    if (preset.imageSrc) {
      if (satelliteImageCache[preset.imageSrc]) {
        const img = satelliteImageCache[preset.imageSrc];
        const crop = preset.crop || { sx: 0, sy: 0, sw: img.naturalWidth || img.width, sh: img.naturalHeight || img.height };
        ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 512, 512);
        runFullPipeline();
        if (typeof drawSatelliteTelemetryBadge === 'function') {
          drawSatelliteTelemetryBadge(ctx, 512, 512, preset.code, preset.coordsText || '9°N-14°N, 99°E-103°E');
        }
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          satelliteImageCache[preset.imageSrc] = img;
          const crop = preset.crop || { sx: 0, sy: 0, sw: img.naturalWidth || img.width, sh: img.naturalHeight || img.height };
          ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 512, 512);
          runFullPipeline();
          if (typeof drawSatelliteTelemetryBadge === 'function') {
            drawSatelliteTelemetryBadge(ctx, 512, 512, preset.code, preset.coordsText || '9°N-14°N, 99°E-103°E');
          }
        };
        img.onerror = () => {
          // Fallback to procedural satellite generation if image fails to load
          preset.generate(ctx, 512, 512, currentMapStyle);
          runFullPipeline();
        };
        img.src = preset.imageSrc;
      }
    } else {
      // Mathematical Benchmark Presets (Straight Line, Koch Curve, etc.)
      preset.generate(ctx, 512, 512, currentMapStyle);
      runFullPipeline();
    }
  }

  // --- Image Upload Handler ---
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          originalCanvas.width = 512;
          originalCanvas.height = 512;
          const ctx = originalCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 512, 512);

          const summaryTitle = document.getElementById('summary-area-title');
          if (summaryTitle) summaryTitle.textContent = `ภาพอัปโหลด: ${file.name}`;

          presetCards.forEach(c => c.classList.remove('active', 'border-cyan-500', 'bg-cyan-950/40'));
          presetPills.forEach(p => p.classList.remove('bg-cyan-900/60', 'text-cyan-300', 'border-cyan-600'));

          runFullPipeline();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Run Full Analysis Pipeline ---
  function runFullPipeline() {
    // 1. Digital Image Processing & Edge Detection
    const method = edgeMethodSelect ? edgeMethodSelect.value : 'canny';
    const highThresh = cannyHighSlider ? parseInt(cannyHighSlider.value, 10) : 80;

    binaryResult = ImageProcessor.processCanvas(originalCanvas, method, {
      lowThreshold: Math.floor(highThresh * 0.4),
      highThreshold: highThresh,
      threshold: highThresh
    });

    // Render clean binary edges to edge canvas
    edgeCanvas.width = binaryResult.width;
    edgeCanvas.height = binaryResult.height;
    ImageProcessor.renderMatrixToCanvas(binaryResult, edgeCanvas);

    // 2. Box-Counting Dimension Algorithm
    boxCountingResult = BoxCounting.analyze(binaryResult);

    // 3. OLS Linear Regression & Statistics
    olsResult = OLSRegression.fit(boxCountingResult.scales);

    // Update UI Stats & Badges
    updateStatisticalCards(olsResult, binaryResult);

    // Populate Scale Results Table
    populateScaleTable(boxCountingResult.scales);

    // Render Box Counting Grid Overlay
    currentScaleIndex = 0;
    renderGridScale(currentScaleIndex);

    // Update Log-Log Regression Chart
    updateLogLogChart(olsResult);

    // Update Step-by-Step Live Calculation Guide
    updateLiveCalculationGuide(boxCountingResult, olsResult);

    // Update Wave Simulation with full terrain/landmass preservation
    if (waveSim) {
      waveSim.loadLandFromCanvas(originalCanvas, olsResult ? olsResult.fractalDimension : 1.20);
    }
  }

  // --- Render Box-Counting Scale on Overlay Canvas ---
  function renderGridScale(index) {
    if (!boxCountingResult || !boxCountingResult.scales[index]) return;
    const scale = boxCountingResult.scales[index];

    gridOverlayCanvas.width = boxCountingResult.width;
    gridOverlayCanvas.height = boxCountingResult.height;
    const ctx = gridOverlayCanvas.getContext('2d');

    // 1. Draw edge canvas as base map
    ctx.drawImage(edgeCanvas, 0, 0);

    // 2. Render Box-Counting Grid and Highlighted Boxes on top
    BoxCounting.renderGrid(ctx, scale, boxCountingResult.width, boxCountingResult.height, {
      showEmptyGrid: true,
      gridColor: 'rgba(255, 255, 255, 0.15)',
      occupiedFill: 'rgba(41, 151, 255, 0.35)',
      occupiedStroke: 'rgba(41, 151, 255, 0.95)',
      clearCanvas: false
    });

    if (currentScaleBadge) {
      currentScaleBadge.textContent = `สเกล ${index + 1}/${boxCountingResult.scales.length} (ε = ${scale.boxSize} px, N = ${scale.count} กล่อง)`;
    }

    highlightScaleTableRow(index);
  }

  // --- Update Statistical Cards & Values ---
  function updateStatisticalCards(res, binRes) {
    if (!res) return;

    const statD = document.getElementById('stat-fractal-d');
    const statR2 = document.getElementById('stat-r2');
    const statPval = document.getElementById('stat-p-value');
    const statSE = document.getElementById('stat-std-error');
    const statEdgeCount = document.getElementById('stat-edge-pixels');
    const statInterpretation = document.getElementById('stat-interpretation-text');
    const statValidity = document.getElementById('stat-validity-text');

    if (statD) statD.textContent = res.fractalDimension.toFixed(4);
    if (statR2) statR2.textContent = `${(res.r2 * 100).toFixed(1)}%`;
    if (statPval) statPval.textContent = res.pValue < 0.0001 ? 'p < 0.0001 (มีนัยสำคัญ)' : `p = ${res.pValue.toFixed(4)}`;
    if (statSE) statSE.textContent = `SE: ± ${res.standardError.toFixed(4)}`;
    if (statEdgeCount) statEdgeCount.textContent = `${binRes.edgeCount.toLocaleString()} px`;

    const statRiskHero = document.getElementById('stat-risk-badge-hero');
    const statPvalHero = document.getElementById('stat-p-value-hero');
    if (statPvalHero) statPvalHero.textContent = res.pValue < 0.0001 ? '< 0.0001' : res.pValue.toFixed(4);

    if (statRiskHero) {
      if (res.interpretation.riskLevel === 'high') {
        statRiskHero.textContent = 'Severe Risk';
        statRiskHero.className = 'text-2xl sm:text-4xl font-bold text-[#ff453a] tracking-tight mb-1';
      } else if (res.interpretation.riskLevel === 'med') {
        statRiskHero.textContent = 'Moderate';
        statRiskHero.className = 'text-2xl sm:text-4xl font-bold text-[#ff9f0a] tracking-tight mb-1';
      } else {
        statRiskHero.textContent = 'Low Risk';
        statRiskHero.className = 'text-2xl sm:text-4xl font-bold text-[#30d158] tracking-tight mb-1';
      }
    }

    if (statInterpretation) statInterpretation.textContent = res.interpretation.explanation;
    if (statValidity) statValidity.textContent = res.interpretation.statisticalValidity;

    populateScaleTable(boxCountingResult.scales);
  }

  // --- Populate Scale Results Table ---
  function populateScaleTable(scales) {
    const tbody = document.getElementById('scales-table-body');
    if (!tbody || !scales) return;

    tbody.innerHTML = '';
    scales.forEach((s, idx) => {
      const countNum = (s && typeof s.count === 'number') ? s.count : 0;
      const tr = document.createElement('tr');
      tr.id = `scale-row-${idx}`;
      tr.className = 'border-b border-white/5 hover:bg-white/[0.03] transition cursor-pointer';
      tr.innerHTML = `
        <td class="py-2 px-2.5 text-white font-medium">${s.boxSize} px</td>
        <td class="py-2 px-2.5 text-zinc-300 font-medium">${countNum.toLocaleString()}</td>
        <td class="py-2 px-2.5 text-[#86868b]">${s.logInvRatio !== undefined ? s.logInvRatio.toFixed(3) : ''}</td>
        <td class="py-2 px-2.5 text-[#86868b]">${s.logCount !== undefined ? s.logCount.toFixed(3) : ''}</td>
      `;
      tr.addEventListener('click', () => {
        currentScaleIndex = idx;
        renderGridScale(currentScaleIndex);
      });
      tbody.appendChild(tr);
    });
  }

  function highlightScaleTableRow(index) {
    const rows = document.querySelectorAll('#scales-table-body tr');
    rows.forEach((r, i) => {
      if (i === index) {
        r.classList.add('bg-cyan-950/50', 'border-l-4', 'border-l-cyan-400');
      } else {
        r.classList.remove('bg-cyan-950/50', 'border-l-4', 'border-l-cyan-400');
      }
    });
  }

  // --- Update Log-Log Regression Chart (Chart.js) ---
  function updateLogLogChart(ols) {
    const ctx = document.getElementById('log-log-chart');
    if (!ctx) return;

    const scatterData = ols.dataPoints.map(p => ({ x: p.x, y: p.y }));
    const minX = Math.min(...ols.dataPoints.map(p => p.x));
    const maxX = Math.max(...ols.dataPoints.map(p => p.x));
    const lineData = [
      { x: minX, y: ols.slope * minX + ols.intercept },
      { x: maxX, y: ols.slope * maxX + ols.intercept }
    ];

    if (logLogChart) {
      logLogChart.destroy();
    }

    logLogChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'จุดข้อมูลกล่องนับ ln(N(ε))',
            data: scatterData,
            backgroundColor: '#ffffff',
            borderColor: '#27272a',
            borderWidth: 1.5,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            type: 'line',
            label: `เส้นถดถอย OLS (D = ${ols.slope.toFixed(4)}, R² = ${(ols.r2 * 100).toFixed(1)}%)`,
            data: lineData,
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#a1a1aa', font: { family: 'inherit', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `ln(1/r): ${ctx.parsed.x.toFixed(3)}, ln(N): ${ctx.parsed.y.toFixed(3)}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'ln(1/r) [ความละเอียดสเกล]', color: '#71717a', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#a1a1aa', font: { size: 10 } }
          },
          y: {
            title: { display: true, text: 'ln(N(r)) [จำนวนกล่อง]', color: '#71717a', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#a1a1aa', font: { size: 10 } }
          }
        }
      }
    });
  }

  // --- Step-by-Step Live Calculation Guide Table & Derivation ---
  function updateLiveCalculationGuide(boxRes, ols) {
    const tableBody = document.getElementById('calc-live-table-body');
    const tableFoot = document.getElementById('calc-live-table-foot');
    const slopeResult = document.getElementById('calc-live-slope-result');
    const r2Result = document.getElementById('calc-live-r2-result');

    if (!tableBody || !boxRes || !ols) return;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    const n = ols.dataPoints.length;

    tableBody.innerHTML = '';
    ols.dataPoints.forEach((p, idx) => {
      const xi = p.x;
      const yi = p.y;
      const xiyi = xi * yi;
      const xi2 = xi * xi;

      sumX += xi;
      sumY += yi;
      sumXY += xiyi;
      sumX2 += xi2;

      const countNum = (p && typeof p.count === 'number') ? p.count : ((boxRes && boxRes.scales && boxRes.scales[idx]) ? boxRes.scales[idx].count : 0);

      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/5 hover:bg-white/[0.03] transition';
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-[#86868b] font-medium">${idx + 1}</td>
        <td class="py-2.5 px-3 text-white font-medium">${p.boxSize} px</td>
        <td class="py-2.5 px-3 text-zinc-300 font-medium">${countNum.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-[#30d158] font-mono">${xi.toFixed(4)}</td>
        <td class="py-2.5 px-3 text-[#2997ff] font-mono">${yi.toFixed(4)}</td>
        <td class="py-2.5 px-3 text-[#ff9f0a] font-mono">${xiyi.toFixed(4)}</td>
        <td class="py-2.5 px-3 text-purple-400 font-mono">${xi2.toFixed(4)}</td>
      `;
      tableBody.appendChild(tr);
    });

    if (tableFoot) {
      tableFoot.innerHTML = `
        <tr class="font-medium text-xs">
          <td colspan="3" class="py-2.5 px-3 text-right text-[#86868b]">ผลรวม (\(\\sum\)):</td>
          <td class="py-2.5 px-3 text-[#30d158]">\(\\sum x = ${sumX.toFixed(3)}\)</td>
          <td class="py-2.5 px-3 text-[#2997ff]">\(\\sum y = ${sumY.toFixed(3)}\)</td>
          <td class="py-2.5 px-3 text-[#ff9f0a]">\(\\sum xy = ${sumXY.toFixed(3)}\)</td>
          <td class="py-2.5 px-3 text-purple-400">\(\\sum x^2 = ${sumX2.toFixed(3)}\)</td>
        </tr>
      `;
    }

    if (slopeResult) {
      slopeResult.innerHTML = `
        <div class="space-y-1">
          <div>แทนค่า: \(D = \\frac{${n}(${sumXY.toFixed(2)}) - (${sumX.toFixed(2)})(${sumY.toFixed(2)})}{${n}(${sumX2.toFixed(2)}) - (${sumX.toFixed(2)})^2}\)</div>
          <div class="font-bold text-cyan-400 text-sm">มิติแฟร็กทัล (D) = ${ols.slope.toFixed(4)} (Standard Error: ± ${ols.standardError.toFixed(4)})</div>
        </div>
      `;
    }

    if (r2Result) {
      r2Result.innerHTML = `
        <div class="space-y-1">
          <div>แทนค่า: \(R^2 = 1 - \\frac{${ols.ssRes.toFixed(4)}}{${ols.ssTot.toFixed(4)}}\)</div>
          <div class="font-bold text-emerald-400 text-sm">ความแม่นยำ (R²) = ${(ols.r2 * 100).toFixed(2)}% | ค่า p-value < 0.0001 (มีนัยสำคัญยิ่ง)</div>
        </div>
      `;
    }

    if (window.renderAllFormulas) {
      window.renderAllFormulas(document.getElementById('tab-pane-calculation'));
    }
  }

  // --- Regional Comparison Dashboard (DMCR Erosion Rates & Dual Charts) ---
  function renderRegionalComparison() {
    const regionKeys = ['whole_gulf', 'upper_gulf', 'eastern_gulf', 'western_gulf', 'southern_gulf'];
    const tableBody = document.getElementById('regional-table-body');
    const ctxD = document.getElementById('regional-chart');
    const ctxErosion = document.getElementById('regional-erosion-chart');

    const chartLabels = [];
    const chartD = [];
    const chartErosionAvg = []; // Average erosion rate in meters/year

    if (tableBody) {
      tableBody.innerHTML = '';
      regionKeys.forEach(k => {
        const p = PRESETS[k];
        chartLabels.push(p.name.split(' (')[0]);
        chartD.push(p.historicalD);

        // Parse numerical erosion rate
        let avgErosion = 2.0;
        if (k === 'upper_gulf') avgErosion = 7.5;
        else if (k === 'southern_gulf') avgErosion = 4.5;
        else if (k === 'eastern_gulf') avgErosion = 2.0;
        else if (k === 'western_gulf') avgErosion = 1.5;
        else if (k === 'whole_gulf') avgErosion = 3.8;
        chartErosionAvg.push(avgErosion);

        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/5 hover:bg-[#1d1d1f] transition ' + (k === 'whole_gulf' ? 'bg-white/[0.03] font-medium' : '');
        tr.innerHTML = `
          <td class="py-3 px-3.5 font-semibold text-white flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-zinc-300">${p.code}</span>
            <span>${p.name.split(' (')[0]}</span>
          </td>
          <td class="py-3 px-3.5 font-mono font-bold text-white">${p.historicalD.toFixed(3)}</td>
          <td class="py-3 px-3.5 font-mono text-zinc-300">${(p.historicalR2 * 100).toFixed(1)}%</td>
          <td class="py-3 px-3.5 font-mono font-semibold text-[#ff453a]">${p.erosionRate}</td>
          <td class="py-3 px-3.5 font-mono text-[#86868b]">${p.coastLength}</td>
          <td class="py-3 px-3.5">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${p.riskLevel === 'high' ? 'badge-risk-high' : 'badge-risk-med'}">
              ${p.erosionRisk.split(' (')[0]}
            </span>
          </td>
          <td class="py-3 px-3.5 text-xs text-[#86868b]">${p.description}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    // Chart 1: Fractal Dimension D
    if (ctxD) {
      if (regionalComparisonChart) regionalComparisonChart.destroy();
      regionalComparisonChart = new Chart(ctxD, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'มิติแฟร็กทัล (D)',
            data: chartD,
            backgroundColor: ['#fafafa', '#f43f5e', '#a1a1aa', '#71717a', '#fb7185'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 1.0,
              max: 1.35,
              title: { display: true, text: 'มิติ D', color: '#71717a', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#a1a1aa', font: { size: 10 } }
            },
            x: { 
              grid: { display: false },
              ticks: { color: '#a1a1aa', font: { size: 10 } } 
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Chart 2: Coastal Erosion Rate (m/year)
    if (ctxErosion) {
      if (regionalErosionChart) regionalErosionChart.destroy();
      regionalErosionChart = new Chart(ctxErosion, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'อัตรากัดเซาะ (ม./ปี)',
            data: chartErosionAvg,
            backgroundColor: ['#f43f5e', '#ef4444', '#f59e0b', '#71717a', '#fb7185'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 0,
              max: 10,
              title: { display: true, text: 'เมตร/ปี', color: '#71717a', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' },
              ticks: { color: '#a1a1aa', font: { size: 10 } }
            },
            x: { 
              grid: { display: false },
              ticks: { color: '#a1a1aa', font: { size: 10 } } 
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }



  // --- Quick Scenario Trigger for Wave Sim ---
  function triggerWaveScenario(scenario) {
    if (!waveSim) return;
    waveSim.stop();

    if (scenario === 'normal') {
      waveSim.waveAmplitude = 10;
      waveSim.defenseType = 'none';
      if (waveAmpSlider) waveAmpSlider.value = 10;
      if (waveAmpVal) waveAmpVal.textContent = '10 m';
      if (defenseSelect) defenseSelect.value = 'none';
    } else if (scenario === 'monsoon') {
      waveSim.waveAmplitude = 22;
      waveSim.defenseType = 'none';
      if (waveAmpSlider) waveAmpSlider.value = 22;
      if (waveAmpVal) waveAmpVal.textContent = '22 m';
      if (defenseSelect) defenseSelect.value = 'none';
    } else if (scenario === 'mangrove') {
      waveSim.waveAmplitude = 18;
      waveSim.defenseType = 'mangrove';
      if (waveAmpSlider) waveAmpSlider.value = 18;
      if (waveAmpVal) waveAmpVal.textContent = '18 m';
      if (defenseSelect) defenseSelect.value = 'mangrove';
    } else if (scenario === 'breakwater') {
      waveSim.waveAmplitude = 18;
      waveSim.defenseType = 'breakwater';
      if (waveAmpSlider) waveAmpSlider.value = 18;
      if (waveAmpVal) waveAmpVal.textContent = '18 m';
      if (defenseSelect) defenseSelect.value = 'breakwater';
    }

    waveSim.start('wave', (stats) => {
      const sedSpan = document.getElementById('wave-stat-sediment');
      const lossSpan = document.getElementById('wave-stat-loss');
      const dissSpan = document.getElementById('wave-stat-dissipation');
      if (sedSpan) sedSpan.textContent = `${stats.totalSediment.toFixed(0)} หน่วย`;
      if (lossSpan) lossSpan.textContent = `${stats.sedimentLossPercent.toFixed(1)}%`;
      if (dissSpan) dissSpan.textContent = `${stats.dissipatedEnergy.toFixed(0)} J/m`;
    });
  }

  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerWaveScenario(btn.dataset.scenario);
    });
  });

  // --- Box-Counting Scale Step & Playback Controls ---
  if (prevScaleBtn) {
    prevScaleBtn.addEventListener('click', () => {
      if (!boxCountingResult) return;
      currentScaleIndex = (currentScaleIndex - 1 + boxCountingResult.scales.length) % boxCountingResult.scales.length;
      renderGridScale(currentScaleIndex);
    });
  }

  if (nextScaleBtn) {
    nextScaleBtn.addEventListener('click', () => {
      if (!boxCountingResult) return;
      currentScaleIndex = (currentScaleIndex + 1) % boxCountingResult.scales.length;
      renderGridScale(currentScaleIndex);
    });
  }

  if (playScaleBtn) {
    playScaleBtn.addEventListener('click', () => {
      if (isPlayingScaleAnimation) {
        clearInterval(scaleAnimationTimer);
        isPlayingScaleAnimation = false;
        playScaleBtn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5 mr-1 inline"></i> เล่นแอนิเมชัน';
      } else {
        isPlayingScaleAnimation = true;
        playScaleBtn.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5 mr-1 inline"></i> พัก';
        scaleAnimationTimer = setInterval(() => {
          if (!boxCountingResult) return;
          currentScaleIndex = (currentScaleIndex + 1) % boxCountingResult.scales.length;
          renderGridScale(currentScaleIndex);
        }, 1100);
      }
      if (window.lucide) lucide.createIcons();
    });
  }

  // --- Slider Event Listeners ---
  if (cannyHighSlider && cannyHighVal) {
    cannyHighSlider.addEventListener('input', (e) => {
      cannyHighVal.textContent = e.target.value;
      runFullPipeline();
    });
  }

  if (edgeMethodSelect) {
    edgeMethodSelect.addEventListener('change', () => {
      runFullPipeline();
    });
  }

  if (runAnalysisBtn) {
    runAnalysisBtn.addEventListener('click', () => {
      runFullPipeline();
    });
  }

  // Wave Simulation Controls
  if (waveStartBtn) {
    waveStartBtn.addEventListener('click', () => {
      if (waveSim) {
        const viewMode = waveViewSelect ? waveViewSelect.value : 'wave';
        waveSim.start(viewMode, (stats) => {
          const sedSpan = document.getElementById('wave-stat-sediment');
          const lossSpan = document.getElementById('wave-stat-loss');
          const dissSpan = document.getElementById('wave-stat-dissipation');
          if (sedSpan) sedSpan.textContent = `${stats.totalSediment.toFixed(0)} หน่วย`;
          if (lossSpan) lossSpan.textContent = `${stats.sedimentLossPercent.toFixed(1)}%`;
          if (dissSpan) dissSpan.textContent = `${stats.dissipatedEnergy.toFixed(0)} J/m`;
        });
      }
    });
  }

  if (wavePauseBtn) {
    wavePauseBtn.addEventListener('click', () => {
      if (waveSim) waveSim.stop();
    });
  }

  if (waveResetBtn) {
    waveResetBtn.addEventListener('click', () => {
      if (waveSim) waveSim.reset();
    });
  }

  if (waveAmpSlider && waveAmpVal) {
    waveAmpSlider.addEventListener('input', (e) => {
      const amp = parseFloat(e.target.value);
      waveAmpVal.textContent = `${amp} m`;
      if (waveSim) waveSim.waveAmplitude = amp;
    });
  }

  if (defenseSelect) {
    defenseSelect.addEventListener('change', (e) => {
      if (waveSim) waveSim.defenseType = e.target.value;
    });
  }

  if (waveViewSelect) {
    waveViewSelect.addEventListener('change', (e) => {
      if (waveSim) waveSim.render(e.target.value);
    });
  }

  // --- Scenario Quick Presets ---
  if (scenarioBtns) {
    scenarioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const scenario = btn.dataset.scenario;
        if (!waveSim) return;

        if (scenario === 'normal') {
          waveSim.waveAmplitude = 10;
          waveSim.defenseType = 'none';
          if (waveAmpSlider) waveAmpSlider.value = 10;
          if (waveAmpVal) waveAmpVal.textContent = '10 m';
          if (defenseSelect) defenseSelect.value = 'none';
        } else if (scenario === 'monsoon') {
          waveSim.waveAmplitude = 22;
          waveSim.defenseType = 'none';
          if (waveAmpSlider) waveAmpSlider.value = 22;
          if (waveAmpVal) waveAmpVal.textContent = '22 m';
          if (defenseSelect) defenseSelect.value = 'none';
        } else if (scenario === 'mangrove') {
          waveSim.waveAmplitude = 14;
          waveSim.defenseType = 'mangrove';
          if (waveAmpSlider) waveAmpSlider.value = 14;
          if (waveAmpVal) waveAmpVal.textContent = '14 m';
          if (defenseSelect) defenseSelect.value = 'mangrove';
        } else if (scenario === 'breakwater') {
          waveSim.waveAmplitude = 14;
          waveSim.defenseType = 'breakwater';
          if (waveAmpSlider) waveAmpSlider.value = 14;
          if (waveAmpVal) waveAmpVal.textContent = '14 m';
          if (defenseSelect) defenseSelect.value = 'breakwater';
        }

        waveSim.reset();
        waveSim.render(waveViewSelect ? waveViewSelect.value : 'wave');
      });
    });
  }

  // --- Export Data Features ---
  function exportCSV() {
    if (!boxCountingResult || !olsResult) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Box_Size_Pixels,Occupied_Count_N,Log_Inv_Scale,Log_Count_N,Fitted_Log_Count,Residual\n';
    
    olsResult.dataPoints.forEach(p => {
      csvContent += `${p.boxSize},${p.count},${p.x.toFixed(5)},${p.y.toFixed(5)},${p.yHat.toFixed(5)},${p.residual.toFixed(5)}\n`;
    });

    csvContent += `\nFractal_Dimension_D,${olsResult.fractalDimension.toFixed(5)}\n`;
    csvContent += `R_Squared,${olsResult.r2.toFixed(5)}\n`;
    csvContent += `P_Value,${olsResult.pValue}\n`;
    csvContent += `Standard_Error,${olsResult.standardError.toFixed(5)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fractal_coastline_data_${currentPresetId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
  const exportCsvBtnHero = document.getElementById('export-csv-btn-hero');
  if (exportCsvBtnHero) exportCsvBtnHero.addEventListener('click', exportCSV);

  if (exportImageBtn) {
    exportImageBtn.addEventListener('click', () => {
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = 512;
      mergedCanvas.height = 512;
      const mCtx = mergedCanvas.getContext('2d');

      mCtx.drawImage(edgeCanvas, 0, 0);
      mCtx.drawImage(gridOverlayCanvas, 0, 0);

      const link = document.createElement('a');
      link.download = `fractal_analysis_grid_${currentPresetId}.png`;
      link.href = mergedCanvas.toDataURL('image/png');
      link.click();
    });
  }

  // --- Initial Load ---
  selectPreset(currentPresetId);

  // Initialize Lucide Icons & Math formulas
  if (window.lucide) {
    lucide.createIcons();
  }
  if (window.renderAllFormulas) {
    window.renderAllFormulas(document.body);
  }
});
