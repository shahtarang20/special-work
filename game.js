(function () {
  "use strict";

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const comboEl = document.getElementById('combo');
  const startOverlay = document.getElementById('startOverlay');
  const endOverlay = document.getElementById('endOverlay');
  const startBtn = document.getElementById('startBtn');
  const retryBtn = document.getElementById('retryBtn');
  const endScoreEl = document.getElementById('endScore');
  const endBestEl = document.getElementById('endBest');
  const endTitleEl = document.getElementById('endTitle');
  const endBadgeEl = document.getElementById('endBadge');
  const muteBtn = document.getElementById('muteBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const milestoneEl = document.getElementById('milestone');
  const shareBtn = document.getElementById('shareBtn');
  const topScoresStart = document.getElementById('topScoresStart');
  const topScoresListStart = document.getElementById('topScoresListStart');
  const topScoresEnd = document.getElementById('topScoresEnd');
  const topScoresListEnd = document.getElementById('topScoresListEnd');

  let DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  let W = 0, H = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- persistence ----------
  let best = 0;
  try { best = parseInt(localStorage.getItem('skyline_best') || '0', 10) || 0; } catch (e) {}
  bestEl.textContent = 'BEST ' + best;

  // ---------- audio (synth, no assets) ----------
  let audioCtx = null;
  let muted = false;
  try { muted = localStorage.getItem('skyline_muted') === '1'; } catch (e) {}
  updateMuteIcon();

  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
  }
  function beep(freq, dur, type, vol) {
    if (muted || !audioCtx) return;
    try {
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  function sfxDrop(pitch) { beep(220 + pitch * 14, 0.12, 'triangle', 0.16); }
  function sfxPerfect() { beep(880, 0.09, 'sine', 0.2); setTimeout(() => beep(1180, 0.14, 'sine', 0.16), 60); }
  function sfxFail() { beep(140, 0.4, 'sawtooth', 0.14); }

  muteBtn.addEventListener('click', function () {
    muted = !muted;
    try { localStorage.setItem('skyline_muted', muted ? '1' : '0'); } catch (e) {}
    updateMuteIcon();
  });
  function updateMuteIcon() { muteBtn.textContent = muted ? '🔇' : '🔊'; }

  // ---------- top score history (local, per-browser) ----------
  function loadTopScores() {
    try { return JSON.parse(localStorage.getItem('skyline_top_scores') || '[]'); }
    catch (e) { return []; }
  }
  function saveTopScores(list) {
    try { localStorage.setItem('skyline_top_scores', JSON.stringify(list)); } catch (e) {}
  }
  function recordScore(s) {
    if (s <= 0) return;
    const list = loadTopScores();
    list.push(s);
    list.sort((a, b) => b - a);
    saveTopScores(list.slice(0, 5));
  }
  function renderTopScores(listEl, wrapEl) {
    const list = loadTopScores();
    if (!list.length) { wrapEl.hidden = true; return; }
    wrapEl.hidden = false;
    listEl.innerHTML = list.map((s, i) =>
      '<li><span>#' + (i + 1) + '</span><span>' + s + '</span></li>'
    ).join('');
  }

  // ---------- haptics ----------
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  // ---------- milestone toasts ----------
  const MILESTONES = {
    10: "You're on a roll!",
    25: 'Skyscraper status!',
    50: 'Halfway to legendary!',
    100: 'Sky is not the limit!',
  };
  let lastMilestoneShown = 0;
  function checkMilestone(s) {
    const hit = Object.keys(MILESTONES).map(Number).find(m => s === m);
    if (hit && hit !== lastMilestoneShown) {
      lastMilestoneShown = hit;
      showMilestone(hit + ' — ' + MILESTONES[hit]);
    }
  }
  function showMilestone(text) {
    milestoneEl.textContent = text;
    milestoneEl.classList.remove('show');
    void milestoneEl.offsetWidth;
    milestoneEl.classList.add('show');
    clearTimeout(showMilestone._t);
    showMilestone._t = setTimeout(() => milestoneEl.classList.remove('show'), 1400);
  }

  // ---------- pause ----------
  let paused = false;
  function setPaused(v) {
    if (state !== 'playing' && !v) return;
    paused = v;
    pauseOverlay.hidden = !v;
    pauseBtn.textContent = v ? '▶' : '⏸';
    if (audioCtx) { try { v ? audioCtx.suspend() : audioCtx.resume(); } catch (e) {} }
  }
  pauseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (state === 'playing') setPaused(!paused);
  });
  resumeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setPaused(false);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing') setPaused(true);
  });

  // ---------- share ----------
  shareBtn.addEventListener('click', async function (e) {
    e.stopPropagation();
    const text = 'I scored ' + score + ' in Skyline Stacker! Can you beat it?';
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Skyline Stacker', text: text, url: url });
      } else {
        await navigator.clipboard.writeText(text + ' ' + url);
        shareBtn.textContent = 'Copied!';
        setTimeout(() => { shareBtn.textContent = 'Share score'; }, 1500);
      }
    } catch (err) {}
  });

  // ---------- parallax skyline background ----------
  const SKYLINE_BUILDINGS = (function () {
    const arr = [];
    let seed = 42;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (let i = 0; i < 24; i++) {
      arr.push({
        x: i * 46 - 200,
        w: 30 + rand() * 20,
        h: 60 + rand() * 160,
        alpha: 0.05 + rand() * 0.05,
      });
    }
    return arr;
  })();

  // ---------- palette ----------
  const PALETTE = [
    ['#ff6f9c', '#ff9a6f'],
    ['#ffd166', '#ff9a6f'],
    ['#5ce6c0', '#4ecdc4'],
    ['#a78bfa', '#7c6bff'],
    ['#6fb8ff', '#5ce6c0'],
    ['#ff9a6f', '#ffd166'],
  ];
  function colorFor(i) { return PALETTE[i % PALETTE.length]; }

  // ---------- game state ----------
  const BASE_W = 220;
  const BLOCK_H = 34;
  let state = 'idle'; // idle | playing | over | over-falling
  let blocks = [];
  let current = null;
  let camY = 0, camYTarget = 0;
  let score = 0;
  let combo = 0;
  let particles = [];
  let fallingCuts = [];
  let shake = 0;
  let lastTime = 0;

  function worldToScreenScale() { return W / 320; }

  function reset() {
    blocks = [{ x: -BASE_W / 2, w: BASE_W, colorIdx: 0 }];
    score = 0;
    combo = 0;
    camY = 0; camYTarget = 0;
    particles = [];
    fallingCuts = [];
    shake = 0;
    lastMilestoneShown = 0;
    paused = false;
    pauseOverlay.hidden = true;
    pauseBtn.textContent = '⏸';
    spawnNext();
    updateScoreUI();
  }

  function spawnNext() {
    const last = blocks[blocks.length - 1];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = Math.min(3.6, 1.5 + blocks.length * 0.045) * (W / 320);
    current = {
      x: last.x + dir * (W / 320) * 140,
      w: last.w,
      colorIdx: blocks.length,
      dir: dir,
      speed: speed,
      dropping: false,
      dropVel: 0,
    };
  }

  function updateScoreUI() { scoreEl.textContent = String(score); }

  function showCombo(text) {
    comboEl.textContent = text;
    comboEl.classList.remove('show');
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => comboEl.classList.remove('show'), 700);
  }

  function drop() {
    if (state !== 'playing' || !current || current.dropping) return;
    current.dropping = true;
    current.dropVel = 0;
  }

  function onAction() {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (paused) return;
    if (state === 'idle') startGame();
    else if (state === 'playing') drop();
    else if (state === 'over') startGame();
  }

  function startGame() {
    state = 'playing';
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    reset();
  }

  function endGame() {
    state = 'over';
    recordScore(score);
    if (score > best) {
      best = score;
      try { localStorage.setItem('skyline_best', String(best)); } catch (e) {}
    }
    bestEl.textContent = 'BEST ' + best;
    endScoreEl.textContent = String(score);
    endBestEl.textContent = String(best);
    if (score >= best && score > 0) {
      endBadgeEl.textContent = 'New best!';
      endTitleEl.textContent = 'Record height!';
    } else {
      endBadgeEl.textContent = 'Tower collapsed';
      endTitleEl.textContent = pickFailMsg();
    }
    sfxFail();
    vibrate(120);
    shake = 14;
    renderTopScores(topScoresListEnd, topScoresEnd);
    setTimeout(() => { endOverlay.hidden = false; }, 380);
  }

  function pickFailMsg() {
    const msgs = ['So close!', 'Nice try', 'Almost there', 'One more go?'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function spawnParticles(x, y, w, colorIdx, count) {
    const c = colorFor(colorIdx);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + Math.random() * w,
        y: y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -Math.random() * 2.5 - 1,
        life: 1,
        size: 4 + Math.random() * 5,
        color: c[Math.random() < 0.5 ? 0 : 1],
      });
    }
  }

  function spawnFallingCut(x, w, colorIdx, dir) {
    fallingCuts.push({
      x: x, w: w, y: screenYForIndex(blocks.length), colorIdx: colorIdx,
      vx: dir * (1 + Math.random() * 1.2), vy: 0, rot: 0, vr: dir * 0.12,
      life: 1.4,
    });
  }

  function screenYForIndex(i) { return H - 90 - (i * BLOCK_H) - camY; }

  function landCurrent() {
    const last = blocks[blocks.length - 1];
    const overlapLeft = Math.max(last.x, current.x);
    const overlapRight = Math.min(last.x + last.w, current.x + current.w);
    const overlapW = overlapRight - overlapLeft;

    if (overlapW <= 2) {
      state = 'over-falling';
      current.fallVx = current.dir * current.speed;
      current.fallVy = 0.5;
      setTimeout(endGame, 500);
      return;
    }

    const scale = worldToScreenScale();
    const droppedW = current.w - overlapW;
    const isPerfect = droppedW < 4 / scale;

    if (isPerfect) {
      combo++;
      const bonus = 5 + combo * 2;
      score += bonus;
      showCombo(combo > 1 ? ('COMBO x' + combo) : 'PERFECT!');
      sfxPerfect();
      vibrate(30);
      spawnParticles(current.x, screenYForIndex(blocks.length), current.w, current.colorIdx, 14);
      shake = Math.max(shake, 4);
    } else {
      combo = 0;
      score += 1;
      sfxDrop(blocks.length);
      vibrate(15);
      if (current.x < overlapLeft) {
        spawnFallingCut(current.x, overlapLeft - current.x, current.colorIdx, -1);
      }
      if (current.x + current.w > overlapRight) {
        spawnFallingCut(overlapRight, (current.x + current.w) - overlapRight, current.colorIdx, 1);
      }
      spawnParticles(overlapLeft, screenYForIndex(blocks.length), overlapW, current.colorIdx, 6);
    }

    updateScoreUI();
    checkMilestone(score);
    blocks.push({ x: overlapLeft, w: overlapW, colorIdx: current.colorIdx });
    if (blocks[blocks.length - 1].w < 4) {
      state = 'over-falling';
      setTimeout(endGame, 250);
      return;
    }
    camYTarget = -(blocks.length - 1) * BLOCK_H + H * 0.32;
    spawnNext();
  }

  // ---------- main loop ----------
  function frame(t) {
    if (!lastTime) lastTime = t;
    const dt = Math.min(40, t - lastTime) / 16.6667;
    lastTime = t;

    if (paused) {
      render();
      requestAnimationFrame(frame);
      return;
    }

    camY += (camYTarget - camY) * 0.14 * dt;

    if (state === 'playing' && current) {
      const scale = worldToScreenScale();
      const range = 150 * scale;
      current.x += current.dir * current.speed * dt;
      const last = blocks[blocks.length - 1];
      const center = last.x + last.w / 2;
      if (current.x + current.w / 2 > center + range || current.x + current.w / 2 < center - range) {
        current.dir *= -1;
      }
      if (current.dropping) {
        current.dropVel += 0.9 * dt;
        current._dropY = (current._dropY || 0) + current.dropVel * dt;
        if (current._dropY >= BLOCK_H * 0.62) {
          landCurrent();
        }
      }
    } else if (state === 'over-falling' && current) {
      current.fallVy = (current.fallVy || 0) + 0.6 * dt;
      current._dropY = (current._dropY || 0) + current.fallVy * dt;
      current.x += (current.fallVx || 0) * dt;
    }

    for (let i = fallingCuts.length - 1; i >= 0; i--) {
      const p = fallingCuts[i];
      p.vy += 0.45 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= 0.016 * dt;
      if (p.life <= 0) fallingCuts.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= 0.03 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 1.2);

    render();
    requestAnimationFrame(frame);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2c2050');
    g.addColorStop(1, '#150f28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawSkyline();

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    const scale = worldToScreenScale();
    const cx = W / 2;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const y = screenYForIndex(i);
      if (y < -BLOCK_H || y > H + BLOCK_H) continue;
      drawBlock(cx + b.x * scale, y, b.w * scale, BLOCK_H, b.colorIdx, i === blocks.length - 1 && state === 'playing');
    }

    if (current && (state === 'playing' || state === 'over-falling')) {
      const y = screenYForIndex(blocks.length) + (current._dropY || 0);
      drawBlock(cx + current.x * scale, y, current.w * scale, BLOCK_H, current.colorIdx, false);
    }

    for (const p of fallingCuts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(cx + (p.x + p.w / 2) * scale, p.y);
      ctx.rotate(p.rot);
      const c = colorFor(p.colorIdx);
      drawRoundRect(-p.w * scale / 2, -BLOCK_H / 2, p.w * scale, BLOCK_H, 6, c);
      ctx.restore();
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    const vg = ctx.createLinearGradient(0, 0, 0, 90);
    vg.addColorStop(0, 'rgba(44,32,80,1)');
    vg.addColorStop(1, 'rgba(44,32,80,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, 90);
  }

  function drawSkyline() {
    const parallax = camY * 0.25;
    const baseline = H - 60;
    ctx.save();
    for (const b of SKYLINE_BUILDINGS) {
      const bx = ((b.x + W / 2 - 200) % (W + 400) + (W + 400)) % (W + 400) - 200;
      const by = baseline + parallax * 0.6;
      ctx.fillStyle = 'rgba(255,255,255,' + b.alpha + ')';
      ctx.fillRect(bx, by - b.h, b.w, b.h);
    }
    ctx.restore();
  }

  function drawRoundRect(x, y, w, h, r, colors) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  function drawBlock(sx, sy, w, h, colorIdx, glow) {
    if (w <= 0) return;
    const colors = colorFor(colorIdx);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    drawRoundRect(sx - w / 2, sy - h / 2, w, h, 8, colors);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.35;
    drawRoundRect(sx - w / 2 + 2, sy - h / 2 + 2, w - 4, 5, 3, ['#ffffff', '#ffffff']);
    ctx.restore();

    if (glow) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(performance.now() / 220) * 0.08;
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - w / 2 - 1, sy - h / 2 - 1, w + 2, h + 2);
      ctx.restore();
    }
  }

  // ---------- input ----------
  canvas.addEventListener('pointerdown', onAction);
  startBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); onAction(); });
  retryBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); onAction(); });
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' && e.code !== 'ArrowUp' && e.code !== 'Enter') return;
    e.preventDefault();
    onAction();
  });

  // ---------- boot ----------
  resize();
  renderTopScores(topScoresListStart, topScoresStart);
  requestAnimationFrame(frame);
})();
