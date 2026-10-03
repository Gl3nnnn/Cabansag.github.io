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
  const userDir = path.join(os.tmpdir(), 'cdp-verify-profile');
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

    cdp.close();
  } finally {
    proc.kill();
  }

  console.log(failures === 0 ? '\n  all checks passed' : `\n  ${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('harness error:', e.message); process.exit(2); });
