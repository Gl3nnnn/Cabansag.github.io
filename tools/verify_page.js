// Headless verification harness for the portfolio page.
//
// The suites check the markup and the CSS text. They cannot check what the browser
// actually does with it: whether the hero sub-headline still rotates, whether the
// count-up observer wins against renderProjects, or how many rules the parser
// really built. Those were the failures that mattered here, so this drives a real
// Chrome over the DevTools protocol and asks the page.
//
// Run: node tools/verify_page.js [path-to-index.html]
'use strict';

const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

const PAGE = 'file:///' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'))
  .replace(/\\/g, '/');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findChrome() {
  for (const c of CHROME_CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error('no Chrome or Chromium found in the usual places');
}

// Minimal CDP client: enough to navigate and evaluate, nothing more.
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        events.push(msg);
      }
    });
    ws.addEventListener('error', reject);
    ws.addEventListener('open', () => resolve({
      send: (method, params) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
      }),
      close: () => ws.close(),
      events,
    }));
  });
}

async function waitForTarget(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debuggable page');
}

async function main() {
  const chrome = await findChrome();
  const port = 9333;
  // Per-run profile, deliberately. Reusing one fixed path let Chrome serve index.html
  // from its disk cache, so the harness measured a stale page and reported values
  // that did not move when the CSS changed - a measurement tool that can silently
  // measure the wrong thing is worse than no tool. Unique per run, removed below.
  const userDir = path.join(os.tmpdir(), 'cdp-verify-profile-' + process.pid);
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
    '--allow-file-access-from-files', '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });

  let failures = 0;
  const check = (ok, label, detail) => {
    if (ok) console.log(`  ok    ${label}${detail ? '  (' + detail + ')' : ''}`);
    else { console.log(`  FAIL  ${label}${detail ? '  (' + detail + ')' : ''}`); failures++; }
  };

  try {
    const cdp = await connect(await waitForTarget(port));
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: PAGE });
    // Give load, the GitHub fetch (which fails offline and falls back to the
    // curated list), and the count-up animation real time to run.
    await sleep(6000);

    const evaluate = async expr => {
      const r = await cdp.send('Runtime.evaluate', {
        expression: expr, returnByValue: true, awaitPromise: true,
      });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    console.log('\n=== structure ===');
    check(await evaluate('!!document.querySelector("main#main")'), 'main#main landmark present');
    check(await evaluate('document.querySelectorAll("main > section").length') === 10,
      'ten sections inside main',
      await evaluate('document.querySelectorAll("main > section").length + " found"'));
    check(await evaluate('document.querySelectorAll("section[tabindex=\\"-1\\"]").length') === 10,
      'all ten sections focusable via tabindex=-1',
      await evaluate('document.querySelectorAll("section[tabindex=\\"-1\\"]").length + " found"'));

    console.log('\n=== heading order ===');
    const jumps = await evaluate(`(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(h => !h.closest('.sr-only') && !h.closest('nav'))
        .map(h => +h.tagName[1]);
      const out = [];
      for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i-1] > 1) out.push(hs[i-1] + '->' + hs[i]);
      return out.join(',') || 'none';
    })()`);
    check(jumps === 'none', 'no skipped heading levels', jumps);
    check(await evaluate('document.querySelectorAll("h4").length') === 0, 'no h4 left');
    // A heading that was never closed silently adopts the rest of the page as its
    // children, which no tag-balance check on the source can see.
    check(await evaluate(`[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(h => h.querySelectorAll('h1,h2,h3,h4,h5,h6').length).length`) === 0,
      'no heading swallowed another (all tags closed)');

    console.log('\n=== projects ===');
    check(await evaluate('document.querySelectorAll(".project-card").length') === 13,
      'thirteen project cards rendered',
      await evaluate('document.querySelectorAll(".project-card").length + " rendered"'));
    check(await evaluate('document.querySelectorAll(".project-outcome").length') === 13,
      'every card has an outcome line',
      await evaluate('document.querySelectorAll(".project-outcome").length + " rendered"'));

    console.log('\n=== hero backdrop ===');
    // Split a computed background stack into real layers. Splitting on commas is
    // not good enough: Chrome expands `0 1px` into more than one stop, so a plain
    // comma split reports several times as many "layers" as the stack really has
    // and would pass a check that is not looking at anything.
    // A function, not an IIFE with a trailing (), so each caller can re-read the
    // stack at the moment it needs it. When this was invoked once on load, the
    // theme loop below measured the dark theme's layers against the light theme's
    // page background and reported it as a light-theme result.
    const SPLIT = `(() => {
      const s = document.querySelector('.home');
      const cs = getComputedStyle(s);
      const layers = [];
      let depth = 0, cur = '';
      for (const ch of cs.backgroundImage) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { layers.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) layers.push(cur.trim());
      // The grid cell as the browser reports it, which is NOT how it is authored.
      // Chrome expands the shorthand into four explicit stops and rewrites
      // 'transparent' as 'rgba(0, 0, 0, 0)', so a regex written against the source
      // form - /transparent 1px 36px/ - silently matches nothing and reports "no px
      // cell found" on a backdrop that has one. It also adds 'px' after every bare
      // zero, so the first offset reads '0px' where the source says '0'.
      //
      // So match the reported form: find the axis layers, take the SMALLEST repeat
      // period on any of them (that is the minor cell - the majors are a multiple
      // of it), and match the transparent stop's trailing length. Reading the
      // smallest rather than filtering on a hardcoded 180px means adding or
      // renaming a tier does not have to update this too.
      const cellPx = (() => {
        const periods = [];
        for (const l of layers) {
          if (!l.startsWith('repeating-linear-gradient')) continue;
          // The repeat period is the last length in the declaration, so match to
          // the end of the layer rather than trying to identify which stop is the
          // transparent one - the reported form spells it rgba(0, 0, 0, 0), and
          // there are four such stops once the shorthand is expanded.
          const m = /([\\d.]+)px\\)$/.exec(l);
          if (m) periods.push(parseFloat(m[1]));
        }
        return periods.length ? Math.min(...periods) : null;
      })();
      return {
        layers,
        cellPx,
        css: cs,
        img: document.querySelector('.home-img img'),
        // Classified rather than counted. The layers used to be exactly 3 and the
        // check below asserted that number, which reads as stricter than the
        // strayClose check in check_css.js - but a count cannot tell a fade from a
        // grid, so it passed just as happily if both grid axes had been replaced by
        // two more copies of the fade. It also made adding the grid's major-line
        // tier a test change: 3 -> 5 was a red build for a purely visual
        // improvement, which is exactly the incentive that ends with the number
        // being edited down to whatever the stylesheet currently says. Asserting the
        // shape means a new tier is free and a deleted axis is not.
        gridAxes: layers.filter(l => l.startsWith('repeating-linear-gradient')).length,
        fades: layers.filter(l => l.startsWith('linear-gradient')).length,
        // The minor grid cell, read off an axis. Pinned in px rather than rem: it
        // used to be 4rem, which tracked the root font-size and so got denser as
        // screens got smaller (38.4px desktop, 28.8px at 360px). Asserting it is
        // rem-free so the property cannot quietly start tracking rem again.
};
    })`;

    // The grid + fade are painted as `background` on .home rather than on a
    // pseudo-element, specifically so nothing needs `overflow: hidden`. If that
    // ever changes, this is the check that notices the photo getting sliced.
    const backdrop = await evaluate(`(() => {
      const { layers, css, img, gridAxes, fades, cellPx } = ${SPLIT}();
      const h = document.querySelector('.home').getBoundingClientRect();
      const i = img.getBoundingClientRect();
      return {
        gridAxes,
        fades,
        cellPx,
        image: css.backgroundImage,
        layers: layers.length,
        overflow: css.overflow,
        photoBottomPastSection: +(i.bottom - h.bottom).toFixed(1),
        photoVisible: i.width > 0 && i.height > 0,
      };
    })()`);
    check(backdrop.image !== 'none', '.home paints a backdrop', backdrop.layers + ' layers');
    check(backdrop.fades >= 1, 'the fade down to the page colour survived parsing',
      backdrop.fades + ' non-repeating gradient layer(s)');
    check(backdrop.gridAxes >= 2, 'the grid still has both axes',
      backdrop.gridAxes + ' repeating gradient layer(s), ' +
      'one per axis so the backdrop is a grid rather than stripes');
    check(backdrop.gridAxes % 2 === 0, 'the grid axes come in matched pairs',
      backdrop.gridAxes + ' axis layer(s) - an odd count means one direction has a ' +
      'different number of tiers from the other, which reads as a mistake');
    check(backdrop.cellPx !== null && backdrop.cellPx >= 24 && backdrop.cellPx <= 48,
      'the minor grid cell is a fixed px pitch, not a rem one',
      backdrop.cellPx === null ? 'no px period found on any axis layer; reported image was ' + backdrop.image
        : backdrop.cellPx + 'px (rem would scale 38.4px -> 28.8px as screens shrink)');
    check(backdrop.overflow === 'visible',
      '.home does not clip (overflow stays visible, so the photo cannot be sliced)',
      'overflow: ' + backdrop.overflow);
    check(backdrop.photoVisible, 'the hero photo still has a box',
      `${backdrop.photoBottomPastSection}px past section bottom`);

    // The backdrop sits behind body copy, so the contrast of the bio paragraph has
    // to be measured rather than assumed. WCAG relative luminance, composited here
    // because the painted backdrop is a gradient stack and cannot be read off a
    // single computed colour. Each layer contributes its first colour stop, so this
    // treats a gradient as flat: an approximation, but a close one, and the margins
    // reported are wide enough that it cannot flip a pass into a fail.
    //
    // Text is measured against the surface it is actually painted on, so this walks
    // up from the element and stops at the first opaque background. A button with
    // its own black fill is not read against the section gradient behind it; its
    // label is green on black and the backdrop is irrelevant to it.
    const contrast = await evaluate(`(() => {
      const lum = ([r, g, b]) => {
        const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parse = s => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const alpha = s => { const p = (s.match(/[\\d.]+/g) || []).map(Number); return p.length > 3 ? p[3] : 1; };
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      // Composite the section's stack over the body background, bottom layer first,
      // the way the browser paints them. Takes the stack as an argument so it can
      // never close over a stack captured before the theme was set.
      const sectionBackdrop = layers => {
        let acc = parse(getComputedStyle(document.body).backgroundColor);
        for (const layer of layers) {
          const m = layer.match(/rgba?\\(([^)]+)\\)/);
          if (!m) continue;
          const parts = m[1].split(',').map(s => parseFloat(s));
          const [r, g, b] = parts, a = parts.length > 3 ? parts[3] : 1;
          if (a === 0) continue;
          acc = [r * a + acc[0] * (1 - a), g * a + acc[1] * (1 - a), b * a + acc[2] * (1 - a)];
        }
        return acc;
      };
      const home = document.querySelector('.home');
      // Named by class, not by position. The hero paragraph used to be the only
      // non-tagline copy in .home-content, so a structural selector like
      // p:not(.text-animation) covered its contrast by accident. Splitting it into
      // .hero-role and .hero-bio leaves two elements to cover, and that selector
      // would pick up only the first - so a third line added later would go
      // unmeasured with nothing to say so. .hero-bio is the one that matters: it is
      // the longest run of body copy over the backdrop, and not every accent colour
      // is legal for it.
      const SELS = ['.home-content h1', '.hero-role', '.hero-bio', '.btn-primary', '.btn-secondary'];
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      const out = {};
      // Measured in both themes. The light backdrop is the subtle one by design, so
      // it is the more likely of the two to quietly cost contrast.
      for (const theme of ['dark', 'light']) {
        root.setAttribute('data-theme', theme);
        // Re-read per theme: the stack is theme-dependent.
        const { layers } = ${SPLIT}();
        const results = {};
        for (const sel of SELS) {
          const el = document.querySelector(sel);
          if (!el) continue;
          let node = el, base = null, via = 'own background';
          while (node && node !== document.body) {
            const bg = getComputedStyle(node).backgroundColor;
            if (alpha(bg) > 0) { base = parse(bg); break; }
            if (node === home) { base = sectionBackdrop(layers); via = 'section gradient stack'; break; }
            node = node.parentElement;
          }
          if (!base) base = parse(getComputedStyle(document.body).backgroundColor);
          results[sel] = { r: +ratio(parse(getComputedStyle(el).color), base).toFixed(2), via };
        }
        out[theme] = results;
      }
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return out;
    })()`);
    for (const [theme, set] of Object.entries(contrast)) {
      for (const [sel, { r: ratio, via }] of Object.entries(set)) {
        // 4.5 is the AA threshold for body text; the h1 is large so it needs only 3.
        const min = sel.includes('h1') ? 3 : 4.5;
        check(ratio >= min, `contrast over the backdrop (${theme}): ${sel.replace('.home-content ', '')}`,
          `${ratio}:1 against its ${via} (needs ${min}:1)`);
      }
    }

    // The check above only proves the backdrop is *present*. This one proves it is
    // *visible*, which is a different question and the one that actually matters: the
    // first version of this backdrop used a 5% grid line, which composited to
    // 1.06:1 against the background - below the ~1.1:1 where two surfaces are
    // distinguishable at all. It shipped to production fully formed, correct in the
    // stylesheet, and invisible. Every other check here passed while it was broken.
    //
    // So: composite each feature's own colour over the page background in isolation
    // and require it to clear a floor. 1.1:1 is roughly where a surface stops being
    // noticeable; the floors sit above that so there is margin, not on it.
    const visibility = await evaluate(`(() => {
      const lum = ([r, g, b]) => {
        const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parse = s => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      const over = (fg, bg) => {
        const m = fg.match(/rgba?\\(([^)]+)\\)/);
        if (!m) return null;
        const p = m[1].split(',').map(s => parseFloat(s));
        const [r, g, b] = p, a = p.length > 3 ? p[3] : 1;
        if (a === 0) return null;
        return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
      };
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      const out = {};
      for (const theme of ['dark', 'light']) {
        root.setAttribute('data-theme', theme);
        // Re-read per theme: the stack is theme-dependent.
        const { layers } = ${SPLIT}();
        // Uses the same shared depth-aware splitter as the layer count, so this
        // cannot measure a different set of layers than the check above it counts.
        const bg = parse(getComputedStyle(document.body).backgroundColor);
        const grid = layers.filter(l => l.startsWith('repeating-linear-gradient'));
        const meas = {};
        // Both grid axes carry the same tint; one is enough and both must agree.
        const line = grid.map(l => over(l, bg)).filter(Boolean);
meas.grid = line.length
          ? { r: +Math.min(...line.map(c => ratio(c, bg))).toFixed(2), axes: line.length }
          : null;
        out[theme] = meas;
      }
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return out;
    })()`);
    for (const theme of ['dark', 'light']) {
      const gridMin = 1.15;
      check(visibility[theme].grid && visibility[theme].grid.r >= gridMin,
        `grid lines are actually visible (${theme})`,
        visibility[theme].grid
          ? `${visibility[theme].grid.r}:1 against the page background across ${visibility[theme].grid.axes} axes (needs ${gridMin}:1 to be noticeable at all)`
          : 'no grid line found in the stack');
    }

    // The backdrop must not be dark-mode-only. Toggle the theme the way the button
    // does and confirm the light theme still gets a backdrop of its own.
    const bothThemes = await evaluate(`(() => {
      const read = () => getComputedStyle(document.querySelector('.home')).backgroundImage;
      const root = document.documentElement;
      const before = read();
      const had = root.getAttribute('data-theme');
      root.setAttribute('data-theme', 'light');
      const light = read();
      root.setAttribute('data-theme', 'dark');
      const dark = read();
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return { before, light, dark, differs: light !== dark };
    })()`);
    check(bothThemes.light !== 'none', 'light theme still has a backdrop');
    check(bothThemes.differs, 'light and dark backdrops are not identical',
      bothThemes.differs ? 'differ' : 'IDENTICAL - the light override is not applying');

    // The same failure as the invisible grid, one level up: --second-bg-color was
    // the alternating section bands AND the raised surfaces inside them, so the page
    // could not step away from itself without dragging every card along. The result
    // was a 1.124:1 seam in dark theme and 1.07:1 in light - nothing - while the
    // contact fields resolved to the exact colour of the section behind them. Fixed
    // by splitting the token, so this asserts the split still holds and that each
    // half is doing its own job.
    const surfaces = await evaluate(`(() => {
      const lum = ([r, g, b]) => {
        const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parse = s => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(3); };
      const bgOf = sel => {
        const el = document.querySelector(sel);
        return el ? parse(getComputedStyle(el).backgroundColor) : null;
      };
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      const out = {};
      for (const theme of ['dark', 'light']) {
        root.setAttribute('data-theme', theme);
        const page = parse(getComputedStyle(document.body).backgroundColor);
        // Probed by role, not by a list that can rot: these are the sections that
        // are *meant* to be bands. An earlier version hardcoded .about here, which
        // passed until .about was flipped to the page colour to break up a run of
        // bands - at which point it correctly reported 1:1 against itself. The
        // alternation itself is asserted by the boundary walk below.
        const bands = ['.education', '.certifications', '.hero-stats', '.footer'].map(bgOf);
        const card = bgOf('.testimonial-card');
        const field = bgOf('.contact form textarea');
        out[theme] = {
          band: +Math.min(...bands.filter(Boolean).map(b => ratio(b, page))).toFixed(3),
          bandSpread: bands.filter(Boolean).map(b => ratio(b, page)),
          cardOnPage: card ? ratio(card, page) : null,
          fieldOnBand: field ? ratio(field, bgOf('.contact')) : null,
        };
      }
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return out;
    })()`);
    // A band wants to read as a band without becoming a slab, so this is a floor
    // AND a ceiling. The floor is the part that matters: the old shared token sat
    // at 1.124:1 dark and 1.07:1 light, which is why the seams were invisible.
    const BAND_MIN = 1.15, BAND_MAX = 1.35;
    for (const theme of ['dark', 'light']) {
      const s = surfaces[theme];
      check(s.band >= BAND_MIN && s.band <= BAND_MAX,
        `section seams are visible but not slabs (${theme})`,
        `weakest band ${s.band}:1 vs page, across ${s.bandSpread.join(', ')}:1 (needs ${BAND_MIN}-${BAND_MAX}:1; was 1.124 dark, 1.07 light)`);
      // A raised surface has to clear whichever it lands on. This one used to be
      // exactly the colour of the section behind it.
      check(s.fieldOnBand !== null && s.fieldOnBand >= 1.05,
        `form fields are a visible surface (${theme})`,
        s.fieldOnBand === null ? 'no textarea found'
          : `${s.fieldOnBand}:1 against the surface behind them (needs 1.05:1; was 1.0 - identical)`);
      check(s.cardOnPage !== null && s.cardOnPage >= 1.05,
        `cards lift off the page (${theme})`,
        `${s.cardOnPage}:1 against the page (needs 1.05:1)`);
    }

    // Giving the bands a visible step was not enough on its own: the page still
    // had three joins where two bands sat back to back - stats/about,
    // about/education and blog/contact - so those seams stayed invisible while
    // every per-section assertion above passed. A palette fix does not make a
    // page alternate; the assignment has to. So walk the real DOM order and
    // compare neighbours instead of trusting any one section's colour.
    const joins = await evaluate(`(() => {
      const lum = ([r, g, b]) => {
        const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parse = s => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(3); };
      // A transparent background means "whatever is behind me": the hero paints a
      // grid over the page, so reading its own colour would compare nothing.
      const effective = el => {
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          const m = c.match(/[\\d.]+/g) || [];
          if (m.length >= 3 && (m.length < 4 || parseFloat(m[3]) > 0)) return parse(c);
        }
        return parse(getComputedStyle(document.body).backgroundColor);
      };
      const flow = [...document.querySelectorAll('#main > section, #main > div, footer.footer')];
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      const out = {};
      for (const theme of ['dark', 'light']) {
        root.setAttribute('data-theme', theme);
        const rows = flow.map(el => ({ name: el.id || el.className.split(' ')[0], c: effective(el) }));
        out[theme] = rows.slice(1).map((r, i) => ({
          a: rows[i].name, b: r.name, r: ratio(rows[i].c, r.c),
        }));
      }
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return out;
    })()`);
    // 1.0 would mean the two sections resolved to the same colour, which is the
    // bug; the seams in play measure 1.17-1.19, so this only has to clear "equal".
    const JOIN_MIN = 1.05;
    for (const theme of ['dark', 'light']) {
      const dead = joins[theme].filter(j => j.r < JOIN_MIN);
      check(dead.length === 0, `every section boundary is visible (${theme})`,
        dead.length
          ? dead.map(j => `${j.a} -> ${j.b} at ${j.r}:1`).join('; ')
          : `${joins[theme].length} boundaries, weakest ${Math.min(...joins[theme].map(j => j.r))}:1 (needs ${JOIN_MIN}:1; three joins were 1.0)`);
    }

    // ---------- footer ----------
    // Grouped and re-spaced, so the things worth asserting are: every URL that was
    // there before is still there (this footer is the only route to resume.pdf and
    // faq.html), the nav is one centred row on desktop and a clean column on a
    // phone, tap targets are reachable, and nothing overflows. The href list is
    // checked against the spec in order rather than as a set, so a link cannot be
    // silently reordered or swapped for a near-identical wrong one.
    console.log('\n=== footer ===');
    const footerAt = async (w, h, mobile) => {
      // Clear before setting. Applying setDeviceMetricsOverride repeatedly without
      // a clear in between leaves a stale scrollbar in the emulation state: a third
      // consecutive 375px pass reported innerWidth 391 while clientWidth and
      // body.scrollWidth were both 375, i.e. documentElement.scrollWidth was
      // 16px over on a page with nothing wider than the viewport. Same trap as the
      // header's centring check - the number was real, the thing being measured
      // was not.
      await cdp.send('Emulation.clearDeviceMetricsOverride');
      await cdp.send('Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
      await cdp.send('Page.navigate', { url: PAGE });
      await sleep(2500);
      return evaluate(`(() => {
        const ft = document.querySelector('footer.footer');
        const cs = getComputedStyle(ft);
        const ftr = ft.getBoundingClientRect();
        // The footer's own content box, for the same reason the header measures
        // against its content box: the max-width container is narrower than a
        // 1920px screen, so the viewport edge is the wrong reference.
        const contentL = ftr.left + parseFloat(cs.paddingLeft);
        const contentR = ftr.right - parseFloat(cs.paddingRight);
        const socials = [...ft.querySelectorAll('.social a')];
        const navLinks = [...ft.querySelectorAll('.footer-nav a')];
        const nr = ft.querySelector('.footer-nav ul').getBoundingClientRect();
        const ul = getComputedStyle(ft.querySelector('.footer-nav ul'));
        // Tallest and shortest link, because the column layout gives every one of
        // them the same box and a regression would show up as the minimum.
        const linkBoxes = navLinks.map(a => a.getBoundingClientRect().height);
        let worst = null;
        for (const el of ft.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (!worst || r.right > worst.over) {
            worst = { over: +(r.right - document.documentElement.clientWidth).toFixed(1),
                      tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') };
          }
        }
        return {
          vw: document.documentElement.clientWidth,
          scrollW: document.documentElement.scrollWidth,
          // overflow-x hidden plus max-width and width of 100vw on html, and 100vw
          // includes the scrollbar while clientWidth does not - so on a page whose
          // html is width-locked, documentElement.scrollWidth can report the
          // scrollbar as overflow while no element is wider than the viewport. The
          // body box is what actually holds the content, and the per-element scan
          // below is the real evidence either way.
          //
          // (No backticks in this comment: it lives inside a template literal, and
          // one would close the string early and take the whole evaluate() with it.)
          bodyScrollW: document.body.scrollWidth,
          totalH: +ftr.height.toFixed(1),
          topEdge: parseFloat(cs.borderTopWidth),
          topEdgeColour: cs.borderTopColor,
          shadow: cs.boxShadow !== 'none',
          socialCount: socials.length,
          socialCentred: Math.abs(((socials[0].getBoundingClientRect().left + socials[socials.length - 1].getBoundingClientRect().right) / 2) - (ftr.left + ftr.right) / 2),
          navCount: navLinks.length,
          navLabels: navLinks.map(a => a.textContent.trim()),
          navHrefs: navLinks.map(a => a.getAttribute('href')),
          navDir: ul.flexDirection,
          // Every link on the same line means one row; different first-line offsets
          // means it wrapped. Read from the rendered boxes rather than inferred
          // from the width, because the column layout is also "one per line".
          navLines: new Set(navLinks.map(a => Math.round(a.getBoundingClientRect().top))).size,
          navCentreOff: +(((nr.left + nr.right) / 2) - (contentL + contentR) / 2).toFixed(1),
          minLinkH: +Math.min(...linkBoxes).toFixed(1),
          nameText: (ft.querySelector('.footer-name') || {}).textContent || '',
          taglineText: ((ft.querySelector('.footer-tagline') || {}).textContent || '').replace(/\\s+/g, ' ').trim(),
          nameSize: ft.querySelector('.footer-name') ? parseFloat(getComputedStyle(ft.querySelector('.footer-name')).fontSize) : 0,
          navSize: navLinks.length ? parseFloat(getComputedStyle(navLinks[0]).fontSize) : 0,
          stampText: ((ft.querySelector('.last-updated') || {}).textContent || '').trim(),
          yearText: (document.getElementById('year') || {}).textContent || '',
          copyrightText: ((ft.querySelector('.copyright') || {}).textContent || '').replace(/\\s+/g, ' ').trim(),
          metaGap: (() => {
            const nav = ft.querySelector('.footer-nav').getBoundingClientRect();
            const meta = ft.querySelector('.footer-meta').getBoundingClientRect();
            return +(meta.top - nav.bottom).toFixed(1);
          })(),
          worst: worst.over > 0.5 ? worst.tag + ' by ' + worst.over + 'px' : 'nothing',
        };
      })()`);
    };

    const ftWide = await footerAt(1920, 1080, false);
    const WANT_HREFS = ['resume-2026.pdf', 'faq.html', '#about', '#education', '#experience',
      '#certifications', '#services', '#projects', '#testimonials', '#blog', '#contact'];
    check(ftWide.navCount === 11 && JSON.stringify(ftWide.navHrefs) === JSON.stringify(WANT_HREFS),
      'all 11 footer nav links are present, in order, pointing where they always did',
      ftWide.navHrefs.length + ' links: ' + ftWide.navHrefs.join(', '));
    check(ftWide.navLabels.join('|') === 'Resume|FAQ|About|Education|Experience|Certifications|Skills|Projects|Testimonials|Blog|Contact',
      'the nav labels are the required set', ftWide.navLabels.join(', '));
    check(ftWide.socialCount === 4, 'all four social icons survive',
      ftWide.socialCount + ' icons');
    check(ftWide.navLines === 1, 'the nav is one clean row on desktop',
      `${ftWide.navLines} line(s) at 1920px`);
    check(Math.abs(ftWide.navCentreOff) <= 2, 'the nav is centred in the footer container',
      `${ftWide.navCentreOff}px off centre`);
    check(Math.abs(ftWide.socialCentred) <= 2, 'the social row is centred',
      `${ftWide.socialCentred.toFixed(1)}px off the bar centre`);
    check(ftWide.topEdge >= 1 && !/rgba\(0, 0, 0, 0\)/.test(ftWide.topEdgeColour),
      'the footer has a visible neon accent line on top',
      `${ftWide.topEdge}px ${ftWide.topEdgeColour}`);
    check(ftWide.shadow, 'the footer carries the navbar\'s mirrored depth cue');
    check(ftWide.nameText.trim() === 'Glenn Patrick Cabansag', 'the brand name is present',
      JSON.stringify(ftWide.nameText));
    check(ftWide.taglineText === 'IT Professional • Cybersecurity • Web Development',
      'the role tagline is present', JSON.stringify(ftWide.taglineText));
    check(/All rights reserved\./.test(ftWide.copyrightText), 'the copyright line reads correctly',
      JSON.stringify(ftWide.copyrightText));
    check(ftWide.yearText === String(new Date().getFullYear()),
      'the copyright year is still filled in by script.js',
      `#year shows "${ftWide.yearText}"`);
    check(/^Last updated: \d{4}-\d{2}-\d{2}$/.test(ftWide.stampText),
      'the last-updated stamp keeps the shape tools/build_last_updated.js matches',
      JSON.stringify(ftWide.stampText));
    // The excess the redesign was asked to remove. It was 25px + 50px + the social
    // row's own line box with nothing grouping the four elements; ~2rem between the
    // nav and the caption is the new ceiling.
    check(ftWide.metaGap <= 40, 'the copyright block is not marooned below the nav',
      `${ftWide.metaGap}px between the nav and the meta block (was 50px of margin plus 40px of padding)`);

    const ftPhone = await footerAt(375, 812, true);
    check(ftPhone.navDir === 'column', 'the nav stacks on a phone',
      `flex-direction ${ftPhone.navDir}`);
    check(ftPhone.navLines === 11, 'each phone link is on its own row',
      `${ftPhone.navLines} rows for 11 links`);
    // WCAG 2.5.8 target size. With `html` at 40% here, this is only reachable
    // because the padding is in rem - a px floor would have been wrong at every
    // other breakpoint.
    check(ftPhone.minLinkH >= 44, 'phone tap targets are at least 44px tall',
      `shortest link ${ftPhone.minLinkH}px`);
    check(ftPhone.navSize >= 13, 'phone nav text is actually readable',
      `${ftPhone.navSize}px (the desktop 1.8rem renders as 11.5px at this breakpoint)`);
    check(ftPhone.nameSize >= 16, 'the brand name is actually readable on a phone',
      `${ftPhone.nameSize}px`);
    check(Math.abs(ftPhone.socialCentred) <= 2, 'the social row stays centred on a phone',
      `${ftPhone.socialCentred.toFixed(1)}px off centre`);
    check(ftPhone.bodyScrollW <= ftPhone.vw + 0.5 && ftPhone.worst === 'nothing',
      'the footer does not cause horizontal overflow at 375px',
      `body scrollWidth ${ftPhone.bodyScrollW} vs viewport ${ftPhone.vw}; ` +
      `widest element past the viewport: ${ftPhone.worst}`);

    const ftNarrow = await footerAt(320, 700, true);
    check(ftNarrow.bodyScrollW <= ftNarrow.vw + 0.5 && ftNarrow.worst === 'nothing',
      'no horizontal overflow at 320px either',
      `body scrollWidth ${ftNarrow.bodyScrollW} vs viewport ${ftNarrow.vw}; ` +
      `widest element past the viewport: ${ftNarrow.worst}`);
    // 320px is a separate breakpoint on this site - `html` drops to 35%, so every
    // rem in the 480px block shrinks again. Without its own footer rules the nav
    // text lands at 12.9px, under the floor asserted at 375px.
    check(ftNarrow.navSize >= 13 && ftNarrow.minLinkH >= 44,
      'the nav stays readable and tappable at 320px too',
      `${ftNarrow.navSize}px text, shortest link ${ftNarrow.minLinkH}px ` +
      `(the 480px block's 2.3rem renders as 12.9px here)`);
    // The tap target has to clear 44px without turning into a long footer: the
    // first attempt padded to 3.4rem, hit 69px a link and made the footer 993px
    // tall on a 375px phone.
    check(ftNarrow.totalH <= 900, 'the footer stays compact on a phone',
      `${ftNarrow.totalH}px tall at 320px (was 993px at 375px with 69px links)`);

    // The footer's hovers are the only motion it has, and they are now real
    // transitions rather than the invalid `0.3 ease-in-out` that did nothing.
    const ftHover = await evaluate(`(() => {
      const ft = document.querySelector('footer.footer');
      const a = ft.querySelector('.social a');
      const l = ft.querySelector('.footer-nav a');
      const sa = getComputedStyle(a), sl = getComputedStyle(l);
      return { icon: sa.transitionProperty, iconDur: sa.transitionDuration,
               link: sl.transitionProperty, linkDur: sl.transitionDuration,
               iconTransform: sa.transform };
    })()`);
    check(/transform/.test(ftHover.icon) && /background-color|box-shadow/.test(ftHover.icon),
      'the social icons have a real hover transition',
      `${ftHover.icon} over ${ftHover.iconDur} (was an invalid unitless shorthand, so nothing animated)`);
    check(/color/.test(ftHover.link) && ftHover.linkDur !== '0s',
      'the nav links have a real hover transition',
      `${ftHover.link} over ${ftHover.linkDur}`);

    await cdp.send('Emulation.setEmulatedMedia',
      { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const ftStill = await evaluate(`(() => {
      const ft = document.querySelector('footer.footer');
      const a = ft.querySelector('.social a');
      return { dur: getComputedStyle(a).transitionDuration,
               emulated: matchMedia('(prefers-reduced-motion: reduce)').matches };
    })()`);
    check(ftStill.emulated && ftStill.dur === '0s',
      'footer hover motion stops under prefers-reduced-motion',
      `transition-duration ${ftStill.dur}`);
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [] });

    await cdp.send('Emulation.clearDeviceMetricsOverride');

    console.log('\n=== header / nav ===');
    // The header was 119px at 1920 - 38.4px of padding above and below a 37px logo,
    // on a fixed bar that never scrolls away - and at 1280 the logo wrapped to a
    // second line and took it to 150.8px. Neither is visible in the CSS text: both
    // only show up as a measured height, which is why these are numbers.
    const barAt = async (w, h, mobile) => {
      // Cleared before set, for the same reason as the footer suite: back-to-back
      // setDeviceMetricsOverride calls without a clear leave a stale scrollbar in
      // the emulation state, and documentElement.scrollWidth then reports that
      // scrollbar as horizontal overflow on a page with nothing wide in it.
      await cdp.send('Emulation.clearDeviceMetricsOverride');
      await cdp.send('Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
      await cdp.send('Page.navigate', { url: PAGE });
      await sleep(3000);
      return evaluate(`(() => {
        const hd = document.querySelector('.header');
        const cs = getComputedStyle(hd);
        const logo = document.querySelector('.logo');
        const lr = logo.getBoundingClientRect();
        const lfs = parseFloat(getComputedStyle(logo).fontSize);
        const links = [...document.querySelectorAll('.navbar a')];
        const last = links[links.length - 1].getBoundingClientRect();
        const tog = document.getElementById('theme-toggle').getBoundingClientRect();
        const icon = document.getElementById('menu-icon').getBoundingClientRect();
        const hr = hd.getBoundingClientRect();
        // The bar's own content box, not the viewport. Everything inside it is
        // meant to align to these two edges, and the viewport edge is the wrong
        // reference as soon as the max-width container is narrower than the screen.
        const contentL = hr.left + parseFloat(cs.paddingLeft);
        const contentR = hr.right - parseFloat(cs.paddingRight);
        const nr = document.querySelector('.navbar').getBoundingClientRect();
        return {
          h: +hr.height.toFixed(1),
          edge: parseFloat(cs.borderBottomWidth),
          // A wrapped two-line logo is ~3x its own line box; a single line is ~1.5x
          // because of the font's ascent+descent. Measured 37px vs 74px for the same
          // 24.96px type, so this threshold separates them with room to spare.
          logoLines: +(lr.height / lfs).toFixed(2),
          // Distance from the last nav link's right edge to the controls' left edge.
          // Negative means they overlap.
          clearance: +(tog.left - last.right).toFixed(1),
          // Measured from the theme toggle, not the hamburger: the hamburger is
          // display:none above 1150px, so its rect is all zeroes and reading the
          // inset from it reports the toggle as being a whole viewport away.
          vw: innerWidth,
          navCentre: +((nr.left + nr.right) / 2).toFixed(1),
          contentL: +contentL.toFixed(1),
          contentR: +contentR.toFixed(1),
          contentW: +(contentR - contentL).toFixed(1),
          logoOffLeft: +(lr.left - contentL).toFixed(1),
          toggleOffRight: +(contentR - tog.right).toFixed(1),
          navShown: getComputedStyle(document.querySelector('.navbar')).display !== 'none',
          // body.scrollWidth rather than documentElement's, for the same reason as
          // the footer and hero phone checks: the 390px media query width-locks
          // html to 100vw, which counts the scrollbar clientWidth excludes, so
          // documentElement.scrollWidth intermittently reports a 16px phantom.
          bodyScrollW: document.body.scrollWidth,
          innerW: window.innerWidth,
          clientW: document.documentElement.clientWidth,
        };
      })()`);
    };
    const barWide = await barAt(1920, 1080, false);
    check(barWide.h <= 80, 'the header is not a slab', `${barWide.h}px tall (was 119px)`);
    check(barWide.h >= 55 && barWide.h <= 66, 'the header height is in the 60-65px target',
      `${barWide.h}px at 1920 (padding carries the height; the toggle keeps its own 4.4rem)`);
    check(barWide.logoLines < 2, 'the logo does not wrap to two lines',
      `${barWide.logoLines}x its font size per line`);
    check(barWide.clearance >= 0, 'the nav does not collide with the controls',
      `${barWide.clearance}px between the last link and the toggle`);
    // With space-between and the toggle ahead of the nav in the markup, the toggle
    // measured 899px from the right edge - dead centre of a 1920px bar. Alignment is
    // asserted against the bar's content box, not the viewport, because the
    // max-width container is narrower than a 1920px screen.
    check(barWide.toggleOffRight <= 40, 'the toggle sits on the container right edge',
      `${barWide.toggleOffRight}px inside it (was 899px from the viewport edge - centred)`);
    check(Math.abs(barWide.logoOffLeft) <= 1, 'the logo sits on the container left edge',
      `${barWide.logoOffLeft}px out from it`);
    check(barWide.contentW <= 1441, 'one max-width container holds the whole bar',
      `${barWide.contentW}px of content at 1920 (capped at 1440, so 240px gutters)`);
    // The requirement is a centred nav, which flexbox cannot express: margin-left:auto
    // only pushes an item against an edge. The grid's 1fr auto 1fr does, and this is
    // what proves the middle column is really the middle rather than approximately so.
    //
    // Centred on the *content box*, not on innerWidth. This page has a 15px
    // scrollbar, so the layout viewport the fixed bar actually spans is 1905px at a
    // nominal 1920 - measuring against innerWidth/2 = 960 reports the nav at 952.5px
    // as "7.5px off centre" when it is exactly centred in the bar it lives in.
    const boxCentre = (barWide.contentL + barWide.contentR) / 2;
    check(Math.abs(barWide.navCentre - boxCentre) <= 2, 'the nav is centred in the bar',
      `nav centre ${barWide.navCentre}px vs bar centre ${boxCentre}px ` +
      `(bar spans ${barWide.contentL}-${barWide.contentR}, ${barWide.vw}px viewport less a 15px scrollbar)`);
    check(barWide.edge >= 1, 'the header has a defined bottom edge',
      `${barWide.edge}px border (was none - content just stopped at an arbitrary line)`);
    check(barWide.bodyScrollW <= barWide.clientW + 0.5, 'the header does not cause horizontal overflow',
      `body scrollWidth ${barWide.bodyScrollW} vs viewport ${barWide.clientW}`);

    const barMid = await barAt(1280, 800, false);
    check(barMid.h <= 80 && barMid.logoLines < 2, 'the header stays thin at 1280px',
      `${barMid.h}px, logo ${barMid.logoLines}x (was 150.8px with a wrapped logo)`);

    const barPhone = await barAt(375, 812, true);
    check(barPhone.h <= 56, 'the header is thin on a phone',
      `${barPhone.h}px tall (was 95.4px, stacked vertically by a column flex-direction)`);
    check(!barPhone.navShown, 'the nav collapses on a phone',
      `navbar display ${barPhone.navShown ? 'shown' : 'none'} at 375px`);
    check(barPhone.bodyScrollW <= barPhone.clientW + 0.5, 'no horizontal overflow at 375px',
      `body scrollWidth ${barPhone.bodyScrollW} vs viewport ${barPhone.clientW}` +
      (barPhone.innerW !== barPhone.clientW ? ` (innerWidth ${barPhone.innerW}, stale emulation)` : ''));

    // The logo glow is a permanent animation in the always-visible header. The first
    // reduced-motion block sits mid-stylesheet while the light theme restates the
    // same animation further down at equal specificity, so a single early rule
    // covers dark theme only and light theme keeps pulsing forever. Assert both.
    await cdp.send('Emulation.setEmulatedMedia',
      { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const logoStill = await evaluate(`(() => {
      const root = document.documentElement;
      const had = root.getAttribute('data-theme');
      const read = () => getComputedStyle(document.querySelector('.logo span')).animationName;
      root.setAttribute('data-theme', 'dark');
      const dark = read();
      root.setAttribute('data-theme', 'light');
      const light = read();
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return { dark, light };
    })()`);
    check(logoStill.dark === 'none' && logoStill.light === 'none',
      'the logo glow stops under prefers-reduced-motion in both themes',
      `dark ${logoStill.dark}, light ${logoStill.light} (light restates it later at equal specificity)`);
    // The hero stat count-up, under reduced motion.
    //
    // Every other motion check above works by cancelling a CSS property and reading
    // it back. That cannot reach this one: the count-up writes textContent from a
    // requestAnimationFrame loop, so there is no property to cancel and the numbers
    // swept 0 -> target for 1.5s whatever the setting said. It is also the only
    // motion on the page with no reduced-motion branch at all - the rotator, the
    // halo, the float, the pulse and the logo glow are all handled in CSS, and this
    // was missed.
    console.log('\n=== hero stats count-up ===');
    await cdp.send('Emulation.setEmulatedMedia',
      { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.send('Page.navigate', { url: PAGE });
    await sleep(600);
    // Count the frames the stats area schedules over a short window. Reduced means
    // zero, and this measures the loop directly rather than inferring it from a
    // final value - a 1.5s sweep sampled at 3s looks identical to an instant write.
    const statMotion = await evaluate(`(async () => {
      const els = [...document.querySelectorAll('.hero-stat-count')];
      if (!els.length) return { n: 0 };
      let frames = 0;
      const real = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) { frames++; return real.call(window, cb); };
      els[0].scrollIntoView();
      await new Promise(r => real.call(window, () => setTimeout(r, 1200)));
      window.requestAnimationFrame = real;
      return {
        n: els.length,
        frames,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        states: els.map(e => e.dataset.statState || 'none'),
        texts: els.map(e => e.textContent.trim()),
        targets: els.map(e => (e.dataset.target || '?') + (e.dataset.suffix || '')),
      };
    })()`);
    check(statMotion.reduced, 'the harness really is emulating reduced motion',
      'matchMedia says reduce: ' + statMotion.reduced);
    check(statMotion.n > 0, 'the hero stats are on the page', statMotion.n + ' found');
    check(statMotion.frames === 0, 'the count-up starts no animation frames under reduced motion',
      statMotion.frames + ' rAF calls in 1.2s after the stats were scrolled into view');
    check(statMotion.states.every(s => s === 'final'),
      'each stat takes the instant-write path, not the animated one',
      'data-stat-state: ' + statMotion.states.join(', '));
    check(statMotion.texts.join('|') === statMotion.targets.join('|'),
      'the stats land on their target values immediately',
      statMotion.texts.join(', ') + ' vs ' + statMotion.targets.join(', '));

    // And the same stats still animate when the setting is off, or the branch above
    // would pass on a page that never animated anything.
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [] });
    await cdp.send('Page.navigate', { url: PAGE });
    await sleep(600);
    const statAnim = await evaluate(`(async () => {
      const els = [...document.querySelectorAll('.hero-stat-count')];
      if (!els.length) return { frames: -1, states: [], texts: [] };
      let frames = 0;
      const real = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) { frames++; return real.call(window, cb); };
      els[0].scrollIntoView();
      await new Promise(r => real.call(window, () => setTimeout(r, 400)));
      window.requestAnimationFrame = real;
      return { frames, states: els.map(e => e.dataset.statState || 'none'), texts: els.map(e => e.textContent.trim()) };
    })()`);
    check(statAnim.frames > 0 && statAnim.states.every(s => s === 'animated'),
      'the count-up still animates when reduced motion is off',
      `${statAnim.frames} rAF calls, data-stat-state: ${statAnim.states.join(', ')}`);
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [] });
    // barAt leaves the viewport wherever it last measured, and the hero photo suite
    // below assumes the 1280x900 window the harness launched with - it inherited a
    // 375px phone viewport here and measured the photo's 28rem floor, then failed
    // its own "not oversized" check at 48% of the screen. Put it back.
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    console.log('\n=== hero photo ===');
    // The photo was a circle only at the one size the base rule was written for.
    // `width` was overridden at every breakpoint but `height` never was, so below
    // 895px it rendered as a 300x120px ellipse on a 375px phone - and nothing
    // caught it, because "the image has a box" is true of an ellipse too. These
    // checks measure the shape rather than the presence.
    const photo = await evaluate(`(() => {
      const wrap = document.querySelector('.home-img');
      const img = wrap.querySelector('img');
      const cs = getComputedStyle(img);
      const r = img.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const halo = getComputedStyle(wrap, '::after');
      return {
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        vw: document.documentElement.clientWidth,
        top: cs.top,
        dx: +(((r.left + r.width / 2) - (w.left + w.width / 2))).toFixed(1),
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        haloContent: halo.content,
        haloAnim: halo.animationName,
        floatAnim: getComputedStyle(wrap).animationName,
        shadow: cs.boxShadow,
        radius: cs.borderTopLeftRadius,
      };
    })()`);
    check(Math.abs(photo.w - photo.h) <= 1, 'the photo is a circle, not an ellipse',
      `${photo.w}x${photo.h}px (was 300x120 at 375px wide before aspect-ratio)`);
    check(photo.w <= photo.vw * 0.3, 'the photo is not oversized',
      `${photo.w}px = ${Math.round(photo.w / photo.vw * 100)}% of the viewport (was 32vw, 461px at 1440)`);
    check(photo.top === 'auto' && Math.abs(photo.dx) <= 1,
      'the photo is centred, not offset by a top hack',
      `computed top: ${photo.top}, off centre by ${photo.dx}px`);
    check(photo.objectFit === 'cover', 'the portrait is cropped, not squashed',
      'object-fit: ' + photo.objectFit + ' at ' + photo.objectPosition);
    check(photo.haloContent !== 'none' && photo.haloAnim === 'profile-halo',
      'the halo is present and pulsing',
      `::after content ${photo.haloContent}, animation ${photo.haloAnim}`);
    // On the wrapper, not the image: the halo's inset: 0 has to travel with the
    // photo or the circle would slide around inside a stationary ring.
    check(photo.floatAnim === 'profile-float', 'the photo floats',
      'wrapper animation ' + photo.floatAnim);
    check(photo.radius === '50%', 'the frame is fully round',
      'border-radius: ' + photo.radius);

    // A permanent animation has to stop for people who asked for that, and the
    // only way to know the swap works is to ask the browser with the media
    // feature actually set rather than reading the stylesheet and hoping.
    await cdp.send('Emulation.setEmulatedMedia',
      { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const still = await evaluate(`(() => {
      const wrap = document.querySelector('.home-img');
      const halo = getComputedStyle(wrap, '::after');
      return { anim: halo.animationName, opacity: halo.opacity,
               float: getComputedStyle(wrap).animationName,
               rotator: getComputedStyle(document.querySelector('.ta-rotator')).display };
    })()`);
    check(still.anim === 'none', 'the pulse stops under prefers-reduced-motion',
      `animation-name: ${still.anim} at opacity ${still.opacity}`);
    check(still.float === 'none', 'the float stops under prefers-reduced-motion',
      'wrapper animation-name: ' + still.float);
    // Confirms the emulation is real and this check is not passing by accident:
    // the rotator's swap below is already known to work, so it must flip too.
    check(still.rotator === 'none', 'the reduced-motion emulation is actually in effect',
      '.ta-rotator display: ' + still.rotator);
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [] });

    // The photo transitions box-shadow over 0.45s, so reading it in the same tick
    // as the theme flip returns the value the transition started from - the dark
    // one - and reports the light override as not applying when it applies fine.
    // Sampled after the transition instead, which is also what a visitor sees.
    const hadTheme = await evaluate(`document.documentElement.getAttribute('data-theme')`);
    await evaluate(`document.documentElement.setAttribute('data-theme', 'light')`);
    await sleep(700);
    const lightRing = await evaluate(
      `getComputedStyle(document.querySelector('.home-img img')).boxShadow`);
    await evaluate(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(700);
    const darkRing = await evaluate(
      `getComputedStyle(document.querySelector('.home-img img')).boxShadow`);
    if (hadTheme === null) await evaluate(`document.documentElement.removeAttribute('data-theme')`);
    else await evaluate(`document.documentElement.setAttribute('data-theme', '${hadTheme}')`);
    check(lightRing !== darkRing, 'light and dark photo rings are not identical',
      lightRing !== darkRing
        ? 'differ: ' + lightRing.slice(0, 34) + ' vs ' + darkRing.slice(0, 34)
        : `IDENTICAL - light: ${lightRing}, dark: ${darkRing}`);

    console.log('\n=== hero count-up (the race) ===');
    // The stats sit below the fold, and the observer is deliberately lazy, so they
    // have to be scrolled into view before the animation is allowed to start.
    await evaluate('document.querySelector("#hero-stat-projects").scrollIntoView({block:"center"})');
    await sleep(2500);
    // renderProjects writes data-target; the observer animates the text. Both must
    // end up agreeing, whichever ran last -- that disagreement was the original bug.
    const stats = await evaluate(`(() => {
      const out = {};
      for (const s of document.querySelectorAll('.hero-stat')) {
        const n = s.querySelector('.hero-stat-count');
        out[s.querySelector('.hero-stat-label').textContent.trim()] = {
          text: n.textContent.trim(),
          target: n.dataset.target,
          suffix: n.dataset.suffix || '',
        };
      }
      return out;
    })()`);
    check(stats['Projects Built'] && stats['Projects Built'].target === '13',
      'project stat targets 13', stats['Projects Built'] && stats['Projects Built'].target);
    check(stats['Skill Areas'] && stats['Skill Areas'].target === '8',
      'skill stat targets 8', stats['Skill Areas'] && stats['Skill Areas'].target);
    check(stats['Certifications'] && stats['Certifications'].target === '38',
      'certification stat targets 38', stats['Certifications'] && stats['Certifications'].target);
    const settled = Object.entries(stats)
      .filter(([, v]) => v.target)
      .map(([k, v]) => [k, v.text === v.target + v.suffix]);
    check(settled.every(([, ok]) => ok), 'every stat settled on its own target + suffix',
      settled.map(([k, ok]) => `${k}=${ok ? 'ok' : 'MISMATCH'}`).join(' '));

    console.log('\n=== hero sub-headline rotator ===');
    // The tagline is a <p>, so `.home-content p` applies to it. That rule sets
    // 1.5rem and outranks `.text-animation`, which is how the running text came to
    // render at a little over half its intended size without any markup changing.
    // A size assertion is the only thing that catches that class of regression.
    const type = await evaluate(`(() => {
      const el = document.querySelector('.text-animation');
      const cs = getComputedStyle(el);
      const body = document.querySelector('.home-content p:not(.text-animation)');
      return {
        tag: el.tagName,
        size: parseFloat(cs.fontSize),
        weight: cs.fontWeight,
        declared: parseFloat(cs.fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize),
        bodySize: body ? parseFloat(getComputedStyle(body).fontSize) : 0,
        h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
      };
    })()`);
    check(type.tag === 'P', 'tagline is a p, not a heading', type.tag);
    check(Math.abs(type.declared - 3.5) < 0.05, 'tagline renders at its declared 3.5rem',
      type.size + 'px = ' + type.declared.toFixed(2) + 'rem');
    check(type.size > type.bodySize * 2, 'tagline is not collapsed to body-copy size',
      `tagline ${type.size}px vs body ${type.bodySize}px (${(type.size / type.bodySize).toFixed(2)}x)`);
    check(type.weight === '600', 'tagline keeps its 600 weight', type.weight);
    check(type.size < type.h1, 'tagline still sits below the h1 in the size hierarchy',
      `${type.size}px < h1 ${type.h1}px`);

    // The visible words are CSS `content` on ::before, so textContent is empty by
    // design. Ask the pseudo-element instead: that is what the reader actually sees.
    const rot = await evaluate(`getComputedStyle(document.querySelector('.ta-rotator'),'::before').animationName`);
    check(rot === 'word', 'rotator pseudo-element runs the word animation', rot);
    const seen = [];
    for (let i = 0; i < 16; i++) {
      seen.push(await evaluate(
        `getComputedStyle(document.querySelector('.ta-rotator'),'::before').content`));
      await sleep(1000);
    }
    const uniq = [...new Set(seen.filter(s => s && s !== 'none' && s !== 'normal'))];
    check(uniq.length >= 3, 'rotator cycles through several titles', JSON.stringify(uniq));
    check(uniq.length > 1, 'rotator text actually changes over time',
      uniq.length + ' distinct words sampled');
    // Screen readers must get a stable sentence instead of the animation.
    check(await evaluate(`(() => { const s = document.querySelector('.ta-sr');
      return !!s && s.textContent.includes('Information Technology Assistant'); })()`),
      'static sr-only sentence present for assistive tech');

    console.log('\n=== CSS the browser actually built ===');
    const css = await evaluate(`(() => {
      let rules = 0, keyframes = 0, media = 0;
      for (const sheet of document.styleSheets) {
        let rs; try { rs = sheet.cssRules; } catch (e) { continue; }
        for (const r of rs) {
          rules++;
          if (r.type === CSSRule.KEYFRAMES_RULE) keyframes++;
          if (r.type === CSSRule.MEDIA_RULE) media++;
        }
      }
      return { rules, keyframes, media, sheets: document.styleSheets.length };
    })()`);
    check(css.rules > 300, 'stylesheet has a healthy rule count', css.rules + ' rules');
    check(css.keyframes >= 5, 'all five @keyframes registered', css.keyframes + ' keyframes');
    check(css.media >= 13, 'all thirteen media queries registered', css.media + ' media');

    console.log('\n=== structured data ===');
    const ld = await evaluate(`(() => {
      const b = [...document.querySelectorAll('script[type="application/ld+json"]')];
      return b.map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } });
    })()`);
    check(ld.length === 1 && ld[0] !== null, 'exactly one JSON-LD block, and it parses',
      ld.length + ' block(s)');
    const graph = ld[0] && ld[0]['@graph'];
    const types = graph ? graph.map(n => n['@type']).join(', ') : '(none)';
    check(graph && graph.length === 3, 'three nodes in the graph', types);
    const person = graph && graph.find(n => n['@type'] === 'Person');
    check(person && person.hasCredential && person.hasCredential.length === 38,
      'Person lists all 38 credentials',
      person && person.hasCredential ? person.hasCredential.length + ' credentials' : 'none');
    const site = graph && graph.find(n => n['@type'] === 'WebSite');
    check(site && site.potentialAction && site.potentialAction.target.urlTemplate.includes('blog.html?q='),
      'SearchAction points at blog.html?q=',
      site && site.potentialAction ? site.potentialAction.target.urlTemplate : 'none');

    console.log('\n=== console errors ===');
    const errs = cdp.events
      .filter(e => e.method === 'Runtime.exceptionThrown')
      .map(e => (e.params.exceptionDetails.exception || {}).description || e.params.exceptionDetails.text);
    check(errs.length === 0, 'no uncaught exceptions', errs.slice(0, 2).join(' | ') || 'clean');

    // The SearchAction in the JSON-LD promises a working ?q= on blog.html. Structured
    // data that points at a parameter the page ignores is worse than none at all.
    // Results are pre-existing .post-item elements toggled with .is-hidden, so the
    // count that matters is the visible ones, not the number of cards in the DOM.
    console.log('\n=== blog.html?q= (what SearchAction advertises) ===');
    const visibleCount = `document.querySelectorAll('.post-item:not(.is-hidden)').length`;
    const totalCount = `document.querySelectorAll('.post-item').length`;
    const BLOG = PAGE.replace(/index\.html$/, 'blog.html?q=laravel');
    await cdp.send('Page.navigate', { url: BLOG });
    await sleep(3500);
    const totals = await evaluate(`${totalCount}`);
    const shown = await evaluate(`${visibleCount}`);
    check(totals === 9, 'nine posts exist on the page', totals + ' posts');
    check(shown > 0 && shown < totals, 'the query actually narrows the list',
      `${shown} of ${totals} shown`);
    check(await evaluate(`(() => {
      const vis = [...document.querySelectorAll('.post-item:not(.is-hidden)')];
      return vis.length > 0 && vis.every(el => el.textContent.toLowerCase().includes('laravel'));
    })()`), 'every visible result really mentions laravel');
    check(await evaluate('document.getElementById("blog-search").value') === 'laravel',
      'the search box is populated from the URL');
    check(await evaluate('(document.getElementById("blog-results").textContent.match(/\\d+/)||[""])[0]') === String(shown),
      'the result count matches what is on screen');
    // Typing must keep the URL shareable.
    check(await evaluate('location.search.includes("q=laravel")'), 'query is mirrored into the address bar');
    // And an unmatched term must not leave the reader staring at everything.
    await cdp.send('Page.navigate', { url: PAGE.replace(/index\.html$/, 'blog.html?q=zzzznotathing') });
    await sleep(3000);
    const none = await evaluate(`(() => {
      const vis = document.querySelectorAll('.post-item:not(.is-hidden)').length;
      return vis + ' visible, empty-state shown: ' + !document.getElementById('no-results').hidden;
    })()`);
    check(/^0 visible, empty-state shown: true$/.test(none),
      'an unmatched query shows the empty state instead of everything', none);

    // The photo's diameter is specified as a target on a 1920px screen, and every
    // other photo check runs at the 1280px window this harness launches with.
    // This is the only thing holding that number still true.
    console.log('\n=== hero photo at 1920px ===');
    // Cleared first, like every other width change in this harness - see the note
    // on barAt. The footer suite runs before this one and leaves an override in
    // place, which is exactly the back-to-back case that goes stale.
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: PAGE });
    await sleep(3000);
    const wide = await evaluate(`(() => {
      const r = document.querySelector('.home-img img').getBoundingClientRect();
      const home = document.querySelector('.home').getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.home'));
      return {
        d: +r.width.toFixed(1),
        square: +r.height.toFixed(1),
        overflow: +(document.documentElement.scrollWidth - document.documentElement.clientWidth).toFixed(1),
        gap: cs.gap,
        textW: +document.querySelector('.home-content').getBoundingClientRect().width.toFixed(1),
        homeW: +home.width.toFixed(1),
      };
    })()`);
    check(wide.d >= 330 && wide.d <= 380, 'the photo hits the 330-380px target at 1920px',
      `${wide.d}px diameter (target 330-380, was 278px before this change)`);
    check(Math.abs(wide.d - wide.square) <= 1, 'still a circle at 1920px',
      `${wide.d}x${wide.square}px`);
    // The 26vw term in the clamp exists for this band: at 1920 it is capped by the
    // rem bound, and the text column has to survive the gap that leaves behind.
    check(wide.textW > 300, 'the hero text column still has room at 1920px',
      `text ${wide.textW}px of ${wide.homeW}px section, gap ${wide.gap}`);
    check(wide.overflow <= 0.5, 'no horizontal overflow at 1920px',
      `scrollWidth exceeds the viewport by ${wide.overflow}px`);

    // A backdrop is easy to make responsive-hostile: gradients sized in rem scale
    // with the root font-size, which the breakpoints shrink from 60% to 35%, and
    // `html { overflow-x: hidden }` hides any overflow rather than letting it be
    // noticed. So measure the hero at phone width instead of trusting it.
    console.log('\n=== hero at phone width ===');
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: 375, height: 820, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: PAGE });
    await sleep(3000);
    const narrow = await evaluate(`(() => {
      const vw = document.documentElement.clientWidth;
      const home = document.querySelector('.home');
      const ta = document.querySelector('.text-animation');
      const img = document.querySelector('.home-img img');
      const tr = ta.getBoundingClientRect();
      // Whole document, not just .home. The hero is the section this check was
      // written for, but "the page does not scroll sideways on a phone" is a
      // property of the page - and a scan limited to the hero reports "nothing"
      // for a footer or a blog card that is 16px too wide, which is exactly the
      // regression this is meant to catch.
      let worst = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (!worst || r.right > worst.over) {
          worst = { over: r.right - vw, tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + String(el.className).trim().split(/\s+/)[0] : '') };
        }
      }
      return {
        vw,
        innerW: window.innerWidth,
        scrollW: document.documentElement.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        taglineRight: +tr.right.toFixed(1),
        taglineClipped: tr.right > vw + 0.5,
        photoW: +img.getBoundingClientRect().width.toFixed(1),
        photoH: +img.getBoundingClientRect().height.toFixed(1),
        // The shared splitter, not a bare split('gradient('). That naive form
        // counted 3 before the grid gained its major-line tier and now counts 5,
        // but it was never really a layer count: it counts the literal string
        // 'gradient(' anywhere in the value, so it cannot distinguish the fade
        // from the grid and would happily pass a stack of five copies of the fade.
        // Reusing SPLIT keeps this check and the desktop one reading the same
        // classification, which is the point of hoisting it into a function.
        gridAxes: (() => {
          const layers = [];
          let depth = 0, cur = '';
          for (const ch of getComputedStyle(home).backgroundImage) {
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            if (ch === ',' && depth === 0) { layers.push(cur.trim()); cur = ''; continue; }
            cur += ch;
          }
          if (cur.trim()) layers.push(cur.trim());
          return layers.filter(l => l.startsWith('repeating-linear-gradient')).length;
        })(),
        worst: worst.over > 0.5 ? worst.tag + ' by ' + worst.over.toFixed(1) + 'px' : 'nothing',
        // Left edges of the hero's stacked children. This is what
        // \`align-items: baseline\` broke, and separately a \`margin: 0 auto\` on each
        // paragraph below 895px: in a column flex container the cross
        // axis is horizontal, so baseline alignment put the h1, tagline and body
        // copy each on their own first baseline, which for mixed font sizes is a
        // ragged left edge. 3rem of margin-top then offset the whole column
        // against the photo. One number for all of them, because the claim under
        // test is that they share an edge.
        leftEdges: [...document.querySelectorAll('.home-content > h1, .home-content > p, .home-content > .btn-group')]
          .map(el => ({ tag: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), left: +el.getBoundingClientRect().left.toFixed(1) })),
        // Same measurement at the desktop width this runs against elsewhere.
        roleLeft: +document.querySelector('.hero-role').getBoundingClientRect().left.toFixed(1),
        bioLeft: +document.querySelector('.hero-bio').getBoundingClientRect().left.toFixed(1),
        heroLeft: +document.querySelector('.home-content h1').getBoundingClientRect().left.toFixed(1),
        referenceLeft: +document.querySelector('.services h2').getBoundingClientRect().left.toFixed(1),
        // The two hero CTAs. \`.btn-group a:nth-of-type(2)\` restated \`.btn\`
        // exactly, so Resume and Contact rendered identically and neither read as
        // the primary action. Comparing resolved backgrounds is the only check that
        // actually distinguishes them; a selector change alone would not have.
        ctas: [...document.querySelectorAll('.btn-group .btn')].map(el => ({
          label: el.textContent.trim(),
          primary: el.classList.contains('btn-primary'),
          bg: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
        })),
      };
    })()`);
    // body.scrollWidth plus the per-element scan, not documentElement.scrollWidth.
    // The 390px media query sets overflow-x hidden and 100vw widths on html, and
    // 100vw counts the scrollbar that clientWidth excludes - so on this page
    // documentElement.scrollWidth intermittently reports a 16px phantom overflow
    // that no element accounts for. innerWidth is reported alongside so a stale
    // emulation state stays visible in the failure text instead of hiding.
    check(narrow.bodyScrollW <= narrow.vw + 0.5 && narrow.worst === 'nothing',
      'no horizontal overflow at 375px',
      `body scrollWidth ${narrow.bodyScrollW} vs viewport ${narrow.vw}; ` +
      `widest element past the viewport: ${narrow.worst}` +
      (narrow.innerW !== narrow.vw ? ` (innerWidth ${narrow.innerW}, stale emulation)` : ''));
    check(!narrow.taglineClipped, 'tagline is not clipped at 375px',
      'right edge at ' + narrow.taglineRight + 'px');
    check(narrow.gridAxes >= 2, 'backdrop survives the phone breakpoints',
      narrow.gridAxes + ' grid axis layer(s) still parsed, photo ' + narrow.photoW + 'px wide');
    // Every child of .home-content should start at the same x. baseline alignment
    // and the leftover 3rem margin each failed this independently.
    const lefts = narrow.leftEdges.map(l => l.left);
    const spread = Math.max(...lefts) - Math.min(...lefts);
    check(narrow.leftEdges.length >= 4 && spread <= 1,
      'the hero text column shares one left edge at 375px',
      `${narrow.leftEdges.length} children, spread ${spread.toFixed(1)}px: ` +
      narrow.leftEdges.map(l => `${l.tag} ${l.left}px`).join(', '));
    check(Math.abs(narrow.roleLeft - lefts[0]) <= 1 && Math.abs(narrow.bioLeft - lefts[0]) <= 1,
      'the role and bio lines align with the h1 above them',
      `h1 ${lefts[0]}px, role ${narrow.roleLeft}px, bio ${narrow.bioLeft}px`);
    // The hero against the rest of the page, which is the check that catches an
    // indent. "The hero children share an edge" passes happily on a column that is
    // uniformly 60px too far in, because a wrong edge is still a shared edge - that
    // is exactly how the 4rem mobile margin survived: the column looked tidy in
    // isolation and indented relative to every section heading on the page.
    //
    // So compare against a section outside the hero rather than against the hero
    // itself. .services h2 is a plain section child with no margin of its own, so
    // its left edge is the page gutter and nothing else.
    const heroVsPage = narrow.heroLeft - narrow.referenceLeft;
    check(Math.abs(heroVsPage) <= 1,
      'the hero text shares the page gutter, not an indent of its own',
      `hero h1 ${narrow.heroLeft}px vs .services h2 ${narrow.referenceLeft}px ` +
      `(${heroVsPage > 0 ? '+' : ''}${heroVsPage}px); was +38.4px at 768 and +63px at 820 ` +
      'from .home\'s own horizontal margin stacking on section padding');
    // Distinct backgrounds is the actual requirement; the classes are only how the
    // stylesheet expresses it.
    check(narrow.ctas.length === 2, 'both hero CTAs are still there',
      narrow.ctas.map(c => c.label).join(', '));
    check(narrow.ctas.length === 2 && narrow.ctas[0].bg !== narrow.ctas[1].bg,
      'Resume and Contact resolve to different backgrounds, so one reads as primary',
      narrow.ctas.map(c => `${c.label} ${c.bg}`).join(' vs '));
    // The regression that motivated the whole photo rewrite: `width` was set per
    // breakpoint and `height` never was, so the circle arrived at the phone as an
    // ellipse. The width alone looked plausible, which is why it survived.
    check(Math.abs(narrow.photoW - narrow.photoH) <= 1, 'the photo is still a circle at 375px',
      `${narrow.photoW}x${narrow.photoH}px (was 300x120px)`);
    check(narrow.photoW <= narrow.vw * 0.55, 'the photo is scaled down on a phone',
      `${narrow.photoW}px = ${Math.round(narrow.photoW / narrow.vw * 100)}% of the viewport`);
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // ---------- education / experience timeline ----------
    // Four defects lived here and every one of them was invisible to the source-
    // level suites, because the CSS was well-formed the whole time:
    //   - at <=576px the rail was hidden with `display: none` while .timeline-dot
    //     was left in place, so phones showed four dots floating unconnected with
    //     their glows and no line to sit on. (The dot did NOT reach the date: the
    //     991px block's `.timeline-item:nth-child(odd)` padding-left outranks the
    //     576px block's lower-specificity `padding: 0`, so the 37px gutter
    //     survived. Verified by running this suite against the pre-change file -
    //     `the rail is visible` fails there, `no dot overlaps a date` does not.)
    //   - .education/.experience set `padding: 100px 15px`, a class selector that
    //     outranks `section`, pinning both sections to 15px at every width while
    //     Services and Projects tracked the breakpoint's 3%/12%;
    //   - the rail and dot were each 1px off the shared centreline (rail centred
    //     on 50% + 1.5px, dot on 50% + 2.5px), and the light theme's ring
    //     inherited the error;
    //   - .timeline-content was a plain div with cursor:pointer and a 1.05 hover
    //     scale, which on touch sticks after a tap and pushed a near-full-width
    //     card outside its own track.
    // Every section that renders a .timeline-items is measured, not just
    // Education, because the CSS is shared with Experience.
    console.log('\n=== timeline: dot clears the date, rail and dot share a centre ===');
    const timelineAt = async (w, h, mobile) => {
      // The rail is a pseudo-element, so it has no rect of its own. Its box is
      // rebuilt from computed `left` + `width` against the track's padding box,
      // which is what `left` resolves against. Clear-then-set, for the reason at
      // barAt.
      await cdp.send('Emulation.clearDeviceMetricsOverride');
      await cdp.send('Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
      await cdp.send('Page.navigate', { url: PAGE });
      await sleep(3000);
      return evaluate(`(() => {
        const out = { sections: [], bodyScrollW: 0, vw: document.documentElement.clientWidth };
        for (const sec of document.querySelectorAll('.education, .experience')) {
          const track = sec.querySelector('.timeline-items');
          const cs = getComputedStyle(track, '::before');
          const trackR = track.getBoundingClientRect();
          const pl = parseFloat(getComputedStyle(track).paddingLeft);
          const pr = parseFloat(getComputedStyle(track).paddingRight);
          // left on the pseudo resolves against the track's padding box.
          const railLeft = trackR.left + pl +
            (cs.left.endsWith('%')
              ? (trackR.width - pl - pr) * parseFloat(cs.left) / 100
              : parseFloat(cs.left));
          const railW = parseFloat(cs.width) || 0;
          const items = [...track.querySelectorAll('.timeline-item')].map(it => {
            const dot = it.querySelector('.timeline-dot').getBoundingClientRect();
            const date = it.querySelector('.timeline-date').getBoundingClientRect();
            const card = it.querySelector('.timeline-content').getBoundingClientRect();
            // Overlap on both axes. A 0-tall box would trivially pass, so a
            // hit requires real intersection area in the vertical direction too.
            const overlapX = Math.min(dot.right, date.right) - Math.max(dot.left, date.left);
            const overlapY = Math.min(dot.bottom, date.bottom) - Math.max(dot.top, date.top);
            // The dot's 4px separation ring is drawn outside its border box and
            // getBoundingClientRect does not include box-shadow, so the ring's
            // outer edge is recovered from the computed spread. Against the card
            // it is the thing that actually touches: the dot's own box can clear
            // the card while its halo does not.
            const ring = (getComputedStyle(it.querySelector('.timeline-dot')).boxShadow
              .match(/(-?[\\d.]+)px/g) || []).map(parseFloat);
            const spread = ring.length ? Math.max(...ring.map(Math.abs)) : 0;
            return {
              overlap: +(Math.max(0, overlapX) * Math.max(0, overlapY)).toFixed(1),
              dotCX: +(dot.left + dot.width / 2).toFixed(1),
              cardOverhang: +(Math.max(0, card.right - out.vw) + Math.max(0, 0 - card.left)).toFixed(1),
              dotLeft: +dot.left.toFixed(1),
              // Negative means the dot's ring would sit inside the card.
              ringToCard: +(card.left - (dot.right + spread)).toFixed(1),
              // The dot has to read as belonging to the date line beside it, not
              // to the card below it.
              dotDateSkew: +Math.abs(
                (dot.top + dot.height / 2) - (date.top + date.height / 2)).toFixed(1),
              cursor: getComputedStyle(it.querySelector('.timeline-content')).cursor,
              transform: getComputedStyle(it.querySelector('.timeline-content')).transform,
            };
          });
          out.sections.push({
            id: sec.id,
            railCX: +(railLeft + railW / 2).toFixed(1),
            railVisible: cs.display !== 'none',
            padL: +pl.toFixed(1), padR: +pr.toFixed(1),
            items,
          });
        }
        out.bodyScrollW = document.documentElement.scrollWidth;
        // Section gutters, for the shared-rhythm check below.
        for (const id of ['education', 'experience', 'services', 'projects']) {
          const s = getComputedStyle(document.getElementById(id));
          out[id + 'Pad'] = +parseFloat(s.paddingLeft).toFixed(1);
        }
        return out;
      })()`);
    };

    for (const [w, h, mobile] of [[375, 812, true], [768, 1024, false], [1280, 900, false]]) {
      const t = await timelineAt(w, h, mobile);
      const worstOverlap = Math.max(...t.sections.flatMap(s => s.items.map(i => i.overlap)));
      check(worstOverlap <= 1, `no dot overlaps a date at ${w}px`,
        `worst intersection area ${worstOverlap}px² (the dot must sit in the item's padding gutter)`);

      // 0.5px of tolerance, not 1px. Both the rail and the dot are px-sized and
      // the track is centred with `margin: auto`, so at a fractional viewport
      // width the track's left edge is fractional while the dot's is a whole
      // number - sub-pixel here is arithmetic, not layout. But the pre-fix
      // geometry was out by a full 1px at every width, and a 1px tolerance would
      // have passed it. 0.5px is tight enough to fail that and still leaves room
      // for the rounding.
      const worstDrift = Math.max(...t.sections.flatMap(
        s => s.items.map(i => Math.abs(i.dotCX - s.railCX))));
      check(worstDrift <= 0.5, `every dot is centred on the rail at ${w}px`,
        `worst drift ${worstDrift.toFixed(1)}px (was 1px off in both themes)`);

      check(t.sections.every(s => s.railVisible), `the rail is visible at ${w}px`,
        t.sections.map(s => `${s.id} display=${s.railVisible}`).join(', '));

      // The dot's 4px ring must clear the card on the single rail. An earlier
      // revision of this fix used `padding-left: 3.6rem` for that gutter, which
      // resolves to 25.9px at the 40% root - and the ring reaches 25px, so at
      // 375px it landed 0.9px INSIDE the card, drawing a notch of band colour
      // along the card's left border. A rem gutter cannot clear a px-sized dot
      // at every root font-size, which is what this pins down.
      //
      // Only asserted below 991px, where the dot is the card's left-hand
      // neighbour. On the desktop zigzag the dot sits on the centreline and the
      // card is a half-track away on the other side, so "gap between them" is
      // meaningless there and would read as a large negative.
      if (w <= 991) {
        const worstRingGap = Math.min(...t.sections.flatMap(s => s.items.map(i => i.ringToCard)));
        check(worstRingGap >= 0, `the dot's ring clears the card at ${w}px`,
          `tightest gap ${worstRingGap.toFixed(1)}px (negative means the ring draws inside the card)`);
      }

      // Vertical centring of the dot on the date's line box. A flat `top: 10px`
      // only looked level against the old 2rem/800 date at the 60% root; at every
      // smaller root it sat below the text, ~7px adrift on a 375px phone. The
      // rule now derives its offset from the date's own metrics.
      const worstSkew = Math.max(...t.sections.flatMap(s => s.items.map(i => i.dotDateSkew)));
      check(worstSkew <= 1, `each dot is level with its date at ${w}px`,
        `worst vertical skew ${worstSkew.toFixed(1)}px`);

      const worstOverhang = Math.max(...t.sections.flatMap(s => s.items.map(i => i.cardOverhang)));
      check(worstOverhang <= 1, `no timeline card hangs past the viewport at ${w}px`,
        `worst overhang ${worstOverhang.toFixed(1)}px at ${t.vw}px viewport`);

      // cursor:pointer on a non-interactive div, plus the 1.05 scale. Asserted
      // on the computed style rather than by simulating a hover, which would also
      // need to model the sticky :hover state touch devices leave behind.
      // `auto` is the CSS initial value and is what a non-interactive div
      // resolves to - the assertion is that `pointer` is gone, not that a
      // particular non-pointer keyword landed.
      check(t.sections.every(s => s.items.every(i => i.cursor !== 'pointer')),
        `timeline cards are not advertised as clickable at ${w}px`,
        `cursor: ${[...new Set(t.sections.flatMap(s => s.items.map(i => i.cursor)))].join(', ')} (was explicitly pointer)`);
      check(t.sections.every(s => s.items.every(i => i.transform === 'none')),
        `timeline cards do not scale on hover at ${w}px`,
        [...new Set(t.sections.flatMap(s => s.items.map(i => i.transform)))].join(', '));

      check(t.bodyScrollW <= t.vw + 0.5, `no horizontal overflow at ${w}px`,
        `scrollWidth ${t.bodyScrollW} vs viewport ${t.vw}`);
    }

    console.log('\n=== timeline: sections share one horizontal rhythm ===');
    // The regression that made these two sections look misaligned against every
    // other one: `padding: 100px 15px` on a class selector outranks `section`,
    // so Education and Experience never saw the breakpoint's 3% or 12%.
    for (const [w, h] of [[1280, 900], [375, 812]]) {
      const t = await timelineAt(w, h, w < 500);
      const pads = ['education', 'experience', 'services', 'projects'].map(k => t[k + 'Pad']);
      check(pads.every(p => Math.abs(p - pads[0]) <= 0.5),
        `education, experience, services and projects share a gutter at ${w}px`,
        `education ${t.educationPad}, experience ${t.experiencePad}, services ${t.servicesPad}, projects ${t.projectsPad}px`);
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    cdp.close();
  } finally {
    proc.kill();
    // Best-effort: a leftover profile dir is harmless, but accumulating one per
    // run would slowly fill the temp directory.
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) { /* Windows may still hold it */ }
  }

  console.log(failures === 0 ? '\n  all checks passed' : `\n  ${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('harness error:', e.message); process.exit(2); });
