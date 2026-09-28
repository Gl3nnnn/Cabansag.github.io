// Generates resume.html from the portfolio's own data so the resume cannot
// drift from the site. Certifications are parsed out of index.html; experience,
// education and skills are transcribed from the matching site sections and
// flagged below for review.
//
// The resume is deliberately one page: Patrick asked for the strongest
// credentials only, no projects, and everything to fit on a single A4 sheet.
// The full 37-certification list and the project catalogue stay on the
// filterable site, which is where the resume points for them.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dec = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

// ---------- certifications (source of truth: index.html) ----------
const certSection = html.match(/<section class="certifications" id="certifications">[\s\S]*?<\/section>/)[0];
const certs = [...certSection.matchAll(/<div class="cert-card">[\s\S]*?<h4>([\s\S]*?)<\/h4>\s*<span class="cert-issuer">([\s\S]*?)<\/span>[\s\S]*?<span class="cert-date">([\s\S]*?)<\/span>/g)]
  .map(m => ({ title: dec(m[1]), issuer: dec(m[2]), date: dec(m[3]) }));
if (certs.length !== 37) throw new Error(`expected 37 certifications, parsed ${certs.length}`);

// ---------- the certifications that make the cut ----------
// Eight of the 37, chosen for recognised issuer and relevance to an IT
// support / cloud / Linux career: Cisco CCNA for networking, the ISC2 CC for
// security, both Red Hat RHCSA levels for Linux, Google Cloud Fundamentals and
// Technical Support Fundamentals, TryHackMe Advent of Cyber, and the DataCamp
// AI Engineer for Developers Associate.
// Everything else - the TESDA and design courses, the intro and gen-AI
// Google tracks, Udemy, Alteryx and the rest - stays on the site's filterable
// list. Order here is the order they were chosen in; the resume itself groups
// them by issuer, sorted alphabetically, which is where this order stops
// mattering.
const SHORTLIST = [
  'CCNA: Switching, Routing, and Wireless Essentials',
  'Red Hat System Administration I (RH124)',
  'Red Hat System Administration II (RH134)',
  'Google Cloud Fundamentals: Core Infrastructure',
  'Technical Support Fundamentals',
  'Certified in Cybersecurity (CC)',
  'Advent of Cyber 2024',
  'AI Engineer for Developers Associate'
];
const short = SHORTLIST.map(t => {
  const hit = certs.find(c => c.title === t);
  if (!hit) throw new Error(`shortlist title not found in index.html: "${t}"`);
  return hit;
});

// ---------- projects: intentionally not on the resume ----------
// Patrick asked for the projects to come off the resume, so script.js is no
// longer read here. The project catalogue stays on the site.

const groupByIssuer = list => {
  const map = new Map();
  for (const c of list) {
    if (!map.has(c.issuer)) map.set(c.issuer, []);
    map.get(c.issuer).push(c);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- transcribed from the site; review these ----------
const SUMMARY = [
  'Information Technology professional in Iloilo, Philippines, working as an IT Assistant at COMPASS Training Center. BS Information Technology, University of San Agustin (2024). My work sits where software meets the people who depend on it: building web applications, supporting users, and keeping networks running. Most of my PHP, JavaScript and networking experience comes from projects I build outside of work.'
];
const EXPERIENCE = [
  {
    role: 'IT Assistant',
    org: 'COMPASS Training Center, Inc.',
    when: 'Oct 2024 – Present',
    where: 'Iloilo City, Philippines',
    bullets: [
      'Provide IT support and assistance at the COMPASS Training Center, helping maintain systems, devices and network infrastructure that support daily operations.',
      'Support staff and trainees directly, resolving technical issues and keeping classroom and administrative systems available.'
    ]
  },
  {
    role: 'IT Help Desk',
    org: 'Lead Generation and Donor Creation Inc.',
    when: 'Jan 2024 – Apr 2024',
    where: 'Iloilo City, Philippines',
    bullets: [
      'Responded to technical requests and incidents, troubleshooting hardware and software issues for end users.',
      'Documented recurring problems and worked with users through resolution to keep daily operations running.'
    ]
  }
];
const SKILLS = [
  { k: 'Technical Support', v: 'Hardware and software troubleshooting, user support, incident handling' },
  { k: 'Networking', v: 'CCNA switching, routing and wireless fundamentals; network troubleshooting' },
  { k: 'Linux & Systems', v: 'Red Hat System Administration I and II (RH124, RH134)' },
  { k: 'Programming', v: 'PHP, JavaScript, Python' },
  { k: 'Web Development', v: 'Laravel, server-side web applications, browser-based apps' },
  { k: 'Cloud & DevOps', v: 'Google Cloud fundamentals, Docker containers' },
  { k: 'Databases & SQL', v: 'Relational database design and querying' },
  { k: 'Cybersecurity', v: 'Security fundamentals, threat awareness; ISC2 CC and TryHackMe Advent of Cyber' },
  { k: 'Tools & Productivity', v: 'Microsoft Office, Google Workspace, documentation' }
];

const css = `
@page { size: A4; margin: 12mm 14mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 9.1pt;
  line-height: 1.32;
  color: #1a1d21;
  background: #f2f3f5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.sheet {
  width: 210mm; min-height: 297mm;
  margin: 0 auto 8mm;
  padding: 12mm 14mm;
  background: #fff;
}
h1, h2, h3 { margin: 0; }
h1 { font-size: 19pt; letter-spacing: -0.2pt; line-height: 1.1; }
.role-line { font-size: 9.6pt; color: #4a4f57; margin-top: 0.6mm; }
.contact { margin-top: 2mm; font-size: 8.2pt; color: #33383f; line-height: 1.4; }
.contact span { white-space: nowrap; }
.contact .sep { color: #a8adb5; margin: 0 4px; }
h2 {
  font-size: 8.2pt; text-transform: uppercase; letter-spacing: 1pt;
  color: #166534; border-bottom: 1pt solid #166534;
  margin: 2.4mm 0 1.9mm; padding-bottom: 0.9mm;
}
section { break-inside: auto; }
.entry { break-inside: avoid; margin-bottom: 1.8mm; }
.entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 5mm; }
.entry-title { font-weight: 600; font-size: 9.6pt; }
.entry-org { font-weight: 400; color: #4a4f57; }
.entry-when { color: #4a4f57; font-size: 8.4pt; white-space: nowrap; }
.entry-meta { color: #6b7078; font-size: 8.2pt; }
ul.bullets { margin: 0.9mm 0 0; padding-left: 4.2mm; }
ul.bullets li { margin-bottom: 0.3mm; }
p.summary { margin: 0 0 1.4mm; }
.cert-group { break-inside: avoid; margin-bottom: 1.5mm; }
.cert-issuer { font-weight: 600; font-size: 8.6pt; color: #166534; }
.cert-items { margin: 0.5mm 0 0; padding: 0; list-style: none; }
.cert-items li { display: flex; justify-content: space-between; gap: 3mm; font-size: 8.3pt; padding: 0.2mm 0; }
.cert-items .when { color: #6b7078; white-space: nowrap; }
.skill-row { display: flex; gap: 2.5mm; font-size: 8.4pt; padding: 0.28mm 0; border-bottom: 0.4pt dotted #d7dade; break-inside: avoid; }
.skill-key { font-weight: 600; min-width: 36mm; }
.note { color: #6b7078; font-size: 7.6pt; margin: 0 0 2.2mm; }
@media print {
  body { background: #fff; }
  .sheet { width: auto; min-height: 0; margin: 0; padding: 0; }
}`;

const shortlistHtml = groupByIssuer(short).map(([issuer, items]) => `
      <div class="cert-group">
        <div class="cert-issuer">${esc(issuer)}</div>
        <ul class="cert-items">
          ${items.map(c => `<li><span>${esc(c.title)}</span><span class="when">${esc(c.date)}</span></li>`).join('\n          ')}
        </ul>
      </div>`).join('');

const skillsHtml = SKILLS.map(s => `
      <div class="skill-row"><span class="skill-key">${esc(s.k)}</span><span>${esc(s.v)}</span></div>`).join('');

const expHtml = EXPERIENCE.map(e => `
      <div class="entry">
        <div class="entry-head">
          <div class="entry-title">${esc(e.role)} <span class="entry-org">— ${esc(e.org)}</span></div>
          <div class="entry-when">${esc(e.when)}</div>
        </div>
        <div class="entry-meta">${esc(e.where)}</div>
        <ul class="bullets">
          ${e.bullets.map(b => `<li>${esc(b)}</li>`).join('\n          ')}
        </ul>
      </div>`).join('');

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glenn Patrick Cabansag — Resume</title>
<!-- This is a print-formatted document, not a page to browse: the homepage
     links to it with a download attribute, so nobody ever lands here. Left
     unlisted in the sitemap and kept out of search results, because the only
     thing it adds to what is already indexed is a thin duplicate of the
     homepage content. follow is deliberate: link equity should still flow. -->
<meta name="robots" content="noindex, follow">
<style>${css}</style>
</head>
<body>

<div class="sheet">
  <header>
    <h1>Glenn Patrick Cabansag</h1>
    <div class="role-line">Information Technology Professional</div>
    <div class="contact">
      <span>Iloilo, Philippines</span><span class="sep">|</span>
      <span>09388759110</span><span class="sep">|</span>
      <span>patrickcabansag5@gmail.com</span><span class="sep">|</span>
      <span>linkedin.com/in/glenpatrick</span><span class="sep">|</span>
      <span>gl3nnnn.github.io/Cabansag.github.io</span>
    </div>
  </header>

  <section>
    <h2>Summary</h2>
    ${SUMMARY.map(s => `<p class="summary">${esc(s)}</p>`).join('\n    ')}
  </section>

  <section>
    <h2>Experience</h2>
    ${expHtml}
  </section>

  <section>
    <h2>Education</h2>
    <div class="entry">
      <div class="entry-head">
        <div class="entry-title">Bachelor of Science in Information Technology</div>
        <div class="entry-when">Aug 2020 – Jun 2024</div>
      </div>
      <div class="entry-meta">University of San Agustin, Iloilo City, Philippines</div>
    </div>
  </section>

  <section>
    <h2>Certifications</h2>
    <p class="note">${short.length} of ${certs.length}. The complete filterable list, with every issuer and date, is at gl3nnnn.github.io/Cabansag.github.io &middot; Full list and profile also on LinkedIn: linkedin.com/in/glenpatrick</p>
    ${shortlistHtml}
  </section>

  <section>
    <h2>Skills</h2>
    ${skillsHtml}
  </section>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'resume.html'), out);
console.log(`Wrote resume.html`);
console.log(`  certifications parsed : ${certs.length}`);
console.log(`  on the resume         : ${short.length} across ${groupByIssuer(short).length} issuers`);
console.log(`  projects              : none (removed by request)`);
