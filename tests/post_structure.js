// Structural assertions for the generated posts: heading numbering, TOC/body
// agreement, unique ids, anchor resolution, tag balance, encoding, and the
// metadata/JSON-LD agreement with the spec.
//
// This started as a throwaway script and earned its place in tests/, because the
// failures it catches are exactly the ones that render fine but read wrong - a
// "4." that follows another "4.", a TOC pointing at a heading that was renamed,
// or a canonical URL that names a page which does not exist.
//
// It covers every post in tools/posts/, not a hand-written slug list, so adding a
// spec automatically brings it under test.
//
// Run: node tests/post_structure.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SPECS = fs.readdirSync(path.join(ROOT, 'tools', 'posts'))
  .filter(f => f.endsWith('.js') && !f.startsWith('_'))
  .map(f => f.replace(/\.js$/, ''));

let pass = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++;
  else fails.push(msg);
}

const SITE = 'https://gl3nnnn.github.io/Cabansag.github.io';

SPECS.forEach(name => {
  const spec = require(path.join(ROOT, 'tools', 'posts', `${name}.js`));
  const slug = spec.slug;
  const html = fs.readFileSync(path.join(ROOT, `blog-${slug}.html`), 'utf8');

  // Headings inside the article body, in document order.
  const body = html.slice(html.indexOf('<div class="content">'), html.indexOf('<nav class="post-nav"'));
  const h2s = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(m => ({ id: m[1], text: m[2] }));

  ok(h2s.length === spec.toc.length, `${slug}: body has ${h2s.length} headings, the spec TOC lists ${spec.toc.length}`);

  // The last heading is the closing reflection and is unnumbered by convention.
  const numbered = h2s.slice(0, -1);
  numbered.forEach((h, i) => {
    ok(h.text.startsWith(`${i + 1}. `), `${slug}: heading ${i + 1} is "${h.text}", expected it to start "${i + 1}. "`);
  });
  if (h2s.length) {
    ok(!/^\d+\./.test(h2s[h2s.length - 1].text), `${slug}: the final heading "${h2s[h2s.length - 1].text}" should be unnumbered`);
  }

  // TOC: same length, same order, same text as the headings.
  const toc = [...html.matchAll(/<li><a href="#([^"]+)">([\s\S]*?)<\/a><\/li>/g)].map(m => ({ id: m[1], text: m[2] }));
  ok(toc.length === h2s.length, `${slug}: TOC has ${toc.length} entries, the body has ${h2s.length} headings`);
  toc.forEach((t, i) => {
    const h = h2s[i];
    if (!h) return;
    ok(t.id === h.id, `${slug}: TOC entry ${i + 1} points at #${t.id}, heading ${i + 1} is #${h.id}`);
    ok(t.text === h.text, `${slug}: TOC text "${t.text}" differs from heading "${h.text}"`);
  });
  if (toc.length) ok(!/^\d+\./.test(toc[toc.length - 1].text), `${slug}: the final TOC entry should be unnumbered`);

  // The spec's TOC is the source for both, so the two must not drift either.
  spec.toc.forEach((t, i) => {
    const h = h2s[i];
    if (!h) return;
    ok(t.id === h.id, `${slug}: spec TOC entry "${t.id}" is not heading ${i + 1} (#${h.id})`);
  });

  // Unique ids.
  const ids = h2s.map(h => h.id);
  ok(new Set(ids).size === ids.length, `${slug}: duplicate heading ids in [${ids.join(', ')}]`);

  // Every href="#..." in the document resolves to a real id.
  const allIds = new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  anchors.forEach(a => ok(allIds.has(a), `${slug}: link to #${a} has no matching id`));

  // Tag balance for the elements a post is actually built from.
  ['p', 'h2', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote'].forEach(tag => {
    const open = (html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    ok(open === close, `${slug}: <${tag}> opens ${open} times, closes ${close}`);
  });
  ok(!/<p[^>]*>\s*<p[ >]/.test(html), `${slug}: contains a paragraph nested inside another paragraph`);
  ok(!/<\/p>\s*<\/p>/.test(html), `${slug}: contains a doubled closing </p>`);
  ok(!/<p[^>]*>\s*<\/p>/.test(html), `${slug}: contains an empty paragraph`);

  // Encoding. A BOM or a replacement character is invisible in review but
  // breaks the first heading on the page.
  ok(!html.includes('\uFFFD'), `${slug}: contains a replacement character (U+FFFD)`);
  ok(html.charCodeAt(0) !== 0xFEFF, `${slug}: starts with a BOM`);
  ok(!html.includes('\r\n'), `${slug}: contains CRLF line endings`);

  // The document title is not derivable from anything else, so it has to be
  // asserted: a generated post without one inherits the browser's URL as its
  // title, which is how the queue post shipped once.
  ok(html.includes(`<title>${spec.title} | Glenn Patrick Cabansag</title>`),
    `${slug}: <title> is not "${spec.title} | Glenn Patrick Cabansag"`);

  // Meta and JSON-LD carry the date, which an earlier version of build() dropped.
  ok(html.includes(`<time datetime="${spec.date}">${spec.displayDate}</time>`), `${slug}: the header date is not ${spec.date}`);

  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  ok(!!ld, `${slug}: no JSON-LD block`);
  if (ld) {
    // The block is a @graph, so the Article is a node rather than a top-level
    // field. Reading datePublished off the root object finds nothing and looks
    // like a missing date rather than a wrong lookup.
    let graph = null;
    try {
      graph = JSON.parse(ld[1])['@graph'];
    } catch (e) {
      ok(false, `${slug}: JSON-LD does not parse: ${e.message}`);
    }
    ok(Array.isArray(graph), `${slug}: JSON-LD has no @graph array`);
    const article = (graph || []).find(n => n['@type'] === 'Article');
    ok(!!article, `${slug}: JSON-LD has no Article node`);
    if (article) {
      ok(article.datePublished === spec.date, `${slug}: JSON-LD datePublished is ${article.datePublished}, expected ${spec.date}`);
      ok(article.headline === spec.title, `${slug}: JSON-LD headline differs from the spec title`);
      ok(article.description === spec.description, `${slug}: JSON-LD description differs from the spec description`);
      // The spec slug has no blog- prefix; every absolute URL must carry it.
      const page = `${SITE}/blog-${slug}.html`;
      ok(article['@id'] === `${page}#article`, `${slug}: JSON-LD @id is ${article['@id']}, expected ${page}#article`);
      ok(article.mainEntityOfPage['@id'] === page, `${slug}: JSON-LD mainEntityOfPage is ${article.mainEntityOfPage['@id']}, expected ${page}`);
      ok(html.includes(`<link rel="canonical" href="${page}">`), `${slug}: canonical URL is not ${page}`);
      ok(html.includes(`<meta property="og:url" content="${page}">`), `${slug}: og:url is not ${page}`);
      // Every @id must be an absolute URL on this site.
      (graph || []).forEach(n => {
        ok(String(n['@id']).startsWith(SITE), `${slug}: JSON-LD node ${n['@type']} has a non-site @id: ${n['@id']}`);
        ok(!/\/Cabansag\.github\.io\/[a-z-]*\//.test(String(n['@id'])), `${slug}: JSON-LD @id has a doubled path: ${n['@id']}`);
      });
    }
  }
});

console.log(`\n  ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  fails.forEach(f => console.log('  FAIL: ' + f));
  process.exit(1);
}