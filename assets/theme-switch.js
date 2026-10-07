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
      '<div class="theme-switch-orb"><i class="fa-solid fa-moon"></i><span class="ring"></span></div>' +
      '<h3 class="theme-switch-title">Switching to Dark mode...</h3>' +
      '<p class="theme-switch-sub">Tuning colors for your eyes.</p>' +
      '<div class="theme-switch-bar"><span></span></div>' +
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
    if (btn) { btn.classList.remove('theme-flip'); void btn.offsetWidth; btn.classList.add('theme-flip'); }

    if (REDUCED) {
      try { apply(next); } catch (e) {}
      title.textContent = isLight ? 'Light mode on' : 'Dark mode on';
      sub.textContent = isLight ? 'Bright and clear.' : 'Easy on the eyes.';
      card.classList.add('is-done');
      later(hide, 700);
      return;
    }
    later(function () { try { apply(next); } catch (e) {} }, 420);
    later(function () {
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
      window.switchThemeAnimated(next, applyTheme, toggle);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
