// Generates resume.html from the portfolio's own data so the resume cannot
// drift from the site. Certifications are parsed out of index.html and the four
// featured projects are looked up in script.js; experience, education, skills
// and the summary are transcribed below and flagged for review.
//
// The resume is deliberately one page. Patrick asked for the strongest
// credentials only, 4 relevant projects, and everything on a single A4 sheet at
// a body size no smaller than 10pt. The full 38-certification list and the other
// projects stay on the filterable site, which is where the resume points.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const dec = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

// ---------- certifications (source of truth: index.html) ----------
// Both patterns below are deliberately loose about things that are presentational
// rather than meaningful. The section match tolerates trailing attributes, and
// the card match accepts any heading level: the certification titles were h4 and
// were retagged h3 when index.html's skipped heading levels were fixed, which
// silently broke this parser and was caught only by the count guard below.
// Re-pin these to a literal tag or a literal attribute list and the next
// cosmetic retag does the same thing again.
const certSection = html.match(/<section class="certifications" id="certifications"[^>]*>[\s\S]*?<\/section>/);
if (!certSection) throw new Error('cannot find the certifications section in index.html');
const certs = [...certSection[0].matchAll(/<div class="cert-card">[\s\S]*?<h[1-6]>([\s\S]*?)<\/h[1-6]>\s*<span class="cert-issuer">([\s\S]*?)<\/span>[\s\S]*?<span class="cert-date">([\s\S]*?)<\/span>/g)]
  .map(m => ({ title: dec(m[1]), issuer: dec(m[2]), date: dec(m[3]) }));
if (certs.length !== 38) throw new Error(`expected 38 certifications, parsed ${certs.length}`);

// ---------- the certifications that make the cut ----------
// Nine of the 38, chosen for recognised issuer and relevance to an IT
// support / systems / cloud career: Cisco CCNA for networking, the ISC2 CC for
// security, both Red Hat RHCSA levels for Linux, Google Cloud Fundamentals and
// Technical Support Fundamentals, TryHackMe Advent of Cyber, the DataCamp
// AI Engineer for Developers Associate, and the DICT CyberPRO cybersecurity
// portal, which is a Philippine government credential and the only one a local
// recruiter is likely to recognise on sight.
// Everything else - the TESDA and design courses, the intro and gen-AI
// Google tracks, Udemy, Alteryx and the rest - stays on the site's filterable
// list, which the Certifications note points to.
//
// Titles here must match the index.html certification heading byte for byte,
// including the en dash in CyberPRO: `short` throws on a miss, so a typo fails the
// build rather than silently dropping the credential from the resume.
const SHORTLIST = [
  'CCNA: Switching, Routing, and Wireless Essentials',
  'Red Hat System Administration I (RH124)',
  'Red Hat System Administration II (RH134)',
  'Google Cloud Fundamentals: Core Infrastructure',
  'Technical Support Fundamentals',
  'Certified in Cybersecurity (CC)',
  'Advent of Cyber 2024',
  'AI Engineer for Developers Associate',
  'Cybersecurity Professionals Portal (CyberPRO) – Level 2 (Intermediate)'
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
// The allowlist is now empty, and that is the point: every technology the resume
// asserts is backed by a credential, a public repository or a job.
//
// MySQL was the last entry, and it is sourced rather than merely confirmed. The
// accounting repository's own files show it: .env.example sets DB_CONNECTION=mysql
// on port 3306, and database/acc.sql is a phpMyAdmin dump taken against MariaDB
// 10.4.32. Both are committed to the public repo, so the claim is checkable by
// anyone who opens it rather than resting on assertion.
//
// Windows and TCP/IP left earlier because the rebuilt Skills section states both
// as plain text, corroborated by the support roles and Google Technical Support
// Fundamentals on one side and Red Hat and CCNA on the other.
const USER_CONFIRMED = new Set();

// Eight rows, matching the eight areas of the site's Skills section and leading
// with the work rather than the tooling, in the same order the site uses. Docker
// was dropped from the Cloud row: it had no credential, repository or job behind
// it, and the site no longer claimed it. Windows and TCP/IP also came off the
// allowlist, because the rebuilt Skills section now states both as plain text and
// the site corroborates them (Red Hat and CCNA for TCP/IP, the support roles and
// Google Technical Support Fundamentals for Windows) - so they are sourced rather
// than excused. MySQL is the one remaining assertion, since no credential or
// repository names it.
const SKILLS = [
  { k: 'IT Support', v: 'Hardware/software troubleshooting, Windows workstation support, user support, incident handling' },
  { k: 'Linux & Systems', v: 'Red Hat System Administration I and II (RH124, RH134)' },
  { k: 'Networking', v: 'TCP/IP fundamentals and subnetting; CCNA switching, routing, wireless' },
  { k: 'Google Cloud', v: 'Seven credentials: core infrastructure, modernisation, security and operations, GenAI' },
  { k: 'Cybersecurity', v: 'Threat awareness; ISC2 CC, DICT CyberPRO Level 2, TryHackMe Advent of Cyber' },
  { k: 'Web Development', v: 'PHP, Laravel and Blade, MySQL; server-side and browser-based applications' },
  { k: 'Python & Automation', v: 'Desktop tools, records management and support-task automation' },
  { k: 'Design & Graphics', v: 'Four design credentials: graphic design principles, logo design, trends in art and design' }
];

// Each contact item is { icon, text }. The icon is a small inline SVG so the
// line stays self-contained (no font CDN, no external request) and prints in
// black-and-white. It is decorative only: the visible text is the full value,
// never a glyph, so an ATS still reads the address itself and not a symbol.
//
// Path data is copied verbatim from Font Awesome Free (solid + brands, CC BY 4.0
// icons), the same set index.html already loads, so the resume and the site read
// as one design. The per-glyph viewBox matters: these are not square, and
// forcing them into a shared 16x16 box is what previously sheared the phone and
// globe outlines. Do not hand-edit these paths; take them from the FA svgs.
const ICONS = {
  pin: ['0 0 384 512', 'M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z'],
  phone: ['0 0 512 512', 'M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z'],
  mail: ['0 0 512 512', 'M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z'],
  linkedin: ['0 0 448 512', 'M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z'],
  github: ['0 0 496 512', 'M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z'],
  globe: ['0 0 512 512', 'M352 256c0 22.2-1.2 43.6-3.3 64l-185.3 0c-2.2-20.4-3.3-41.8-3.3-64s1.2-43.6 3.3-64l185.3 0c2.2 20.4 3.3 41.8 3.3 64zm28.8-64l123.1 0c5.3 20.5 8.1 41.9 8.1 64s-2.8 43.5-8.1 64l-123.1 0c2.1-20.6 3.2-42 3.2-64s-1.1-43.4-3.2-64zm112.6-32l-116.7 0c-10-63.9-29.8-117.4-55.3-151.6c78.3 20.7 142 77.5 171.9 151.6zm-149.1 0l-176.6 0c6.1-36.4 15.5-68.6 27-94.7c10.5-23.6 22.2-40.7 33.5-51.5C239.4 3.2 248.7 0 256 0s16.6 3.2 27.8 13.8c11.3 10.8 23 27.9 33.5 51.5c11.6 26 20.9 58.2 27 94.7zm-209 0L18.6 160C48.6 85.9 112.2 29.1 190.6 8.4C165.1 42.6 145.3 96.1 135.3 160zM8.1 192l123.1 0c-2.1 20.6-3.2 42-3.2 64s1.1 43.4 3.2 64L8.1 320C2.8 299.5 0 278.1 0 256s2.8-43.5 8.1-64zM194.7 446.6c-11.6-26-20.9-58.2-27-94.6l176.6 0c-6.1 36.4-15.5 68.6-27 94.6c-10.5 23.6-22.2 40.7-33.5 51.5C272.6 508.8 263.3 512 256 512s-16.6-3.2-27.8-13.8c-11.3-10.8-23-27.9-33.5-51.5zM135.3 352c10 63.9 29.8 117.4 55.3 151.6C112.2 482.9 48.6 426.1 18.6 352l116.7 0zm358.1 0c-30 74.1-93.6 130.9-171.9 151.6c25.5-34.2 45.2-87.7 55.3-151.6l116.7 0z']
};

const icon = name =>
  `<svg class="c-icon" viewBox="${ICONS[name][0]}" aria-hidden="true" focusable="false"><path d="${ICONS[name][1]}"/></svg>`;

const CONTACT = [
  { icon: 'pin', text: 'Iloilo City, Philippines' },
  // Both mobile numbers share one item: the icon is decorative and a second
  // phone item would push the contact line toward a third row on the A4 sheet.
  { icon: 'phone', text: '09388759110 / 09910102920' },
  { icon: 'mail', text: 'patrickcabansag5@gmail.com' },
  { icon: 'linkedin', text: 'linkedin.com/in/glenpatrick' },
  { icon: 'github', text: 'github.com/Gl3nnnn' },
  // labelled, because a bare github.io path reads as a typo to a recruiter
  // skimming the header. The label is also the pointer to the rest of the
  // work, since the resume carries 4 of the 13 projects.
  { icon: 'globe', text: 'Portfolio: gl3nnnn.github.io/Cabansag.github.io' }
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
   .contact .c-item { white-space: nowrap; }
   .contact .c-item + .sep { margin: 0 3px; }
   .contact .sep { color: #a8adb5; }
   /* decorative marker only: the value beside it is always the full text, so the
      icon never becomes the only carrier of the information */
   .c-icon {
     /* height drives the size and width follows the glyph's own aspect ratio,
        because these viewBoxes are 384x512, 448x512 and 496x512. A fixed width
        here is what squashed the phone and globe before. */
     height: 2.6mm; width: auto;
     margin-right: 0.85mm;
     vertical-align: -0.45mm;
     fill: #6b7280;
   }
  h2 {
    font-size: 9pt; text-transform: uppercase; letter-spacing: 1pt;
    color: #166534; border-bottom: 1pt solid #166534;
    /* the six section headings are the page's cheapest vertical slack: trimmed
       to hold a 9th certification on one page without touching the 10pt body */
    margin: 1.2mm 0 0.9mm; padding-bottom: 0.4mm;
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
      ${CONTACT.map((c, i) => `<span class="c-item">${icon(c.icon)}${esc(c.text)}</span>${i < CONTACT.length - 1 ? '<span class="sep">|</span>' : ''}`).join('\n      ')}
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
