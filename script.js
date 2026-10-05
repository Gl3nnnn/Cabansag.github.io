const EMAILJS = { publicKey: 'qJNRbjDf_u2JtF1Hf', serviceID: 'service_bkjbqcm', templateID: 'template_kkar83i' };
if (typeof emailjs !== "undefined") { try { emailjs.init(EMAILJS.publicKey); } catch (e) {} }
let navbar = document.querySelector('.navbar');
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');
let menuIcon = document.querySelector('#menu-icon');

// Active navigation link on scroll (scroll-spy)
function updateActiveLink() {
    let scrollY = window.scrollY;
    let currentId = '';

    sections.forEach(sec => {
        let top = sec.offsetTop - 200;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (scrollY >= top && scrollY < top + height) {
            currentId = id;
        }
    });

    if (!currentId && scrollY < sections[0].offsetTop) {
        currentId = 'home';
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentId) {
            link.classList.add('active');
        }
    });
}

window.onscroll = () => {
    updateActiveLink();
    updateScrollProgress();
    toggleBackToTop();
};

// Mobile menu toggle
menuIcon.onclick = () => {
    menuIcon.classList.toggle('fa-xmark');
    navbar.classList.toggle('active');
};

// Close mobile menu when a link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuIcon.classList.remove('fa-xmark');
        navbar.classList.remove('active');
    });
});

// Scroll progress bar (top of page)
function updateScrollProgress() {
    const progress = document.getElementById('scroll-progress');
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = percent + '%';
}

// Back to top button
const backToTop = document.getElementById('back-to-top');

function toggleBackToTop() {
    if (window.scrollY > 400) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
}

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// GitHub project cards
const GITHUB_USER = 'Gl3nnnn';
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`;

// Note: the previous EXCLUDED allow/deny list (forks, skills-* clones, The-MALWARE-Repo,
// Microsoft-Activation-Scripts-MAS-, etc.) has been removed. It only existed to filter raw
// API output, and the Projects section is now driven by the curated PROJECTS list below.

// Curated project list - the single source of truth for the Projects section.
//
// These were previously fetched live from the GitHub API and filtered with
// `repo.description !== undefined`. That filter never worked: the API returns
// `description: null` (not `undefined`) for repos without one, and
// `null !== undefined` is true, so every non-excluded repo passed. The result
// was 35 "projects", 26 of which rendered the literal text
// "No description available." - including repos named `3d-image`, `Flower`,
// `NebulaWhisper` and `shootingNotDone-`.
//
// Curating here means the section can never show an undescribed or junk repo.
// The API is still queried, but only to enrich these entries with live star
// counts, last-pushed dates and demo URLs.
// `outcome` is the line that says what came out of the project rather than what
// it contains, because `description` already covers the "what". It is optional:
// a card with no outcome simply omits the row.
//
// TREAT EVERY `outcome` BELOW AS A DRAFT. The two longest ones
// (counter_compass, accounting) are grounded in their own blog posts. The rest
// are written to be defensible from the repo's stated scope, not invented
// metrics - no uptime, no user counts, no "reduced tickets by 40%". If a line
// overstates what the repo actually does, delete it; the card still renders.
const PROJECTS = [
    { name: 'INVENTORY-NEW', language: 'PHP', tags: ['Inventory', 'Web App'], description: 'Inventory management web system for tracking stock, suppliers and item movement in a small business.', outcome: 'One system for stock, suppliers and item movement, so a purchase and its effect on inventory are the same record rather than two.' },
    { name: 'accounting', language: 'Blade', tags: ['Accounting', 'Laravel'], description: 'Accounting and financial web application built with Laravel and Blade templating.', outcome: 'Double-entry is enforced at write time, so an unbalanced journal never reaches the database. Still in beta; the tests cover the ledger, not the UI.' },
    { name: 'TechDesk', language: 'PHP', tags: ['Ticketing', 'Helpdesk'], description: 'IT tech-desk ticketing app for logging, assigning and tracking technical support requests.', outcome: 'A ticket has to survive being logged, reassigned and reopened weeks later, which is where the schema earns its keep.' },
    { name: 'helpdesk', language: 'PHP', tags: ['Helpdesk', 'Ticketing'], description: 'Helpdesk support system built to manage end-user tickets and recurring IT issues.', outcome: 'Aimed at recurring faults rather than one-off tickets, so the same issue collects one record instead of five.' },
    { name: 'it_inventory', language: 'PHP', tags: ['IT Assets', 'Inventory'], description: 'IT asset inventory system for recording hardware, assignments and equipment lifecycle.', outcome: 'Answers the three questions an asset list actually gets asked: what we have, who holds it, and what state it is in.' },
    { name: 'counter_compass', language: 'JavaScript', tags: ['Queue', 'Ticketing'], description: 'Real-time queue management system for walk-in registrations, document processing and inquiries, with independent ticket numbering per service and a live waiting-area display.', outcome: 'Replaces the counter paper list, and the waiting-area display updates by push rather than polling. Not deployed yet: authentication and HTTPS are still open.' },
    { name: 'InventoryTBF', language: 'JavaScript', tags: ['Inventory', 'Web App'], description: 'Browser-based inventory tracker for monitoring stock levels and item records.', outcome: 'The same stock problem solved with nothing to install, so it could be exercised end to end without a server.' },
    { name: 'Issue-Tracker', language: 'JavaScript', tags: ['Issue Tracking', 'Web App'], description: 'Issue and bug tracking web application for capturing, triaging and managing defects.', outcome: 'Forces every defect to carry a status and an owner, which turns triage into a query instead of an argument.' },
    { name: 'games', language: 'JavaScript', tags: ['Games', 'Browser'], description: 'Collection of small browser games built with vanilla JavaScript.', outcome: 'Small games written to get comfortable with the DOM, canvas and input handling without leaning on a framework.' },
    { name: 'radios', language: 'JavaScript', tags: ['Audio', 'Web App'], description: 'Streaming-style radio player web app built with JavaScript.', outcome: 'Mostly an exercise in buffering state, and in keeping the interface honest about what the audio is doing.' },
    { name: 'SimpleStudentManager', language: 'Python', tags: ['Student Records', 'CLI'], description: 'Command-line student management app for storing, searching and updating student records.', outcome: 'A first command-line project: add, search and update records, and reject bad input without a traceback.' },
    { name: 'SimpleAssistant', language: 'Python', tags: ['Automation', 'Desktop'], description: 'Desktop assistant application with task helpers and lightweight automation.', outcome: 'Task helpers built to see what actually happens between a click and the operating system.' },
    { name: 'simplecalculator', language: 'Python', tags: ['Calculator', 'Desktop'], description: 'Desktop calculator application with a clean graphical interface.', outcome: 'The smallest useful desktop app: a GUI, a working keyboard path, and not dividing by zero.' }
];

// Rendered when nothing has loaded yet and before enrichment completes.
// `outcome` is carried through here and in enrichProjects() on purpose: both
// rebuild each object field by field, so a new PROJECTS field that is not added
// to both of these silently disappears from the cards.
function projectsFromCurated() {
    return PROJECTS.map(p => ({
        name: p.name,
        language: p.language,
        description: p.description,
        outcome: p.outcome,
        tags: p.tags || [],
        stargazers_count: 0,
        html_url: `https://github.com/${GITHUB_USER}/${p.name}`,
        homepage: '',
        pushed_at: ''
    }));
}

// Merge live repo data onto the curated entries. Unknown repos are ignored and
// curated entries missing from the API are kept, so the list never shrinks.
function enrichProjects(apiRepos) {
    const byName = new Map(apiRepos.map(r => [r.name, r]));
    return PROJECTS.map(p => {
        const live = byName.get(p.name);
        if (!live) {
            return {
                name: p.name,
                language: p.language,
                description: p.description,
                outcome: p.outcome,
                tags: p.tags || [],
                stargazers_count: 0,
                html_url: `https://github.com/${GITHUB_USER}/${p.name}`,
                homepage: '',
                pushed_at: ''
            };
        }
        return {
            name: p.name,
            language: live.language || p.language,
            description: p.description,
            outcome: p.outcome,
            tags: p.tags || [],
            stargazers_count: live.stargazers_count || 0,
            html_url: live.html_url || `https://github.com/${GITHUB_USER}/${p.name}`,
            homepage: live.homepage || '',
            pushed_at: live.pushed_at || ''
        };
    });
}


const projectsGrid = document.getElementById('projects-grid');
let activeProjects = [];

function langIcon(language) {
    const lang = (language || '').toLowerCase();
    if (lang.includes('javascript')) return 'fa-brands fa-js';
    if (lang.includes('python')) return 'fa-brands fa-python';
    if (lang.includes('php')) return 'fa-brands fa-php';
    if (lang.includes('java')) return 'fa-brands fa-java';
    if (lang.includes('blade') || lang.includes('laravel')) return 'fa-brands fa-laravel';
    if (lang.includes('html')) return 'fa-brands fa-html5';
    if (lang.includes('css')) return 'fa-brands fa-css3-alt';
    return 'fa-solid fa-code';
}

function formatPushed(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
}

function buildProjectCard(repo) {
    const name = repo.name;
    const description = (repo.description || '').slice(0, 160);
    // Optional, and deliberately not truncated: the outcome is a single
    // hand-written sentence, so clipping it would cut the point off. A card
    // without one just omits the row.
    const outcome = (repo.outcome || '').trim();
    const language = repo.language || 'N/A';
    const stars = repo.stargazers_count || 0;
    const url = repo.html_url || `https://github.com/${GITHUB_USER}/${name}`;
    const hasDemo = Boolean(repo.homepage);
    const ctaLabel = hasDemo ? 'Live Demo' : 'View Project';
    const ctaIcon = hasDemo ? 'fa-solid fa-rocket' : 'fa-solid fa-arrow-right';
    const pushed = formatPushed(repo.pushed_at);
    const tags = (repo.tags || [])
        .map(tag => `<span class="project-tag">${tag}</span>`)
        .join('');

    return `
        <a class="project-card" href="${url}" target="_blank" rel="noopener">
            <div class="project-top">
                <h3>${name}</h3>
                <span class="project-star"><i class="fa-solid fa-star"></i> ${stars}</span>
            </div>
            <p>${description}</p>
            ${outcome ? `<p class="project-outcome">${outcome}</p>` : ''}
            ${tags ? `<div class="project-tags">${tags}</div>` : ''}
            <div class="project-meta">
                <span class="project-lang"><i class="${langIcon(language)}"></i> ${language}</span>
                ${pushed ? `<span class="project-updated"><i class="fa-regular fa-clock"></i> ${pushed}</span>` : ''}
                <span class="project-link ${hasDemo ? 'demo' : ''}">${ctaLabel} <i class="${ctaIcon}"></i></span>
            </div>
        </a>
    `;
}

let activeLang = 'All';

function projectLangCounts() {
    const counts = {};
    activeProjects.forEach(repo => {
        const lang = repo.language || 'N/A';
        counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
}

function renderProjectFilters() {
    const container = document.getElementById('project-filters');
    if (!container) return;
    const counts = projectLangCounts();
    const langs = Object.keys(counts).sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b));
    const total = activeProjects.length;
    const options = ['All', ...langs].map(lang => {
        const n = lang === 'All' ? total : (counts[lang] || 0);
        return `<button type="button" class="chip${lang === activeLang ? ' active' : ''}" data-lang="${lang}" aria-pressed="${lang === activeLang}">${lang} <span class="chip-count">${n}</span></button>`;
    });
    container.innerHTML = options.join('');
    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeLang = chip.dataset.lang;
            renderProjectFilters();
            renderProjectGrid();
        });
    });
}

function renderProjectGrid() {
    const list = activeLang === 'All'
        ? activeProjects
        : activeProjects.filter(repo => (repo.language || 'N/A') === activeLang);

    const counter = document.getElementById('project-results-count');
    if (counter) {
        counter.textContent = list.length === activeProjects.length
            ? `Showing all ${list.length} projects`
            : `Showing ${list.length} of ${activeProjects.length} projects`;
    }

    if (list.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects in this category.</p>`;
        return;
    }

    projectsGrid.innerHTML = list.map(buildProjectCard).join('');
    observeReveal(projectsGrid);
}

function renderProjects(projects) {
    // The curated list is already in deliberate display order, so it is not
    // re-sorted here. Re-sorting by stars (all currently 0) made the order
    // depend on API response order.
    activeProjects = projects;

    // Sets data-target, not textContent. This element is also driven by the hero
    // count-up observer further down, which animates from data-target and then
    // unobserves. Writing textContent here used to set the correct "13+" and then
    // lose it: the observer fired afterwards and animated the stale data-target
    // from the markup back over the top, so the stat read 12+ directly above 13
    // project cards. Writing the target instead means both agree, whichever
    // happens to run first. The "+" comes from data-suffix on the element.
    const statProj = document.getElementById('hero-stat-projects');
    if (statProj) statProj.dataset.target = String(activeProjects.length);

    if (activeProjects.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects to show at the moment.</p>`;
        return;
    }

    renderProjectFilters();
    renderProjectGrid();
}

// Tells the visitor when the section is showing the curated list instead of
// live GitHub data. Star counts and last-updated dates only exist in the API
// response, so on the fallback path those fields are simply absent and used to
// disappear without explanation. Hidden by default so a healthy load never
// flashes it.
function setProjectsLive(isLive) {
    const note = document.getElementById('project-data-note');
    if (!note) return;
    note.hidden = Boolean(isLive);
}

async function loadProjects() {
    // v4: v3 payloads predate the per-project `outcome` line. The cache hit path
    // renders from the cached objects directly, so a v3 entry would draw every
    // card with the outcome row missing until the TTL expired. Bumped to force
    // one refetch instead. Note the cached path is also why `outcome` has to be
    // carried through projectsFromCurated/enrichProjects rather than read off
    // PROJECTS at render time.
    const CACHE_KEY = 'portfolio_projects_v4';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    // renderProjects renders whatever array it is handed, so a truncated or
    // hand-mangled cache entry would quietly shrink the section instead of
    // failing. Only trust a cache that still describes the same projects, in
    // the same order, as the curated list - which is also exactly what the
    // enrichProjects() output looks like, since it maps over PROJECTS.
    const isUsable = list =>
        Array.isArray(list) &&
        list.length === PROJECTS.length &&
        PROJECTS.every((p, i) => list[i] && list[i].name === p.name);

    const readCache = () => {
        let raw = null;
        try { raw = localStorage.getItem(CACHE_KEY); } catch (err) { return null; }
        if (!raw) return null;

        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }

        if (parsed && isUsable(parsed.projects)) return parsed;

        // Anything else - wrong shape, truncated, reordered, or not JSON at all
        // - is unusable. Delete it so it does not fail again on every load,
        // rather than just ignoring it and leaving it to be re-read next time.
        try { localStorage.removeItem(CACHE_KEY); } catch (err) { /* ignore */ }
        return null;
    };

    const cached = readCache();

    // Only the API path writes the cache, so a cache hit is always live-derived
    // data, just possibly an hour old.
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        setProjectsLive(true);
        renderProjects(cached.projects);
        return;
    }

    try {
        const res = await fetch(GITHUB_API_URL);
        if (res.status === 403 || res.status === 429) {
            // A rate limit is not a reason to blank the section - the curated
            // list is authoritative, so fall back to it and say so.
            if (cached) { setProjectsLive(true); renderProjects(cached.projects); return; }
            setProjectsLive(false);
            renderProjects(projectsFromCurated());
            return;
        }
        if (!res.ok) throw new Error('GitHub API error: ' + res.status);
        const data = await res.json();
        const projects = enrichProjects(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), projects })); } catch (err) { /* ignore */ }
        setProjectsLive(true);
        renderProjects(projects);
    } catch (error) {
        console.warn('Could not load projects from GitHub; showing the curated list.', error);
        if (cached) { setProjectsLive(true); renderProjects(cached.projects); return; }
        setProjectsLive(false);
        renderProjects(projectsFromCurated());
    }
}

// Scroll reveal.
// NOTE: this block must be defined and initialised BEFORE loadProjects() is called.
// renderProjectGrid() calls observeReveal(), and on the cached path loadProjects()
// renders synchronously (no await), so a null revealObserver here would mean
// project cards never get the .reveal/.in-view classes and silently stay hidden.
let revealObserver = null;

function observeReveal(root) {
    if (!revealObserver) return;
    root.querySelectorAll('.timeline-item, .cert-category, .cert-card, .services-box, .project-card, .testimonial-card, .blog-card, .heading')
        .forEach(el => {
            if (el.classList.contains('reveal')) return;
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
}

if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    observeReveal(document);
}

loadProjects();

// Copy email button (contact section)
const copyEmailBtn = document.getElementById('copy-email');
if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
        const email = 'patrickcabansag5@gmail.com';
        const done = () => {
            copyEmailBtn.textContent = 'Copied!';
            setTimeout(() => { copyEmailBtn.textContent = 'Copy Email'; }, 2000);
        };
        const fallbackCopy = () => {
            const textarea = document.createElement('textarea');
            textarea.value = email;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); done(); } catch (err) { /* ignore */ }
            document.body.removeChild(textarea);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(done).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    });
}

// Skill bars fill animation
//
// Removed along with the proficiency meters themselves. The bar JS existed only
// to animate .skill-fill widths to a self-assigned data-level percentage; with
// the meters gone there is no element left for it to act on, so keeping it would
// have meant dead code querying a selector that matches nothing.

// Dynamic copyright year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Light / dark theme toggle (persisted; defaults to system preference)
(function initTheme() {
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (err) { /* ignore */ }

    const toggle = document.getElementById('theme-toggle');
    const icon = toggle ? toggle.querySelector('i') : null;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const applyThemeColor = (t) => {
        if (themeColor) themeColor.setAttribute('content', t === 'light' ? '#f6f7f9' : '#121212');
    };
    const apply = (t) => {
        root.setAttribute('data-theme', t);
        if (icon) icon.className = t === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        applyThemeColor(t);
        try { localStorage.setItem('theme', t); } catch (err) { /* ignore */ }
    };
    if (icon) icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    applyThemeColor(theme);
    if (toggle) toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        apply(next);
    });
})();

// Hero stats count-up animation when scrolled into view.
//
// Reduced motion is honoured here, in JS, and not only in the stylesheet. Every
// other animation on this page is CSS, where the existing
// `@media (prefers-reduced-motion: reduce)` blocks in index.html can cancel the
// property and the effect stops. This one is not: it writes textContent from a
// rAF loop, so there is no CSS property to cancel and the numbers still swept
// from 0 to their target for 1.5s regardless of the setting. Cancelling
// `animation` does nothing to a script. With the setting on, the observer still
// runs - IntersectionObserver is not motion - but it paints the final value once
// and never starts a frame loop.
//
// data-stat-state is what makes that testable from outside. `animated` marks the
// loop path and `final` the reduced path, so verify_page.js can assert which of
// the two actually ran instead of sampling textContent and hoping to catch it
// mid-sweep. It also gives the reduced path something observable to compare
// against, since "the number looks right immediately" and "the number arrived by
// animating and happened to finish before the assertion" are otherwise
// indistinguishable.
if ('IntersectionObserver' in window) {
    const statEls = document.querySelectorAll('.hero-stat-count');
    if (statEls.length) {
        const statReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                statObserver.unobserve(el);
                const target = parseInt(el.dataset.target || '0', 10);
                const suffix = el.dataset.suffix || '';
                if (statReduced) {
                    el.textContent = target + suffix;
                    el.dataset.statState = 'final';
                    return;
                }
                const duration = 1500;
                const start = performance.now();
                el.dataset.statState = 'animated';
                const tick = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - p, 3);
                    el.textContent = Math.round(target * eased) + suffix;
                    if (p < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        }, { threshold: 0.4 });
        statEls.forEach(el => statObserver.observe(el));
    }
}

// Certification cards: add a per-card "view on LinkedIn" quick link
const CERT_LINK = 'https://www.linkedin.com/in/glenpatrick/details/certifications/';
document.querySelectorAll('.cert-card').forEach(card => {
    if (card.querySelector('.cert-verify-link')) return;
    const top = card.querySelector('.cert-card-top');
    const link = document.createElement('a');
    link.href = CERT_LINK;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'cert-verify-link';
    link.setAttribute('aria-label', 'View certifications on LinkedIn');
    link.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
    if (top) top.appendChild(link);
    else card.appendChild(link);
});
