// Generates resume.html from the portfolio's own data so the resume cannot
// drift from the site. Certifications are parsed out of index.html and the four
// featured projects are looked up in script.js; experience, education, skills
// and the summary are transcribed below and flagged for review.
//
// The resume is deliberately one page. Patrick asked for the strongest
// credentials only, 4 relevant projects, and everything on a single A4 sheet at
// a body size no smaller than 10pt. The full 37-certification list and the other
// projects stay on the filterable site, which is where the resume points.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const dec = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

// ---------- certifications (source of truth: index.html) ----------
const certSection = html.match(/<section class="certifications" id="certifications">[\s\S]*?<\/section>/)[0];
const certs = [...certSection.matchAll(/<div class="cert-card">[\s\S]*?<h4>([\s\S]*?)<\/h4>\s*<span class="cert-issuer">([\s\S]*?)<\/span>[\s\S]*?<span class="cert-date">([\s\S]*?)<\/span>/g)]
  .map(m => ({ title: dec(m[1]), issuer: dec(m[2]), date: dec(m[3]) }));
if (certs.length !== 37) throw new Error(`expected 37 certifications, parsed ${certs.length}`);

// ---------- the certifications that make the cut ----------
// Eight of the 37, chosen for recognised issuer and relevance to an IT
// support / systems / cloud career: Cisco CCNA for networking, the ISC2 CC for
// security, both Red Hat RHCSA levels for Linux, Google Cloud Fundamentals and
// Technical Support Fundamentals, TryHackMe Advent of Cyber, and the DataCamp
// AI Engineer for Developers Associate.
// Everything else - the TESDA and design courses, the intro and gen-AI
// Google tracks, Udemy, Alteryx and the rest - stays on the site's filterable
// list, which the Certifications note points to.
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

// ---------- projects (source of truth: script.js curated list) ----------
const projects = [...js.matchAll(/\{\s*name:\s*'([^']+)'[^}]*?language:\s*'([^']+)'[^}]*?tags:\s*\[([^\]]*)\][^}]*?description:\s*'([^']*)'/g)]
  .map(m => ({
    name: m[1],
    language: m[2],
    tags: m[3].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean),
    description: m[4].replace(/\\'/g, "'")
  }));
if (projects.length !== 13) throw new Error(`expected 13 projects, parsed ${projects.length}`);

// Four of the thirteen, covering the areas he asked for: asset/inventory
// management, help-desk ticketing, full-stack web work, and the queue system he
// built for the registration area. `src` must match the project name in
// script.js, so renaming a project there breaks this build rather than
// silently dropping it. `line` is a tightened restatement of that project's own
// script.js description, kept to one line; the source wording is recorded
// beside it so the two can be compared.
const PROJECTS = [
  {
    src: 'it_inventory', label: 'IT Asset Inventory System',
    line: 'Tracks hardware, assignments and equipment lifecycle across IT assets.'
  },
  {
    src: 'TechDesk', label: 'TechDesk Ticketing App',
    line: 'Logs, assigns and tracks technical support requests.'
  },
  {
    src: 'accounting', label: 'Accounting Web Application',
    line: 'Financial web application built with Laravel and Blade.'
  },
  {
    src: 'counter_compass', label: 'Queue Management System',
    line: 'Real-time queue for registrations, documents and inquiries, numbered per service.'
  }
];
const featured = PROJECTS.map(p => {
  const hit = projects.find(x => x.name === p.src);
  if (!hit) throw new Error(`featured project "${p.src}" not found in script.js`);
  return { ...p, language: hit.language, description: hit.description };
});

const groupByIssuer = list => {
  const map = new Map();
  for (const c of list) {
    if (!map.has(c.issuer)) map.set(c.issuer, []);
    map.get(c.issuer).push(c);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- supplied by the user; review these ----------
const SUMMARY = [
  'IT Assistant with hands-on experience providing technical support, troubleshooting hardware and software issues, maintaining IT systems, and assisting staff and trainees in a training-center environment. Skilled in networking fundamentals, Windows support, hardware troubleshooting, and basic system administration, with practical development experience in PHP, Laravel, JavaScript, and MySQL. Experienced in building IT solutions such as purchasing, asset management, and queue management systems, combining technical support with practical problem-solving and automation.'
];

const EXPERIENCE = [
  {
    role: 'IT Assistant',
    org: 'COMPASS Training Center',
    when: 'Oct 2024 – Present',
    where: 'Iloilo City, Philippines',
    bullets: [
      'Provide day-to-day IT support to staff and trainees, troubleshooting and resolving hardware and software issues.',
      'Maintain systems, devices and network infrastructure that support daily operations.',
      'Keep classroom and administrative systems available throughout each training day.',
      'Write small scripts and tools to automate routine tasks and cut down repetitive support work.',
      'Built the registration-area queue system, and develop an accounting web application in beta.'
    ]
  },
  {
    role: 'IT Help Desk',
    org: 'Lead Generation and Donor Creation Inc.',
    when: 'Jan 2024 – Apr 2024',
    where: 'Iloilo City, Philippines',
    bullets: [
      'Responded to technical requests and incidents, troubleshooting hardware, software, and basic network issues for end users.',
      'Installed, configured, and maintained computers, peripherals, applications, and user workstations to support daily operations.',
      'Documented recurring problems, tracked incidents to resolution, and escalated to the right team when needed.'
    ]
  }
];

// ---------- skills: one keyword-dense line per category ----------
// Windows, TCP/IP, MySQL and the automation bullet in the IT Assistant role are
// asserted by Patrick directly rather than scraped from the site, so they have no
// site source for the audit to check. They are named here so the guarantee still
// covers everything else: a further unsourced keyword fails the audit rather
// than slipping through. Nothing beyond this set may be added on assertion alone.
//
// The automation bullet and the two-systems bullet are asserted by Patrick
// directly rather than scraped from the site, so they have no site source for the
// audit to check. They are named here so the guarantee still covers everything
// else: a further unsourced keyword fails the audit rather than slipping through.
// Nothing beyond this set may be added on assertion alone.
//
// The automation bullet is worded "small scripts and tools" on purpose. He
// described it as "a little coding for system automation", and no scripting
// language is claimed, because the site does not say which one he used.
//
// The queue and accounting systems both exist as public repositories, but the
// site attributes neither to the IT Assistant role, so it is his own account of
// the job that puts them there. The queue system is described as built and the
// accounting one as in beta, matching how far each has actually got - the queue
// repository is version 1.0.0, while the accounting work is unfinished. Neither
// is described as live at the counter, because counter_compass's own README
// still lists authentication and deployment hardening as outstanding.
//
// The IT Help Desk bullets name peripherals, configuration, workstations,
// escalation and installation. None of those words appears anywhere in the site,
// so the job as described is Patrick's own account. The site does corroborate
// hardware, software, incidents and networking, which is why the troubleshooting
// bullet stands on its own but the install/configure bullet is an assertion.
const USER_CONFIRMED = new Set(['Windows', 'TCP/IP', 'MySQL']);

const SKILLS = [
  { k: 'Technical Support', v: 'Hardware/software troubleshooting, Windows workstation support, user support, incident handling' },
  { k: 'Networking', v: 'TCP/IP fundamentals and subnetting; CCNA switching, routing, wireless; network troubleshooting' },
  { k: 'Systems & Linux', v: 'Red Hat System Administration I and II (RH124, RH134)' },
  { k: 'Programming', v: 'PHP, JavaScript, Python' },
  { k: 'Web Development', v: 'Laravel and Blade; server-side and browser-based applications' },
  { k: 'Databases', v: 'MySQL; relational design and SQL' },
  { k: 'Cybersecurity', v: 'Security fundamentals and threat awareness; ISC2 CC, TryHackMe Advent of Cyber' },
  { k: 'Cloud', v: 'Google Cloud fundamentals, Docker containers' }
];

const CONTACT = [
  'Iloilo City, Philippines',
  '09388759110',
  'patrickcabansag5@gmail.com',
  'linkedin.com/in/glenpatrick',
  'github.com/Gl3nnnn',
  'gl3nnnn.github.io/Cabansag.github.io'
];

const css = `
@page { size: A4; margin: 12mm 14mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.3;
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
.role-line { font-size: 10.5pt; color: #3f444c; margin-top: 0.4mm; }
.contact { margin-top: 1.3mm; font-size: 9.2pt; color: #33383f; line-height: 1.35; }
.contact span { white-space: nowrap; }
.contact .sep { color: #a8adb5; margin: 0 3px; }
h2 {
  font-size: 9pt; text-transform: uppercase; letter-spacing: 1pt;
  color: #166534; border-bottom: 1pt solid #166534;
  margin: 1.7mm 0 1.25mm; padding-bottom: 0.6mm;
}
section { break-inside: auto; }
.entry { break-inside: avoid; margin-bottom: 1.15mm; }
.entry:last-child { margin-bottom: 0; }
.entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 5mm; }
.entry-title { font-weight: 600; font-size: 10.5pt; }
.entry-org { font-weight: 400; color: #3f444c; }
.entry-when { color: #3f444c; font-size: 9.2pt; white-space: nowrap; }
.entry-meta { color: #5f646c; font-size: 9.2pt; }
ul.bullets { margin: 0.6mm 0 0; padding-left: 4.2mm; }
ul.bullets li { margin-bottom: 0.15mm; }
p.summary { margin: 0 0 1.1mm; line-height: 1.22; }
.cert-items { margin: 0; padding: 0; list-style: none; }
.cert-items li { font-size: 9.2pt; padding: 0.2mm 0; }
.cert-issuer { font-weight: 600; color: #166534; }
.skill-row { display: flex; gap: 2.5mm; font-size: 9.4pt; padding: 0.2mm 0; border-bottom: 0.4pt dotted #d7dade; break-inside: avoid; }
.skill-key { font-weight: 600; min-width: 34mm; }
.proj-items { margin: 0; padding: 0; list-style: none; }
.proj-items li { font-size: 9.2pt; padding: 0.25mm 0; }
.proj-name { font-weight: 600; }
.proj-lang { color: #5f646c; }
.proj-more { margin: 0.7mm 0 0; font-size: 8.8pt; font-style: italic; color: #4b515a; }
.note { color: #5f646c; font-size: 8.8pt; margin: 0 0 1.6mm; }
@media print {
  body { background: #fff; }
  .sheet { width: auto; min-height: 0; margin: 0; padding: 0; }
}`;

// One line per issuer rather than a heading plus a list: same information,
// roughly half the vertical space, and a flatter list for an ATS to read.
const certsHtml = groupByIssuer(short).map(([issuer, items]) => `
      <li><span class="cert-issuer">${esc(issuer)}</span> — ${items
        .map(c => `${esc(c.title)} <span class="proj-lang">(${esc(c.date)})</span>`).join('; ')}</li>`).join('');

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

const projHtml = featured.map(p => `
      <li><span class="proj-name">${esc(p.label)}</span> <span class="proj-lang">(${esc(p.language)})</span> — ${esc(p.line)}</li>`).join('');

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
    <div class="role-line">IT Support &amp; Systems Professional</div>
    <div class="contact">
      ${CONTACT.map((c, i) => `<span>${esc(c)}</span>${i < CONTACT.length - 1 ? '<span class="sep">|</span>' : ''}`).join('\n      ')}
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
    <h2>Skills</h2>
    ${skillsHtml}
  </section>

  <section>
    <h2>Certifications</h2>
    <ul class="cert-items">
      ${certsHtml}
    </ul>
    <p class="note" style="margin-top:1.6mm">Additional certifications available on LinkedIn and portfolio.</p>
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
    <h2>Projects</h2>
    <ul class="proj-items">
      ${projHtml}
    </ul>
    <p class="proj-more">More projects on GitHub: github.com/Gl3nnnn</p>
  </section>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'resume.html'), out);
console.log(`Wrote resume.html`);
console.log(`  certifications parsed : ${certs.length}`);
console.log(`  on the resume         : ${short.length} across ${groupByIssuer(short).length} issuers`);
console.log(`  projects              : ${featured.length} of ${projects.length} (${featured.map(p => p.src).join(', ')})`);
console.log(`  body font             : 10pt`);
console.log(`  user-confirmed skills : ${[...USER_CONFIRMED].join(', ')}`);
console.log('\n  featured project source descriptions, for comparison with the one-liners:');
featured.forEach(p => console.log(`    ${p.src}: ${p.description}`));
