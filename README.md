# Glenn Patrick Cabansag's Portfolio

Welcome to my portfolio website! I'm Glenn Patrick Cabansag, an Information Technology professional based in Iloilo, Philippines.

🌐 **Live site**: https://gl3nnnn.github.io/Cabansag.github.io/

> **Note:** this repository is published as a project page, so every URL below is relative to
> `https://gl3nnnn.github.io/Cabansag.github.io/` — not the bare domain root.

## About Me

- **Role**: IT Assistant at COMPASS Training Center, Inc.
- **Education**: Bachelor of Science in Information Technology, University of San Agustin (2020-2024)
- **Location**: Iloilo, Philippines

## Skills

These are the eight areas on the site's Skills section. Each one traces to a credential, a public
repository, or a job held — the site shows the specific evidence next to each.

- **IT Support** — Google Technical Support Fundamentals · TESDA Microsoft Digital Literacy · 2 roles
- **Linux & Systems** — Red Hat System Administration I (RH124) · Red Hat System Administration II (RH134)
- **Networking** — CCNA: Switching, Routing, and Wireless Essentials · Cisco Network Support and Security
- **Google Cloud** — 7 credentials spanning core infrastructure, modernisation, security and operations, GenAI and responsible AI
- **Cybersecurity** — ISC2 CC · DICT CyberPRO L1 · Cisco CyberOps · TryHackMe Advent of Cyber · LFC108 · IBM · UMD
- **Web Development** — PHP · Laravel and Blade · MySQL · JavaScript (5 of 13 public repos are PHP or Laravel)
- **Python & Automation** — 3 Python repos · DataCamp AI Engineer Associate
- **Design & Graphics** — 4 design credentials (credential-based, not a current role)

Currently studying AWS; listed as learning rather than experience, since no credential or project
in it exists yet.

## Experience

- **IT Assistant** — COMPASS Training Center, Inc. (Oct 2024 - Present)
- **IT Help Desk** — Lead Generation and Donor Creation Inc. (Jan 2024 - Apr 2024)

## Certifications

38 licenses and certifications across 7 categories, spanning cloud, networking, cybersecurity,
development, design, systems support and data. Highlights include:

- **Cloud & DevOps (7)** — Digital Transformation with Google Cloud · Google Cloud Fundamentals: Core Infrastructure · Infrastructure and Application Modernization with Google Cloud · Understanding Google Cloud Security and Operations · Introduction to Large Language Models · Introduction to Responsible AI · Introduction to Generative AI
- **Networking (2)** — CCNA: Switching, Routing, and Wireless Essentials · Network Support and Security
- **Cybersecurity (8)** — Certified in Cybersecurity (CC) [ISC2] · CyberOps Associate · Introduction to Cybersecurity · Advent of Cyber 2024 [TryHackMe] · Cybersecurity Essentials (LFC108) [Linux Foundation] · Introduction to Cybersecurity Tools & Cyber Attacks [IBM] · Cybersecurity for Everyone [University of Maryland] · Cybersecurity Professionals Portal (CyberPRO) Level 1 [DICT]
- **Development & AI (8)** — AI Engineer for Developers Associate [DataCamp] · Introduction to Data Science · Responsive Web Design [freeCodeCamp] · CSS Essentials · Introduction to Software Engineering [IBM] · iOS Development for Beginners · Introduction to Quantum Computing [Udemy] · SMART Android Mobile Apps Development [TESDA]
- **Design & Graphics (4)** — Principles of Graphic Design [University of the Philippines] · Trends in Art and Design [DICT] · Developing Designs for a Logo [TESDA] · Introduction to Visual Graphic Design [TESDA]
- **Systems & Support (5)** — Red Hat System Administration I (RH124) · Red Hat System Administration II (RH134) · Technical Support Fundamentals [Google] · Microsoft Digital Literacy [TESDA] · Globe Wi-Fi 101 and Digital Thumbprint Program
- **Data & Professional (4)** — Alteryx Foundational Micro-Credential · Six Sigma White Belt [CSSC] · Information Systems Auditing, Controls and Assurance [HKUST] · SMART Technopreneurship 101 [TESDA]

The full list, with issuers, dates and credential IDs, is on the site's Certifications section
and can also be viewed on my [LinkedIn certifications page](https://www.linkedin.com/in/glenpatrick/details/certifications/).

## Projects

Some featured public repositories:

- **INVENTORY-NEW** — Inventory management web system (PHP)
- **accounting** — Accounting web app built with Laravel (Blade)
- **TechDesk** / **helpdesk** / **it_inventory** — IT support and asset systems (PHP)
- **InventoryTBF** / **Issue-Tracker** / **radios** / **games** — JavaScript apps
- **SimpleStudentManager** / **SimpleAssistant** / **simplecalculator** — Python utilities

The Projects section on the site loads live from GitHub and includes language filters with per-language counts, a "Showing X of Y" result counter, and two topic tags per project. The list itself is a curated set of repositories in `script.js`, so the section never shrinks or reorders when the API is rate limited or a repo is renamed. View the full list on my [GitHub](https://github.com/Gl3nnnn).

## Site Structure

- `index.html` — main portfolio page (home, about, education, experience, certifications, skills, projects, testimonials, blog, contact)
- `faq.html` — frequently asked questions
- `blog.html` — blog archive with search and topic filters
- `blog-queue-system.html, blog-accounting-laravel.html, blog-it-support-shift.html, blog-vlans-home-lab.html, blog-docker-portfolio.html, blog-tryhackme-first-month.html, blog-home-lab.html, blog-aws-journey.html, blog-helpdesk-lessons.html` — blog posts
- `404.html` — custom 404 page
- `script.js` — shared interactivity (nav, scroll spy, projects via GitHub API with curated fallback, language filters, reveal-on-scroll, theme toggle, hero stats, skill bars, cert links, copy-email). Loaded only by `index.html`.
- Inline in `index.html` — the EmailJS contact form handler, honeypot, field validation and status popups
- Inline in `faq.html` — FAQ accordion, search and category filter
- `manifest.webmanifest` — PWA/install metadata
- `profile.jpg`, `og-cover.jpg` — profile photo and social share card
- `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` — branding and icons
- `sitemap.xml`, `robots.txt` — SEO files
- `resume.html` — printable resume source (1 page, A4, 10pt body). Certifications and the four featured projects are generated from this site's own data by the build script, so the resume cannot drift from the site; the summary, experience, skills and education are transcribed beside it for review. Edit the data, run `node tools/build_resume.js`, then print to PDF. The other 29 certifications and the other 9 projects deliberately stay off the resume, with a pointer to GitHub for the rest and live on the site's filterable list instead. No tables, images or icons, so applicant tracking systems read it as plain text.
- `resume-2026.pdf` — the generated resume served to visitors
- `RESUME_Cabansag_GlennPatrick.pdf` — superseded 2024 resume, kept for reference and no longer linked

## Blog Authoring

- `tools/posts/_chain.js` — single source of truth for the post timeline. It owns the order, derives each post's previous/next links and the set of category filters from the posts themselves, and rejects duplicate dates. Adding a post means adding it here; a spec cannot invent its own navigation.
- `tools/posts/<slug>.js` — one post spec per post: title, description, date, category, TOC and body HTML. The body is a JS template string rather than JSON because post bodies are full of quotes and backslashes, and hand-escaping those into JSON corrupts code samples.
- `tools/build_post.js` — renders a spec to `blog-<slug>.html` using the VLAN post as the template, so the CSS, header and footer cannot drift. Run `node tools/build_post.js tools/posts/<slug>.js`.
- The three newest posts (`queue-system`, `accounting-laravel`, `it-support-shift`) are generated this way. The older six are hand-maintained.
- After changing a post body, regenerate it and re-run the suites below.

### Tests

```
node tests/blog_claims.js
node tests/post_structure.js
```

- `tests/blog_claims.js` — the evidence suite. Checks that the chain's order and navigation match every post on disk, that `blog.html`, `index.html`, `sitemap.xml` and this README all agree on the same nine posts, that the claims in the new posts are still backed by the resume or the FAQ, and that touched files have no BOM, no replacement characters and no CRLF.
- `tests/post_structure.js` — per-post structure. Heading numbering, TOC/body agreement, unique ids, anchor resolution, tag balance, encoding, `<title>`, and agreement between each spec and its rendered canonical URL and JSON-LD.

## Contact Me

- **Email**: patrickcabansag5@gmail.com
- **LinkedIn**: [Glenn Patrick Cabansag](https://www.linkedin.com/in/glenpatrick)
- **GitHub**: [Gl3nnnn](https://github.com/Gl3nnnn)
- **Facebook**: [Gl3nQt](https://www.facebook.com/Gl3nQt)

---

Thank you for visiting my portfolio! Feel free to reach out if you have any questions or collaboration ideas.
