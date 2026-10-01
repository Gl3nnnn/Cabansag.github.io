// Single source of truth for the blog's ordering and prev/next links.
//
// Ordering is reverse-chronological by published date, verified against all six
// existing posts before any of this existed: prev points at the OLDER post,
// next at the NEWER one, and the two ends of the chain get a pn-empty spacer so
// the 2-column nav grid stays balanced.
//
// Every spec in this directory declares its date and gets its prev/next
// overwritten from the chain below. That is deliberate: when a post is inserted
// in the middle of the timeline, every existing post's nav has to change, and
// doing that by hand is how a chain silently rots. The test suite asserts that
// what is on disk matches what the chain says it should be.
//
// A post is listed here only if tools/posts/<slug>.js exists, or if it is one
// of the six originals that predate the generator.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const POSTS = [
  { slug: 'queue-system', date: '2026-09-15', title: 'Building a Queue System for a Training Centre Counter' },
  { slug: 'accounting-laravel', date: '2026-08-12', title: 'What Building an Accounting App in Laravel Taught Me' },
  { slug: 'it-support-shift', date: '2026-07-08', title: 'What I Actually Do in an IT Support Shift' },
  { slug: 'vlans-home-lab', date: '2026-04-15', title: 'Segmenting My Home Lab with VLANs' },
  { slug: 'docker-portfolio', date: '2026-03-15', title: 'Dockerizing My Portfolio: Containers Made Simple' },
  { slug: 'tryhackme-first-month', date: '2026-02-15', title: 'My First Month on TryHackMe: Learning Cybersecurity One Room at a Time' },
  { slug: 'home-lab', date: '2026-01-15', title: 'Setting Up My Home Lab: Networking Basics' },
  { slug: 'aws-journey', date: '2025-09-20', title: 'My AWS Learning Journey: Getting Started' },
  { slug: 'helpdesk-lessons', date: '2025-06-10', title: 'From Help Desk to IT Assistant: What I Learned' },
];

// Fail loudly on a duplicate date: two posts sharing one would make the ordering
// between them undefined, and the nav chain would be ambiguous.
const seen = new Set();
POSTS.forEach(p => {
  if (seen.has(p.date)) throw new Error(`duplicate published date in the chain: ${p.date}`);
  seen.add(p.date);
});

// Newest first.
POSTS.sort((a, b) => (a.date < b.date ? 1 : -1));

// prev = the next entry (older), next = the entry above (newer).
const links = {};
POSTS.forEach((p, i) => {
  links[p.slug] = {
    prev: POSTS[i + 1] ? { slug: POSTS[i + 1].slug, title: POSTS[i + 1].title } : null,
    next: POSTS[i - 1] ? { slug: POSTS[i - 1].slug, title: POSTS[i - 1].title } : null,
  };
});

// The distinct categories, for blog.html's filter row and its "topics covered"
// stat. Derived rather than hand-listed so a new category cannot be forgotten.
//
// A spec is the source of truth for anything the generator writes. The six
// originals predate the generator, so their category is read off the category
// badge inside their own post page rather than off blog.html's card: the card
// holds a display label, the post holds the value the filter matches on.
function categories() {
  const out = new Set();
  POSTS.forEach(p => {
    const specPath = path.join(__dirname, `${p.slug}.js`);
    if (fs.existsSync(specPath)) {
      const m = fs.readFileSync(specPath, 'utf8').match(/^\s*category:\s*'([^']+)'/m);
      if (m) { out.add(m[1]); return; }
    }
    // The badge inside the post's own article header is <span class="category">.
    // ("post-cat" is the label blog.html uses on its cards, a different thing.)
    const post = fs.readFileSync(path.join(ROOT, `blog-${p.slug}.html`), 'utf8');
    const m = post.match(/<span class="category">([^<]+)<\/span>/);
    if (m) { out.add(m[1].trim()); return; }
    throw new Error(`no category for ${p.slug}: no spec, and no category badge in blog-${p.slug}.html`);
  });
  return [...out].sort();
}

module.exports = { POSTS, links, categories };

if (require.main === module) {
  POSTS.forEach((p, i) => {
    const l = links[p.slug];
    const prev = l.prev ? `prev=${l.prev.slug}` : 'prev=(none)';
    const next = l.next ? `next=${l.next.slug}` : 'next=(none)';
    console.log(`  ${String(i + 1).padStart(2)}. ${p.date}  ${p.slug.padEnd(22)} ${prev.padEnd(28)} ${next}`);
  });
  console.log(`\n  ${POSTS.length} posts, ${categories().length} categories: ${categories().join(', ')}`);
}
