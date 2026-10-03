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
    // not good enough: Chrome serialises `0 1px` as four separate stops, so a plain
    // comma split reports 18 "layers" for a 5-layer stack and would pass a check
    // that is not looking at anything.
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
      return { layers, css: cs, img: document.querySelector('.home-img img') };
    })`;

    // The grid + glows are painted as `background` on .home rather than on a
    // pseudo-element, specifically so nothing needs `overflow: hidden`. If that
    // ever changes, this is the check that notices the photo getting sliced.
    const backdrop = await evaluate(`(() => {
      const { layers, css, img } = ${SPLIT}();
      const h = document.querySelector('.home').getBoundingClientRect();
      const i = img.getBoundingClientRect();
      return {
        image: css.backgroundImage,
        layers: layers.length,
        overflow: css.overflow,
        photoBottomPastSection: +(i.bottom - h.bottom).toFixed(1),
        photoVisible: i.width > 0 && i.height > 0,
      };
    })()`);
    check(backdrop.image !== 'none', '.home paints a backdrop', backdrop.layers + ' layers');
    check(backdrop.layers === 5, 'all five declared layers survived parsing',
      backdrop.layers + ' layers (2 glows, 1 fade, 2 grid axes)');
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
      const SELS = ['.home-content h1', '.home-content p:not(.text-animation)', '.home-content .btn'];
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
    // first version of this backdrop used a 5% grid line and a 10% glow, which
    // composited to 1.05:1 and 1.13:1 against the background - below the ~1.1:1
    // where two surfaces are distinguishable at all. It shipped to production fully
    // formed, correct in the stylesheet, and invisible. Every other check here
    // passed while it was broken.
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
        const glows = layers.filter(l => l.startsWith('radial-gradient'));
        const meas = {};
        // Both grid axes carry the same tint; one is enough and both must agree.
        const line = grid.map(l => over(l, bg)).filter(Boolean);
meas.grid = line.length
          ? { r: +Math.min(...line.map(c => ratio(c, bg))).toFixed(2), axes: line.length }
          : null;
        const centres = glows.map(l => over(l, bg)).filter(Boolean);
        meas.glow = centres.length
          ? { r: +Math.min(...centres.map(c => ratio(c, bg))).toFixed(2), count: centres.length }
          : null;
        out[theme] = meas;
      }
      if (had === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', had);
      return out;
    })()`);
    for (const theme of ['dark', 'light']) {
      // The grid carries the whole effect, so it gets the higher floor.
      const gridMin = 1.15;      check(visibility[theme].grid && visibility[theme].grid.r >= gridMin,
        `grid lines are actually visible (${theme})`,
        visibility[theme].grid
          ? `${visibility[theme].grid.r}:1 against the page background across ${visibility[theme].grid.axes} axes (needs ${gridMin}:1 to be noticeable at all)`
          : 'no grid line found in the stack');
      const glowMin = 1.12;
      check(visibility[theme].glow && visibility[theme].glow.r >= glowMin,
        `glows are actually visible (${theme})`,
        visibility[theme].glow
          ? `weakest of ${visibility[theme].glow.count} is ${visibility[theme].glow.r}:1 at its centre (needs ${glowMin}:1)`
          : 'no radial glow found in the stack');
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

    // A backdrop is easy to make responsive-hostile: gradients sized in rem scale
    // with the root font-size, which the breakpoints shrink from 60% to 35%, and
    // `html { overflow-x: hidden }` hides any overflow rather than letting it be
    // noticed. So measure the hero at phone width instead of trusting it.
    console.log('\n=== hero at phone width ===');
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
      let worst = null;
      for (const el of document.querySelectorAll('.home *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (!worst || r.right > worst.over) {
          worst = { over: r.right - vw, tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') };
        }
      }
      return {
        vw,
        scrollW: document.documentElement.scrollWidth,
        taglineRight: +tr.right.toFixed(1),
        taglineClipped: tr.right > vw + 0.5,
        photoW: +img.getBoundingClientRect().width.toFixed(1),
        layers: getComputedStyle(home).backgroundImage.split('gradient(').length - 1,
        worst: worst.over > 0.5 ? worst.tag + ' by ' + worst.over.toFixed(1) + 'px' : 'nothing',
      };
    })()`);
    check(narrow.scrollW <= narrow.vw + 0.5, 'no horizontal overflow at 375px',
      `scrollWidth ${narrow.scrollW} vs viewport ${narrow.vw}; worst: ${narrow.worst}`);
    check(!narrow.taglineClipped, 'tagline is not clipped at 375px',
      'right edge at ' + narrow.taglineRight + 'px');
    check(narrow.layers === 5, 'backdrop survives the phone breakpoints',
      narrow.layers + ' layers, photo ' + narrow.photoW + 'px wide');
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
