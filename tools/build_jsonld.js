// Generate the JSON-LD block in index.html.
//
// Why a generator rather than hand-written JSON in the page: the block is built
// from index.html's own certification markup, so the structured data cannot claim
// credentials the page does not show, and cannot fall behind them either. Editing
// the cards and forgetting the structured data is the exact failure this removes.
//
// The Person node's descriptive fields are transcribed here rather than parsed
// out of the page, following the same convention as build_resume.js: the prose a
// person is described with is reviewed by hand, the structured facts about
// credentials are derived. Edit below, then run this.
//
// Run:  node tools/build_jsonld.js           write the block into index.html
//       node tools/build_jsonld.js --check   fail if index.html is out of date
//
// --check is what CI runs. It is the whole point: the generator is only worth
// having if a stale block is loud, and nobody regenerates by hand.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const BLOG = path.join(ROOT, 'blog.html');

const SITE = 'https://gl3nnnn.github.io/Cabansag.github.io/';
const SITE_NAME = "Glenn Patrick Cabansag's Portfolio";

// ---------------------------------------------------------------- person
// Transcribed, not parsed. Keep this truthful and keep it in step with the page.
const PERSON = {
  name: 'Glenn Patrick Cabansag',
  givenName: 'Glenn Patrick',
  familyName: 'Cabansag',
  jobTitle: 'IT Assistant',
  worksFor: { '@type': 'Organization', name: 'COMPASS Training Center, Inc.' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of San Agustin' },
  email: 'mailto:patrickcabansag5@gmail.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Iloilo City',
    addressCountry: 'PH',
  },
  sameAs: [
    'https://www.linkedin.com/in/glenpatrick',
    'https://github.com/Gl3nnnn',
    'https://www.facebook.com/Gl3nQt',
  ],
};

const PERSON_ID = `${SITE}#person`;
const WEBSITE_ID = `${SITE}#website`;

// ------------------------------------------------------------- parsing
// Only the handful of entities index.html actually uses in this markup. Decoding
// an arbitrary entity table here would be more machinery than the input deserves.
const ENTITIES = {
  '&amp;': '&',
  '&nbsp;': ' ',
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&rsquo;': '\u2019',
  '&lsquo;': '\u2018',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
};
const dec = s => s
  .replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|\w+);/g, (m, dec10, hex, name) => {
    if (dec10) return String.fromCharCode(Number(dec10));
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    return ENTITIES[name] !== undefined ? ENTITIES[name] : m;
  })
  .replace(/\s+/g, ' ')
  .trim();

// "Nov 2023" -> "2023-11". Month precision only, which is all the cards carry.
// A partial ISO date is valid and is honest about the precision available;
// inventing a day would not be.
const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};
function isoMonthYear(raw) {
  const m = /^([A-Z][a-z]{2})\s+(\d{4})$/.exec(raw);
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[2]}-${MONTHS[m[1]]}`;
}

function readCerts(html) {
  const section = html.match(
    /<section class="certifications" id="certifications"[^>]*>[\s\S]*?<\/section>/);
  if (!section) throw new Error('cannot find the certifications section in index.html');

  // Split on the card's opening tag and parse each chunk on its own, rather than
  // trying to match the whole card with one regex. The nested divs mean a
  // trailing `[\s\S]*?</div>` stops at the first closing div - which is .cert-info,
  // before the date and credential spans - so dates and IDs came out empty that
  // way. Each chunk is exactly one card because the delimiter is removed by split.
  // The heading level is not pinned: the cards were retagged from h4 to h3 when
  // index.html's skipped heading levels were fixed, which broke build_resume.js
  // for the same reason.
  return section[0].split('<div class="cert-card">').slice(1).map(chunk => {
    const pick = (re) => {
      const m = chunk.match(re);
      return dec(m ? m[1] : '');
    };
    return {
      title: pick(/<h[1-6]>([\s\S]*?)<\/h[1-6]>/),
      issuer: pick(/<span class="cert-issuer">([\s\S]*?)<\/span>/),
      date: isoMonthYear(pick(/<span class="cert-date">([\s\S]*?)<\/span>/)),
      // The span reads "Credential ID 12345"; the identifier is the value, so the
      // label is stripped rather than repeated inside the structured data.
      credentialId: pick(/<span class="cert-credential">([\s\S]*?)<\/span>/)
        .replace(/^Credential\s+ID\s*/i, ''),
    };
  });
}

// -------------------------------------------------------------- graph
function credential(c) {
  const node = {
    '@type': 'EducationalOccupationalCredential',
    name: c.title,
    credentialCategory: 'certification',
    recognizedBy: { '@type': 'Organization', name: c.issuer },
  };
  if (c.date) node.dateCreated = c.date;
  // One card on the page has no credential ID, so this is conditional rather
  // than an empty string: an empty identifier is worse than none.
  if (c.credentialId) {
    node.identifier = {
      '@type': 'PropertyValue',
      propertyID: 'credentialID',
      value: c.credentialId,
    };
  }
  return node;
}

function buildGraph(certs) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { ...PERSON, '@type': 'Person', '@id': PERSON_ID, url: SITE, image: `${SITE}profile.jpg`,
        hasCredential: certs.map(credential) },
      { '@type': 'WebSite', '@id': WEBSITE_ID, url: SITE, name: SITE_NAME,
        inLanguage: 'en', publisher: { '@id': PERSON_ID },
        potentialAction: {
          '@type': 'SearchAction',
          // blog.html reads ?q= and mirrors edits back into the address bar.
          // Asserted below, because advertising a search that silently ignores
          // the query is worse than advertising no search at all.
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE}blog.html?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        } },
      { '@type': 'ProfilePage', '@id': `${SITE}#profilepage`, url: SITE,
        name: SITE_NAME, inLanguage: 'en',
        about: { '@id': PERSON_ID }, isPartOf: { '@id': WEBSITE_ID } },
    ],
  };
}

function renderBlock(graph) {
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;
}

// --------------------------------------------------------------- main
function main() {
  const check = process.argv.includes('--check');
  const html = fs.readFileSync(INDEX, 'utf8');

  const certs = readCerts(html);
  if (certs.length === 0) throw new Error('parsed zero certifications out of index.html');

  // The card count is the independent check: the credentials come from parsing
  // the cards, so this catches a card whose fields did not match the pattern
  // rather than agreeing with a broken parse.
  const cardCount = (html.match(/class="cert-card"/g) || []).length;
  if (certs.length !== cardCount) {
    throw new Error(`parsed ${certs.length} certifications but index.html has ${cardCount} .cert-card entries`);
  }
  const unparsed = certs.filter(c => !c.title || !c.issuer);
  if (unparsed.length) {
    throw new Error(`${unparsed.length} certification(s) parsed without a title or issuer`);
  }
  // Dates and IDs are not required - one card genuinely has no ID - but a card
  // losing its date to a markup change is a silent failure, because the block
  // still parses and still looks right. Fail on a card that lost one.
  const noDate = certs.filter(c => !c.date);
  if (noDate.length) {
    throw new Error(
      `${noDate.length} certification(s) parsed without a usable date, first is ` +
      `"${noDate[0].title}" (raw date did not match "MMM YYYY"). ` +
      'The markup or the month table changed.');
  }

  // Keep the SearchAction honest: it is only true if blog.html applies the term.
  // Matches both `new URLSearchParams(loc.search).get('q')` and the
  // `searchParams.get('q')` form, since either is a working implementation.
  const blog = fs.readFileSync(BLOG, 'utf8');
  if (!/(?:URLSearchParams|searchParams)[\s\S]{0,80}?\.get\(\s*['"]q['"]\s*\)/.test(blog)) {
    throw new Error(
      'blog.html does not read ?q=, so the SearchAction in this block would\n' +
      '  advertise a site search that drops the query. Fix blog.html or remove the\n' +
      '  WebSite node before writing this block.');
  }

  const graph = buildGraph(certs);
  const json = JSON.stringify(graph);
  JSON.parse(json); // belt and braces: never write a block that will not parse
  const block = renderBlock(graph);

  const existing = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/);
  if (!existing) throw new Error('cannot find the JSON-LD block in index.html');

  if (check) {
    const current = JSON.stringify(JSON.parse(existing[0]
      .replace(/^<script type="application\/ld\+json">/, '')
      .replace(/<\/script>$/, '')));
    if (current !== json) {
      console.error('index.html JSON-LD is out of date. Run: node tools/build_jsonld.js');
      console.error(`  on disk: ${current.length} bytes, expected: ${json.length} bytes`);
      process.exit(1);
    }
    console.log(`  jsonld           : up to date (${certs.length} credentials)`);
    return;
  }

  fs.writeFileSync(INDEX, html.replace(existing[0], block));
  console.log('Wrote JSON-LD into index.html');
  console.log(`  credentials     : ${certs.length}`);
  console.log(`  nodes           : ${graph['@graph'].map(n => n['@type']).join(', ')}`);
  console.log(`  block size      : ${block.length} bytes`);
}

main();