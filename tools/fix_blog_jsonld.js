// Restructures the blog JSON-LD into a single @graph so the author is declared
// once and referenced by @id, instead of being duplicated as an inline Person on
// the Article, on the Blog, and on all six BlogPosting entries. Also adds a
// BreadcrumbList, which is how a post should signal its position in the hierarchy.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const SITE = 'https://gl3nnnn.github.io/Cabansag.github.io';
const PERSON_ID = SITE + '/#person';

const readLd = (file) => {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no JSON-LD block in ${file}`);
  return { html, json: JSON.parse(m[1]) };
};

// Replace the first JSON-LD block, leaving the rest of the document untouched.
const writeLd = (file, obj) => {
  const p = path.join(ROOT, file);
  const html = fs.readFileSync(p, 'utf8');
  const next = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    () => '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 4) + '\n    </script>'
  );
  if (next === html) throw new Error(`failed to rewrite JSON-LD in ${file}`);
  fs.writeFileSync(p, next);
};

const personNode = () => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Glenn Patrick Cabansag',
  url: SITE + '/'
});

// ---------- blog.html ----------
{
  const file = 'blog.html';
  const { json } = readLd(file);
  if (json['@type'] !== 'Blog') throw new Error(`${file}: expected a Blog node, got ${json['@type']}`);

  const graph = [
    personNode(),
    {
      '@type': 'Blog',
      '@id': SITE + '/blog.html#blog',
      name: json.name,
      url: json.url,
      description: json.description,
      author: { '@id': PERSON_ID },
      blogPost: json.blogPost.map(p => ({
        '@type': 'BlogPosting',
        '@id': p.url + '#posting',
        headline: p.headline,
        url: p.url,
        datePublished: p.datePublished,
        description: p.description,
        author: { '@id': PERSON_ID }
      }))
    },
    {
      '@type': 'BreadcrumbList',
      '@id': SITE + '/blog.html#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog' }
      ]
    }
  ];
  writeLd(file, { '@context': 'https://schema.org', '@graph': graph });
  console.log(`${file}: ${graph[1].blogPost.length} postings, author declared once`);
}

// ---------- the six posts ----------
const posts = fs.readdirSync(ROOT).filter(f => /^blog-.*\.html$/.test(f));
if (posts.length !== 6) throw new Error(`expected 6 posts, found ${posts.length}`);

for (const file of posts) {
  const { json } = readLd(file);
  if (json['@type'] !== 'Article') throw new Error(`${file}: expected an Article node, got ${json['@type']}`);
  const url = SITE + '/' + file;

  const graph = [
    personNode(),
    {
      '@type': 'Article',
      '@id': url + '#article',
      headline: json.headline,
      description: json.description,
      image: json.image,
      datePublished: json.datePublished,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': url + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog.html' },
        { '@type': 'ListItem', position: 3, name: json.headline }
      ]
    }
  ];
  writeLd(file, { '@context': 'https://schema.org', '@graph': graph });
  console.log(`${file}: article + breadcrumb, author declared once`);
}
