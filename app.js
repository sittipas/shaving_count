/* ========================================
   BladeTrack – Application Logic
   Three.js 3D blade + localStorage
   Water-tracker inspired fluid aesthetics
   ======================================== */

(function () {
  'use strict';

  // ---- Constants ----
  const STORAGE_KEY = 'bladetrack_data';

  // ---- DOM Elements ----
  const els = {
    currentCount: document.getElementById('currentCount'),
    maxShaves: document.getElementById('maxShaves'),
    modalMaxShaves: document.getElementById('modalMaxShaves'),
    remainingCount: document.getElementById('remainingCount'),
    totalBlades: document.getElementById('totalBlades'),
    totalShaves: document.getElementById('totalShaves'),
    shaveBtn: document.getElementById('shaveBtn'),
    replaceModal: document.getElementById('replaceModal'),
    replaceBtn: document.getElementById('replaceBtn'),
    dismissBtn: document.getElementById('dismissBtn'),
    resetToggle: document.getElementById('resetToggle'),
    resetModal: document.getElementById('resetModal'),
    confirmResetBladeBtn: document.getElementById('confirmResetBladeBtn'),
    confirmResetAllBtn: document.getElementById('confirmResetAllBtn'),
    dismissResetBtn: document.getElementById('dismissResetBtn'),
    sheetResetBladeBtn: document.getElementById('sheetResetBladeBtn'),
    sheetResetAllBtn: document.getElementById('sheetResetAllBtn'),
    historyToggle: document.getElementById('historyToggle'),
    historyPanel: document.getElementById('historyPanel'),
    historyClose: document.getElementById('historyClose'),
    historyList: document.getElementById('historyList'),
    historyInline: document.getElementById('historyInline'),
    resetBtn: document.getElementById('resetBtn'),
    maxInput: document.getElementById('maxInput'),
    decreaseMax: document.getElementById('decreaseMax'),
    increaseMax: document.getElementById('increaseMax'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    blade3dContainer: document.getElementById('blade3dContainer'),
  };

  // ---- Default Data ----
  function defaultData() {
    return {
      maxShaves: 30,
      currentShaves: 0,
      totalShaves: 0,
      totalBlades: 0,
      currentBladeStart: new Date().toISOString(),
      history: [],
    };
  }

  // ---- State ----
  let data = loadData();

  // ---- Storage ----
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultData(), ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load data, using defaults', e);
    }
    return defaultData();
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save data', e);
    }
  }

  // ============================================================
  // THREE.JS 3D SCENE: BLADE + FLUID RIPPLES
  // ============================================================
  let scene = null;
  let camera = null;
  let renderer = null;
  let bladeGroup = null;
  let rippleMesh = null;
  let rippleGeo = null;
  let ripplePoints = null;
  let pointLight = null;
  let flashLight = null;
  let spinVelocity = 0.015;
  let spinBoost = 0;
  let shockwaveTimer = 0;
  let isPointerDown = false;
  let lastPointerX = 0;

  function initThreeScene() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js is not loaded yet');
      return false;
    }

    const container = els.blade3dContainer;
    if (!container) return false;

    const w = container.clientWidth || 320;
    const h = container.clientHeight || 220;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 1.1, 4.2);
    camera.lookAt(0, 0, 0);

    // Renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      console.error('WebGLRenderer initialization failed:', err);
      return false;
    }

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xd0e4f7, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.0);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    pointLight = new THREE.PointLight(0x00d4ff, 1.2, 12);
    pointLight.position.set(0, 2.5, 2.5);
    scene.add(pointLight);

    flashLight = new THREE.PointLight(0xffffff, 0, 8);
    flashLight.position.set(0, 0.5, 2);
    scene.add(flashLight);

    // Build the 3D double edge razor blade
    buildRazorBlade();

    // Build fluid water-wave ripples beneath the blade
    buildWaveRipples();

    // Interactive pointer drag to rotate
    setupInteraction(container);

    // Resize handling
    window.addEventListener('resize', onResize);

    // Animation loop
    animate();
    return true;
  }

  // --- Create authentic Double-Edge Safety Razor Blade geometry ---
  function createBladeGeometry() {
    const shape = new THREE.Shape();
    const w = 1.6;
    const h = 0.85;
    const nw = 0.14;
    const nh = 0.14;

    // Outer contour with corner tabs/notches (counter-clockwise)
    shape.moveTo(-w + nw, -h);
    shape.lineTo(w - nw, -h);
    shape.lineTo(w - nw, -h + nh);
    shape.lineTo(w, -h + nh);
    shape.lineTo(w, h - nh);
    shape.lineTo(w - nw, h - nh);
    shape.lineTo(w - nw, h);
    shape.lineTo(-w + nw, h);
    shape.lineTo(-w + nw, h - nh);
    shape.lineTo(-w, h - nh);
    shape.lineTo(-w, -h + nh);
    shape.lineTo(-w + nw, -h + nh);
    shape.closePath();

    // Clean, non-intersecting cutouts:
    // 1. Center circular arbor hole
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 0.24, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    // 2. Left horizontal slot
    const leftSlot = new THREE.Path();
    leftSlot.moveTo(-1.25, -0.05);
    leftSlot.lineTo(-0.28, -0.05);
    leftSlot.lineTo(-0.28, 0.05);
    leftSlot.lineTo(-1.25, 0.05);
    leftSlot.closePath();
    shape.holes.push(leftSlot);

    // 3. Right horizontal slot
    const rightSlot = new THREE.Path();
    rightSlot.moveTo(0.28, -0.05);
    rightSlot.lineTo(1.25, -0.05);
    rightSlot.lineTo(1.25, 0.05);
    rightSlot.lineTo(0.28, 0.05);
    rightSlot.closePath();
    shape.holes.push(rightSlot);

    // 4. Left alignment notch
    const leftNotch = new THREE.Path();
    leftNotch.moveTo(-0.75, -0.16);
    leftNotch.lineTo(-0.65, -0.16);
    leftNotch.lineTo(-0.65, 0.16);
    leftNotch.lineTo(-0.75, 0.16);
    leftNotch.closePath();
    shape.holes.push(leftNotch);

    // 5. Right alignment notch
    const rightNotch = new THREE.Path();
    rightNotch.moveTo(0.65, -0.16);
    rightNotch.lineTo(0.75, -0.16);
    rightNotch.lineTo(0.75, 0.16);
    rightNotch.lineTo(0.65, 0.16);
    rightNotch.closePath();
    shape.holes.push(rightNotch);

    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.012,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }

  // --- Blade texture with micro engraving ---
  function createBladeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Subtle brushed metal base
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Brushed metal streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Laser engraved text
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLADETRACK', 256, 80);

    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.fillText('PLATINUM • STAINLESS STEEL', 256, 185);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function buildRazorBlade() {
    if (!scene || typeof THREE === 'undefined') return;

    if (bladeGroup) {
      scene.remove(bladeGroup);
      while (bladeGroup.children.length > 0) {
        const obj = bladeGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
        bladeGroup.remove(obj);
      }
    } else {
      bladeGroup = new THREE.Group();
    }

    const pct = Math.min(1, data.currentShaves / data.maxShaves);
    const bladeGeo = createBladeGeometry();

    // Material dynamically adapts based on blade freshness
    const freshColor = new THREE.Color(0xf8fafc);
    const wornColor = new THREE.Color(0x8a7b6c);
    const bladeColor = freshColor.clone().lerp(wornColor, pct);

    const texture = createBladeTexture();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      metalness: THREE.MathUtils.lerp(0.92, 0.45, pct),
      roughness: THREE.MathUtils.lerp(0.18, 0.55, pct),
      map: texture,
      side: THREE.DoubleSide,
    });

    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeGroup.add(bladeMesh);

    // Razor beveled cutting edges (top and bottom honed strips)
    const edgeMat = new THREE.MeshStandardMaterial({
      color: pct > 0.8 ? 0xf59e0b : 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
      emissive: pct > 0.85 ? new THREE.Color(0x331100) : new THREE.Color(0x000000),
      side: THREE.DoubleSide,
    });

    const topEdgeGeo = new THREE.BoxGeometry(3.0, 0.012, 0.035);
    const topEdge = new THREE.Mesh(topEdgeGeo, edgeMat);
    topEdge.position.set(0, 0.84, 0);
    bladeGroup.add(topEdge);

    const bottomEdgeGeo = new THREE.BoxGeometry(3.0, 0.012, 0.035);
    const bottomEdge = new THREE.Mesh(bottomEdgeGeo, edgeMat);
    bottomEdge.position.set(0, -0.84, 0);
    bladeGroup.add(bottomEdge);

    // Initial position & tilt
    bladeGroup.position.set(0, 0.08, 0);
    bladeGroup.rotation.x = 0.25;

    scene.add(bladeGroup);
  }

  // --- Build fluid ripple mesh (mirroring water_tracker.gif wave visual) ---
  function buildWaveRipples() {
    if (!scene || typeof THREE === 'undefined') return;

    const size = 9;
    const segs = 40;
    rippleGeo = new THREE.PlaneGeometry(size, size, segs, segs);

    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });

    rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    rippleMesh.rotation.x = -Math.PI / 2.3;
    rippleMesh.position.set(0, -1.0, -0.2);
    scene.add(rippleMesh);

    // Ambient floating cyan particles
    const pCount = 70;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 6;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 3 - 0.2;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    ripplePoints = new THREE.Points(pGeo, pMat);
    scene.add(ripplePoints);
  }

  // --- Mouse / Touch interaction for 3D blade ---
  function setupInteraction(container) {
    container.addEventListener('pointerdown', (e) => {
      isPointerDown = true;
      lastPointerX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!isPointerDown || !bladeGroup) return;
      const deltaX = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      bladeGroup.rotation.y += deltaX * 0.015;
      spinVelocity = deltaX * 0.005;
    });

    window.addEventListener('pointerup', () => {
      isPointerDown = false;
    });
  }

  // --- Main Animation Loop ---
  function animate() {
    requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const t = performance.now() * 0.001;

    // Blade rotation & hovering bob
    if (bladeGroup) {
      if (!isPointerDown) {
        bladeGroup.rotation.y += spinVelocity + spinBoost;
        // Natural friction decay on spin boost
        spinBoost *= 0.95;
        spinVelocity = THREE.MathUtils.lerp(spinVelocity, 0.012, 0.03);
      }
      bladeGroup.position.y = 0.08 + Math.sin(t * 1.8) * 0.07;
      bladeGroup.rotation.x = 0.25 + Math.sin(t * 1.2) * 0.05;
    }

    // Flash light decay
    if (flashLight && flashLight.intensity > 0.01) {
      flashLight.intensity *= 0.88;
    }

    // Animate concentric water-style ripples
    if (rippleGeo) {
      const pos = rippleGeo.attributes.position;
      const shockWaveFactor = shockwaveTimer > 0 ? (1 + shockwaveTimer * 1.5) : 1;
      shockwaveTimer = Math.max(0, shockwaveTimer - 0.03);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const dist = Math.sqrt(x * x + y * y);

        // Concentric wave ripple equation
        let z = Math.sin(dist * 3.8 - t * 3.0) * (0.16 * shockWaveFactor) / (dist * 0.5 + 0.7);

        // Center depression (vortex drop like in water tracker GIF)
        z -= 0.25 / (dist * 1.2 + 0.8);

        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    // Ambient floating particles
    if (ripplePoints) {
      const positions = ripplePoints.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.003;
        if (positions[i + 1] > 2) {
          positions[i + 1] = -1.5;
        }
      }
      ripplePoints.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    const container = els.blade3dContainer;
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth || 320;
    const h = container.clientHeight || 220;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function triggerBladeCelebration() {
    spinBoost = 0.35;
    shockwaveTimer = 1.0;
    if (flashLight) {
      flashLight.intensity = 3.5;
    }
  }

  // ============================================================
  // APP RENDERING & UI UPDATES
  // ============================================================

  function renderUI() {
    // Update numbers
    els.currentCount.textContent = data.currentShaves;
    els.maxShaves.textContent = data.maxShaves;
    if (els.modalMaxShaves) els.modalMaxShaves.textContent = data.maxShaves;
    els.remainingCount.textContent = Math.max(0, data.maxShaves - data.currentShaves);
    els.totalBlades.textContent = data.totalBlades;
    els.totalShaves.textContent = data.totalShaves;
    els.maxInput.value = data.maxShaves;

    // Update inline history below the button
    renderInlineHistory();
  }

  function render() {
    renderUI();
    if (scene) {
      buildRazorBlade();
    }
  }

  function renderInlineHistory() {
    let html = '';

    // Current blade entry
    if (data.currentShaves > 0) {
      const pct = Math.min(100, Math.round((data.currentShaves / data.maxShaves) * 100));
      html += `
        <div class="history-inline-item">
          <div class="inline-dot current"></div>
          <div class="inline-info">
            <span class="inline-date">${formatDate(data.currentBladeStart)}</span>
            <span class="inline-text">You used ${data.currentShaves} of ${data.maxShaves} shaves</span>
          </div>
          <div class="inline-pct">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <line x1="8" y1="6" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="18"/>
            </svg>
            ${pct}%
          </div>
        </div>`;
    }

    // Past blades
    const recentBlades = data.history.slice(0, 2);
    recentBlades.forEach((blade) => {
      const pct = Math.min(100, Math.round((blade.shaves / data.maxShaves) * 100));
      html += `
        <div class="history-inline-item">
          <div class="inline-dot past"></div>
          <div class="inline-info">
            <span class="inline-date">${formatDate(blade.endDate)}</span>
            <span class="inline-text">You used ${blade.shaves} shaves on Blade #${blade.bladeNumber}</span>
          </div>
          <div class="inline-pct">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <line x1="8" y1="6" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="18"/>
            </svg>
            ${pct}%
          </div>
        </div>`;
    });

    if (!html) {
      html = `
        <div class="history-inline-empty">
          <span>Tap "LOG SHAVE" to start tracking this blade</span>
        </div>`;
    }

    els.historyInline.innerHTML = html;
  }

  // ============================================================
  // USER ACTIONS & RESET LOGIC
  // ============================================================

  function logShave() {
    data.currentShaves++;
    data.totalShaves++;
    saveData();
    render();

    // Trigger 3D celebration spin and shockwave
    triggerBladeCelebration();

    // Number bump animation
    els.currentCount.classList.remove('bump');
    void els.currentCount.offsetWidth;
    els.currentCount.classList.add('bump');

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    // Check if blade exceeded max recommended shaves
    if (data.currentShaves >= data.maxShaves) {
      setTimeout(() => showReplaceModal(), 600);
    }
  }

  function replaceBlade() {
    data.history.unshift({
      bladeNumber: data.totalBlades + 1,
      shaves: data.currentShaves,
      startDate: data.currentBladeStart,
      endDate: new Date().toISOString(),
    });

    data.totalBlades++;
    data.currentShaves = 0;
    data.currentBladeStart = new Date().toISOString();
    saveData();
    render();
    hideReplaceModal();
    showToast('✨ New blade loaded — fresh start!');
    launchConfetti();
  }

  // ---- Modal Handling ----
  function showReplaceModal() {
    els.replaceModal.classList.add('active');
  }

  function hideReplaceModal() {
    els.replaceModal.classList.remove('active');
  }

  function showResetModal() {
    if (els.resetModal) {
      els.resetModal.classList.add('active');
    }
  }

  function hideResetModal() {
    if (els.resetModal) {
      els.resetModal.classList.remove('active');
    }
  }

  // ---- Reset Actions (Guaranteed & Unblockable) ----
  function resetCurrentBlade() {
    data.currentShaves = 0;
    data.currentBladeStart = new Date().toISOString();
    saveData();
    render();
    hideResetModal();
    const sheet = document.getElementById('settingsSheet');
    if (sheet) sheet.classList.remove('active');
    showToast('Current blade reset to 0 shaves');
  }

  function resetAllData() {
    localStorage.removeItem(STORAGE_KEY);
    data = defaultData();
    saveData();
    render();
    hideResetModal();
    closeHistory();
    const sheet = document.getElementById('settingsSheet');
    if (sheet) sheet.classList.remove('active');
    showToast('All tracking data reset');
  }

  // ---- History Panel ----
  function openHistory() {
    renderHistory();
    els.historyPanel.classList.add('active');
    getOrCreateOverlay().classList.add('active');
  }

  function closeHistory() {
    els.historyPanel.classList.remove('active');
    getOrCreateOverlay().classList.remove('active');
  }

  function getOrCreateOverlay() {
    let overlay = document.querySelector('.panel-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'panel-overlay';
      overlay.addEventListener('click', closeHistory);
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function renderHistory() {
    if (data.history.length === 0 && data.currentShaves === 0) {
      els.historyList.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon">🪒</div>
          <div>No blades tracked yet.<br>Log your first shave to get started!</div>
        </div>`;
      return;
    }

    let html = '';

    html += `
      <div class="history-item">
        <div class="history-badge current">🟢</div>
        <div class="history-info">
          <strong>Current Blade</strong>
          <span>Started ${formatDate(data.currentBladeStart)}</span>
        </div>
        <div class="history-shaves">${data.currentShaves}/${data.maxShaves} shaves</div>
      </div>`;

    data.history.forEach((blade) => {
      html += `
        <div class="history-item">
          <div class="history-badge past">🔘</div>
          <div class="history-info">
            <strong>Blade #${blade.bladeNumber}</strong>
            <span>${formatDate(blade.startDate)} — ${formatDate(blade.endDate)}</span>
          </div>
          <div class="history-shaves">${blade.shaves} shaves</div>
        </div>`;
    });

    els.historyList.innerHTML = html;
  }

  // ---- Settings ----
  function changeMax(delta) {
    const newVal = data.maxShaves + delta;
    if (newVal >= 1 && newVal <= 99) {
      data.maxShaves = newVal;
      saveData();
      render();
    }
  }

  function handleMaxInput() {
    const val = parseInt(els.maxInput.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      data.maxShaves = val;
      saveData();
      render();
    }
  }

  // ---- Toast ----
  function showToast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add('active');
    setTimeout(() => els.toast.classList.remove('active'), 2500);
  }

  // ---- Confetti ----
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const colors = ['#00d4ff', '#00b4d8', '#38bdf8', '#22c55e', '#f59e0b', '#ec4899', '#818cf8'];
    const particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 14 + 5),
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.22 + Math.random() * 0.1,
        opacity: 1,
      });
    }

    let frame = 0;
    function animateConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.007;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      frame++;
      if (alive && frame < 200) {
        requestAnimationFrame(animateConfetti);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animateConfetti);
  }

  // ---- Utilities ----
  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ---- Button ripple pointer effect ----
  els.shaveBtn.addEventListener('mousemove', (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.target.style.setProperty('--x', x + '%');
    e.target.style.setProperty('--y', y + '%');
  });

  // ---- Settings toggle via count-subtitle ----
  const subtitle = document.querySelector('.count-subtitle');
  if (subtitle) {
    subtitle.addEventListener('click', () => {
      const sheet = document.getElementById('settingsSheet');
      sheet.classList.toggle('active');
    });
  }

  document.addEventListener('click', (e) => {
    const sheet = document.getElementById('settingsSheet');
    if (sheet && sheet.classList.contains('active') &&
        !sheet.contains(e.target) &&
        subtitle && !subtitle.contains(e.target)) {
      sheet.classList.remove('active');
    }
  });

  // ---- Event Listeners ----
  els.shaveBtn.addEventListener('click', logShave);
  els.replaceBtn.addEventListener('click', replaceBlade);
  els.dismissBtn.addEventListener('click', hideReplaceModal);

  // Reset Listeners
  if (els.resetToggle) els.resetToggle.addEventListener('click', showResetModal);
  if (els.dismissResetBtn) els.dismissResetBtn.addEventListener('click', hideResetModal);
  if (els.confirmResetBladeBtn) els.confirmResetBladeBtn.addEventListener('click', resetCurrentBlade);
  if (els.confirmResetAllBtn) els.confirmResetAllBtn.addEventListener('click', resetAllData);
  if (els.sheetResetBladeBtn) els.sheetResetBladeBtn.addEventListener('click', resetCurrentBlade);
  if (els.sheetResetAllBtn) els.sheetResetAllBtn.addEventListener('click', showResetModal);
  if (els.resetBtn) els.resetBtn.addEventListener('click', showResetModal);

  // History Panel
  els.historyToggle.addEventListener('click', openHistory);
  els.historyClose.addEventListener('click', closeHistory);

  // Shaves per blade adjusters
  els.decreaseMax.addEventListener('click', () => changeMax(-1));
  els.increaseMax.addEventListener('click', () => changeMax(1));
  els.maxInput.addEventListener('change', handleMaxInput);

  // Keyboard shortcut: Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideReplaceModal();
      hideResetModal();
      closeHistory();
      const sheet = document.getElementById('settingsSheet');
      if (sheet) sheet.classList.remove('active');
    }
  });

  // ---- Initialize Application ----
  function startApp() {
    renderUI();

    function tryStart3D() {
      if (typeof THREE !== 'undefined') {
        initThreeScene();
      } else {
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          if (typeof THREE !== 'undefined') {
            clearInterval(timer);
            initThreeScene();
          } else if (attempts > 50) {
            clearInterval(timer);
            console.error('Three.js library failed to load.');
          }
        }, 60);
      }
    }

    tryStart3D();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

})();
