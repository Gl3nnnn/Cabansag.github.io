// Regression suite for the blog: evidence claims, navigation chain, and the
// listings that have to agree with each other.
//
// The point of this file is that three of the nine posts now make claims about
// real work (a queue system, an accounting app, a support shift). Those claims
// were checked against source repos, the resume and the FAQ by hand once. This
// suite makes the check repeatable and, more importantly, catches the specific
// failure that has actually happened on this site: a post or a listing asserting
// something the rest of the site contradicts.
//
// Run: node tests/blog_claims.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };

const chain = require(path.join(ROOT, 'tools', 'posts', '_chain.js'));
const { POSTS, links } = chain;

const blogHtml = read('blog.html');
const indexHtml = read('index.html');
const sitemap = read('sitemap.xml');
const readme = read('README.md');

// ---------------------------------------------------------------- 1. chain
console.log('\n=== the chain owns the ordering ===');
ok(POSTS.length === 9, `chain has ${POSTS.length} posts, expected 9`);
ok(new Set(POSTS.map(p => p.date)).size === POSTS.length, 'chain has duplicate dates');
POSTS.forEach((p, i) => {
  if (i > 0) ok(p.date < POSTS[i - 1].date, `${p.slug} (${p.date}) is not older than ${POSTS[i - 1].slug} (${POSTS[i - 1].date})`);
  ok(fs.existsSync(path.join(ROOT, `blog-${p.slug}.html`)), `blog-${p.slug}.html does not exist`);
});

// prev = older, next = newer. Every post except the newest must have a prev,
// and every post except the oldest must have a next.
POSTS.forEach(p => {
  const l = links[p.slug];
  const i = POSTS.findIndex(x => x.slug === p.slug);
  ok((l.prev === null) === (i === POSTS.length - 1), `${p.slug}: prev presence is wrong`);
  ok((l.next === null) === (i === 0), `${p.slug}: next presence is wrong`);
  if (l.prev) ok(l.prev.slug === POSTS[i + 1].slug, `${p.slug}: prev is ${l.prev.slug}, expected ${POSTS[i + 1].slug}`);
  if (l.next) ok(l.next.slug === POSTS[i - 1].slug, `${p.slug}: next is ${l.next.slug}, expected ${POSTS[i - 1].slug}`);
});

// ---------------------------------------------------------- 2. post nav
// Every post's on-disk prev/next must match the chain. This is the check that
// catches a post inserted in the middle while an older post keeps a stale link.
console.log('\n=== every post\'s nav matches the chain ===');
POSTS.forEach(p => {
  const html = read(`blog-${p.slug}.html`);
  const nav = html.match(/<nav class="post-nav"[\s\S]*?<\/nav>/);
  ok(!!nav, `${p.slug}: no post-nav`);
  if (!nav) return;
  // The slash in </span> has to be escaped or it closes the literal early and
  // "span" is read as the flags.
  const prev = nav[0].match(/class="pn-prev" href="([^"]+)"[\s\S]*?pn-title">(.*?)<\/span>/);
  const next = nav[0].match(/class="pn-next" href="([^"]+)"[\s\S]*?pn-title">(.*?)<\/span>/);
  const want = links[p.slug];

  if (want.prev) {
    ok(!!prev, `${p.slug}: expected a prev link to ${want.prev.slug}, found none`);
    if (prev) {
      ok(prev[1] === `blog-${want.prev.slug}.html`, `${p.slug}: prev href is ${prev[1]}, expected blog-${want.prev.slug}.html`);
      ok(prev[2] === want.prev.title, `${p.slug}: prev title is "${prev[2]}", expected "${want.prev.title}"`);
    }
  } else {
    ok(!prev, `${p.slug}: expected no prev link, found one to ${prev && prev[1]}`);
    ok(/pn-empty/.test(nav[0]), `${p.slug}: missing the pn-empty spacer that balances the nav grid`);
  }

  if (want.next) {
    ok(!!next, `${p.slug}: expected a next link to ${want.next.slug}, found none`);
    if (next) {
      ok(next[1] === `blog-${want.next.slug}.html`, `${p.slug}: next href is ${next[1]}, expected blog-${want.next.slug}.html`);
      ok(next[2] === want.next.title, `${p.slug}: next title is "${next[2]}", expected "${want.next.title}"`);
    }
  } else {
    ok(!next, `${p.slug}: expected no next link, found one to ${next && next[1]}`);
    ok(/pn-empty/.test(nav[0]), `${p.slug}: missing the pn-empty spacer that balances the nav grid`);
  }
});

// Every internal href in a post must resolve to a file that exists.
POSTS.forEach(p => {
  const html = read(`blog-${p.slug}.html`);
  [...html.matchAll(/href="([a-z0-9._-]+\.html)"/g)].forEach(m => {
    ok(fs.existsSync(path.join(ROOT, m[1])), `${p.slug}: links to ${m[1]}, which does not exist`);
  });
});

// ------------------------------------------------------------ 3. listings
console.log('\n=== blog.html ===');
const cards = [...blogHtml.matchAll(/<article class="post-item" data-cat="([^"]+)">([\s\S]*?)<\/article>/g)];
ok(cards.length === 9, `blog.html has ${cards.length} cards, expected 9`);
cards.forEach(c => {
  const slug = c[2].match(/href="(blog-[^"]+\.html)"/)[1].replace('blog-', '').replace('.html', '');
  ok(POSTS.some(p => p.slug === slug), `blog.html has a card for ${slug}, which is not in the chain`);
  ok(c[1] === c[2].match(/<span class="post-cat">([^<]+)</)[1], `${slug}: data-cat and the visible badge disagree`);
});
// Cards must be newest first.
const cardDates = cards.map(c => c[2].match(/datetime="([\d-]+)"/)[1]);
cardDates.forEach((d, i) => {
  if (i > 0) ok(d < cardDates[i - 1], `blog.html card ${i + 1} (${d}) is newer than card ${i} (${cardDates[i - 1]})`);
});
// The card date must equal the chain date.
cards.forEach(c => {
  const slug = c[2].match(/href="(blog-[^"]+\.html)"/)[1].replace('blog-', '').replace('.html', '');
  const want = POSTS.find(p => p.slug === slug).date;
  const got = c[2].match(/datetime="([\d-]+)"/)[1];
  ok(got === want, `${slug}: card shows ${got}, the chain says ${want}`);
});
ok(blogHtml.includes('Showing all 9 posts'), 'blog.html results note does not say 9');
ok(/<div class="num">9<\/div><div class="lbl">Posts Published/.test(blogHtml), 'blog.html post count is not 9');
const cats = chain.categories();
ok(/<div class="num">6<\/div><div class="lbl">Topics Covered/.test(blogHtml), 'blog.html topic count is not 6');
cats.forEach(c => ok(blogHtml.includes(`data-filter="${c}"`), `blog.html has no filter button for ${c}`));
// Every filter button must match at least one card.
[...blogHtml.matchAll(/data-filter="([^"]+)"/g)].map(m => m[1]).filter(c => c !== 'all').forEach(f => {
  ok(cards.some(c => c[1] === f), `filter "${f}" matches no card`);
});
// JSON-LD: one BlogPosting per post, dated to match.
const blogLd = JSON.parse(blogHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const postings = blogLd['@graph'].find(n => n['@type'] === 'Blog').blogPost;
ok(postings.length === 9, `blog.html JSON-LD has ${postings.length} blogPost entries, expected 9`);
POSTS.forEach(p => {
  const e = postings.find(x => x.url.endsWith(`blog-${p.slug}.html`));
  ok(!!e, `blog.html JSON-LD has no entry for ${p.slug}`);
  if (e) ok(e.datePublished === p.date, `${p.slug}: JSON-LD datePublished ${e.datePublished} != ${p.date}`);
});

console.log('\n=== index.html ===');
const homeCards = [...indexHtml.matchAll(/<article class="blog-card">([\s\S]*?)<\/article>/g)];
ok(homeCards.length === 9, `index.html has ${homeCards.length} cards, expected 9`);
POSTS.forEach(p => {
  const c = homeCards.find(x => x[1].includes(`href="blog-${p.slug}.html"`));
  ok(!!c, `index.html has no card for ${p.slug}`);
  if (c) {
    ok(c[1].includes(`datetime="${p.date}"`), `${p.slug}: homepage card date is not ${p.date}`);
    const cat = c[1].match(/blog-category">([^<]+)</)[1];
    const postHtml = read(`blog-${p.slug}.html`);
    const postCat = postHtml.match(/<span class="category">([^<]+)</)[1];
    ok(cat === postCat, `${p.slug}: homepage says "${cat}", the post says "${postCat}"`);
  }
});

console.log('\n=== sitemap.xml ===');
const locs = [...sitemap.matchAll(/<loc>https:\/\/gl3nnnn\.github\.io\/Cabansag\.github\.io\/([^<]*)<\/loc>/g)].map(m => m[1]);
POSTS.forEach(p => ok(locs.includes(`blog-${p.slug}.html`), `sitemap.xml is missing blog-${p.slug}.html`));
ok(new Set(locs).size === locs.length, 'sitemap.xml has duplicate loc entries');
locs.forEach(l => ok(l === '' || fs.existsSync(path.join(ROOT, l)), `sitemap.xml lists ${l}, which does not exist`));

console.log('\n=== README ===');
POSTS.forEach(p => ok(readme.includes(`blog-${p.slug}.html`), `README omits blog-${p.slug}.html`));
const readmePosts = readme.match(/blog-[a-z0-9-]+\.html/g) || [];
ok(readmePosts.length === 9, `README names ${readmePosts.length} posts, expected 9`);

// ----------------------------------------------------------- 4. evidence
// The claims below are the ones a visitor could act on. Each names the source
// that backs it. If the underlying repo or page changes, one of these fails.
console.log('\n=== claims are backed by the source they cite ===');

const queue = read('blog-queue-system.html');
ok(queue.includes('github.com/Gl3nnnn/counter_compass'), 'queue post does not link the repo it describes');
ok(/not production-ready/i.test(queue), 'queue post does not say the system is not production-ready');
ok(/eight items/i.test(queue), 'queue post does not state the eight outstanding items');
ok(!/is deployed|is live in production|is running in production/i.test(queue),
  'queue post claims it is deployed');

// The AWS post used to assert completed work the README and FAQ both deny.
const aws = read('blog-aws-journey.html');
ok(/have not launched anything in AWS yet/i.test(aws), 'AWS post does not state that nothing has been launched');
ok(!/I launched a free-tier/i.test(aws), 'AWS post still claims an EC2 instance was launched');
ok(!/I opened port 22/i.test(aws), 'AWS post still claims security groups were configured');
ok(/no credential behind this post/i.test(aws), 'AWS post does not disclaim a credential');

// README must also present AWS as learning. It has no AWS sentence of its own,
// so this checks the projects list does not assert a deployed AWS project.
ok(!/AWS/i.test(readme) || /learning/i.test(readme), 'README does not frame AWS as learning');
const faq = read('faq.html');
ok(/no credential or project in it yet/i.test(faq), 'faq.html no longer says AWS has no credential or project');

// The resume states both projects' status; the posts must not exceed it.
// The separator is an en dash (U+2013), not a hyphen, so it is written as a
// code point here: a plain "-" would match nothing and the assertion would be
// quietly vacuous.
const resume = read('resume.html');
ok(/COMPASS Training Center/.test(resume), 'resume no longer names the employer');
ok(resume.includes(`Oct 2024 ${String.fromCharCode(0x2013)} Present`), 'resume no longer has the Oct 2024 start date');
const support = read('blog-it-support-shift.html');
ok(/COMPASS/.test(support), 'support post does not name the employer');
ok(/October 2024/.test(support), 'support post does not give the start date');
ok(/previous help desk role/i.test(support), 'support post does not mention the prior role');

// No post may name a tooling the site does not claim anywhere. A script
// language in particular: build_resume.js notes none is claimed.
POSTS.forEach(p => {
  const html = read(`blog-${p.slug}.html`);
  const body = html.slice(html.indexOf('<div class="content">'), html.indexOf('<nav class="post-nav"'));
  ok(!/\b(bash|python scripting|ansible|terraform)\b/i.test(body.replace(/<pre>[\s\S]*?<\/pre>/g, '')),
    `${p.slug}: prose names a scripting/automation language the site does not claim`);
});

// --------------------------------------------------------- 5. well-formed
console.log('\n=== encoding and structure across every touched file ===');
['blog.html', 'index.html', 'sitemap.xml', 'README.md', 'faq.html', 'resume.html',
  ...POSTS.map(p => `blog-${p.slug}.html`)].forEach(f => {
  const s = read(f);
  ok(!s.includes('\uFFFD'), `${f} contains U+FFFD`);
  ok(s.charCodeAt(0) !== 0xFEFF, `${f} starts with a BOM`);
  ok(!/\r\n/.test(s), `${f} has CRLF line endings`);
});
// Every touched JSON-LD block must parse.
['blog.html', 'index.html', 'faq.html', ...POSTS.map(p => `blog-${p.slug}.html`)].forEach(f => {
  [...read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    let parsed = null;
    try { parsed = JSON.parse(m[1]); } catch (e) { /* reported below */ }
    ok(!!parsed, `${f}: JSON-LD block ${i + 1} does not parse`);
  });
});

console.log(`\n  ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log('\n  failures:');
  fails.forEach(f => console.log('    - ' + f));
  process.exit(1);
}
