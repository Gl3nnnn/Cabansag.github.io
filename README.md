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
- **Cybersecurity** — ISC2 CC · DICT CyberPRO L2 · Cisco CyberOps · TryHackMe Advent of Cyber · LFC108 · IBM · UMD
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
- **Cybersecurity (8)** — Certified in Cybersecurity (CC) [ISC2] · CyberOps Associate · Introduction to Cybersecurity · Advent of Cyber 2024 [TryHackMe] · Cybersecurity Essentials (LFC108) [Linux Foundation] · Introduction to Cybersecurity Tools & Cyber Attacks [IBM] · Cybersecurity for Everyone [University of Maryland] · Cybersecurity Professionals Portal (CyberPRO) Level 2 [DICT]
- **Development & AI (8)** — AI Engineer for Developers Associate [DataCamp] · Introduction to Data Science · Responsive Web Design [freeCodeCamp] · CSS Essentials · Introduction to Software Engineering [IBM] · iOS Development for Beginners · Introduction to Quantum Computing [Udemy] · SMART Android Mobile Apps Development [TESDA]
- **Design & Graphics (4)** — Principles of Graphic Design [University of the Philippines] · Trends in Art and Design [DICT] · Developing Designs for a Logo [TESDA] · Introduction to Visual Graphic Design [TESDA]
- **Systems & Support (5)** — Red Hat System Administration I (RH124) · Red Hat System Administration II (RH134) · Technical Support Fundamentals [Google] · Microsoft Digital Literacy [TESDA] · Globe Wi-Fi 101 and Digital Thumbprint Program
- **Data & Professional (4)** — Alteryx Foundational Micro-Credential · Six Sigma White Belt [CSSC] · Information Systems Auditing, Controls and Assurance [HKUST] · SMART Technopreneurship 101 [TESDA]

The full list, with issuers, dates and credential IDs, is on the site's Certifications section
and can also be viewed on my [LinkedIn certifications page](https://www.linkedin.com/in/glenpatrick/details/certifications/).

## Projects

Thirteen repositories, all public. The same list drives the site's Projects section.

**PHP**

- **INVENTORY-NEW** — inventory management web system for stock, suppliers and item movement.
- **TechDesk** — tech-desk ticketing for logging, assigning and tracking support requests.
- **helpdesk** — helpdesk support system for end-user tickets and recurring IT issues.
- **it_inventory** — IT asset inventory for hardware, assignments and equipment lifecycle.

**Laravel**

- **accounting** — accounting and financial application on Laravel 12 with Blade templating.

**JavaScript**

- **counter_compass** — real-time training-centre queue system with independent ticket numbering per service and a live waiting-area display.
- **InventoryTBF** — browser-based inventory tracker for stock levels and item records.
- **Issue-Tracker** — issue and bug tracking for capturing, triaging and managing defects.
- **games** — collection of small browser games in vanilla JavaScript.
- **radios** — streaming-style radio player web app.

**Python**

- **SimpleStudentManager** — command-line app for storing, searching and updating student records.
- **SimpleAssistant** — desktop assistant with task helpers and lightweight automation.
- **simplecalculator** — desktop calculator with a clean graphical interface.

Each entry in `script.js` carries an optional `outcome` line rendered under the card description, saying what came out of the project rather than repeating the description. The Projects section loads live from GitHub and includes language filters with per-language counts, a "Showing X of Y" result counter, and two topic tags per project. The list itself is a curated set of repositories in `script.js`, so the section never shrinks or reorders when the API is rate limited or a repo is renamed. View the full list on my [GitHub](https://github.com/Gl3nnnn).

## Site Structure

- `index.html` — main portfolio page (home, about, education, experience, certifications, skills, projects, testimonials, blog, contact)
- `faq.html` — frequently asked questions
- `blog.html` — blog archive with search and topic filters. Search reads `?q=` on load and mirrors edits back into the address bar, so a filtered page can be shared and the site's `SearchAction` structured data points at a URL that actually applies the term.
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
- `resume-2026.pdf` — the canonical, served resume (generated by `tools/build_resume.js` and used for download/print)
- `RESUME_Cabansag_GlennPatrick.pdf` — superseded 2024 resume, kept for history/reference and is not linked
- `.github/workflows/ci.yml` — runs the suites and the generators on every push
- `tools/verify_page.js` — optional browser-level check, run by hand rather than in CI (see [Tests](#tests))

## Structured Data

`index.html` carries one JSON-LD block, and it is generated rather than hand-maintained:

```
node tools/build_jsonld.js          # rewrite the block in index.html
node tools/build_jsonld.js --check  # fail if index.html is out of date (what CI runs)
```

- `tools/build_jsonld.js` builds an `@graph` of `Person` (with all 38 certifications as `hasCredential`), `WebSite` (with the `SearchAction`) and `ProfilePage`, cross-referenced by `@id`.
- The certifications are parsed out of `index.html`'s own certification cards, so the structured data cannot claim credentials the page does not show. `dateCreated` is a partial ISO month such as `2023-11`, which is the precision the cards carry.
- The `Person` node's descriptive fields (name, job title, employer, location, social links) are transcribed in the tool rather than parsed, following the same convention as `build_resume.js`: prose is reviewed by hand, structured facts are derived.
- After editing a certification card, a project list or the `Person` fields, run the tool and commit the result. After editing a post spec or anything `build_resume.js` reads, run that tool too — CI fails on a stale generated file.

## The Last-Updated Stamp

The homepage shows a `Last updated` date, and it is generated from git history rather than typed — a hand-written literal is stale from the moment it is written and looks correct the entire time.

```
node tools/build_last_updated.js   # restamp the homepage from the last content commit
```

- The date comes from the last commit that touched `index.html`, `script.js` or `profile.jpg` — the page's markup and CSS are inline in the first, the second carries the theme switch and project star counts, and the third is the portrait. A commit touching only a blog post or `resume.html` is not a change to the homepage and must not move the date.
- Commits that did nothing but rewrite the stamp are skipped, so the generator cannot stamp itself. That test is deliberately strict: exactly one file, that file being `index.html`, and every changed line carrying the marker.
- **Install the pre-commit hook once per clone.** `core.hooksPath` is local git config and does not travel with the repository, so this is not automatic:

```
git config core.hooksPath .githooks
```

- `.githooks/pre-commit` then runs `tools/stamp_precommit.js` on every commit, which writes today's date into `index.html` and stages it — so the stamp lands in the same commit as the edit that earned it. The generator above exists for the case where the hook was bypassed, and CI's drift gate is what actually enforces it. Without the hook, a content edit needs two commits: the edit, then the stamp.
- The hook's date comes from `git var GIT_COMMITTER_IDENT` rather than the system clock, because CI later reads the *committed* timestamp; asking git for the value it is about to record removes a timezone or midnight-boundary disagreement between what the hook writes and what the gate checks.
- It declines rather than guess. If `index.html` has staged and unstaged changes at once — the `git add -p` case — it refuses, because staging its output would also stage the hunks deliberately left out. `--no-verify` skips it entirely. Neither is blocked: the stamp is left alone and the drift gate fails the push, which is loud rather than wrong.
- Run `node tools/stamp_precommit.js` by hand to see what it would do. Commits touching none of the three sources exit silently without starting node.

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
node tools/check_css.js
node tools/build_jsonld.js --check
```

All four run on every push via `.github/workflows/ci.yml`, which then regenerates every generated file and fails if `git diff` is not empty. Nothing here has a package.json: the tools use only the Node standard library.

- `tests/blog_claims.js` — the evidence suite. Checks that the chain's order and navigation match every post on disk, that `blog.html`, `index.html`, `sitemap.xml` and this README all agree on the same nine posts, that the claims in the new posts are still backed by the resume or the FAQ, and that touched files have no BOM, no replacement characters and no CRLF. Also the portfolio drift suite: it reads the hero statistics by label and checks them against the number of `.services-box` cards, the `.cert-card` count and the curated `PROJECTS` length, requires every curated project to be named in this README, and compiles `script.js` (a syntax error there empties the Projects section and fails nothing else, because every other check reads `index.html`). Those assertions exist because the page had drifted to claiming 12 projects and 7 skill areas over 13 cards and 8 boxes.
- `tests/post_structure.js` — per-post structure. Heading numbering, TOC/body agreement, unique ids, anchor resolution, tag balance, encoding, `<title>`, and agreement between each spec and its rendered canonical URL and JSON-LD.
- `tools/check_css.js` — parses every inline `<style>` block and fails on a stray top-level `}`, unbalanced braces, JSON-LD text inside a stylesheet, or invalid JSON-LD. Added after `index.html` was found to have had a JSON-LD block injected into its `<style>` 13 times, which left a stray `}` at top level in each spot. The braces still balanced and the page still rendered, but a top-level `}` does not close anything: the parser treats it as a selector prelude and swallows the next at-rule's block with it. That silently deleted `@keyframes word` and `@keyframes typing` — which froze the hero sub-headline on "IT Assistant" — along with 6 of the 13 responsive breakpoints and the `prefers-reduced-motion` fallback, so none of the small-screen layout fixes could take effect. It lives in `tools/` rather than `tests/` because it validates the markup of every page, not a post spec.
- `tools/build_jsonld.js --check` — compares the generated structured data against what is in `index.html` and exits non-zero if they differ. Without it the generator is one more thing to remember to run.
- `tools/verify_page.js` — optional, local only, and deliberately not in CI because it needs a real browser. The three suites above read markup and CSS text; they cannot tell you what a browser did with it. This drives headless Chrome over the DevTools protocol and asks the page instead: that the hero sub-headline still rotates, that the count-up stats settle on their own targets, that 13 cards and 13 outcome lines render, that no heading swallowed the rest of the page after it, how many rules and `@keyframes` the CSS parser really built, that the JSON-LD parses, and that `?q=` on `blog.html` genuinely narrows the list instead of quietly showing all nine posts. Run `node tools/verify_page.js` after anything touching the hero, the CSS or the search. Each check exists because the corresponding bug actually shipped, so the list doubles as a record of what went wrong.

## Contact Me

- **Email**: patrickcabansag5@gmail.com
- **LinkedIn**: [Glenn Patrick Cabansag](https://www.linkedin.com/in/glenpatrick)
- **GitHub**: [Gl3nnnn](https://github.com/Gl3nnnn)
- **Facebook**: [Gl3nQt](https://www.facebook.com/Gl3nQt)

---

Thank you for visiting my portfolio! Feel free to reach out if you have any questions or collaboration ideas.
