/**
 * 2D Wave Physics, Energy Dissipation & Coastal Erosion Simulation Module
 * Simulates shallow water wave propagation, wave refraction at headlands,
 * wave energy dissipation across fractal coastlines, and sediment transport.
 */

class WaveErosionSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Grid resolution for wave physics (scaled down for 60fps performance)
    this.gridW = 120;
    this.gridH = 120;
    
    this.u = new Float32Array(this.gridW * this.gridH);      // current wave height
    this.uPrev = new Float32Array(this.gridW * this.gridH);  // previous step
    this.uNext = new Float32Array(this.gridW * this.gridH);  // next step
    this.energyMap = new Float32Array(this.gridW * this.gridH); // accumulated wave energy
    this.landMask = new Uint8Array(this.gridW * this.gridH); // 1 = land, 0 = ocean

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
    this.erosionRate = 0; // units/sec
    this.dissipatedEnergy = 0;
    this.defenseType = 'none'; // 'none', 'mangrove', 'breakwater'

    // Interactive sediment particles along coastline
    this.sediments = [];
  }

  /**
   * Initialize simulation grid from a binary edge/land matrix
   */
  loadLandMaskFromMatrix(matrix, srcW, srcH, fractalDimension = 1.20) {
    this.fractalD = fractalDimension;
    this.u.fill(0);
    this.uPrev.fill(0);
    this.uNext.fill(0);
    this.energyMap.fill(0);
    this.timeStep = 0;
    this.totalSediment = 1000;
    this.initialSediment = 1000;
    this.sediments = [];

    // Scale binary matrix to simulation grid dimensions
    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const sx = Math.floor((gx / this.gridW) * srcW);
        const sy = Math.floor((gy / this.gridH) * srcH);
        const srcIdx = sy * srcW + sx;
        const gIdx = gy * this.gridW + gx;

        // If land (or edge), mark as solid boundary
        this.landMask[gIdx] = (matrix && matrix[srcIdx] === 1) || (sy < srcH * 0.45 && matrix && matrix[srcIdx] === 1) ? 1 : 0;
      }
    }

    // Spawn sediment particles near the shoreline
    this.spawnSedimentParticles();
    this.render();
  }

  /**
   * Spawn sediment particles along the land-water interface
   */
  spawnSedimentParticles() {
    this.sediments = [];
    const scaleX = this.canvas.width / this.gridW;
    const scaleY = this.canvas.height / this.gridH;

    for (let gy = 1; gy < this.gridH - 1; gy++) {
      for (let gx = 1; gx < this.gridW - 1; gx++) {
        const idx = gy * this.gridW + gx;
        // Check if ocean pixel adjacent to land pixel
        if (this.landMask[idx] === 0) {
          const hasLandNeighbor = 
            this.landMask[(gy-1)*this.gridW + gx] === 1 ||
            this.landMask[(gy+1)*this.gridW + gx] === 1 ||
            this.landMask[gy*this.gridW + (gx-1)] === 1 ||
            this.landMask[gy*this.gridW + (gx+1)] === 1;

          if (hasLandNeighbor && Math.random() < 0.6) {
            this.sediments.push({
              x: (gx + Math.random() * 0.8) * scaleX,
              y: (gy + Math.random() * 0.8) * scaleY,
              gridX: gx,
              gridY: gy,
              health: 1.0,
              velocity: { x: 0, y: 0 }
            });
          }
        }
      }
    }
  }

  /**
   * Single physics simulation step (2D Wave Equation + Shallow Water Dissipation)
   */
  step() {
    this.timeStep++;
    const gw = this.gridW;
    const gh = this.gridH;
    const c2 = this.waveSpeed * this.waveSpeed;

    // 1. Oscillating wave source at bottom ocean boundary (Monsoon ocean swell)
    const waveSourceY = gh - 2;
    for (let gx = 0; gx < gw; gx++) {
      if (this.landMask[waveSourceY * gw + gx] === 0) {
        // Multi-frequency wave train mimicking sea conditions
        const wave = Math.sin(this.timeStep * this.waveFrequency) * this.waveAmplitude
                   + Math.sin(this.timeStep * this.waveFrequency * 0.5 + gx * 0.08) * (this.waveAmplitude * 0.35);
        this.u[waveSourceY * gw + gx] = wave;
      }
    }

    // 2. Finite difference wave equation update: uNext = 2*u - uPrev + c^2 * Laplacian(u)
    let currentEnergySum = 0;
    let dissipatedInStep = 0;

    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const idx = y * gw + x;

        if (this.landMask[idx] === 1) {
          this.uNext[idx] = 0;
          continue;
        }

        // Coastal Defense attenuation damping
        let effectiveDamping = this.damping;
        if (this.defenseType === 'mangrove') {
          // Mangrove root zone attenuates waves heavily
          const hasLandNearby = this.hasLandWithin(x, y, 3);
          if (hasLandNearby) effectiveDamping *= 0.92;
        } else if (this.defenseType === 'breakwater') {
          // Offshore breakwater blocks waves at mid-grid
          if (y === Math.floor(gh * 0.65) && (x % 16 < 12)) {
            effectiveDamping *= 0.60;
          }
        }

        // 5-point discrete Laplacian
        const laplacian = 
          this.u[idx - 1] + 
          this.u[idx + 1] + 
          this.u[idx - gw] + 
          this.u[idx + gw] - 
          4 * this.u[idx];

        let nextVal = (2 * this.u[idx] - this.uPrev[idx] + c2 * laplacian) * effectiveDamping;
        
        // Clamp extreme values
        if (nextVal > 40) nextVal = 40;
        if (nextVal < -40) nextVal = -40;

        this.uNext[idx] = nextVal;

        // Wave Energy Density E ~ Amplitude^2
        const energy = nextVal * nextVal;
        this.energyMap[idx] = this.energyMap[idx] * 0.97 + energy * 0.03;
        currentEnergySum += energy;

        // Energy dissipation by fractal geometry roughness
        if (this.hasLandWithin(x, y, 1)) {
          dissipatedInStep += energy * (0.05 * (this.fractalD - 0.9));
        }
      }
    }

    // Cycle arrays
    this.uPrev.set(this.u);
    this.u.set(this.uNext);

    this.dissipatedEnergy += dissipatedInStep;

    // 3. Update sediment budget & erosion
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

  /**
   * Update sediment particles based on local wave stress and erosion
   */
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
      
      // Erosion stress threshold
      if (localEnergy > 15) {
        const erosionDamage = (localEnergy - 15) * 0.0015;
        s.health -= erosionDamage;
        erodedThisStep += erosionDamage * 2;

        // Transport sediment particles offshore/longshore
        s.y += (localEnergy * 0.02) * (Math.random() * 0.5 + 0.5);
        s.x += (Math.random() - 0.5) * 1.5;
      }

      // Remove depleted sediment particles
      if (s.health <= 0 || s.y > this.canvas.height) {
        this.sediments.splice(i, 1);
      }
    }

    this.totalSediment = Math.max(0, this.totalSediment - erodedThisStep);
    this.erosionRate = erodedThisStep * 60; // per second rate
  }

  /**
   * Render the 2D Wave field, landmass, and sediment particles onto canvas
   */
  render(viewMode = 'wave') {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const gw = this.gridW;
    const gh = this.gridH;

    const cellW = width / gw;
    const cellH = height / gh;

    // Create pixel buffer for high performance 60fps rendering
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let y = 0; y < height; y++) {
      const gy = Math.floor((y / height) * gh);
      for (let x = 0; x < width; x++) {
        const gx = Math.floor((x / width) * gw);
        const gIdx = gy * gw + gx;
        const pIdx = (y * width + x) * 4;

        if (this.landMask[gIdx] === 1) {
          // Land styling (Green emerald terrain)
          pixels[pIdx] = 22;     // R
          pixels[pIdx + 1] = 101; // G
          pixels[pIdx + 2] = 52;  // B
          pixels[pIdx + 3] = 255;
        } else {
          if (viewMode === 'energy') {
            // Wave Energy & Stress Heatmap (Blue -> Cyan -> Yellow -> Red)
            const energyVal = Math.min(this.energyMap[gIdx] / 60, 1.0);
            const r = Math.floor(Math.min(255, energyVal * 350));
            const g = Math.floor(Math.sin(energyVal * Math.PI) * 220);
            const b = Math.floor((1 - energyVal) * 240);

            pixels[pIdx] = r;
            pixels[pIdx + 1] = g;
            pixels[pIdx + 2] = b;
            pixels[pIdx + 3] = 255;
          } else {
            // Wave Height Surface (Deep Navy -> Cyan Wave crests)
            const hVal = this.u[gIdx];
            const normH = Math.max(-1, Math.min(1, hVal / this.waveAmplitude));

            let r, g, b;
            if (normH >= 0) {
              // Wave Crest: bright cyan / white foam
              r = Math.floor(6 + normH * 160);
              g = Math.floor(30 + normH * 210);
              b = Math.floor(70 + normH * 185);
            } else {
              // Wave Trough: dark navy ocean deep
              r = Math.floor(Math.max(2, 6 + normH * 5));
              g = Math.floor(Math.max(8, 30 + normH * 20));
              b = Math.floor(Math.max(25, 70 + normH * 45));
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

    // Draw Coastal Defenses overlay if active
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

    // Draw Sediment particles (golden sand particles)
    ctx.fillStyle = '#fde047';
    for (let i = 0; i < this.sediments.length; i++) {
      const s = this.sediments[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Start 60fps physics simulation loop
   */
  start(viewMode = 'wave', onUpdate = null) {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      this.step();
      this.render(viewMode);

      if (onUpdate && this.timeStep % 3 === 0) {
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

  /**
   * Stop physics simulation loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset wave fields & sediment budget
   */
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
