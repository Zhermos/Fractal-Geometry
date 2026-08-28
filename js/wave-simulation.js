/**
 * 2D Wave Physics, Energy Dissipation & Coastal Erosion Simulation Module
 * Simulates shallow water wave propagation, wave refraction at headlands,
 * wave energy dissipation across fractal coastlines, and sediment transport.
 * Guarantees that the entire landmass and terrain stay permanently visible.
 */

class WaveErosionSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Grid resolution for wave physics
    this.gridW = 128;
    this.gridH = 128;
    
    this.u = new Float32Array(this.gridW * this.gridH);         // Current wave height
    this.uPrev = new Float32Array(this.gridW * this.gridH);     // Previous wave height
    this.uNext = new Float32Array(this.gridW * this.gridH);     // Next wave height
    this.energyMap = new Float32Array(this.gridW * this.gridH); // Accumulated wave energy
    this.landMask = new Uint8Array(this.gridW * this.gridH);    // 1 = Land, 0 = Ocean
    this.terrainColors = new Uint8ClampedArray(this.gridW * this.gridH * 3); // Preserved land colors

    // Simulation Parameters
    this.waveSpeed = 0.45;
    this.damping = 0.988;
    this.waveAmplitude = 12.0;
    this.waveFrequency = 0.12;
    this.timeStep = 0;
    this.isRunning = false;
    this.animationFrameId = null;
    this.fractalD = 1.20;

    // Sediment & Erosion Stats
    this.totalSediment = 1000;
    this.initialSediment = 1000;
    this.erosionRate = 0;
    this.dissipatedEnergy = 0;
    this.defenseType = 'none'; // 'none', 'mangrove', 'breakwater'

    // Sediment particles along the beach
    this.sediments = [];
  }

  /**
   * Load solid landmass from source canvas RGB data
   */
  loadLandFromCanvas(sourceCanvas, fractalDimension = 1.20) {
    if (!sourceCanvas) return;
    this.fractalD = fractalDimension;
    this.u.fill(0);
    this.uPrev.fill(0);
    this.uNext.fill(0);
    this.energyMap.fill(0);
    this.timeStep = 0;
    this.totalSediment = 1000;
    this.initialSediment = 1000;
    this.sediments = [];

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = srcCtx.getImageData(0, 0, srcW, srcH).data;

    let landCount = 0;

    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const sx = Math.floor((gx / this.gridW) * srcW);
        const sy = Math.floor((gy / this.gridH) * srcH);
        const srcIdx = (sy * srcW + sx) * 4;
        const gIdx = gy * this.gridW + gx;

        const r = imgData[srcIdx];
        const g = imgData[srcIdx + 1];
        const b = imgData[srcIdx + 2];

        // Robust Land Detection Rule
        let isLand = false;
        if (b > g && b > r) {
          isLand = false; // Definite Blue Ocean
        } else if (g >= b * 1.35 && g > 35) {
          isLand = true;  // Lush Green Landmass
        } else if (r > b * 1.4 && g > b * 1.15 && (r > 60 || g > 60)) {
          isLand = true;  // Sandy Beach / Gold Shoreline / Brown River Delta
        } else if (g > b + 12 && g > 40) {
          isLand = true;
        }

        if (isLand) {
          this.landMask[gIdx] = 1;
          this.terrainColors[gIdx * 3] = r;
          this.terrainColors[gIdx * 3 + 1] = g;
          this.terrainColors[gIdx * 3 + 2] = b;
          landCount++;
        } else {
          this.landMask[gIdx] = 0;
        }
      }
    }

    // Safety fallback: if no land was detected, sample left half of canvas as land
    if (landCount === 0) {
      for (let gy = 0; gy < this.gridH; gy++) {
        for (let gx = 0; gx < Math.floor(this.gridW * 0.45); gx++) {
          const gIdx = gy * this.gridW + gx;
          this.landMask[gIdx] = 1;
          this.terrainColors[gIdx * 3] = 20;
          this.terrainColors[gIdx * 3 + 1] = 83;
          this.terrainColors[gIdx * 3 + 2] = 45;
        }
      }
    }

    this.spawnSedimentParticles();
    this.render();
  }

  /**
   * Spawn sediment particles along the land-water shoreline
   */
  spawnSedimentParticles() {
    this.sediments = [];
    const scaleX = this.canvas.width / this.gridW;
    const scaleY = this.canvas.height / this.gridH;

    for (let gy = 1; gy < this.gridH - 1; gy++) {
      for (let gx = 1; gx < this.gridW - 1; gx++) {
        const idx = gy * this.gridW + gx;
        if (this.landMask[idx] === 0) {
          const hasLandNeighbor = 
            this.landMask[(gy-1)*this.gridW + gx] === 1 ||
            this.landMask[(gy+1)*this.gridW + gx] === 1 ||
            this.landMask[gy*this.gridW + (gx-1)] === 1 ||
            this.landMask[gy*this.gridW + (gx+1)] === 1;

          if (hasLandNeighbor && Math.random() < 0.7) {
            this.sediments.push({
              x: (gx + Math.random() * 0.8) * scaleX,
              y: (gy + Math.random() * 0.8) * scaleY,
              gridX: gx,
              gridY: gy,
              health: 1.0
            });
          }
        }
      }
    }
  }

  /**
   * Single physics simulation step
   */
  step() {
    this.timeStep++;
    const gw = this.gridW;
    const gh = this.gridH;
    const c2 = this.waveSpeed * this.waveSpeed;

    // 1. Multi-Harmonic Oceanic Wave Swell Generation (Southern & Southeastern Open Waters)
    const waveSourceY = gh - 2;
    for (let gx = 0; gx < gw; gx++) {
      if (this.landMask[waveSourceY * gw + gx] === 0) {
        const primaryWave = Math.sin(this.timeStep * this.waveFrequency) * this.waveAmplitude;
        const harmonicWave = Math.sin(this.timeStep * this.waveFrequency * 0.65 + gx * 0.08) * (this.waveAmplitude * 0.45);
        const crossSwell = Math.cos(this.timeStep * this.waveFrequency * 0.35 - gx * 0.05) * (this.waveAmplitude * 0.30);
        const wave = primaryWave + harmonicWave + crossSwell;
        
        this.u[waveSourceY * gw + gx] = wave;
        if (waveSourceY + 1 < gh) {
          this.u[(waveSourceY + 1) * gw + gx] = wave * 0.92;
        }
      }
    }

    // 2. Wave equation discrete Laplacian
    let dissipatedInStep = 0;

    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const idx = y * gw + x;

        if (this.landMask[idx] === 1) {
          this.uNext[idx] = 0;
          continue;
        }

        let effectiveDamping = this.damping;
        if (this.defenseType === 'mangrove') {
          if (this.hasLandWithin(x, y, 3)) effectiveDamping *= 0.91;
        } else if (this.defenseType === 'breakwater') {
          if (y === Math.floor(gh * 0.65) && (x % 16 < 12)) {
            effectiveDamping *= 0.62;
          }
        }

        const laplacian = 
          this.u[idx - 1] + 
          this.u[idx + 1] + 
          this.u[idx - gw] + 
          this.u[idx + gw] - 
          4 * this.u[idx];

        let nextVal = (2 * this.u[idx] - this.uPrev[idx] + c2 * laplacian) * effectiveDamping;
        if (nextVal > 45) nextVal = 45;
        if (nextVal < -45) nextVal = -45;

        this.uNext[idx] = nextVal;

        // Wave Energy Accumulation
        const energy = nextVal * nextVal;
        this.energyMap[idx] = this.energyMap[idx] * 0.96 + energy * 0.04;

        if (this.hasLandWithin(x, y, 1)) {
          dissipatedInStep += energy * (0.05 * (this.fractalD - 0.9));
        }
      }
    }

    this.uPrev.set(this.u);
    this.u.set(this.uNext);
    this.dissipatedEnergy += dissipatedInStep;

    this.updateSediments();
  }

  hasLandWithin(gx, gy, radius) {
    const gw = this.gridW;
    const gh = this.gridH;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const ny = gy + dy;
        const nx = gx + dx;
        if (nx >= 0 && nx < gw && ny >= 0 && ny < gh) {
          if (this.landMask[ny * gw + nx] === 1) return true;
        }
      }
    }
    return false;
  }

  updateSediments() {
    const scaleX = this.canvas.width / this.gridW;
    const scaleY = this.canvas.height / this.gridH;
    let erodedThisStep = 0;

    for (let i = this.sediments.length - 1; i >= 0; i--) {
      const s = this.sediments[i];
      const gx = Math.min(Math.max(Math.floor(s.x / scaleX), 0), this.gridW - 1);
      const gy = Math.min(Math.max(Math.floor(s.y / scaleY), 0), this.gridH - 1);
      const idx = gy * this.gridW + gx;
      const localEnergy = this.energyMap[idx];

      if (localEnergy > 15) {
        const damage = (localEnergy - 15) * 0.0015;
        s.health -= damage;
        erodedThisStep += damage * 2;
        s.y += (localEnergy * 0.02) * (Math.random() * 0.5 + 0.5);
        s.x += (Math.random() - 0.5) * 1.5;
      }

      if (s.health <= 0 || s.y > this.canvas.height) {
        this.sediments.splice(i, 1);
      }
    }

    this.totalSediment = Math.max(0, this.totalSediment - erodedThisStep);
    this.erosionRate = erodedThisStep * 60;
  }

  /**
   * Render wave field ensuring landmass is ALWAYS fully preserved and visible
   */
  render(viewMode = 'wave') {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const gw = this.gridW;
    const gh = this.gridH;
    const cellW = width / gw;
    const cellH = height / gh;

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let y = 0; y < height; y++) {
      const gy = Math.floor((y / height) * gh);
      for (let x = 0; x < width; x++) {
        const gx = Math.floor((x / width) * gw);
        const gIdx = gy * gw + gx;
        const pIdx = (y * width + x) * 4;

        if (this.landMask[gIdx] === 1) {
          // Check if coastline boundary for sandy shoreline
          const isShoreline = !this.landMask[Math.max(0, gy - 1) * gw + gx] ||
                              !this.landMask[Math.min(gh - 1, gy + 1) * gw + gx] ||
                              !this.landMask[gy * gw + Math.max(0, gx - 1)] ||
                              !this.landMask[gy * gw + Math.min(gw - 1, gx + 1)];

          if (isShoreline) {
            // Sandy Beach Gold
            pixels[pIdx] = 234;     // R
            pixels[pIdx + 1] = 179; // G
            pixels[pIdx + 2] = 8;   // B
            pixels[pIdx + 3] = 255;
          } else {
            // Lush Green Landmass
            const tr = this.terrainColors[gIdx * 3] || 22;
            const tg = this.terrainColors[gIdx * 3 + 1] || 101;
            const tb = this.terrainColors[gIdx * 3 + 2] || 52;
            pixels[pIdx] = tr;
            pixels[pIdx + 1] = tg;
            pixels[pIdx + 2] = tb;
            pixels[pIdx + 3] = 255;
          }
        } else {
          // Ocean Water Rendering
          if (viewMode === 'energy') {
            // High-Definition Thermal Energy Heatmap (Deep Navy -> Cyan -> Green -> Gold -> Red)
            const e = Math.min(this.energyMap[gIdx] / 75, 1.0);
            let r, g, b;

            if (e < 0.25) {
              // Deep Ocean Navy to Electric Cyan
              const t = e / 0.25;
              r = Math.floor(10 + t * (14 - 10));
              g = Math.floor(20 + t * (165 - 20));
              b = Math.floor(55 + t * (233 - 55));
            } else if (e < 0.50) {
              // Cyan to Emerald Green
              const t = (e - 0.25) / 0.25;
              r = Math.floor(14 + t * (48 - 14));
              g = Math.floor(165 + t * (209 - 165));
              b = Math.floor(233 + t * (88 - 233));
            } else if (e < 0.75) {
              // Emerald Green to Radiant Gold/Amber
              const t = (e - 0.50) / 0.25;
              r = Math.floor(48 + t * (250 - 48));
              g = Math.floor(209 + t * (204 - 209));
              b = Math.floor(88 + t * (21 - 88));
            } else {
              // Radiant Gold to Intense Crimson Impact
              const t = (e - 0.75) / 0.25;
              r = Math.floor(250 + t * (255 - 250));
              g = Math.floor(204 + t * (45 - 204));
              b = Math.floor(21 + t * (30 - 21));
            }

            pixels[pIdx] = r;
            pixels[pIdx + 1] = g;
            pixels[pIdx + 2] = b;
            pixels[pIdx + 3] = 255;
          } else {
            // Dynamic Wave Surface (Deep Navy Ocean -> Glowing Cyan Wave Crests)
            const hVal = this.u[gIdx];
            const normH = Math.max(-1, Math.min(1, hVal / this.waveAmplitude));

            let r, g, b;
            if (normH >= 0) {
              r = Math.floor(8 + normH * 190);
              g = Math.floor(28 + normH * 227);
              b = Math.floor(65 + normH * 190);
            } else {
              r = Math.floor(Math.max(4, 8 + normH * 6));
              g = Math.floor(Math.max(10, 28 + normH * 20));
              b = Math.floor(Math.max(30, 65 + normH * 45));
            }

            pixels[pIdx] = r;
            pixels[pIdx + 1] = g;
            pixels[pIdx + 2] = b;
            pixels[pIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Defenses Overlay
    if (this.defenseType === 'mangrove') {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1;
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          if (this.landMask[gy * gw + gx] === 0 && this.hasLandWithin(gx, gy, 2)) {
            ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
          }
        }
      }
    } else if (this.defenseType === 'breakwater') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      const breakY = Math.floor(gh * 0.65) * cellH;
      for (let gx = 0; gx < gw; gx += 16) {
        ctx.fillRect(gx * cellW, breakY, 12 * cellW, 3 * cellH);
        ctx.strokeRect(gx * cellW, breakY, 12 * cellW, 3 * cellH);
      }
    }

    // Sediment Particles
    ctx.fillStyle = '#fde047';
    for (let i = 0; i < this.sediments.length; i++) {
      const s = this.sediments[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  start(viewMode = 'wave', onUpdate = null) {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      // Run 2 physics sub-steps per animation frame for rich, energetic hydrodynamic propagation
      this.step();
      this.step();
      this.render(viewMode);

      if (onUpdate && this.timeStep % 2 === 0) {
        onUpdate({
          totalSediment: this.totalSediment,
          sedimentLossPercent: ((this.initialSediment - this.totalSediment) / this.initialSediment) * 100,
          erosionRate: this.erosionRate,
          dissipatedEnergy: this.dissipatedEnergy,
          timeStep: this.timeStep
        });
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset() {
    this.stop();
    this.u.fill(0);
    this.uPrev.fill(0);
    this.uNext.fill(0);
    this.energyMap.fill(0);
    this.timeStep = 0;
    this.totalSediment = this.initialSediment;
    this.dissipatedEnergy = 0;
    this.spawnSedimentParticles();
    this.render();
  }
}
