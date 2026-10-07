// Uniform animated theme switch - used by blog, faq, 404 and blog posts.
// index.html uses script.js instead (same animation), so do not load this there.
(function () {
  // Ensure shared CSS is present even if the page forgot the <link>.
  function ensureCSS() {
    if (document.getElementById('theme-switch-css-link')) return;
    var has = false;
    try {
      var links = document.querySelectorAll('link[rel="stylesheet"]');
      for (var i = 0; i < links.length; i++) {
        if ((links[i].getAttribute('href') || '').indexOf('theme-switch.css') !== -1) { has = true; break; }
      }
    } catch (e) {}
    if (!has) {
      var l = document.createElement('link');
      l.id = 'theme-switch-css-link';
      l.rel = 'stylesheet';
      l.href = 'assets/theme-switch.css';
      document.head.appendChild(l);
    }
  }
  ensureCSS();

  var overlay = null, timers = [];
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function ensure() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'theme-switch-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="theme-switch-card" role="status" aria-live="polite">' +
      '<span class="theme-pill"><i class="fa-solid fa-circle-half-stroke"></i><span class="theme-pill-text">Theme</span></span>' +
      '<div class="theme-switch-orb"><i class="fa-solid fa-moon"></i><span class="ring"></span><span class="orbit o1"></span><span class="orbit o2"></span></div>' +
      '<h3 class="theme-switch-title">Switching to Dark mode...</h3>' +
      '<p class="theme-switch-sub">Tuning colors for your eyes.</p>' +
      '<div class="theme-switch-bar"><span></span></div>' +
      '<div class="theme-meta"><span class="theme-pct">0%</span><span class="theme-step">Reading palette...</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    return overlay;
  }
  function hide() {
    clearTimers();
    if (overlay) overlay.classList.remove('show');
  }

  // Same signature as script.js so behavior matches index.html exactly.
  var themeProgTimer = null;
  function runThemeProgress(card, isLight) {
    try { if (themeProgTimer) clearInterval(themeProgTimer); } catch (e) {}
    var bar = card.querySelector('.theme-switch-bar span');
    var pct = card.querySelector('.theme-pct');
    var step = card.querySelector('.theme-step');
    var pill = card.querySelector('.theme-pill-text');
    var steps = isLight ? ['Reading palette...','Warming whites...','Softening shadows...','Bright and clear!'] : ['Reading palette...','Dimming lights...','Deepening blacks...','Easy on the eyes!'];
    if (pill) pill.textContent = isLight ? 'Dark \u2192 Light' : 'Light \u2192 Dark';
    var p = 0;
    if (bar) bar.style.width = '4%';
    if (pct) pct.textContent = '4%';
    if (step) step.textContent = steps[0];
    themeProgTimer = setInterval(function () {
      p = Math.min(96, p + 8 + Math.random() * 10);
      if (bar) bar.style.width = p.toFixed(0) + '%';
      if (pct) pct.textContent = p.toFixed(0) + '%';
      if (step) step.textContent = steps[Math.min(steps.length - 2, Math.floor(p / 34))];
      if (p >= 96) { try { clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; }
    }, 110);
    timers.push({ _t: 1 });
    var _origClear = clearTimers;
    clearTimers = function () { try { if (themeProgTimer) clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; timers.forEach(function (x) { try { if (typeof x === 'number') clearTimeout(x); } catch (e) {} }); timers = []; };
  }
  window.switchThemeAnimated = function (next, apply, btn) {
    var ov = ensure();
    var card = ov.querySelector('.theme-switch-card');
    var orb = ov.querySelector('.theme-switch-orb');
    var icon = ov.querySelector('.theme-switch-orb i');
    var title = ov.querySelector('.theme-switch-title');
    var sub = ov.querySelector('.theme-switch-sub');
    var isLight = next === 'light';

    clearTimers();
    card.classList.remove('is-done', 'is-light', 'is-dark');
    card.classList.add(isLight ? 'is-light' : 'is-dark');
    orb.classList.remove('spin-done');
    icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    title.textContent = isLight ? 'Switching to Light mode...' : 'Switching to Dark mode...';
    sub.textContent = isLight ? 'Brightening things up.' : 'Dimming the lights.';
    ov.classList.remove('show');
    void ov.offsetWidth;
    ov.classList.add('show');
    try { runThemeProgress(card, isLight); } catch (e) {}
    if (btn) { btn.classList.remove('theme-flip'); void btn.offsetWidth; btn.classList.add('theme-flip'); }

    if (REDUCED) {
      try { apply(next); } catch (e) {}
      title.textContent = isLight ? 'Light mode on' : 'Dark mode on';
      sub.textContent = isLight ? 'Bright and clear.' : 'Easy on the eyes.';
      try { if (typeof themeProgTimer !== 'undefined' && themeProgTimer) { try { clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; } } catch (e) {}
      try { var _b = card.querySelector('.theme-switch-bar span'); if (_b) _b.style.width = '100%'; var _p = card.querySelector('.theme-pct'); if (_p) _p.textContent = '100%'; var _s = card.querySelector('.theme-step'); if (_s) _s.textContent = isLight ? 'Bright and clear! Enjoy!' : 'Easy on the eyes! Enjoy!'; } catch (e) {}
      try { if (typeof themeProgTimer !== 'undefined' && themeProgTimer) { try { clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; } } catch (e) {} /*REDUCED-100*/
      try { var _b2 = card.querySelector('.theme-switch-bar span'); if (_b2) _b2.style.width = '100%'; var _p2 = card.querySelector('.theme-pct'); if (_p2) _p2.textContent = '100%'; } catch (e) {}
      card.classList.add('is-done');
      later(hide, 700);
      return;
    }
    later(function () { try { apply(next); } catch (e) {} }, 420);
    later(function () {
      try { if (typeof themeProgTimer !== 'undefined' && themeProgTimer) { try { clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; } } catch (e) {}
      try { var _b = card.querySelector('.theme-switch-bar span'); if (_b) _b.style.width = '100%'; var _p = card.querySelector('.theme-pct'); if (_p) _p.textContent = '100%'; var _s = card.querySelector('.theme-step'); if (_s) _s.textContent = isLight ? 'Bright and clear! Enjoy!' : 'Easy on the eyes! Enjoy!'; } catch (e) {}
      card.classList.add('is-done');
      orb.classList.add('spin-done');
      icon.className = 'fa-solid fa-check';
      title.textContent = isLight ? 'Light mode on!' : 'Dark mode on!';
      sub.textContent = isLight ? 'Bright and clear. Enjoy!' : 'Easy on the eyes. Enjoy!';
    }, 1000);
    later(hide, 1750);
  };

  function applyTheme(next) {
    var root = document.documentElement;
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#f6f7f9' : '#121212');
    var t = document.getElementById('theme-toggle');
    var ic = t ? t.querySelector('i') : null;
    if (ic) ic.className = next === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  function wire() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle || toggle.getAttribute('data-ts-wired')) return;
    // Clone strips the instant-switch listener the inline page script added,
    // so only the animated version runs.
    var fresh = toggle.cloneNode(true);
    fresh.removeAttribute('data-ts-wired');
    toggle.parentNode.replaceChild(fresh, toggle);
    toggle = fresh;
    toggle.setAttribute('data-ts-wired', 'true');
    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      var themeProgTimer = null;
  function runThemeProgress(card, isLight) {
    try { if (themeProgTimer) clearInterval(themeProgTimer); } catch (e) {}
    var bar = card.querySelector('.theme-switch-bar span');
    var pct = card.querySelector('.theme-pct');
    var step = card.querySelector('.theme-step');
    var pill = card.querySelector('.theme-pill-text');
    var steps = isLight ? ['Reading palette...','Warming whites...','Softening shadows...','Bright and clear!'] : ['Reading palette...','Dimming lights...','Deepening blacks...','Easy on the eyes!'];
    if (pill) pill.textContent = isLight ? 'Dark \u2192 Light' : 'Light \u2192 Dark';
    var p = 0;
    if (bar) bar.style.width = '4%';
    if (pct) pct.textContent = '4%';
    if (step) step.textContent = steps[0];
    themeProgTimer = setInterval(function () {
      p = Math.min(96, p + 8 + Math.random() * 10);
      if (bar) bar.style.width = p.toFixed(0) + '%';
      if (pct) pct.textContent = p.toFixed(0) + '%';
      if (step) step.textContent = steps[Math.min(steps.length - 2, Math.floor(p / 34))];
      if (p >= 96) { try { clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; }
    }, 110);
    timers.push({ _t: 1 });
    var _origClear = clearTimers;
    clearTimers = function () { try { if (themeProgTimer) clearInterval(themeProgTimer); } catch (e) {} themeProgTimer = null; timers.forEach(function (x) { try { if (typeof x === 'number') clearTimeout(x); } catch (e) {} }); timers = []; };
  }
  window.switchThemeAnimated(next, applyTheme, toggle);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
