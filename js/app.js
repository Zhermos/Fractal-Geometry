/**
 * Main Application Controller for Fractal Coastline & Coastal Erosion Simulation
 * Connects UI, Simple/Advanced Modes, Quick Preset Cards, Auto Tour Demo, and Simulation Engines.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Canvas Elements ---
  const originalCanvas = document.getElementById('original-canvas');
  const edgeCanvas = document.getElementById('edge-canvas');
  const gridOverlayCanvas = document.getElementById('grid-overlay-canvas');
  const paradoxCanvas = document.getElementById('paradox-canvas');
  const waveCanvas = document.getElementById('wave-canvas');

  // --- UI Elements & Buttons ---
  const presetCards = document.querySelectorAll('.preset-card');
  const presetPills = document.querySelectorAll('.preset-pill');
  const edgeMethodSelect = document.getElementById('edge-method');
  const cannyHighSlider = document.getElementById('canny-high-slider');
  const cannyHighVal = document.getElementById('canny-high-val');
  const imageUploadInput = document.getElementById('image-upload');
  const runAnalysisBtn = document.getElementById('run-analysis-btn');
  const prevScaleBtn = document.getElementById('prev-scale-btn');
  const nextScaleBtn = document.getElementById('next-scale-btn');
  const playScaleBtn = document.getElementById('play-scale-btn');
  const currentScaleBadge = document.getElementById('current-scale-badge');

  // Mode Switch Elements
  const modeSimpleBtn = document.getElementById('mode-simple-btn');
  const modeAdvancedBtn = document.getElementById('mode-advanced-btn');
  const autoTourBtn = document.getElementById('auto-tour-btn');

  // Canvas View Toggle
  const viewAllCanvasesBtn = document.getElementById('view-all-canvases-btn');
  const viewFocusCanvasBtn = document.getElementById('view-focus-canvas-btn');
  const canvasesGrid = document.getElementById('canvases-grid');

  // Paradox Controls
  const rulerSlider = document.getElementById('ruler-slider');
  const rulerSliderVal = document.getElementById('ruler-slider-val');

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
  let binaryResult = null;
  let boxCountingResult = null;
  let olsResult = null;
  let currentScaleIndex = 0;
  let isPlayingScaleAnimation = false;
  let scaleAnimationTimer = null;
  let isAutoTourRunning = false;

  // Chart instances
  let logLogChart = null;
  let richardsonChart = null;
  let regionalComparisonChart = null;

  // Simulation instances
  let paradoxSim = null;
  let waveSim = null;

  // Initialize Simulations
  if (paradoxCanvas) {
    paradoxSim = new CoastlineParadoxSimulator(paradoxCanvas);
  }
  if (waveCanvas) {
    waveSim = new WaveErosionSimulation(waveCanvas);
  }

  // Set default body to simple mode
  document.body.classList.add('simple-mode');

  // --- Mode Toggle Logic ---
  if (modeSimpleBtn && modeAdvancedBtn) {
    modeSimpleBtn.addEventListener('click', () => {
      document.body.classList.add('simple-mode');
      modeSimpleBtn.classList.add('bg-cyan-600', 'text-white');
      modeSimpleBtn.classList.remove('text-slate-400');
      modeAdvancedBtn.classList.remove('bg-cyan-600', 'text-white');
      modeAdvancedBtn.classList.add('text-slate-400');
    });

    modeAdvancedBtn.addEventListener('click', () => {
      document.body.classList.remove('simple-mode');
      modeAdvancedBtn.classList.add('bg-cyan-600', 'text-white');
      modeAdvancedBtn.classList.remove('text-slate-400');
      modeSimpleBtn.classList.remove('bg-cyan-600', 'text-white');
      modeSimpleBtn.classList.add('text-slate-400');
    });
  }

  // --- Canvas View Mode Toggle ---
  if (viewAllCanvasesBtn && viewFocusCanvasBtn && canvasesGrid) {
    viewAllCanvasesBtn.addEventListener('click', () => {
      canvasesGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-5';
      viewAllCanvasesBtn.classList.add('bg-slate-800', 'text-cyan-400', 'font-bold');
      viewAllCanvasesBtn.classList.remove('text-slate-400');
      viewFocusCanvasBtn.classList.remove('bg-slate-800', 'text-cyan-400', 'font-bold');
      viewFocusCanvasBtn.classList.add('text-slate-400');
    });

    viewFocusCanvasBtn.addEventListener('click', () => {
      canvasesGrid.className = 'grid grid-cols-1 md:grid-cols-1 gap-5 max-w-2xl mx-auto';
      viewFocusCanvasBtn.classList.add('bg-slate-800', 'text-cyan-400', 'font-bold');
      viewFocusCanvasBtn.classList.remove('text-slate-400');
      viewAllCanvasesBtn.classList.remove('bg-slate-800', 'text-cyan-400', 'font-bold');
      viewAllCanvasesBtn.classList.add('text-slate-400');
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
    if (targetTab === 'paradox' && paradoxSim) {
      paradoxSim.render(parseInt(rulerSlider ? rulerSlider.value : 40, 10));
      updateRichardsonChart();
    } else if (targetTab === 'wave' && waveSim) {
      waveSim.render(waveViewSelect ? waveViewSelect.value : 'wave');
    } else if (targetTab === 'regional') {
      renderRegionalComparison();
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
    
    // Highlight active card
    presetCards.forEach(card => {
      if (card.dataset.preset === presetId) {
        card.classList.add('active', 'border-cyan-500');
        card.classList.remove('border-slate-800');
      } else {
        card.classList.remove('active', 'border-cyan-500');
        card.classList.add('border-slate-800');
      }
    });

    // Highlight active pill
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

  // --- Preset Loading & Canvas Artwork Generation ---
  function loadSelectedPreset(presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return;

    // Update Summary Header
    const summaryTitle = document.getElementById('summary-area-title');
    if (summaryTitle) summaryTitle.textContent = preset.name;

    // Set canvas dimensions
    originalCanvas.width = 512;
    originalCanvas.height = 512;
    const ctx = originalCanvas.getContext('2d');

    // Generate preset artwork
    preset.generate(ctx, 512, 512);

    // Auto trigger analysis pipeline
    runFullPipeline();
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

          // Deselect cards
          presetCards.forEach(c => c.classList.remove('active', 'border-cyan-500'));
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

    // Render binary edges to edge canvas
    edgeCanvas.width = binaryResult.width;
    edgeCanvas.height = binaryResult.height;
    ImageProcessor.renderMatrixToCanvas(binaryResult, edgeCanvas);

    // 2. Box-Counting Dimension Algorithm
    boxCountingResult = BoxCounting.analyze(binaryResult);

    // 3. OLS Linear Regression & Statistics
    olsResult = OLSRegression.fit(boxCountingResult.scales);

    // Update UI Stats & Badges
    updateStatisticalCards(olsResult, binaryResult);

    // Render Box Counting Grid Overlay
    currentScaleIndex = 0;
    renderGridScale(currentScaleIndex);

    // Update Log-Log Regression Chart
    updateLogLogChart(olsResult);

    // Update Coastline Paradox Points
    if (paradoxSim && binaryResult.edgePixels) {
      const orderedPts = sortEdgePixels(binaryResult.edgePixels);
      paradoxSim.setCoastlinePoints(orderedPts);
      paradoxSim.render(parseInt(rulerSlider ? rulerSlider.value : 40, 10));
      updateRichardsonChart();
    }

    // Update Wave Simulation Land Mask
    if (waveSim) {
      waveSim.loadLandMaskFromMatrix(
        binaryResult.matrix, 
        binaryResult.width, 
        binaryResult.height, 
        olsResult ? olsResult.fractalDimension : 1.20
      );
    }
  }

  // Helper: Sort edge points sequentially
  function sortEdgePixels(pixels) {
    if (!pixels || pixels.length === 0) return [];
    if (pixels.length <= 2) return pixels;

    const remaining = [...pixels];
    const sorted = [remaining.shift()];

    while (remaining.length > 0 && sorted.length < 1200) {
      const last = sorted[sorted.length - 1];
      let nearestIdx = 0;
      let minDist = Infinity;

      const searchLimit = Math.min(remaining.length, 80);
      for (let i = 0; i < searchLimit; i++) {
        const dx = remaining[i].x - last.x;
        const dy = remaining[i].y - last.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist) {
          minDist = distSq;
          nearestIdx = i;
        }
      }

      if (minDist > 1600) {
        sorted.push(remaining.shift());
      } else {
        sorted.push(remaining.splice(nearestIdx, 1)[0]);
      }
    }

    return sorted;
  }

  // --- Render Box-Counting Scale on Overlay Canvas ---
  function renderGridScale(index) {
    if (!boxCountingResult || !boxCountingResult.scales[index]) return;
    const scale = boxCountingResult.scales[index];

    gridOverlayCanvas.width = boxCountingResult.width;
    gridOverlayCanvas.height = boxCountingResult.height;
    const ctx = gridOverlayCanvas.getContext('2d');

    BoxCounting.renderGrid(ctx, scale, boxCountingResult.width, boxCountingResult.height, {
      showEmptyGrid: true,
      gridColor: 'rgba(56, 189, 248, 0.2)',
      occupiedFill: 'rgba(6, 182, 212, 0.35)',
      occupiedStroke: 'rgba(34, 211, 238, 0.95)'
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
    const statRiskBadge = document.getElementById('stat-risk-badge');
    const statInterpretation = document.getElementById('stat-interpretation-text');
    const statValidity = document.getElementById('stat-validity-text');

    if (statD) statD.textContent = res.fractalDimension.toFixed(4);
    if (statR2) statR2.textContent = `${(res.r2 * 100).toFixed(1)}%`;
    if (statPval) statPval.textContent = res.pValue < 0.0001 ? 'p < 0.0001 (มีนัยสำคัญ)' : `p = ${res.pValue.toFixed(4)}`;
    if (statSE) statSE.textContent = `SE: ± ${res.standardError.toFixed(4)}`;
    if (statEdgeCount) statEdgeCount.textContent = `${binRes.edgeCount.toLocaleString()} px`;

    if (statRiskBadge) {
      if (res.interpretation.riskLevel === 'high') {
        statRiskBadge.innerHTML = 'วิกฤตสูง 🔴';
        statRiskBadge.className = 'text-sm font-black text-rose-400 block mt-1';
      } else if (res.interpretation.riskLevel === 'med') {
        statRiskBadge.innerHTML = 'ปานกลาง 🟡';
        statRiskBadge.className = 'text-sm font-black text-amber-400 block mt-1';
      } else {
        statRiskBadge.innerHTML = 'ต่ำ 🟢';
        statRiskBadge.className = 'text-sm font-black text-emerald-400 block mt-1';
      }
    }

    if (statInterpretation) statInterpretation.textContent = res.interpretation.explanation;
    if (statValidity) statValidity.textContent = res.interpretation.statisticalValidity;

    populateScaleTable(boxCountingResult.scales);
  }

  // --- Populate Scale Results Table ---
  function populateScaleTable(scales) {
    const tbody = document.getElementById('scales-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    scales.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.id = `scale-row-${idx}`;
      tr.className = 'border-b border-slate-800/60 hover:bg-slate-800/50 transition cursor-pointer';
      tr.innerHTML = `
        <td class="py-2 px-2.5 text-cyan-400 font-bold">${s.boxSize} px</td>
        <td class="py-2 px-2.5 text-slate-300 font-bold">${s.count.toLocaleString()}</td>
        <td class="py-2 px-2.5 text-slate-400">${s.logInvRatio.toFixed(3)}</td>
        <td class="py-2 px-2.5 text-slate-400">${s.logCount.toFixed(3)}</td>
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
            backgroundColor: '#06b6d4',
            borderColor: '#22d3ee',
            pointRadius: 6,
            pointHoverRadius: 8
          },
          {
            type: 'line',
            label: `เส้นถดถอย OLS (D = ${ols.slope.toFixed(4)}, R² = ${(ols.r2 * 100).toFixed(1)}%)`,
            data: lineData,
            borderColor: '#f59e0b',
            borderWidth: 2.5,
            borderDash: [4, 4],
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
            labels: { color: '#cbd5e1', font: { family: 'system-ui', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `ln(1/r): ${ctx.parsed.x.toFixed(3)}, ln(N): ${ctx.parsed.y.toFixed(3)}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'ln(1/r) [ความละเอียดสเกล]', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#cbd5e1' }
          },
          y: {
            title: { display: true, text: 'ln(N(r)) [จำนวนกล่องครอบทับ]', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#cbd5e1' }
          }
        }
      }
    });
  }

  // --- Update Richardson Plot Chart (Coastline Paradox) ---
  function updateRichardsonChart() {
    const ctx = document.getElementById('richardson-chart');
    if (!ctx || !paradoxSim) return;

    const data = paradoxSim.measurementHistory.map(h => ({
      x: h.rulerSize,
      y: h.totalLength
    }));

    if (richardsonChart) {
      richardsonChart.destroy();
    }

    richardsonChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'ความยาวชายฝั่งรวมที่วัดได้ L(ε) (Pixels)',
          data: data,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#ef4444'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            reverse: true,
            title: { display: true, text: 'ขนาดไม้วัด ε (Pixels) [เล็กลงเรื่อยๆ →]', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#cbd5e1' }
          },
          y: {
            title: { display: true, text: 'ความยาวรวมที่วัดได้ L(ε)', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#cbd5e1' }
          }
        },
        plugins: {
          legend: { labels: { color: '#cbd5e1' } }
        }
      }
    });
  }

  // --- Regional Comparison Dashboard ---
  function renderRegionalComparison() {
    const regionKeys = ['whole_gulf', 'upper_gulf', 'eastern_gulf', 'western_gulf', 'southern_gulf'];
    const tableBody = document.getElementById('regional-table-body');
    const ctx = document.getElementById('regional-chart');

    const chartLabels = [];
    const chartD = [];

    if (tableBody) {
      tableBody.innerHTML = '';
      regionKeys.forEach(k => {
        const p = PRESETS[k];
        chartLabels.push(p.name.split(' (')[0].replace('🇹🇭 ', ''));
        chartD.push(p.historicalD);

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 ' + (k === 'whole_gulf' ? 'bg-cyan-950/30' : '');
        tr.innerHTML = `
          <td class="py-3 px-4 font-semibold ${k === 'whole_gulf' ? 'text-cyan-300 font-bold' : 'text-sky-400'}">${p.name}</td>
          <td class="py-3 px-4 font-mono font-bold text-cyan-400">${p.historicalD.toFixed(3)}</td>
          <td class="py-3 px-4 font-mono text-slate-300">${(p.historicalR2 * 100).toFixed(1)}%</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${p.riskLevel === 'high' ? 'badge-risk-high' : 'badge-risk-med'}">
              ${p.erosionRisk}
            </span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-400">${p.description}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    if (ctx) {
      if (regionalComparisonChart) regionalComparisonChart.destroy();
      regionalComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'มิติแฟร็กทัล (Fractal Dimension D)',
            data: chartD,
            backgroundColor: ['#06b6d4', '#f43f5e', '#38bdf8', '#10b981', '#f59e0b'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 1.0,
              max: 1.4,
              title: { display: true, text: 'มิติแฟร็กทัล D', color: '#94a3b8' },
              grid: { color: 'rgba(255, 255, 255, 0.06)' },
              ticks: { color: '#cbd5e1' }
            },
            x: {
              ticks: { color: '#cbd5e1' }
            }
          },
          plugins: {
            legend: { labels: { color: '#cbd5e1' } }
          }
        }
      });
    }
  }

  // --- Auto-Tour Demo (Guided Walkthrough) ---
  if (autoTourBtn) {
    autoTourBtn.addEventListener('click', () => {
      if (isAutoTourRunning) return;
      isAutoTourRunning = true;
      autoTourBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> กำลังสาธิต...';

      // 1. Switch to Pipeline Tab & select Whole Gulf
      switchTab('pipeline');
      selectPreset('whole_gulf');

      // 2. Play Box-counting animation
      let step = 0;
      const tourInterval = setInterval(() => {
        if (!boxCountingResult) return;
        step++;
        currentScaleIndex = (currentScaleIndex + 1) % boxCountingResult.scales.length;
        renderGridScale(currentScaleIndex);

        if (step >= 4) {
          clearInterval(tourInterval);

          // 3. Switch to Wave tab & trigger Monsoon scenario
          setTimeout(() => {
            switchTab('wave');
            triggerWaveScenario('monsoon');

            setTimeout(() => {
              // 4. Trigger Mangrove defense
              triggerWaveScenario('mangrove');
              isAutoTourRunning = false;
              autoTourBtn.innerHTML = '<i data-lucide="play-circle" class="w-4 h-4 mr-1"></i> เล่นตัวอย่างอัตโนมัติ';
              if (window.lucide) lucide.createIcons();
            }, 3000);

          }, 1000);
        }
      }, 900);
    });
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

  // Coastline Paradox Ruler Slider
  if (rulerSlider && rulerSliderVal) {
    rulerSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      rulerSliderVal.textContent = `${val} px`;
      if (paradoxSim) {
        paradoxSim.render(val);
      }
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

  // --- Export Data Features ---
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
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
    });
  }

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
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
  }
});
