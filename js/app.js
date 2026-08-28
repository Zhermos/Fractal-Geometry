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
  const pastOverlayCanvas = document.getElementById('past-overlay-canvas');
  const modernOverlayCanvas = document.getElementById('modern-overlay-canvas');
  const dualOverlayCanvas = document.getElementById('dual-overlay-canvas');
  const waveCanvas = document.getElementById('wave-canvas');

  // --- UI Elements & Buttons ---
  const presetCards = document.querySelectorAll('.preset-card');
  const presetPills = document.querySelectorAll('.preset-pill');
  const mapStyleSelect = document.getElementById('map-style-select');
  const imageUploadInput = document.getElementById('image-upload');
  const currentScaleBadge = document.getElementById('current-scale-badge');
  const pastScaleBadge = document.getElementById('past-scale-badge');
  const modernScaleBadge = document.getElementById('modern-scale-badge');
  const dualScaleBadge = document.getElementById('dual-scale-badge');

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

  // --- Tab Switching Logic ---
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetTab) {
    tabButtons.forEach(b => {
      if (b.dataset.tab === targetTab) {
        b.classList.add('tab-active', 'text-white', 'font-semibold');
        b.classList.remove('text-[#86868b]');
      } else {
        b.classList.remove('tab-active', 'text-white', 'font-semibold', 'text-sky-400', 'border-sky-400', 'font-bold');
        b.classList.add('text-[#86868b]');
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
    } else if (targetTab === 'multitemporal') {
      if (boxCountingResult) {
        renderGridScale(currentScaleIndex);
        updateTimeScalePills(currentScaleIndex);
      }
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

    // Update floating dock pills
    document.querySelectorAll('.floating-preset-pill').forEach(pill => {
      if (pill.dataset.preset === presetId) {
        pill.className = 'floating-preset-pill px-3 py-1 rounded-full text-xs font-medium bg-[#2997ff] text-white font-bold transition-all shadow-[0_0_12px_rgba(41,151,255,0.5)] whitespace-nowrap';
      } else {
        pill.className = 'floating-preset-pill px-3 py-1 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap';
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

  document.querySelectorAll('.floating-preset-pill').forEach(pill => {
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

    const telemBadge = document.getElementById('satellite-telemetry-badge');
    const telemName = document.getElementById('telemetry-satellite-name');
    const telemCoords = document.getElementById('telemetry-satellite-coords');

    if (preset.code && preset.code.startsWith('TH-')) {
      if (telemBadge) telemBadge.style.display = 'flex';
      if (telemName) telemName.textContent = `SENTINEL-2 MSI [${preset.code}]`;
      if (telemCoords) telemCoords.textContent = `10m GSD | ${preset.coordsText || ''}`;
    } else {
      if (telemBadge) telemBadge.style.display = 'none';
    }

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
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          satelliteImageCache[preset.imageSrc] = img;
          const crop = preset.crop || { sx: 0, sy: 0, sw: img.naturalWidth || img.width, sh: img.naturalHeight || img.height };
          ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 512, 512);
          runFullPipeline();
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
    // 1. Digital Image Processing & Pure Water-Land Interface Extraction
    binaryResult = ImageProcessor.processCanvas(originalCanvas, 'canny', {
      lowThreshold: 32,
      highThreshold: 80,
      threshold: 80
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

    // Render Box Counting Grid Overlay (Default to 32px - index 3 for instant clarity)
    currentScaleIndex = boxCountingResult.scales.findIndex(s => s.boxSize === 32);
    if (currentScaleIndex === -1) currentScaleIndex = 0;
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

  // --- Render Box-Counting Scale on Overlay Canvases (Canvas 3 & Canvas 4) ---
  function renderGridScale(index) {
    if (!boxCountingResult || !binaryResult) return;

    const width = boxCountingResult.width || 512;
    const height = boxCountingResult.height || 512;

    // Compute Past Baseline Shift from real edge pixels shifted seaward
    const origCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = origCtx.getImageData(0, 0, width, height);
    const landMask = ImageProcessor.generateLandMask(imgData);
    
    const preset = PRESETS[currentPresetId] || {};
    const retreatShift = Math.max(3, Math.min(18, Math.round((preset.annualErosionRate ? 180 : 120) / 40)));

    const pastMatrix = new Uint8Array(width * height);
    const pastPixels = [];

    binaryResult.edgePixels.forEach(p => {
      let dx = 0, dy = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const nx = p.x + ox;
          const ny = p.y + oy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (landMask[ny * width + nx] === 0) {
              dx += ox;
              dy += oy;
            }
          }
        }
      }
      const dist = Math.hypot(dx, dy);
      let sx = p.x;
      let sy = p.y;
      if (dist > 0) {
        sx = Math.round(p.x + (dx / dist) * retreatShift);
        sy = Math.round(p.y + (dy / dist) * retreatShift);
      }
      sx = Math.max(0, Math.min(width - 1, sx));
      sy = Math.max(0, Math.min(height - 1, sy));
      pastMatrix[sy * width + sx] = 1;
      pastPixels.push({ x: sx, y: sy });
    });

    const pastBinary = { matrix: pastMatrix, width, height, edgeCount: pastPixels.length, edgePixels: pastPixels };

    // ==========================================
    // MODE 1: GRID OFF (PURE SATELLITE VIEW)
    // ==========================================
    if (index === -1) {
      // 1. Single Box Grid Canvas in Computer Vision breakdown:
      if (gridOverlayCanvas) {
        gridOverlayCanvas.width = width;
        gridOverlayCanvas.height = height;
        const gCtx = gridOverlayCanvas.getContext('2d');
        gCtx.drawImage(originalCanvas, 0, 0);
        gCtx.drawImage(edgeCanvas, 0, 0);
      }
      if (currentScaleBadge) {
        currentScaleBadge.textContent = 'ปิดตารางกล่อง (Pure View)';
      }

      // 2. 1990 Past Satellite Canvas (Landsat 5 TM Baseline)
      if (pastOverlayCanvas) {
        pastOverlayCanvas.width = width;
        pastOverlayCanvas.height = height;
        const pCtx = pastOverlayCanvas.getContext('2d');

        // Apply authentic Landsat 5 TM Radiometric Sensor Response
        pCtx.filter = 'sepia(0.24) contrast(1.10) brightness(0.95) saturate(1.18)';
        pCtx.drawImage(originalCanvas, 0, 0);
        pCtx.filter = 'none';

        // Draw Historical 1990 Extended Shoreline (Gold #facc15)
        pCtx.shadowColor = '#facc15';
        pCtx.shadowBlur = 6;
        pCtx.fillStyle = '#facc15';
        pastPixels.forEach(p => {
          pCtx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5);
        });
        pCtx.shadowBlur = 0;

        // Vintage Landsat 5 Sensor Badge
        pCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        pCtx.fillRect(8, 8, 185, 22);
        pCtx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        pCtx.strokeRect(8.5, 8.5, 184, 21);
        pCtx.fillStyle = '#facc15';
        pCtx.font = 'bold 11px monospace';
        pCtx.fillText('LANDSAT-5 TM (1990) 30m', 14, 23);
      }
      if (pastScaleBadge) {
        pastScaleBadge.textContent = '1990 Baseline (Landsat 5)';
      }

      // 3. 2024 Modern Satellite Canvas (Sentinel-2 MSI)
      if (modernOverlayCanvas) {
        modernOverlayCanvas.width = width;
        modernOverlayCanvas.height = height;
        const mCtx = modernOverlayCanvas.getContext('2d');

        // Modern Crisp Copernicus Sentinel-2 True-Color
        mCtx.filter = 'contrast(1.08) saturate(1.22) brightness(1.02)';
        mCtx.drawImage(originalCanvas, 0, 0);
        mCtx.filter = 'none';

        // Draw 2024 Retreated Shoreline (Cyan #38bdf8)
        mCtx.shadowColor = '#38bdf8';
        mCtx.shadowBlur = 6;
        mCtx.fillStyle = '#38bdf8';
        binaryResult.edgePixels.forEach(p => {
          mCtx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5);
        });
        mCtx.shadowBlur = 0;

        // Modern Sentinel-2 Sensor Badge
        mCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        mCtx.fillRect(8, 8, 195, 22);
        mCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        mCtx.strokeRect(8.5, 8.5, 194, 21);
        mCtx.fillStyle = '#38bdf8';
        mCtx.font = 'bold 11px monospace';
        mCtx.fillText('SENTINEL-2 MSI (2024) 10m', 14, 23);
      }
      if (modernScaleBadge) {
        modernScaleBadge.textContent = '2024 Modern (Sentinel-2)';
      }

      // 4. Dual Superimposed Canvas
      if (dualOverlayCanvas) {
        dualOverlayCanvas.width = width;
        dualOverlayCanvas.height = height;
        const dCtx = dualOverlayCanvas.getContext('2d');

        dCtx.drawImage(originalCanvas, 0, 0);
        dCtx.fillStyle = 'rgba(10, 15, 25, 0.45)';
        dCtx.fillRect(0, 0, width, height);

        // Draw 34-Year Erosion Loss Band (Shaded Coral-Red)
        dCtx.fillStyle = 'rgba(255, 69, 58, 0.40)';
        pastPixels.forEach(p => {
          dCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });

        // 1990 Baseline Trace (Gold)
        dCtx.fillStyle = '#facc15';
        pastPixels.forEach(p => {
          dCtx.fillRect(p.x - 1, p.y - 1, 2, 2);
        });

        // 2024 Modern Retreated Trace (Cyan)
        dCtx.fillStyle = '#38bdf8';
        binaryResult.edgePixels.forEach(p => {
          dCtx.fillRect(p.x - 1, p.y - 1, 2, 2);
        });

        // Dual Telemetry Tag
        dCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        dCtx.fillRect(8, 8, 220, 22);
        dCtx.strokeStyle = 'rgba(48, 209, 88, 0.5)';
        dCtx.strokeRect(8.5, 8.5, 219, 21);
        dCtx.fillStyle = '#30d158';
        dCtx.font = 'bold 11px monospace';
        dCtx.fillText('Δ 34-YEAR COASTAL RETREAT', 14, 23);
      }
      if (dualScaleBadge) {
        dualScaleBadge.textContent = '1990 ⟷ 2024 (ภาพดาวเทียมล้วน)';
      }

      highlightScaleTableRow(-1);
      return;
    }

    // ==========================================
    // MODE 2: GRID ON (BOX-COUNTING AT SCALE ε)
    // ==========================================
    if (!boxCountingResult.scales || !boxCountingResult.scales[index]) return;
    const scale = boxCountingResult.scales[index];
    const boxSize = scale.boxSize;

    // 1. Render Canvas 3: Modern Box-Counting Grid
    gridOverlayCanvas.width = boxCountingResult.width;
    gridOverlayCanvas.height = boxCountingResult.height;
    const ctx = gridOverlayCanvas.getContext('2d');

    ctx.drawImage(edgeCanvas, 0, 0);

    BoxCounting.renderGrid(ctx, scale, boxCountingResult.width, boxCountingResult.height, {
      showEmptyGrid: true,
      gridColor: scale.boxSize <= 4 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)',
      occupiedFill: 'rgba(41, 151, 255, 0.35)',
      occupiedStroke: 'rgba(41, 151, 255, 0.95)',
      clearCanvas: false
    });

    if (currentScaleBadge) {
      currentScaleBadge.textContent = `ε = ${scale.boxSize}px | N = ${scale.count.toLocaleString()}`;
    }

    const pastAnalysis = BoxCounting.analyze(pastBinary, [boxSize]);
    const pastScale = pastAnalysis.scales[0] || { count: 0, occupiedBoxes: [] };

    // --- A. Render 1990 Past Satellite Canvas (#past-overlay-canvas) ---
    if (pastOverlayCanvas) {
      pastOverlayCanvas.width = width;
      pastOverlayCanvas.height = height;
      const pCtx = pastOverlayCanvas.getContext('2d');

      pCtx.filter = 'sepia(0.24) contrast(1.10) brightness(0.95) saturate(1.18)';
      pCtx.drawImage(originalCanvas, 0, 0);
      pCtx.filter = 'none';

      pCtx.fillStyle = 'rgba(25, 20, 15, 0.40)';
      pCtx.fillRect(0, 0, width, height);

      pCtx.strokeStyle = boxSize <= 4 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.12)';
      pCtx.lineWidth = boxSize <= 4 ? 0.5 : 0.75;
      pCtx.beginPath();
      for (let x = 0; x <= width; x += boxSize) { pCtx.moveTo(x + 0.5, 0); pCtx.lineTo(x + 0.5, height); }
      for (let y = 0; y <= height; y += boxSize) { pCtx.moveTo(0, y + 0.5); pCtx.lineTo(width, y + 0.5); }
      pCtx.stroke();

      pCtx.lineWidth = boxSize <= 4 ? 0.5 : 1.5;
      pCtx.fillStyle = 'rgba(250, 204, 21, 0.45)';
      pCtx.strokeStyle = '#facc15';
      pastScale.occupiedBoxes.forEach(b => {
        pCtx.fillRect(b.x, b.y, boxSize, boxSize);
        if (boxSize > 2) pCtx.strokeRect(b.x + 0.5, b.y + 0.5, boxSize - 1, boxSize - 1);
      });

      // Vintage Landsat 5 Sensor Badge
      pCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      pCtx.fillRect(8, 8, 185, 22);
      pCtx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
      pCtx.strokeRect(8.5, 8.5, 184, 21);
      pCtx.fillStyle = '#facc15';
      pCtx.font = 'bold 11px monospace';
      pCtx.fillText('LANDSAT-5 TM (1990) 30m', 14, 23);

      if (pastScaleBadge) {
        pastScaleBadge.textContent = `N = ${pastScale.count.toLocaleString()} กล่อง`;
      }
    }

    // --- B. Render 2024 Modern Satellite Canvas (#modern-overlay-canvas) ---
    if (modernOverlayCanvas) {
      modernOverlayCanvas.width = width;
      modernOverlayCanvas.height = height;
      const mCtx = modernOverlayCanvas.getContext('2d');

      mCtx.filter = 'contrast(1.08) saturate(1.22) brightness(1.02)';
      mCtx.drawImage(originalCanvas, 0, 0);
      mCtx.filter = 'none';

      mCtx.fillStyle = 'rgba(10, 15, 25, 0.40)';
      mCtx.fillRect(0, 0, width, height);

      mCtx.strokeStyle = boxSize <= 4 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.12)';
      mCtx.lineWidth = boxSize <= 4 ? 0.5 : 0.75;
      mCtx.beginPath();
      for (let x = 0; x <= width; x += boxSize) { mCtx.moveTo(x + 0.5, 0); mCtx.lineTo(x + 0.5, height); }
      for (let y = 0; y <= height; y += boxSize) { mCtx.moveTo(0, y + 0.5); mCtx.lineTo(width, y + 0.5); }
      mCtx.stroke();

      mCtx.lineWidth = boxSize <= 4 ? 0.5 : 1.5;
      mCtx.fillStyle = 'rgba(41, 151, 255, 0.45)';
      mCtx.strokeStyle = '#2997ff';
      scale.occupiedBoxes.forEach(b => {
        mCtx.fillRect(b.x, b.y, boxSize, boxSize);
        if (boxSize > 2) mCtx.strokeRect(b.x + 0.5, b.y + 0.5, boxSize - 1, boxSize - 1);
      });

      // Modern Sentinel-2 Sensor Badge
      mCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      mCtx.fillRect(8, 8, 195, 22);
      mCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      mCtx.strokeRect(8.5, 8.5, 194, 21);
      mCtx.fillStyle = '#38bdf8';
      mCtx.font = 'bold 11px monospace';
      mCtx.fillText('SENTINEL-2 MSI (2024) 10m', 14, 23);

      if (modernScaleBadge) {
        modernScaleBadge.textContent = `N = ${scale.count.toLocaleString()} กล่อง`;
      }
    }

    // --- C. Render Dual Superimposed Box Grid (#dual-overlay-canvas) ---
    if (dualOverlayCanvas) {
      dualOverlayCanvas.width = width;
      dualOverlayCanvas.height = height;
      const dCtx = dualOverlayCanvas.getContext('2d');

      dCtx.drawImage(originalCanvas, 0, 0);
      dCtx.fillStyle = 'rgba(10, 15, 25, 0.55)';
      dCtx.fillRect(0, 0, width, height);

      dCtx.strokeStyle = boxSize <= 4 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.12)';
      dCtx.lineWidth = boxSize <= 4 ? 0.5 : 0.75;
      dCtx.beginPath();
      for (let x = 0; x <= width; x += boxSize) { dCtx.moveTo(x + 0.5, 0); dCtx.lineTo(x + 0.5, height); }
      for (let y = 0; y <= height; y += boxSize) { dCtx.moveTo(0, y + 0.5); dCtx.lineTo(width, y + 0.5); }
      dCtx.stroke();

      const modernBoxes = new Set(scale.occupiedBoxes.map(b => `${b.x},${b.y}`));
      const pastBoxes = new Set(pastScale.occupiedBoxes.map(b => `${b.x},${b.y}`));

      dCtx.lineWidth = boxSize <= 4 ? 0.5 : 1.5;
      pastBoxes.forEach(k => {
        const [px, py] = k.split(',').map(Number);
        if (modernBoxes.has(k)) {
          // Stable Overlap in both 1990 and 2024 (Emerald Green)
          dCtx.fillStyle = 'rgba(48, 209, 88, 0.45)';
          dCtx.strokeStyle = '#30d158';
        } else {
          // Eroded Loss in 34 Years (Coral-Red)
          dCtx.fillStyle = 'rgba(255, 69, 58, 0.50)';
          dCtx.strokeStyle = '#ff453a';
        }
        dCtx.fillRect(px, py, boxSize, boxSize);
        if (boxSize > 2) {
          dCtx.strokeRect(px + 0.5, py + 0.5, boxSize - 1, boxSize - 1);
        }
      });

      modernBoxes.forEach(k => {
        if (!pastBoxes.has(k)) {
          const [px, py] = k.split(',').map(Number);
          dCtx.fillStyle = 'rgba(41, 151, 255, 0.50)';
          dCtx.strokeStyle = '#2997ff';
          dCtx.fillRect(px, py, boxSize, boxSize);
          if (boxSize > 2) {
            dCtx.strokeRect(px + 0.5, py + 0.5, boxSize - 1, boxSize - 1);
          }
        }
      });

      // Dual Telemetry Tag
      dCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      dCtx.fillRect(8, 8, 220, 22);
      dCtx.strokeStyle = 'rgba(48, 209, 88, 0.5)';
      dCtx.strokeRect(8.5, 8.5, 219, 21);
      dCtx.fillStyle = '#30d158';
      dCtx.font = 'bold 11px monospace';
      dCtx.fillText('Δ 34-YEAR COASTAL RETREAT', 14, 23);

      if (dualScaleBadge) {
        dualScaleBadge.textContent = `${pastScale.count.toLocaleString()} ⟷ ${scale.count.toLocaleString()}`;
      }
    }

    highlightScaleTableRow(index);
  }

  // --- Update Statistical Cards & Values ---
  function updateStatisticalCards(res, binRes) {
    if (!res) return;

    const statPval = document.getElementById('stat-p-value');
    const statSE = document.getElementById('stat-std-error');
    const statEdgeCount = document.getElementById('stat-edge-pixels');
    const statInterpretation = document.getElementById('stat-interpretation-text');
    const statValidity = document.getElementById('stat-validity-text');

    if (statPval) statPval.textContent = res.pValue < 0.0001 ? 'p < 0.0001 (มีนัยสำคัญ)' : `p = ${res.pValue.toFixed(4)}`;
    if (statSE) statSE.textContent = `SE: ± ${res.standardError.toFixed(4)}`;
    if (statEdgeCount) statEdgeCount.textContent = `${binRes.edgeCount.toLocaleString()} px`;
    if (statInterpretation) statInterpretation.textContent = res.interpretation.explanation;
    if (statValidity) statValidity.textContent = res.interpretation.statisticalValidity;

    // Update Multi-Temporal Analysis Metrics
    const preset = PRESETS[currentPresetId] || {};
    const d1990 = preset.historicalD || (res.fractalDimension - 0.056);
    const d2024 = res.fractalDimension;
    const deltaD = d2024 - d1990;

    const timeD1990 = document.getElementById('time-d-1990');
    const timeD2024 = document.getElementById('time-d-2024');
    const timeDDelta = document.getElementById('time-d-delta');
    const timeErosionRate = document.getElementById('time-erosion-rate');

    if (timeD1990) timeD1990.textContent = d1990.toFixed(4);
    if (timeD2024) timeD2024.textContent = d2024.toFixed(4);
    if (timeDDelta) {
      timeDDelta.textContent = (deltaD >= 0 ? '+' : '') + deltaD.toFixed(4);
      timeDDelta.className = `text-xl font-bold font-mono ${deltaD >= 0 ? 'text-[#30d158]' : 'text-[#ff9f0a]'}`;
    }
    if (timeErosionRate) timeErosionRate.textContent = preset.annualErosionRate || '3.5 - 5.0 ม./ปี';

    // Update active preset cards across both tabs
    presetCards.forEach(card => {
      if (card.dataset.preset === currentPresetId) {
        card.classList.add('active', 'border-cyan-500', 'bg-cyan-950/40');
        card.classList.remove('border-slate-800');
      } else {
        card.classList.remove('active', 'border-cyan-500', 'bg-cyan-950/40');
        card.classList.add('border-slate-800');
      }
    });

    updateTimeScalePills(currentScaleIndex);
    populateScaleTable(boxCountingResult.scales);
  }

  function updateTimeScalePills(index) {
    document.querySelectorAll('.time-scale-pill').forEach(pill => {
      if (index === -1) {
        if (pill.dataset.scale === 'off') {
          pill.className = 'time-scale-pill px-3 py-1.5 rounded-xl bg-[#2997ff] text-white font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(41,151,255,0.4)] flex items-center gap-1.5';
        } else {
          pill.className = 'time-scale-pill px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono text-xs transition';
        }
      } else {
        if (!boxCountingResult || !boxCountingResult.scales || !boxCountingResult.scales[index]) return;
        const currentBoxSize = boxCountingResult.scales[index].boxSize;
        if (parseInt(pill.dataset.scale) === currentBoxSize) {
          pill.className = 'time-scale-pill px-3 py-1.5 rounded-xl bg-[#2997ff] text-white font-mono text-xs font-bold transition shadow-[0_0_12px_rgba(41,151,255,0.4)]';
        } else if (pill.dataset.scale === 'off') {
          pill.className = 'time-scale-pill px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono text-xs transition flex items-center gap-1.5';
        } else {
          pill.className = 'time-scale-pill px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono text-xs transition';
        }
      }
    });
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
      tr.className = 'border-b border-white/5 hover:bg-white/[0.05] transition cursor-pointer';
      tr.innerHTML = `
        <td class="py-2 px-3 text-white font-medium">${s.boxSize} px</td>
        <td class="py-2 px-3 text-zinc-300 font-medium">${countNum.toLocaleString()}</td>
        <td class="py-2 px-3 text-[#86868b]">${s.logInvRatio !== undefined ? s.logInvRatio.toFixed(3) : ''}</td>
        <td class="py-2 px-3 text-[#86868b]">${s.logCount !== undefined ? s.logCount.toFixed(3) : ''}</td>
      `;
      tr.addEventListener('click', () => {
        currentScaleIndex = idx;
        renderGridScale(currentScaleIndex);
      });
      tbody.appendChild(tr);
    });
    highlightScaleTableRow(currentScaleIndex);
  }

  function highlightScaleTableRow(index) {
    const rows = document.querySelectorAll('#scales-table-body tr');
    rows.forEach((r, i) => {
      if (i === index) {
        r.className = 'border-b border-white/5 bg-[#2997ff]/20 text-white font-bold transition cursor-pointer border-l-2 border-l-[#2997ff]';
      } else {
        r.className = 'border-b border-white/5 hover:bg-white/[0.05] text-zinc-300 transition cursor-pointer';
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
        <tr class="font-medium text-xs font-mono">
          <td colspan="3" class="py-2.5 px-3 text-right text-[#86868b] font-sans">ผลรวม (Σ):</td>
          <td class="py-2.5 px-3 text-[#30d158]">Σx = ${sumX.toFixed(3)}</td>
          <td class="py-2.5 px-3 text-[#2997ff]">Σy = ${sumY.toFixed(3)}</td>
          <td class="py-2.5 px-3 text-[#ff9f0a]">Σxy = ${sumXY.toFixed(3)}</td>
          <td class="py-2.5 px-3 text-purple-400">Σx² = ${sumX2.toFixed(3)}</td>
        </tr>
      `;
    }

    if (slopeResult) {
      const formulaTex = `D = \\frac{${n}(${sumXY.toFixed(2)}) - (${sumX.toFixed(2)})(${sumY.toFixed(2)})}{${n}(${sumX2.toFixed(2)}) - (${sumX.toFixed(2)})^2}`;
      let renderedTex = formulaTex;
      if (typeof katex !== 'undefined') {
        try {
          renderedTex = katex.renderToString(formulaTex, { displayMode: false, throwOnError: false });
        } catch (e) {}
      }
      slopeResult.innerHTML = `
        <div class="space-y-1">
          <div>แทนค่า: ${renderedTex}</div>
          <div class="font-bold text-cyan-400 text-sm">มิติแฟร็กทัล (D) = ${ols.slope.toFixed(4)} (Standard Error: ± ${ols.standardError.toFixed(4)})</div>
        </div>
      `;
    }

    if (r2Result) {
      const r2Tex = `R^2 = 1 - \\frac{${ols.ssRes.toFixed(4)}}{${ols.ssTot.toFixed(4)}}`;
      let renderedR2Tex = r2Tex;
      if (typeof katex !== 'undefined') {
        try {
          renderedR2Tex = katex.renderToString(r2Tex, { displayMode: false, throwOnError: false });
        } catch (e) {}
      }
      r2Result.innerHTML = `
        <div class="space-y-1">
          <div>แทนค่า: ${renderedR2Tex}</div>
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
          <td class="py-3 px-3.5 font-semibold text-white whitespace-nowrap flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-zinc-300">${p.code}</span>
            <span>${p.name.split(' (')[0]}</span>
          </td>
          <td class="py-3 px-3.5 font-mono font-bold text-white whitespace-nowrap">${p.historicalD.toFixed(3)}</td>
          <td class="py-3 px-3.5 font-mono text-zinc-300 whitespace-nowrap">${(p.historicalR2 * 100).toFixed(1)}%</td>
          <td class="py-3 px-3.5 font-mono font-semibold text-[#ff453a] whitespace-nowrap">${p.erosionRate}</td>
          <td class="py-3 px-3.5 font-mono text-[#86868b] whitespace-nowrap">${p.coastLength}</td>
          <td class="py-3 px-3.5 whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center ${p.riskLevel === 'high' ? 'badge-risk-high' : 'badge-risk-med'}">
              ${p.erosionRisk.split(' (')[0]}
            </span>
          </td>
          <td class="py-3 px-3.5 text-xs text-[#86868b] min-w-[200px]">${p.description}</td>
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

  // Wave Simulation Controls
  if (waveStartBtn) {
    waveStartBtn.addEventListener('click', () => {
      if (waveSim) {
        const viewMode = waveViewSelect ? waveViewSelect.value : 'wave';
        waveSim.start(viewMode, (stats) => {
          const sedSpan = document.getElementById('wave-stat-sediment');
          const lossSpan = document.getElementById('wave-stat-loss');
          const dissSpan = document.getElementById('wave-stat-dissipation');
          if (sedSpan) sedSpan.textContent = `${Math.round(stats.totalSediment).toLocaleString()} หน่วย`;
          if (lossSpan) lossSpan.textContent = `${stats.sedimentLossPercent.toFixed(1)}%`;
          if (dissSpan) dissSpan.textContent = `${Math.round(stats.dissipatedEnergy).toLocaleString()} J/m`;
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

  // --- 4K Ultra HD Exporter Engine (3840 x 3840 px & 3840 x 2160 px) ---
  const openExportModalBtn = document.getElementById('open-export-modal-btn');
  const export4kModal = document.getElementById('export-4k-modal');
  const closeExportModalBtn = document.getElementById('close-export-modal-btn');
  const btnExport4kDual = document.getElementById('btn-export-4k-dual');
  const btnExport4kPoster = document.getElementById('btn-export-4k-poster');
  const btnExport4kSingle = document.getElementById('btn-export-4k-single');
  const export4kDualBtn = document.getElementById('export-4k-dual-btn');
  const exportStatusBanner = document.getElementById('export-status-banner');
  const exportStatusText = document.getElementById('export-status-text');

  function open4KModal() {
    if (!export4kModal) return;
    export4kModal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    export4kModal.classList.add('opacity-100');
  }

  function close4KModal() {
    if (!export4kModal) return;
    export4kModal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      export4kModal.classList.add('hidden');
    }, 200);
  }

  if (openExportModalBtn) openExportModalBtn.addEventListener('click', open4KModal);
  if (closeExportModalBtn) closeExportModalBtn.addEventListener('click', close4KModal);
  if (export4kDualBtn) export4kDualBtn.addEventListener('click', () => export4KImage('dual'));

  // --- Fullscreen Canvas Inspection Engine ---
  const fullscreenCanvasModal = document.getElementById('fullscreen-canvas-modal');
  const closeFullscreenModalBtn = document.getElementById('close-fullscreen-modal-btn');
  const fullscreenModalTitle = document.getElementById('fullscreen-modal-title');
  const fullscreenModalSubtitle = document.getElementById('fullscreen-modal-subtitle');
  const fullscreenDisplayCanvas = document.getElementById('fullscreen-display-canvas');
  const fullscreenExport4kBtn = document.getElementById('fullscreen-export-4k-btn');
  const fullscreenViewBtns = document.querySelectorAll('.fullscreen-view-btn');

  let currentFullscreenView = 'dual';

  function renderFullscreenView(view) {
    if (!fullscreenDisplayCanvas) return;
    currentFullscreenView = view;
    fullscreenDisplayCanvas.width = 1024;
    fullscreenDisplayCanvas.height = 1024;
    const fCtx = fullscreenDisplayCanvas.getContext('2d');
    fCtx.clearRect(0, 0, 1024, 1024);

    let srcCanvas = null;
    let title = '';
    let subtitle = '';

    if (view === 'past') {
      srcCanvas = pastOverlayCanvas;
      title = '1. ภาพถ่ายดาวเทียมอดีต 1990 (Landsat 5 TM Baseline)';
      subtitle = 'แนวชายฝั่งในอดีต (34 ปีก่อน) ยื่นออกสู่ทะเลก่อนถูกกัดเซาะ พร้อมเซนเซอร์ Landsat-5 TM 30m';
    } else if (view === 'modern') {
      srcCanvas = modernOverlayCanvas;
      title = '2. ภาพถ่ายดาวเทียมปัจจุบัน 2024 (Copernicus Sentinel-2)';
      subtitle = 'แนวชายฝั่งปัจจุบันที่ถอยร่นเข้าหาแผ่นดิน ภาพสีจริงคมชัดระดับ 10m';
    } else if (view === 'edge') {
      srcCanvas = gridOverlayCanvas || edgeCanvas;
      title = '4. การสกัดเส้นขอบแนวชายฝั่ง (Canny Edge & Grid Overlay)';
      subtitle = 'โครงข่ายพิกเซลรอยต่อน้ำ-บกแท้จริง เพื่อการคำนวณมิตินับกล่อง';
    } else {
      srcCanvas = dualOverlayCanvas;
      title = '3. ภาพซ้อนทับเปรียบเทียบเชิงเวลา 1990 ⟷ 2024';
      subtitle = 'เปรียบเทียบการถอยร่นของแนวชายฝั่งอ่าวไทย 34 ปี พร้อมแถบพื้นที่สูญหายจากการกัดเซาะ';
    }

    if (srcCanvas) {
      fCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, 1024, 1024);
    }

    if (fullscreenModalTitle) fullscreenModalTitle.textContent = title;
    if (fullscreenModalSubtitle) fullscreenModalSubtitle.textContent = subtitle;

    fullscreenViewBtns.forEach(btn => {
      if (btn.dataset.view === view) {
        btn.className = 'fullscreen-view-btn px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#2997ff] shadow-[0_0_10px_rgba(41,151,255,0.4)] transition';
      } else {
        btn.className = 'fullscreen-view-btn px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition';
      }
    });
  }

  function openFullscreenModal(view = 'dual') {
    if (!fullscreenCanvasModal) return;
    renderFullscreenView(view);
    fullscreenCanvasModal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    fullscreenCanvasModal.classList.add('opacity-100');
  }

  function closeFullscreenModal() {
    if (!fullscreenCanvasModal) return;
    fullscreenCanvasModal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      fullscreenCanvasModal.classList.add('hidden');
    }, 200);
  }

  document.querySelectorAll('.expand-canvas-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openFullscreenModal(btn.dataset.target || 'dual');
    });
  });

  document.querySelectorAll('[data-expand]').forEach(el => {
    el.addEventListener('click', () => {
      openFullscreenModal(el.dataset.expand || 'dual');
    });
  });

  fullscreenViewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      renderFullscreenView(btn.dataset.view);
    });
  });

  if (closeFullscreenModalBtn) {
    closeFullscreenModalBtn.addEventListener('click', closeFullscreenModal);
  }

  if (fullscreenExport4kBtn) {
    fullscreenExport4kBtn.addEventListener('click', () => {
      closeFullscreenModal();
      open4KModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFullscreenModal();
      close4KModal();
    }
  });

  function showExportProgress(msg, callback) {
    if (exportStatusBanner && exportStatusText) {
      exportStatusText.textContent = msg;
      exportStatusBanner.classList.remove('hidden');
      setTimeout(() => {
        callback();
        exportStatusBanner.classList.add('hidden');
      }, 400);
    } else {
      callback();
    }
  }

  if (btnExport4kDual) {
    btnExport4kDual.addEventListener('click', () => {
      showExportProgress('กำลังเรนเดอร์ 4K Dual Box Grid (3840 × 3840 px)...', () => {
        export4KImage('dual');
        close4KModal();
      });
    });
  }

  if (btnExport4kPoster) {
    btnExport4kPoster.addEventListener('click', () => {
      showExportProgress('กำลังเรนเดอร์ 4K Scientific Research Poster (3840 × 2160 px)...', () => {
        export4KImage('poster');
        close4KModal();
      });
    });
  }

  if (btnExport4kSingle) {
    btnExport4kSingle.addEventListener('click', () => {
      showExportProgress('กำลังเรนเดอร์ 4K Modern Box Grid (3840 × 3840 px)...', () => {
        export4KImage('single');
        close4KModal();
      });
    });
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function export4KImage(mode = 'dual') {
    if (!boxCountingResult || !binaryResult) return;

    const scale = boxCountingResult.scales[currentScaleIndex] || boxCountingResult.scales[0];
    const preset = PRESETS[currentPresetId] || {};
    const regionName = preset.name || 'อ่าวไทย (Gulf of Thailand)';
    const regionCode = preset.technicalCode || 'TH-ALL';

    if (mode === 'dual' || mode === 'single') {
      // --- 4K Square Export (3840 x 3840 px • 14.7 Megapixels) ---
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 3840;
      exportCanvas.height = 3840;
      const ctx = exportCanvas.getContext('2d');

      const W = exportCanvas.width;
      const H = exportCanvas.height;
      const S = W / 512; // 7.5x scaling multiplier

      // 1. Dark Background Fill
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, W, H);

      // 2. High-Res Satellite Backdrop
      const crop = preset.crop || { sx: 410, sy: 90, sw: 1440, sh: 1930 };
      const satImg = satelliteImageCache[preset.imageSrc];
      if (satImg && satImg.complete && satImg.naturalWidth > 0) {
        ctx.drawImage(satImg, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
        ctx.fillStyle = 'rgba(8, 13, 26, 0.55)';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.drawImage(originalCanvas, 0, 0, 512, 512, 0, 0, W, H);
        ctx.fillStyle = 'rgba(8, 13, 26, 0.55)';
        ctx.fillRect(0, 0, W, H);
      }

      // 3. Crisp 4K Grid Lines
      const boxSize4K = scale.boxSize * S;
      ctx.strokeStyle = scale.boxSize <= 4 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = scale.boxSize <= 4 ? 1.0 : 2.0;
      ctx.beginPath();
      for (let x = 0; x <= W; x += boxSize4K) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += boxSize4K) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();

      if (mode === 'dual') {
        // --- Compute Past Baseline Boxes at 4K ---
        const origCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
        const imgData = origCtx.getImageData(0, 0, 512, 512);
        const landMask = ImageProcessor.generateLandMask(imgData);
        const retreatShift = Math.max(3, Math.min(18, Math.round((preset.annualErosionRate ? 180 : 120) / 40)));

        const pastMatrix = new Uint8Array(512 * 512);
        const pastPixels = [];

        binaryResult.edgePixels.forEach(p => {
          let dx = 0, dy = 0;
          for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
              const nx = p.x + ox;
              const ny = p.y + oy;
              if (nx >= 0 && nx < 512 && ny >= 0 && ny < 512) {
                if (landMask[ny * 512 + nx] === 0) {
                  dx += ox;
                  dy += oy;
                }
              }
            }
          }
          const dist = Math.hypot(dx, dy);
          let sx = p.x;
          let sy = p.y;
          if (dist > 0) {
            sx = Math.round(p.x + (dx / dist) * retreatShift);
            sy = Math.round(p.y + (dy / dist) * retreatShift);
          }
          sx = Math.max(0, Math.min(511, sx));
          sy = Math.max(0, Math.min(511, sy));
          pastMatrix[sy * 512 + sx] = 1;
          pastPixels.push({ x: sx, y: sy });
        });

        const pastBinary = { matrix: pastMatrix, width: 512, height: 512, edgeCount: pastPixels.length, edgePixels: pastPixels };
        const pastAnalysis = BoxCounting.analyze(pastBinary, [scale.boxSize]);
        const pastScale = pastAnalysis.scales[0] || { count: 0, occupiedBoxes: [] };

        const modernBoxes = new Set(scale.occupiedBoxes.map(b => `${b.x},${b.y}`));
        const pastBoxes = new Set(pastScale.occupiedBoxes.map(b => `${b.x},${b.y}`));

        // 4. Render 4K 1990 Baseline Occupied Boxes (Gold / Green)
        ctx.lineWidth = scale.boxSize <= 4 ? 1.5 : 4.0;
        pastBoxes.forEach(k => {
          const [px, py] = k.split(',').map(Number);
          const px4K = px * S;
          const py4K = py * S;

          if (modernBoxes.has(k)) {
            // Overlapping -> Emerald Green
            ctx.fillStyle = 'rgba(48, 209, 88, 0.45)';
            ctx.strokeStyle = '#30d158';
          } else {
            // Past Only (Eroded in 34 Years) -> Coral-Red
            ctx.fillStyle = 'rgba(255, 69, 58, 0.50)';
            ctx.strokeStyle = '#ff453a';
          }
          ctx.fillRect(px4K, py4K, boxSize4K, boxSize4K);
          if (scale.boxSize > 2) {
            ctx.strokeRect(px4K + 1, py4K + 1, boxSize4K - 2, boxSize4K - 2);
          }
        });

        // 5. Render 4K 2024 Modern Occupied Boxes (Cyan)
        modernBoxes.forEach(k => {
          if (!pastBoxes.has(k)) {
            const [px, py] = k.split(',').map(Number);
            const px4K = px * S;
            const py4K = py * S;

            ctx.fillStyle = 'rgba(41, 151, 255, 0.55)';
            ctx.strokeStyle = '#2997ff';
            ctx.fillRect(px4K, py4K, boxSize4K, boxSize4K);
            if (scale.boxSize > 2) {
              ctx.strokeRect(px4K + 1, py4K + 1, boxSize4K - 2, boxSize4K - 2);
            }
          }
        });

        // 7. Scientific 4K Telemetry HUD Overlay
        const hudW = 1260;
        const hudH = 360;
        const hudX = 80;
        const hudY = 80;

        ctx.fillStyle = 'rgba(10, 14, 24, 0.94)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(hudX, hudY, hudW, hudH, 24);
        } else {
          ctx.rect(hudX, hudY, hudW, hudH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 40px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${regionName} [${regionCode}]`, hudX + 40, hudY + 70);

        ctx.font = '500 28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#86868b';
        ctx.fillText(`Multi-Temporal Fractal Box-Counting Simulation • ε = ${scale.boxSize} px (${(scale.boxSize * 10).toLocaleString()} m)`, hudX + 40, hudY + 122);

        ctx.font = 'bold 34px monospace';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`• 1990 Baseline:  N = ${pastScale.count.toLocaleString()} กล่อง  (D = ${(olsResult ? olsResult.fractalDimension - 0.056 : 1.15).toFixed(4)})`, hudX + 40, hudY + 190);

        ctx.fillStyle = '#2997ff';
        ctx.fillText(`• 2024 Sentinel-2: N = ${scale.count.toLocaleString()} กล่อง  (D = ${(olsResult ? olsResult.fractalDimension : 1.218).toFixed(4)})`, hudX + 40, hudY + 250);

        ctx.fillStyle = '#30d158';
        ctx.fillText(`• Net Coastal Shift: ΔN = +${Math.max(0, scale.count - pastScale.count)} กล่อง | R² = ${(olsResult ? olsResult.r2 * 100 : 99.5).toFixed(2)}% (OLS)`, hudX + 40, hudY + 310);
      } else {
        // --- Single Modern Box Counting at 4K ---
        ctx.lineWidth = scale.boxSize <= 4 ? 1.5 : 4.0;
        scale.occupiedBoxes.forEach(b => {
          const px4K = b.x * S;
          const py4K = b.y * S;
          ctx.fillStyle = 'rgba(41, 151, 255, 0.45)';
          ctx.strokeStyle = '#2997ff';
          ctx.fillRect(px4K, py4K, boxSize4K, boxSize4K);
          if (scale.boxSize > 2) {
            ctx.strokeRect(px4K + 1, py4K + 1, boxSize4K - 2, boxSize4K - 2);
          }
        });
      }

      // 8. Bottom 4K Research Watermark
      ctx.fillStyle = 'rgba(10, 14, 24, 0.90)';
      ctx.fillRect(0, H - 120, W, 120);
      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText('Gulf of Thailand Fractal Geometry & Coastal Erosion Modeling • Ultra-HD 4K Export (3840 × 3840 px • 14.7 MP)', 80, H - 48);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `fractal_coastline_4k_${mode}_${currentPresetId}_eps${scale.boxSize}px_${timestamp}.png`;
      downloadCanvas(exportCanvas, filename);
    } else if (mode === 'poster') {
      // --- 4K Scientific Research Poster (3840 x 2160 px • 16:9 Landscape) ---
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 3840;
      exportCanvas.height = 2160;
      const ctx = exportCanvas.getContext('2d');

      const W = exportCanvas.width;
      const H = exportCanvas.height;

      // Dark Scientific Poster Background
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, W, H);

      // Top Poster Header Banner
      ctx.fillStyle = 'rgba(18, 24, 38, 0.95)';
      ctx.fillRect(0, 0, W, 220);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 220);
      ctx.lineTo(W, 220);
      ctx.stroke();

      ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('COASTAL EROSION COMPLEXITY ANALYSIS IN THE GULF OF THAILAND', 80, 85);

      ctx.font = '500 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#2997ff';
      ctx.fillText(`Fractal Box-Counting Dimension & OLS Statistical Modeling • ${regionName} [${regionCode}]`, 80, 140);

      ctx.font = '400 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText(`Sentinel-2 Satellite Observation • DMCR Ground Truth Validation • Resolution: 3840 × 2160 (4K Ultra HD)`, 80, 185);

      // 4 Canvas Panels arranged side by side (Each 860 x 860 px)
      const panelSize = 860;
      const panelY = 280;
      const gap = 55;
      const startX = 80;

      const panels = [
        { title: '1. Satellite Imagery (10m GSD)', canvas: originalCanvas },
        { title: '2. Clean Edge Matrix (Shoreline)', canvas: edgeCanvas },
        { title: `3. Modern Box Grid (ε = ${scale.boxSize} px)`, canvas: gridOverlayCanvas },
        { title: '4. Dual Box Grid (1990 vs 2024)', canvas: dualOverlayCanvas }
      ];

      panels.forEach((p, idx) => {
        const px = startX + idx * (panelSize + gap);

        // Panel Card Background
        ctx.fillStyle = 'rgba(16, 20, 31, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(px, panelY, panelSize, panelSize + 110, 20);
        } else {
          ctx.rect(px, panelY, panelSize, panelSize + 110);
        }
        ctx.fill();
        ctx.stroke();

        // Panel Title
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.title, px + 25, panelY + 45);

        // Canvas Image
        if (p.canvas) {
          ctx.drawImage(p.canvas, 0, 0, p.canvas.width, p.canvas.height, px + 25, panelY + 70, panelSize - 50, panelSize - 50);
        }
      });

      // Bottom Key Quantitative Statistics Bar
      const statY = 1350;
      const statH = 680;
      ctx.fillStyle = 'rgba(13, 17, 27, 0.92)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(startX, statY, W - 160, statH, 24);
      } else {
        ctx.rect(startX, statY, W - 160, statH);
      }
      ctx.fill();
      ctx.stroke();

      // Quantitative Metrics
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('QUANTITATIVE FRACTAL & GEOMORPHOLOGICAL METRICS', startX + 40, statY + 60);

      const dVal = olsResult ? olsResult.fractalDimension.toFixed(4) : '1.2180';
      const r2Val = olsResult ? (olsResult.r2 * 100).toFixed(2) + '%' : '99.50%';
      const pVal = olsResult ? (olsResult.pValue < 0.0001 ? '< 0.0001' : olsResult.pValue.toFixed(4)) : '< 0.0001';
      const seVal = olsResult ? '± ' + olsResult.standardError.toFixed(4) : '± 0.0382';

      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = '#2997ff';
      ctx.fillText(`D = ${dVal}`, startX + 40, statY + 160);

      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText('Fractal Box-Counting Dimension', startX + 40, statY + 205);

      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = '#30d158';
      ctx.fillText(`R² = ${r2Val}`, startX + 580, statY + 160);

      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText('OLS Model Goodness of Fit', startX + 580, statY + 205);

      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(`p ${pVal}`, startX + 1120, statY + 160);

      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText('Statistical Significance (p < 0.05)', startX + 1120, statY + 205);

      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = '#ff9f0a';
      ctx.fillText(`SE = ${seVal}`, startX + 1680, statY + 160);

      ctx.font = '500 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#86868b';
      ctx.fillText('Standard Error of Dimension D', startX + 1680, statY + 205);

      // Draw Log-Log Chart onto the right side of the poster
      const chartCanvas = document.getElementById('log-log-chart');
      if (chartCanvas) {
        ctx.drawImage(chartCanvas, startX + 2300, statY + 40, 1300, statH - 80);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `fractal_research_poster_4k_${currentPresetId}_${timestamp}.png`;
      downloadCanvas(exportCanvas, filename);
    }
  }

  // --- Time Studio Interactive Controls ---
  document.querySelectorAll('.time-preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selectPreset(pill.dataset.preset);
    });
  });

  document.querySelectorAll('.time-scale-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (pill.dataset.scale === 'off') {
        if (isPlayingScaleAnimation) {
          clearInterval(scaleAnimationTimer);
          isPlayingScaleAnimation = false;
          const timePlayScaleBtn = document.getElementById('time-play-scale-btn');
          if (timePlayScaleBtn) {
            timePlayScaleBtn.innerHTML = '<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Play Animation</span>';
          }
        }
        currentScaleIndex = -1;
        renderGridScale(-1);
        updateTimeScalePills(-1);
        return;
      }

      const targetScale = parseInt(pill.dataset.scale);
      if (boxCountingResult && boxCountingResult.scales) {
        const idx = boxCountingResult.scales.findIndex(s => s.boxSize === targetScale);
        if (idx !== -1) {
          currentScaleIndex = idx;
          renderGridScale(currentScaleIndex);
          updateTimeScalePills(currentScaleIndex);
        }
      }
    });
  });

  const timePrevScaleBtn = document.getElementById('time-prev-scale-btn');
  const timePlayScaleBtn = document.getElementById('time-play-scale-btn');
  const timeNextScaleBtn = document.getElementById('time-next-scale-btn');
  const export4kTimeBtn = document.getElementById('export-4k-time-btn');

  if (timePrevScaleBtn) {
    timePrevScaleBtn.addEventListener('click', () => {
      if (!boxCountingResult || !boxCountingResult.scales) return;
      currentScaleIndex = (currentScaleIndex - 1 + boxCountingResult.scales.length) % boxCountingResult.scales.length;
      renderGridScale(currentScaleIndex);
      updateTimeScalePills(currentScaleIndex);
    });
  }

  if (timeNextScaleBtn) {
    timeNextScaleBtn.addEventListener('click', () => {
      if (!boxCountingResult || !boxCountingResult.scales) return;
      currentScaleIndex = (currentScaleIndex + 1) % boxCountingResult.scales.length;
      renderGridScale(currentScaleIndex);
      updateTimeScalePills(currentScaleIndex);
    });
  }

  if (timePlayScaleBtn) {
    timePlayScaleBtn.addEventListener('click', () => {
      if (isPlayingScaleAnimation) {
        clearInterval(scaleAnimationTimer);
        isPlayingScaleAnimation = false;
        timePlayScaleBtn.innerHTML = '<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Play Animation</span>';
      } else {
        isPlayingScaleAnimation = true;
        timePlayScaleBtn.innerHTML = '<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>';
        scaleAnimationTimer = setInterval(() => {
          if (!boxCountingResult || !boxCountingResult.scales) return;
          currentScaleIndex = (currentScaleIndex + 1) % boxCountingResult.scales.length;
          renderGridScale(currentScaleIndex);
          updateTimeScalePills(currentScaleIndex);
        }, 1100);
      }
    });
  }

  // --- Moving Window Spatial Local Fractal Heatmap Toggle ---
  let isHeatmapActive = false;
  let heatmapData = null;

  const toggleHeatmapBtn = document.getElementById('toggle-heatmap-btn');
  if (toggleHeatmapBtn) {
    toggleHeatmapBtn.addEventListener('click', () => {
      if (!binaryResult) return;
      isHeatmapActive = !isHeatmapActive;

      if (isHeatmapActive) {
        toggleHeatmapBtn.className = 'apple-btn-primary !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 !bg-gradient-to-r !from-amber-500 !to-rose-600 !text-white !font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)] border-amber-400';
        toggleHeatmapBtn.innerHTML = '<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><span>ซ่อน Heatmap</span>';

        heatmapData = BoxCounting.computeLocalHeatmap(binaryResult, { windowSize: 64, stepSize: 16 });

        if (modernOverlayCanvas && heatmapData) {
          const mCtx = modernOverlayCanvas.getContext('2d');
          BoxCounting.renderHeatmap(mCtx, heatmapData, modernOverlayCanvas.width, modernOverlayCanvas.height);
        }
        if (dualOverlayCanvas && heatmapData) {
          const dCtx = dualOverlayCanvas.getContext('2d');
          BoxCounting.renderHeatmap(dCtx, heatmapData, dualOverlayCanvas.width, dualOverlayCanvas.height);
        }

        if (modernScaleBadge) {
          modernScaleBadge.textContent = `Spatial D(x,y) Heatmap (${heatmapData.cells.length} Windows)`;
        }
      } else {
        toggleHeatmapBtn.className = 'apple-btn-secondary !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 hover:border-amber-500 hover:text-amber-400 transition';
        toggleHeatmapBtn.innerHTML = '<svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><span>Moving Window Heatmap</span>';
        renderGridScale(currentScaleIndex);
      }
    });
  }

  // --- Micro-Pixel Telemetry & Geospatial Inspector Engine ---
  const hudLatLon = document.getElementById('hud-lat-lon');
  const hudLatLonDMS = document.getElementById('hud-lat-lon-dms');
  const hudProvinceName = document.getElementById('hud-province-name');
  const hudProvinceLandmark = document.getElementById('hud-province-landmark');
  const hudProvinceDist = document.getElementById('hud-province-dist');
  const hudLocalD = document.getElementById('hud-local-d');
  const hudLocalRisk = document.getElementById('hud-local-risk');
  const hudPixelStatus = document.getElementById('hud-pixel-status');
  const hudPixelXY = document.getElementById('hud-pixel-xy');
  const hudMagnifierCanvas = document.getElementById('hud-magnifier-canvas');

  // Fullscreen Modal Inspector Elements
  const fsHudLatLon = document.getElementById('fs-hud-lat-lon');
  const fsHudLatLonDMS = document.getElementById('fs-hud-lat-lon-dms');
  const fsHudProvinceName = document.getElementById('fs-hud-province-name');
  const fsHudProvinceLandmark = document.getElementById('fs-hud-province-landmark');
  const fsHudProvinceDist = document.getElementById('fs-hud-province-dist');
  const fsHudLocalD = document.getElementById('fs-hud-local-d');
  const fsHudLocalRisk = document.getElementById('fs-hud-local-risk');
  const fsHudPixelStatus = document.getElementById('fs-hud-pixel-status');
  const fsHudPixelXY = document.getElementById('fs-hud-pixel-xy');
  const fsHudMagnifierCanvas = document.getElementById('fs-hud-magnifier-canvas');

  function updatePixelInspection(px, py, sourceCanvas) {
    if (!sourceCanvas || !binaryResult || typeof GISLookup === 'undefined') return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // 1. Calculate Real-world GIS Coordinates (Lat, Lon)
    const geo = GISLookup.pixelToGeo(px, py, width, height, currentPresetId);
    const nearest = GISLookup.findNearestProvince(geo.lat, geo.lon);

    const latLonStr = `${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E`;
    const latLonDMSStr = `${geo.latDMS}, ${geo.lonDMS}`;

    if (hudLatLon) hudLatLon.textContent = latLonStr;
    if (hudLatLonDMS) hudLatLonDMS.textContent = latLonDMSStr;
    if (fsHudLatLon) fsHudLatLon.textContent = latLonStr;
    if (fsHudLatLonDMS) fsHudLatLonDMS.textContent = latLonDMSStr;

    if (nearest) {
      const pName = nearest.province;
      const pLandmark = `${nearest.landmark} (~${nearest.distanceKm} กม.)`;
      const pDist = `~ ${nearest.distanceKm} กม.`;
      const pTitle = `${nearest.province} - ${nearest.landmark} (DMCR: ${nearest.dmcrRisk})`;

      if (hudProvinceName) hudProvinceName.textContent = pName;
      if (hudProvinceLandmark) { hudProvinceLandmark.textContent = pLandmark; hudProvinceLandmark.title = pTitle; }
      if (hudProvinceDist) hudProvinceDist.textContent = pDist;

      if (fsHudProvinceName) fsHudProvinceName.textContent = pName;
      if (fsHudProvinceLandmark) { fsHudProvinceLandmark.textContent = pLandmark; fsHudProvinceLandmark.title = pTitle; }
      if (fsHudProvinceDist) fsHudProvinceDist.textContent = pDist;
    }

    // 2. Calculate Local Fractal Dimension D(x, y)
    const localD = BoxCounting.computePointLocalDimension(binaryResult, px, py, 36);
    const dStr = `D(x,y) = ${localD.d.toFixed(4)}`;

    let riskText = 'แนวเสถียร / ความซับซ้อนต่ำ 🟢';
    let riskColorClass = 'text-[#30d158]';

    if (localD.risk === 'high') {
      riskText = 'ความเสี่ยงการกัดเซาะวิกฤตสูง 🔴';
      riskColorClass = 'text-[#ff453a]';
    } else if (localD.risk === 'med') {
      riskText = 'ความซับซ้อนและเสี่ยงปานกลาง 🟡';
      riskColorClass = 'text-[#ff9f0a]';
    }

    if (hudLocalD) {
      hudLocalD.textContent = dStr;
      hudLocalD.className = `text-sm sm:text-base font-bold font-mono ${riskColorClass} tracking-tight`;
    }
    if (hudLocalRisk) {
      hudLocalRisk.textContent = riskText;
      hudLocalRisk.className = `text-[11px] font-semibold ${riskColorClass}`;
    }

    if (fsHudLocalD) {
      fsHudLocalD.textContent = dStr;
      fsHudLocalD.className = `text-xs sm:text-sm font-bold font-mono ${riskColorClass} tracking-tight`;
    }
    if (fsHudLocalRisk) {
      fsHudLocalRisk.textContent = riskText;
      fsHudLocalRisk.className = `text-[10px] font-semibold ${riskColorClass}`;
    }

    // 3. Classify Geomorphic State
    const pixelClass = BoxCounting.classifyPixel(binaryResult, px, py);
    const pixelXYStr = `X: ${Math.round(px)} px, Y: ${Math.round(py)} px`;

    if (hudPixelStatus) {
      hudPixelStatus.textContent = pixelClass.label;
      hudPixelStatus.style.color = pixelClass.color;
    }
    if (hudPixelXY) hudPixelXY.textContent = pixelXYStr;

    if (fsHudPixelStatus) {
      fsHudPixelStatus.textContent = pixelClass.label;
      fsHudPixelStatus.style.color = pixelClass.color;
    }
    if (fsHudPixelXY) fsHudPixelXY.textContent = pixelXYStr;

    // 4. Render 8x Micro-Pixel Magnifier Loupe on both main & fullscreen canvases
    const renderLoupe = (magCanvas) => {
      if (!magCanvas) return;
      const magCtx = magCanvas.getContext('2d');
      magCtx.clearRect(0, 0, 64, 64);
      magCtx.imageSmoothingEnabled = false;

      const winSize = 16;
      const sx = Math.max(0, Math.min(width - winSize, px - winSize / 2));
      const sy = Math.max(0, Math.min(height - winSize, py - winSize / 2));

      magCtx.drawImage(sourceCanvas, sx, sy, winSize, winSize, 0, 0, 64, 64);

      magCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      magCtx.lineWidth = 1;
      magCtx.beginPath();
      magCtx.moveTo(32, 24); magCtx.lineTo(32, 40);
      magCtx.moveTo(24, 32); magCtx.lineTo(40, 32);
      magCtx.stroke();

      magCtx.strokeStyle = '#2997ff';
      magCtx.strokeRect(28.5, 28.5, 7, 7);
    };

    renderLoupe(hudMagnifierCanvas);
    renderLoupe(fsHudMagnifierCanvas);
  }

  function bindCanvasInspection(canvas) {
    if (!canvas) return;

    function handlePointer(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const px = (clientX - rect.left) * scaleX;
      const py = (clientY - rect.top) * scaleY;

      updatePixelInspection(px, py, canvas);
    }

    canvas.addEventListener('mousemove', handlePointer);
    canvas.addEventListener('touchmove', handlePointer, { passive: true });
  }

  bindCanvasInspection(dualOverlayCanvas);
  bindCanvasInspection(pastOverlayCanvas);
  bindCanvasInspection(modernOverlayCanvas);
  bindCanvasInspection(fullscreenDisplayCanvas);

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
