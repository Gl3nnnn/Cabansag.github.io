const EMAILJS = { publicKey: 'qJNRbjDf_u2JtF1Hf', serviceID: 'service_bkjbqcm', templateID: 'template_kkar83i' };
if (typeof emailjs !== "undefined") { try { emailjs.init(EMAILJS.publicKey); } catch (e) {} }
let navbar = document.querySelector('.navbar');
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');
let menuIcon = document.querySelector('#menu-icon');

// Active navigation link on scroll (scroll-spy)
function updateActiveLink() {
    if (!sections.length || !navLinks.length) return;
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

    if (!currentId && sections[0] && scrollY < sections[0].offsetTop) {
        currentId = 'home';
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentId) {
            link.classList.add('active');
        }
    });
}

// One passive scroll listener, throttled with rAF so scroll-spy +
// back-to-top run once per frame instead of per event.
let scrollTicking = false;
function handleScroll() {
    updateActiveLink();
    toggleBackToTop();
    scrollTicking = false;
}
window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(handleScroll);
    }
}, { passive: true });

// Mobile menu toggle (works with the <button> and the legacy <i>)
function setMenuOpen(open) {
    if (!menuIcon || !navbar) return;
    navbar.classList.toggle('active', open);
    const icon = (menuIcon.tagName === 'BUTTON' ? menuIcon.querySelector('i') : menuIcon) || menuIcon;
    icon.classList.toggle('fa-xmark', open);
    if (menuIcon.tagName === 'BUTTON') {
        menuIcon.setAttribute('aria-expanded', String(open));
    }
}

if (menuIcon) {
    menuIcon.addEventListener('click', () => {
        setMenuOpen(!navbar || !navbar.classList.contains('active'));
    });
}

// Close on Escape or tap outside (mobile menu)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navbar && navbar.classList.contains('active')) setMenuOpen(false);
});
document.addEventListener('click', (e) => {
  if (!navbar || !navbar.classList.contains('active')) return;
  if (menuIcon && menuIcon.contains(e.target)) return;
  if (navbar.contains(e.target)) return;
  setMenuOpen(false);
});

// Close mobile menu when a link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        setMenuOpen(false);
    });
});

// Back to top button — clean + progress ring
const backToTop = document.getElementById('back-to-top');

function toggleBackToTop() {
    if (!backToTop) return;
    const y = window.scrollY || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (y / max) * 100));
    try { backToTop.style.setProperty('--btt-p', pct.toFixed(1) + '%'); } catch (e) {}
    if (y > 400) {
        backToTop.classList.add('show');
    } else if (!backToTop.classList.contains('is-scrolling')) {
        backToTop.classList.remove('show');
    }
}

let bttRaf = 0;
let bttCancelled = false;
function cancelBtt(){ bttCancelled = true; if (bttRaf) cancelAnimationFrame(bttRaf); bttRaf = 0; }
function smoothScrollToTop() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { window.scrollTo(0, 0); return Promise.resolve(); }
    const startY = window.scrollY;
    if (startY <= 0) return Promise.resolve();
    const dur = Math.min(800, Math.max(450, 280 + startY * 0.18));
    const t0 = performance.now();
    bttCancelled = false;
    return new Promise((resolve) => {
        function easeInOut(x){ return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; }
        function frame(now){
            if (bttCancelled) { resolve(); return; }
            const p = Math.min(1, (now - t0) / dur);
            window.scrollTo(0, Math.round(startY * (1 - easeInOut(p))));
            if (p < 1) { bttRaf = requestAnimationFrame(frame); }
            else { bttRaf = 0; resolve(); }
        }
        bttRaf = requestAnimationFrame(frame);
    });
}

if (backToTop) {
    try { document.querySelectorAll('.btt-anime-fx').forEach(el => el.remove()); } catch (e) {}
    try { document.body.classList.remove('btt-shaking'); } catch (e) {}
    ['wheel','touchstart','touchmove'].forEach(ev => window.addEventListener(ev, () => { if (backToTop.classList.contains('is-scrolling')) cancelBtt(); }, { passive: true }));
    backToTop.addEventListener('click', () => {
        if (backToTop.classList.contains('is-scrolling')) return;
        backToTop.classList.add('show', 'is-scrolling');
        smoothScrollToTop().then(() => {
            backToTop.classList.remove('is-scrolling');
            toggleBackToTop();
        });
    });
}

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

// Escape text before it reaches innerHTML. Card content mixes curated
// strings with live GitHub API data (repo names, homepage URLs), so every
// interpolated value goes through here.
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildProjectCard(repo) {
    const rawName = repo.name || '';
    const name = escapeHtml(rawName);
    const description = escapeHtml((repo.description || '').slice(0, 160));
    const outcome = escapeHtml((repo.outcome || '').trim());
    const language = escapeHtml(repo.language || 'N/A');
    const stars = Number(repo.stargazers_count) || 0;
    const fallbackUrl = `https://github.com/${GITHUB_USER}/${rawName}`;
    const rawUrl = repo.html_url || fallbackUrl;
    const url = escapeHtml(/^https:\/\//i.test(rawUrl) ? rawUrl : fallbackUrl);
    const rawHome = repo.homepage || '';
    const demo = escapeHtml(/^https:\/\//i.test(rawHome) ? rawHome : '');
    const pushed = escapeHtml(formatPushed(repo.pushed_at));
    const tags = (repo.tags || []).slice(0, 3)
        .map(tag => `<span class="project-tag">${escapeHtml(tag)}</span>`)
        .join('');

    const actions = demo
        ? `<div class="project-actions"><a class="project-btn primary" href="${demo}" target="_blank" rel="noopener noreferrer">Live Demo</a><a class="project-btn ghost" href="${url}" target="_blank" rel="noopener noreferrer">View Code</a></div>`
        : `<div class="project-actions"><a class="project-btn primary" href="${url}" target="_blank" rel="noopener noreferrer">View Code</a></div>`;

    return `
        <article class="project-card">
            <div class="project-top">
                <h3>${name}</h3>
                <span class="project-star"><i class="fa-solid fa-star"></i> ${stars}</span>
            </div>
            <p class="project-desc">${description}</p>
            ${outcome ? `<p class="project-outcome">${outcome}</p>` : ''}
            ${tags ? `<div class="project-tags">${tags}</div>` : ''}
            <div class="project-meta">
                <span class="project-lang"><i class="${langIcon(language)}"></i> ${language}</span>
                ${pushed ? `<span class="project-updated"><i class="fa-regular fa-clock"></i> ${pushed}</span>` : ''}
            </div>
            ${actions}
        </article>
    `;
}

function readStore(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : v; }
    catch (err) { return fallback; }
}
function writeStore(key, val) {
    try { localStorage.setItem(key, val); } catch (err) {}
}

let activeLang = readStore('portfolio_proj_lang', 'All');
let activeSearch = '';
let activeSort = readStore('portfolio_proj_sort', 'curated');

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
    if (!langs.includes(activeLang) && activeLang !== 'All') activeLang = 'All';
    const total = activeProjects.length;
    const options = ['All', ...langs].map(lang => {
        const n = lang === 'All' ? total : (counts[lang] || 0);
        return `<button type="button" class="chip${lang === activeLang ? ' active' : ''}" data-lang="${escapeHtml(lang)}" aria-pressed="${lang === activeLang}">${escapeHtml(lang)} <span class="chip-count">${n}</span></button>`;
    });
    container.innerHTML = options.join('');
    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeLang = chip.dataset.lang;
            writeStore('portfolio_proj_lang', activeLang);
            renderProjectFilters();
            renderProjectGrid();
        });
    });
}

function getFilteredProjects() {
    const q = activeSearch.trim().toLowerCase();
    let list = activeLang === 'All'
        ? activeProjects.slice()
        : activeProjects.filter(repo => (repo.language || 'N/A') === activeLang);
    if (q) {
        list = list.filter(repo => {
            const hay = `${repo.name || ''} ${repo.description || ''} ${(repo.tags || []).join(' ')}`.toLowerCase();
            return hay.includes(q);
        });
    }
    if (activeSort === 'stars') list.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
    else if (activeSort === 'recent') list.sort((a, b) => String(b.pushed_at || '') > String(a.pushed_at || '') ? 1 : -1);
    else if (activeSort === 'az') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return list;
}

function renderFeatured() {
    const box = document.getElementById('projects-featured');
    if (!box) return;
    if (activeSearch || activeLang !== 'All') { box.hidden = true; box.innerHTML = ''; return; }
    const top = activeProjects.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0] || activeProjects[0];
    if (!top) { box.hidden = true; return; }
    const name = escapeHtml(top.name || '');
    const desc = escapeHtml((top.description || '').slice(0, 180));
    const stars = Number(top.stargazers_count) || 0;
    const url = escapeHtml(top.html_url || `https://github.com/${GITHUB_USER}/${top.name}`);
    const rawHome = top.homepage || '';
    const demo = escapeHtml(/^https:\/\//i.test(rawHome) ? rawHome : '');
    box.hidden = false;
    box.innerHTML = `
        <div class="featured-card">
            <div style="flex:1;min-width:0">
                <span class="featured-badge"><i class="fa-solid fa-star"></i> Featured project</span>
                <h3>${name}</h3>
                <p>${desc}</p>
                <p style="font-size:1.25rem;opacity:.75;margin-top:.6rem"><i class="fa-solid fa-star"></i> ${stars} stars &middot; updated ${escapeHtml(formatPushed(top.pushed_at) || 'recently')}</p>
                <div class="project-actions">
                    ${demo ? `<a class="project-btn primary" href="${demo}" target="_blank" rel="noopener noreferrer">Live Demo</a>` : ''}
                    <a class="project-btn ${demo ? 'ghost' : 'primary'}" href="${url}" target="_blank" rel="noopener noreferrer">View Code</a>
                </div>
            </div>
        </div>`;
}

function bindProjectsToolbar() {
    const input = document.getElementById('project-search');
    if (input && !input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => { activeSearch = input.value; renderProjectGrid(); });
    }
    const sort = document.getElementById('project-sort');
    if (sort && !sort.dataset.bound) {
        sort.dataset.bound = '1';
        sort.value = activeSort;
        sort.addEventListener('change', () => {
            activeSort = sort.value;
            writeStore('portfolio_proj_sort', activeSort);
            renderProjectGrid();
        });
    } else if (sort) { sort.value = activeSort; }
}

function renderProjectGrid() {
    if (!projectsGrid) return;
    bindProjectsToolbar();
    const list = getFilteredProjects();

    const counter = document.getElementById('project-results-count');
    if (counter) {
        counter.textContent = list.length === activeProjects.length && !activeSearch
            ? `Showing all ${list.length} projects`
            : `Showing ${list.length} of ${activeProjects.length} projects`;
    }

    renderFeatured();

    if (list.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects match. Try a different search or category.</p>`;
        return;
    }

    projectsGrid.innerHTML = list.map(buildProjectCard).join('');
    observeReveal(projectsGrid);
}

function renderProjects(projects) {

    if (!projectsGrid) return;
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
    const CACHE_KEY = 'portfolio_projects_v5';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    // renderProjects renders whatever array it is handed, so a truncated or
    // hand-mangled cache entry would quietly shrink the section instead of
    // failing. Only trust a cache that still describes the same projects, in
    // the same order, as the curated list - which is also exactly what the
    // enrichProjects() output looks like, since it maps over PROJECTS.
    const isUsable = list =>
        Array.isArray(list) &&
        list.length > 0 &&
        PROJECTS.every(p => list.some(x => x && x.name === p.name));

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
    const byName = names => { const m = new Map(); (names || []).forEach(r => { if (r && r.name) m.set(r.name, r); }); return m; };
    const mergeCached = cachedProjects => {
        const m = byName(cachedProjects);
        return projectsFromCurated().map(base => {
            const hit = m.get(base.name);
            if (!hit) return base;
            return { ...base, stargazers_count: hit.stargazers_count || 0, pushed_at: hit.pushed_at || '', html_url: hit.html_url || base.html_url, homepage: hit.homepage || '' };
        });
    };

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        setProjectsLive(true);
        renderProjects(mergeCached(cached.projects));
        return;
    }
    // Stale-while-revalidate: show stale cache instantly, refresh in background.
    const stale = cached ? mergeCached(cached.projects) : null;
    if (stale) { setProjectsLive(true); renderProjects(stale); }

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
            try{copyEmailBtn.classList.add('is-copied');}catch(e){}
            setTimeout(() => { copyEmailBtn.textContent = 'Copy Email'; try{copyEmailBtn.classList.remove('is-copied');}catch(e){} }, 2000);
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
    let themeSwitching = false;
    if (toggle) toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        if (window.switchThemeAnimated) {
            window.switchThemeAnimated(next, apply, toggle);
        } else {
            apply(next);
        }
    });
    window.__applyTheme = apply;
})();


// Animated light/dark switch modal (matches resume + contact + social modals).
(function themeSwitchModal() {
  let overlay = null, timers = [];
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function ensure() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'theme-switch-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="theme-switch-card" role="status" aria-live="polite">
        <div class="theme-switch-orb"><i class="fa-solid fa-moon"></i><span class="ring"></span></div>
        <h3 class="theme-switch-title">Switching to Dark mode...</h3>
        <p class="theme-switch-sub">Tuning colors for your eyes.</p>
        <div class="theme-switch-bar"><span></span></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    return overlay;
  }
  function hide() {
    clearTimers();
    if (overlay) overlay.classList.remove('show');
  }
  window.switchThemeAnimated = function (next, apply, btn) {
    const ov = ensure();
    const card = ov.querySelector('.theme-switch-card');
    const orb = ov.querySelector('.theme-switch-orb');
    const icon = ov.querySelector('.theme-switch-orb i');
    const title = ov.querySelector('.theme-switch-title');
    const sub = ov.querySelector('.theme-switch-sub');
    const isLight = next === 'light';

    clearTimers();
    card.classList.remove('is-done', 'is-light', 'is-dark');
    card.classList.add(isLight ? 'is-light' : 'is-dark');
    orb.classList.remove('spin-done');
    icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    title.textContent = isLight ? 'Switching to Light mode...' : 'Switching to Dark mode...';
    sub.textContent = isLight ? 'Brightening things up.' : 'Dimming the lights.';
    ov.classList.remove('show');
    void ov.offsetWidth;
    ov.classList.add('show');
    if (btn) { btn.classList.remove('theme-flip'); void btn.offsetWidth; btn.classList.add('theme-flip'); }

    if (REDUCED) {
      try { apply(next); } catch (e) {}
      title.textContent = isLight ? 'Light mode on' : 'Dark mode on';
      sub.textContent = isLight ? 'Bright and clear.' : 'Easy on the eyes.';
      card.classList.add('is-done');
      later(hide, 700);
      return;
    }
    // apply the real theme mid-loading so colors fade under the modal
    later(() => { try { apply(next); } catch (e) {} }, 420);
    later(() => {
      card.classList.add('is-done');
      orb.classList.add('spin-done');
      icon.className = 'fa-solid fa-check';
      title.textContent = isLight ? 'Light mode on!' : 'Dark mode on!';
      sub.textContent = isLight ? 'Bright and clear. Enjoy!' : 'Easy on the eyes. Enjoy!';
    }, 1000);
    later(hide, 1750);
  };
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

/* Services v2: expandable cards + one-time reveal */
(function(){
  var cards = document.querySelectorAll('.svc-card');
  if(!cards.length) return;
  cards.forEach(function(card){
    var btn = card.querySelector('.svc-head');
    var panel = card.querySelector('.svc-details');
    if(!btn || !panel) return;
    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if(open){ panel.hidden = true; card.classList.remove('svc-open'); }
      else { panel.hidden = false; card.classList.add('svc-open'); }
    });
    if(btn.getAttribute('aria-expanded') === 'true') card.classList.add('svc-open');
  });
  try{
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('svc-in'); io.unobserve(e.target); }
      });
    }, {threshold: 0.12});
    cards.forEach(function(c){ c.classList.add('svc-reveal'); io.observe(c); });
    setTimeout(function(){ cards.forEach(function(c){ c.classList.add('svc-in'); }); }, 1600);
  }catch(e){}
})();

/* Resume download modal with progress + success animation.
   Clicking any a[data-force-download] opens the modal, downloads the
   PDF as a blob (so it saves instead of opening), shows live progress,
   then flips to a "Download complete" state with an animated check. */
(function resumeModalSetup() {
  const CSS = `
  .resume-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,6,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .28s ease}
  .resume-modal-overlay.show{opacity:1;pointer-events:auto}
  .resume-modal{width:min(380px,94vw);border-radius:22px;padding:28px 24px 22px;text-align:center;position:relative;overflow:hidden;background:var(--bg-color,#101410);color:var(--text-color,#eef3ee);border:1px solid rgba(27,179,14,.35);box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset;transform:translateY(18px) scale(.96);transition:transform .38s cubic-bezier(.21,1.02,.55,1)}
  .resume-modal-overlay.show .resume-modal{transform:none}
  .resume-modal::before{content:"";position:absolute;inset:-2px;border-radius:24px;padding:2px;background:conic-gradient(from var(--rm-ang,0deg),transparent 0 70%,rgba(27,179,14,.7) 82%,rgba(0,238,137,.9) 88%,transparent 96%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;animation:rm-spin 2.6s linear infinite}
  @property --rm-ang { syntax:'<angle>'; initial-value:0deg; inherits:false; }
  @keyframes rm-spin{to{--rm-ang:360deg}}
  .rm-badge{width:74px;height:74px;margin:2px auto 12px;border-radius:22px;display:grid;place-items:center;font-size:30px;color:#04140a;background:linear-gradient(135deg,#2bea2b,#00ee89);box-shadow:0 10px 30px rgba(27,179,14,.45);animation:rm-float 2.2s ease-in-out infinite}
  @keyframes rm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .rm-title{font-size:2rem;font-weight:700;margin:0 0 4px}
  .rm-sub{font-size:1.35rem;opacity:.75;margin:0 0 16px;min-height:2em}
  .rm-ring-wrap{position:relative;width:132px;height:132px;margin:0 auto 10px}
  .rm-ring{transform:rotate(-90deg)}
  .rm-ring .bg{stroke:rgba(255,255,255,.12)}
  .rm-ring .fg{stroke:url(#rmGrad);stroke-linecap:round;transition:stroke-dashoffset .18s linear;filter:drop-shadow(0 0 8px rgba(27,179,14,.6))}
  .rm-pct{position:absolute;inset:0;display:grid;place-items:center;font-size:2.2rem;font-weight:800;font-variant-numeric:tabular-nums}
  .rm-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:12px 4px 8px}
  .rm-bar > span{display:block;height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,var(--main-color,#1bb30e),#00ee89);box-shadow:0 0 14px rgba(27,179,14,.7);transition:width .18s linear;position:relative}
  .rm-bar > span::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transform:translateX(-100%);animation:rm-shimmer 1.3s infinite}
  @keyframes rm-shimmer{to{transform:translateX(100%)}}
  .rm-dots::after{content:"";animation:rm-dots 1.2s steps(4) infinite}
  @keyframes rm-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
  .rm-meta{font-size:1.25rem;opacity:.65;font-variant-numeric:tabular-nums}
  .rm-check{width:92px;height:92px;margin:4px auto 10px;border-radius:50%;display:grid;place-items:center;background:rgba(27,179,14,.14);border:2px solid rgba(27,179,14,.5);animation:rm-pop .45s cubic-bezier(.21,1.4,.55,1)}
  @keyframes rm-pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
  .rm-check svg{width:52px;height:52px}
  .rm-check path{stroke:#2bea2b;stroke-width:6;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:rm-draw .55s .15s ease forwards}
  @keyframes rm-draw{to{stroke-dashoffset:0}}
  .rm-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .rm-confetti i{position:absolute;top:-12px;width:8px;height:14px;border-radius:2px;opacity:0;animation:rm-fall 1.6s ease-in forwards}
  @keyframes rm-fall{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(240px) rotate(540deg)}}
  .rm-actions{display:flex;gap:10px;justify-content:center;margin-top:16px}
  .rm-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;border-radius:12px;padding:1rem 1.6rem;font-size:1.35rem;cursor:pointer;transition:transform .15s,background .15s}
  .rm-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.1)}
  .rm-btn.primary{background:linear-gradient(135deg,#1bb30e,#00c46a);border-color:transparent;color:#04140a;font-weight:700;box-shadow:0 8px 24px rgba(27,179,14,.4)}
  .rm-close-x{position:absolute;top:10px;right:12px;border:0;background:transparent;color:inherit;font-size:2rem;cursor:pointer;opacity:.6;line-height:1;padding:.4rem}
  .rm-close-x:hover{opacity:1}
  .resume-modal[data-state="done"] .rm-down-only{display:none}
  .resume-modal[data-state="busy"] .rm-done-only{display:none}
  html[data-theme="light"] .resume-modal{background:#fff;color:#0f1a12;border-color:rgba(22,101,52,.3)}
  html[data-theme="light"] .rm-sub,html[data-theme="light"] .rm-meta{opacity:.7}
  html[data-theme="light"] .rm-ring .bg{stroke:rgba(0,0,0,.12)}
  html[data-theme="light"] .rm-bar{background:rgba(0,0,0,.1)}
  @media (prefers-reduced-motion: reduce){.resume-modal-overlay,.resume-modal,.rm-bar>span,.rm-ring .fg{transition:none!important}.resume-modal::before,.rm-badge,.rm-bar>span::after,.rm-confetti{display:none!important}.rm-check path{animation-duration:.01s}}`;

  function ensureCSS() {
    if (document.getElementById('resume-modal-css')) return;
    const s = document.createElement('style');
    s.id = 'resume-modal-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  let overlay, modal, titleEl, subEl, pctEl, fgEl, barEl, metaEl, cancelBtn, closeBtn, openBtn;
  let aborter = null;
  let autoCloseT = null;
  let lastFocus = null;
  const CIRC = 2 * Math.PI * 54;

  function ensureModal() {
    ensureCSS();
    overlay = document.getElementById('resume-modal-overlay');
    if (overlay) {
      modal = overlay.querySelector('.resume-modal');
      titleEl = overlay.querySelector('.rm-title');
      subEl = overlay.querySelector('.rm-sub');
      pctEl = overlay.querySelector('.rm-pct');
      fgEl = overlay.querySelector('.rm-ring .fg');
      barEl = overlay.querySelector('.rm-bar > span');
      metaEl = overlay.querySelector('.rm-meta');
      cancelBtn = overlay.querySelector('[data-rm="cancel"]');
      closeBtn = overlay.querySelector('[data-rm="close"]');
      openBtn = overlay.querySelector('[data-rm="open"]');
      return overlay;
    }
    overlay = document.createElement('div');
    overlay.id = 'resume-modal-overlay';
    overlay.className = 'resume-modal-overlay';
    overlay.innerHTML =
      '<div class="resume-modal" data-state="busy" role="dialog" aria-modal="true" aria-labelledby="rmTitle" aria-describedby="rmSub">' +
      '<button class="rm-close-x" data-rm="close" aria-label="Close">&times;</button>' +
      '<div class="rm-confetti" aria-hidden="true"></div>' +
      '<div class="rm-down-only"><div class="rm-badge"><i class="fa-solid fa-file-pdf"></i></div></div>' +
      '<div class="rm-done-only"><div class="rm-check"><svg viewBox="0 0 52 52"><path d="M10 28 L22 40 L42 14"/></svg></div></div>' +
      '<h3 class="rm-title" id="rmTitle">Downloading resume</h3>' +
      '<p class="rm-sub rm-dots" id="rmSub" aria-live="polite">Preparing</p>' +
      '<div class="rm-ring-wrap rm-down-only"><svg class="rm-ring" width="132" height="132" viewBox="0 0 132 132">' +
      '<defs><linearGradient id="rmGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2bea2b"/><stop offset="1" stop-color="#00ee89"/></linearGradient></defs>' +
      '<circle class="bg" cx="66" cy="66" r="54" fill="none" stroke-width="12"/>' +
      '<circle class="fg" cx="66" cy="66" r="54" fill="none" stroke-width="12" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + CIRC.toFixed(1) + '"/>' +
      '</svg><div class="rm-pct">0%</div></div>' +
      '<div class="rm-bar rm-down-only" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>' +
      '<div class="rm-meta rm-down-only">resume-2026.pdf</div>' +
      '<div class="rm-actions"><button class="rm-btn rm-down-only" data-rm="cancel">Cancel</button>' +
      '<button class="rm-btn rm-done-only" data-rm="open">Open file</button>' +
      '<button class="rm-btn primary" data-rm="close">Done</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    modal = overlay.querySelector('.resume-modal');
    titleEl = overlay.querySelector('.rm-title');
    subEl = overlay.querySelector('.rm-sub');
    pctEl = overlay.querySelector('.rm-pct');
    fgEl = overlay.querySelector('.rm-ring .fg');
    barEl = overlay.querySelector('.rm-bar > span');
    metaEl = overlay.querySelector('.rm-meta');
    cancelBtn = overlay.querySelector('[data-rm="cancel"]');
    closeBtn = overlay.querySelectorAll('[data-rm="close"]');
    openBtn = overlay.querySelector('[data-rm="open"]');
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeModal(); });
    overlay.querySelectorAll('[data-rm="cancel"]').forEach(b => b.addEventListener('click', () => { if (aborter) aborter.abort(); }));
    overlay.querySelectorAll('[data-rm="close"]').forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && overlay.classList.contains('show')) closeModal(); });
    return overlay;
  }

  function fmtKB(n) {
    if (!n || n <= 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function setProgress(pct, loaded, total) {
    pct = Math.max(0, Math.min(100, pct));
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (fgEl) fgEl.style.strokeDashoffset = (CIRC * (1 - pct / 100)).toFixed(1);
    if (barEl) {
      barEl.style.width = pct + '%';
      const bar = barEl.parentElement;
      if (bar) bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    if (metaEl) metaEl.textContent = total ? (fmtKB(loaded) + ' of ' + fmtKB(total)) : (loaded ? fmtKB(loaded) + ' downloaded' : 'resume-2026.pdf');
  }

  function openModal(fileName) {
    ensureModal();
    lastFocus = document.activeElement;
    if (autoCloseT) { clearTimeout(autoCloseT); autoCloseT = null; }
    modal.dataset.state = 'busy';
    titleEl.textContent = 'Downloading resume';
    subEl.textContent = 'Preparing';
    subEl.classList.add('rm-dots');
    if (metaEl) metaEl.textContent = fileName || 'resume-2026.pdf';
    setProgress(0, 0, 0);
    const conf = overlay.querySelector('.rm-confetti');
    if (conf) conf.innerHTML = '';
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    const c = overlay.querySelector('[data-rm="cancel"]');
    if (c) c.focus();
  }

  function showComplete(fileName, blobUrl) {
    modal.dataset.state = 'done';
    titleEl.textContent = 'Download complete';
    subEl.classList.remove('rm-dots');
    subEl.textContent = (fileName || 'Resume') + ' saved to your downloads.';
    if (openBtn) openBtn.onclick = () => { if (blobUrl) window.open(blobUrl, '_blank', 'noopener'); };
    burstConfetti();
    const done = overlay.querySelector('.rm-actions .primary');
    if (done) done.focus();
    autoCloseT = setTimeout(closeModal, 6000);
  }

  function showError(msg, url) {
    modal.dataset.state = 'done';
    titleEl.textContent = 'Download stuck';
    subEl.classList.remove('rm-dots');
    subEl.textContent = msg || 'Could not fetch the file. Try opening it instead.';
    if (openBtn) openBtn.onclick = () => window.open(url, '_blank', 'noopener');
    const done = overlay.querySelector('.rm-actions .primary');
    if (done) done.focus();
  }

  function burstConfetti() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box = overlay.querySelector('.rm-confetti');
      if (!box) return;
      box.innerHTML = '';
      const colors = ['#2bea2b', '#00ee89', '#ffd23f', '#4cc9f0', '#ff5d8f', '#ffffff'];
      for (let i = 0; i < 26; i++) {
        const s = document.createElement('i');
        s.style.left = (4 + Math.random() * 92) + '%';
        s.style.background = colors[i % colors.length];
        s.style.animationDelay = (Math.random() * 0.5).toFixed(2) + 's';
        s.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
        box.appendChild(s);
      }
      setTimeout(() => { if (box) box.innerHTML = ''; }, 2200);
    } catch (e) {}
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    if (aborter) { try { aborter.abort(); } catch (e) {} aborter = null; }
    if (autoCloseT) { clearTimeout(autoCloseT); autoCloseT = null; }
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function saveBlob(blob, fileName) {
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return blobUrl;
  }

  async function downloadWithProgress(url, fileName) {
    aborter = new AbortController();
    openModal(fileName);
    try {
      const res = await fetch(url, { credentials: 'same-origin', signal: aborter.signal });
      if (!res.ok) throw new Error('fetch failed');
      const total = Number(res.headers.get('content-length')) || 0;
      if (!res.body || !res.body.getReader) {
        setProgress(40, 0, 0);
        subEl.textContent = 'Downloading';
        const blob = await res.blob();
        setProgress(90, blob.size, total);
        const blobUrl = saveBlob(blob, fileName);
        setProgress(100, blob.size, total);
        await new Promise(r => setTimeout(r, 450));
        showComplete(fileName, blobUrl);
        return;
      }
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      subEl.textContent = 'Downloading';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        setProgress(total ? (loaded / total) * 100 : Math.min(95, loaded / 8000), loaded, total);
      }
      const blob = new Blob(chunks, { type: 'application/pdf' });
      setProgress(100, loaded || blob.size, total || loaded);
      const blobUrl = saveBlob(blob, fileName);
      await new Promise(r => setTimeout(r, 500));
      showComplete(fileName, blobUrl);
    } catch (err) {
      if (err && err.name === 'AbortError') { closeModal(); return; }
      try {
        const fb = document.createElement('a');
        fb.href = url;
        fb.download = fileName;
        fb.rel = 'noopener';
        document.body.appendChild(fb);
        fb.click();
        fb.remove();
        showComplete(fileName, null);
      } catch (e2) {
        showError('Could not fetch the file.', url);
      }
    } finally {
      aborter = null;
    }
  }

  // Force resume PDF to download instead of opening in browser.
  // The `download` attribute is only a hint and browsers with a built-in
  // PDF viewer (or Safari on iPhone) still open it. Fetching as a blob
  // and saving via object URL forces a real download on same-origin.
  document.addEventListener('click', (e) => {
    const link = e.target && e.target.closest ? e.target.closest('a[data-force-download]') : null;
    if (!link) return;
    const url = link.getAttribute('href');
    if (!url) return;
    // Let right-click / ctrl+click / middle-click open normally.
    if (e.ctrlKey || e.metaKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    const fileName = link.getAttribute('download') || 'RESUME_Cabansag_GlennPatrick.pdf';
    downloadWithProgress(url, fileName);
  });
})();

/* Contact send modal: sending / success / error with animation.
   Mirrors the resume modal visuals. Exposes window.showContactModal(type, msg).
   The inline contact-form handler in index.html calls it; direct calls are safe. */
(function contactModalSetup() {
  const CSS = `
  .contact-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,6,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .28s ease}
  .contact-modal-overlay.show{opacity:1;pointer-events:auto}
  .contact-modal{width:min(380px,94vw);border-radius:22px;padding:28px 24px 22px;text-align:center;position:relative;overflow:hidden;background:var(--bg-color,#101410);color:var(--text-color,#eef3ee);border:1px solid rgba(27,179,14,.35);box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset;transform:translateY(18px) scale(.96);transition:transform .38s cubic-bezier(.21,1.02,.55,1)}
  .contact-modal-overlay.show .contact-modal{transform:none}
  .contact-modal::before{content:"";position:absolute;inset:-2px;border-radius:24px;padding:2px;background:conic-gradient(from var(--cm-ang,0deg),transparent 0 70%,rgba(27,179,14,.7) 82%,rgba(0,238,137,.9) 88%,transparent 96%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;animation:cm-spin 2.6s linear infinite}
  @property --cm-ang { syntax:'<angle>'; initial-value:0deg; inherits:false; }
  @keyframes cm-spin{to{--cm-ang:360deg}}
  .cm-icon{width:92px;height:92px;margin:4px auto 12px;border-radius:50%;display:grid;place-items:center;position:relative}
  .cm-icon svg{width:46px;height:46px}
  .contact-modal[data-state="sending"] .cm-icon{background:rgba(27,179,14,.14);border:2px solid rgba(27,179,14,.5)}
  .contact-modal[data-state="sending"] .cm-icon .cm-plane{display:block;animation:cm-float 1.8s ease-in-out infinite}
  .cm-plane{font-size:38px;line-height:1}
  @keyframes cm-float{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-8px) rotate(8deg)}}
  .cm-ring{position:absolute;inset:-8px;border-radius:50%;border:3px solid transparent;border-top-color:#2bea2b;border-right-color:rgba(0,238,137,.5);animation:cm-rot 1s linear infinite}
  @keyframes cm-rot{to{transform:rotate(360deg)}}
  .contact-modal[data-state="success"] .cm-icon{background:rgba(27,179,14,.14);border:2px solid rgba(27,179,14,.5);animation:cm-pop .45s cubic-bezier(.21,1.4,.55,1)}
  @keyframes cm-pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
  .contact-modal[data-state="success"] .cm-check path{stroke:#2bea2b;stroke-width:6;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:cm-draw .55s .15s ease forwards}
  @keyframes cm-draw{to{stroke-dashoffset:0}}
  .contact-modal[data-state="error"] .cm-icon{background:rgba(255,70,70,.12);border:2px solid rgba(255,70,70,.55);animation:cm-shake .45s ease}
  @keyframes cm-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
  .contact-modal[data-state="error"] .cm-cross path{stroke:#ff5d5d;stroke-width:6;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:cm-draw .45s .1s ease forwards}
  .contact-modal[data-state="sending"] .cm-done-only{display:none}
  .contact-modal[data-state="sending"] .cm-err-only{display:none}
  .contact-modal[data-state="success"] .cm-send-only{display:none}
  .contact-modal[data-state="success"] .cm-err-only{display:none}
  .contact-modal[data-state="error"] .cm-send-only{display:none}
  .contact-modal[data-state="error"] .cm-done-only.cm-success-only{display:none}
  .cm-title{font-size:2rem;font-weight:700;margin:0 0 4px}
  .cm-sub{font-size:1.35rem;opacity:.78;margin:0 0 14px;min-height:2em;line-height:1.5}
  .cm-dots::after{content:"";animation:cm-dots 1.2s steps(4) infinite}
  @keyframes cm-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
  .cm-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:10px 4px 6px}
  .cm-bar>span{display:block;height:100%;width:30%;border-radius:99px;background:linear-gradient(90deg,var(--main-color,#1bb30e),#00ee89);box-shadow:0 0 14px rgba(27,179,14,.7);animation:cm-slide 1.1s ease-in-out infinite alternate}
  @keyframes cm-slide{from{margin-left:0;width:30%}to{margin-left:70%;width:30%}}
  .contact-modal[data-state="success"] .cm-bar,.contact-modal[data-state="error"] .cm-bar{display:none}
  .cm-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .cm-confetti i{position:absolute;top:-12px;width:8px;height:14px;border-radius:2px;opacity:0;animation:cm-fall 1.6s ease-in forwards}
  @keyframes cm-fall{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(240px) rotate(540deg)}}
  .cm-actions{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}
  .cm-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;border-radius:12px;padding:1rem 1.6rem;font-size:1.35rem;cursor:pointer}
  .cm-btn:hover,.cm-btn:active{border-color:rgba(27,179,14,.6);background:rgba(27,179,14,.18);color:inherit}
  .cm-btn.primary:hover,.cm-btn.primary:active{background:linear-gradient(135deg,#1bb30e,#00c46a);color:#04140a}
  .cm-btn.primary{background:linear-gradient(135deg,#1bb30e,#00c46a);border-color:transparent;color:#04140a;font-weight:700}
  html[data-theme="light"] .contact-modal{background:#fff;color:#0f1a12;border-color:rgba(22,101,52,.3)}
  html[data-theme="light"] .cm-bar{background:rgba(0,0,0,.1)}
  @media (prefers-reduced-motion: reduce){.contact-modal-overlay,.contact-modal{transition:none!important}.contact-modal::before,.cm-plane,.cm-ring,.cm-bar>span,.cm-confetti{display:none!important}}
  `;

  function ensureCSS(){
    if(document.getElementById('contact-modal-css')) return;
    const s=document.createElement('style');
    s.id='contact-modal-css';
    s.textContent=CSS;
    document.head.appendChild(s);
  }

  let overlay, modal, titleEl, subEl, doneBtn, mailBtn, closeX;
  let lastFocus=null, autoT=null;

  function build(){
    if(overlay) return;
    ensureCSS();
    overlay=document.createElement('div');
    overlay.className='contact-modal-overlay';
    overlay.id='contact-modal-overlay';
    overlay.hidden=true;
    overlay.innerHTML=`
      <div class="contact-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" data-state="sending">
        <button class="rm-close-x cm-close-x" type="button" aria-label="Close">\u00d7</button>
        <div class="cm-confetti" aria-hidden="true"></div>
        <div class="cm-icon" aria-hidden="true">
          <span class="cm-plane cm-send-only">\u2709\ufe0f</span>
          <svg class="cm-check cm-done-only cm-success-only" viewBox="0 0 52 52" style="display:none"><path d="M10 27 L22 39 L42 15"/></svg>
          <svg class="cm-cross cm-err-only" viewBox="0 0 52 52" style="display:none"><path d="M14 14 L38 38 M38 14 L14 38"/></svg>
          <span class="cm-ring cm-send-only"></span>
        </div>
        <h3 class="cm-title" id="cm-title">Sending</h3>
        <p class="cm-sub" id="cm-sub">Please wait</p>
        <div class="cm-bar cm-send-only" aria-hidden="true"><span></span></div>
        <div class="cm-actions">
          <button class="cm-btn primary cm-close-btn" type="button">Done</button>
          <button class="cm-btn cm-mail-btn cm-err-only" type="button" style="display:none">Copy email</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    modal=overlay.querySelector('.contact-modal');
    titleEl=overlay.querySelector('#cm-title');
    subEl=overlay.querySelector('#cm-sub');
    doneBtn=overlay.querySelector('.cm-close-btn');
    mailBtn=overlay.querySelector('.cm-mail-btn');
    closeX=overlay.querySelector('.cm-close-x');
    const close=()=>hide();
    doneBtn.addEventListener('click', close);
    closeX.addEventListener('click', close);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && overlay && !overlay.hidden && overlay.classList.contains('show')) close(); });
    if(mailBtn) mailBtn.addEventListener('click', ()=>{
      try{
        const em='patrickcabansag5@gmail.com';
        if(navigator.clipboard) navigator.clipboard.writeText(em);
        mailBtn.textContent='Copied!';
        try{mailBtn.classList.add('is-copied');}catch(e){}
        setTimeout(()=>{ mailBtn.textContent='Copy email'; try{mailBtn.classList.remove('is-copied');}catch(e){} },1800);
      }catch(e){}
    });
  }

  function syncIcons(state){
    if(!overlay) return;
    const show=(sel,on)=>{ overlay.querySelectorAll(sel).forEach(el=>{ el.style.display=on?'':'none'; }); };
    if(state==='sending'){ show('.cm-send-only',true); show('.cm-success-only',false); show('.cm-err-only',false); }
    else if(state==='success'){ show('.cm-send-only',false); show('.cm-success-only',true); show('.cm-err-only',false); }
    else { show('.cm-send-only',false); show('.cm-success-only',false); show('.cm-err-only',true); }
  }

  function burst(){
    try{
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box=overlay.querySelector('.cm-confetti');
      if(!box) return;
      box.innerHTML='';
      const colors=['#2bea2b','#00ee89','#ffd23f','#4cc9f0','#ff5d8f','#ffffff'];
      for(let i=0;i<26;i++){
        const s=document.createElement('i');
        s.style.left=(4+Math.random()*92)+'%';
        s.style.background=colors[i%colors.length];
        s.style.animationDelay=(Math.random()*0.5).toFixed(2)+'s';
        box.appendChild(s);
      }
      setTimeout(()=>{ if(box) box.innerHTML=''; },2200);
    }catch(e){}
  }

  function show(type, msg){
    build();
    if(autoT){ clearTimeout(autoT); autoT=null; }
    lastFocus=document.activeElement;
    const state=(type==='success')?'success':(type==='error')?'error':'sending';
    modal.dataset.state=state;
    syncIcons(state);
    subEl.classList.remove('cm-dots');
    if(state==='sending'){
      titleEl.textContent='Sending your message';
      subEl.textContent=(msg||'Talking to the mail server')+' ';
      subEl.classList.add('cm-dots');
      doneBtn.textContent='Please wait…';
      doneBtn.disabled=true;
    } else if(state==='success'){
      titleEl.textContent='Message sent!';
      subEl.textContent=msg||'Thanks! I usually reply within a day.';
      doneBtn.textContent='Done';
      doneBtn.disabled=false;
      burst();
      autoT=setTimeout(()=>hide(), 4500);
    } else {
      titleEl.textContent='Could not send';
      subEl.textContent=msg||'Please email me directly at patrickcabansag5@gmail.com.';
      doneBtn.textContent='Close';
      doneBtn.disabled=false;
    }
    overlay.hidden=false;
    requestAnimationFrame(()=>requestAnimationFrame(()=>overlay.classList.add('show')));
    document.body.style.overflow='hidden';
    setTimeout(()=>{ try{ doneBtn.focus(); }catch(e){} },80);
  }

  function hide(){
    if(!overlay||overlay.hidden) return;
    overlay.classList.remove('show');
    document.body.style.overflow='';
    if(autoT){ clearTimeout(autoT); autoT=null; }
    setTimeout(()=>{ overlay.hidden=true; },280);
    if(lastFocus&&lastFocus.focus){ try{ lastFocus.focus(); }catch(e){} }
  }

  window.showContactModal=show;
  window.hideContactModal=hide;
})();

// Home hero: fade-up once + second copy-email chip
(function(){var b=document.body;if(b){requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.add('home-loaded');});});}var btn=document.getElementById('copy-email-home');if(btn){btn.addEventListener('click',function(){var email='patrickcabansag5@gmail.com';var done=function(){try{btn.classList.add('is-copied');}catch(e){}var sp=btn.querySelector('span');if(sp){sp.textContent='Copied!';setTimeout(function(){sp.textContent=email;try{btn.classList.remove('is-copied');}catch(e){}},2000);}};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(email).then(done).catch(function(){done();});}else{done();}});}})();

/* Email modal: copy-first popup for mailto links.
   Why: on PCs with no default mail app, clicking mailto opens a
   browser/app chooser that does nothing. This intercepts mailto
   clicks and offers Copy + Gmail + Outlook + mail-app options. */
(function emailModalSetup() {
  const EMAIL = 'patrickcabansag5@gmail.com';
  const CSS = `
  .email-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,6,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .28s ease}
  .email-modal-overlay.show{opacity:1;pointer-events:auto}
  .email-modal{width:min(400px,94vw);border-radius:22px;padding:28px 24px 22px;text-align:center;position:relative;overflow:hidden;background:var(--bg-color,#101410);color:var(--text-color,#eef3ee);border:1px solid rgba(27,179,14,.35);box-shadow:0 24px 80px rgba(0,0,0,.55);transform:translateY(14px) scale(.97);transition:transform .28s ease}
  .email-modal-overlay.show .email-modal{transform:none}
  .email-modal-icon{width:64px;height:64px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;background:rgba(27,179,14,.14);border:1px solid rgba(27,179,14,.4)}
  .email-modal h3{margin:0 0 6px;font-size:20px}
  .email-modal p{margin:0 0 14px;font-size:14px;opacity:.85;line-height:1.5}
  .email-addr{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 12px;font-size:14px;margin-bottom:14px;word-break:break-all}
  .email-addr button{flex:none;border:0;border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer;background:#1bb30e;color:#fff}
  .email-addr button.is-copied{background:#fff;color:#1bb30e}
  .email-actions{display:grid;gap:10px}
  .email-actions a{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:12px;padding:12px;font-weight:700;font-size:14px;border:1px solid rgba(255,255,255,.16);color:inherit;background:rgba(255,255,255,.05)}
  .email-actions a:hover{border-color:#1bb30e}
  .email-actions a.primary{background:#1bb30e;border-color:#1bb30e;color:#fff}
  .email-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer;opacity:.7;line-height:1}
  .email-close:hover{opacity:1}`;
  try {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) {}
  let overlay = null;
  function close() {
    if (overlay) overlay.classList.remove('show');
  }
  function copyText(txt, btn) {
    const done = () => {
      if (btn) {
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        try { btn.classList.add('is-copied'); } catch (e) {}
        setTimeout(() => { btn.textContent = old; try { btn.classList.remove('is-copied'); } catch (e2) {} }, 2000);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(done);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
      done();
    }
  }
  function openModal(email, mailtoHref) {
    const to = email || EMAIL;
    const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to);
    const outlook = 'https://outlook.live.com/mail/deeplink/compose?to=' + encodeURIComponent(to);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'email-modal-overlay';
      overlay.innerHTML = `
        <div class="email-modal" role="dialog" aria-modal="true" aria-label="Send email">
          <button type="button" class="email-close" aria-label="Close">&times;</button>
          <div class="email-modal-icon">✉️</div>
          <h3>Send me an email</h3>
          <p>No mail app? No problem — copy my address or open it in Gmail.</p>
          <div class="email-addr"><span class="email-text"></span><button type="button" class="email-copy">Copy</button></div>
          <div class="email-actions">
            <a class="primary email-gmail" target="_blank" rel="noopener">Open in Gmail</a>
            <a class="email-outlook" target="_blank" rel="noopener">Open in Outlook</a>
            <a class="email-app">Use my mail app</a>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('.email-close').addEventListener('click', close);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    overlay.querySelector('.email-text').textContent = to;
    overlay.querySelector('.email-gmail').href = gmail;
    overlay.querySelector('.email-outlook').href = outlook;
    const appLink = overlay.querySelector('.email-app');
    appLink.href = mailtoHref || ('mailto:' + to);
    appLink.onclick = () => { setTimeout(close, 300); };
    const copyBtn = overlay.querySelector('.email-copy');
    copyBtn.onclick = () => copyText(to, copyBtn);
    overlay.classList.add('show');
    try { overlay.querySelector('.email-close').focus(); } catch (e) {}
  }
  window.showEmailModal = openModal;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a) return;
    if (a.closest && a.closest('.email-modal-overlay')) return;
    // Let the plain text contact email behave as a normal link on right-click/copy,
    // but left-click opens the helper modal so visitors without a mail app are not stuck.
    if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    const href = a.getAttribute('href') || '';
    const to = href.replace(/^mailto:/i, '').split('?')[0] || EMAIL;
    openModal(to, href);
  });
})();

/* Social confirm modal: LinkedIn / GitHub / Facebook -> "open in new tab?" with spring animation */
(function () {
  const BRANDS = [
    { key: 'linkedin', match: 'linkedin.com/in/glenpatrick', name: 'LinkedIn', color: '#0A66C2', icon: 'fa-brands fa-linkedin', desc: 'My work profile and certifications' },
    { key: 'github', match: 'github.com/Gl3nnnn', name: 'GitHub', color: '#24292f', icon: 'fa-brands fa-github', desc: 'My code and projects' },
    { key: 'facebook', match: 'facebook.com/Gl3nQt', name: 'Facebook', color: '#1877F2', icon: 'fa-brands fa-facebook', desc: 'Say hi and follow along' }
  ];
  const CSS = `
  .social-modal-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,8,12,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;visibility:hidden;transition:opacity .28s ease,visibility 0s linear .28s}
  .social-modal-overlay.show{opacity:1;visibility:visible;transition:opacity .28s ease}
  .social-modal{position:relative;width:min(380px,100%);border-radius:20px;padding:28px 24px 22px;text-align:center;color:inherit;background:var(--bg-color,#1a1a1a);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06) inset;transform:translateY(18px) scale(.94);opacity:0;transition:transform .38s cubic-bezier(.34,1.56,.64,1),opacity .28s ease}
  .social-modal-overlay.show .social-modal{transform:translateY(0) scale(1);opacity:1}
  .social-modal-icon{width:72px;height:72px;margin:0 auto 14px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.35);transform:scale(.6);opacity:0}
  .social-modal-overlay.show .social-modal-icon{animation:socialIconPop .55s cubic-bezier(.34,1.56,.64,1) .08s forwards}
  @keyframes socialIconPop{0%{transform:scale(.6) rotate(-10deg);opacity:0}60%{transform:scale(1.12) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  .social-modal h3{margin:0 0 6px;font-size:20px;font-weight:700}
  .social-modal p.sub{margin:0 0 14px;font-size:13.5px;opacity:.75;line-height:1.5}
  .social-url{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 12px;font-size:12.5px;margin-bottom:18px;word-break:break-all;opacity:0;transform:translateY(8px)}
  .social-modal-overlay.show .social-url{animation:socialFadeUp .45s ease .18s forwards}
  .social-url i{opacity:.6}
  @keyframes socialFadeUp{to{opacity:1;transform:translateY(0)}}
  .social-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .social-btn{border-radius:13px;padding:13px 10px;font-weight:700;font-size:14px;cursor:pointer;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;transition:transform .15s ease,border-color .2s,background .2s}
  .social-btn:hover{transform:translateY(-1px)}
  .social-btn:active{transform:translateY(0) scale(.98)}
  .social-btn.primary{color:#fff;border:0;position:relative;overflow:hidden}
  .social-btn.primary::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:socialShine 2.8s ease infinite}
  @keyframes socialShine{0%{left:-60%}55%{left:130%}100%{left:130%}}
  .social-btn.primary.is-opening{pointer-events:none;opacity:.85}
  .social-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer;opacity:.6;line-height:1}
  .social-close:hover{opacity:1}
  .social-hint{margin:12px 0 0;font-size:11.5px;opacity:.55}
  [data-theme="light"] .social-modal{background:#fff;border-color:rgba(0,0,0,.08)}
  [data-theme="light"] .social-url{background:#f3f4f6;border-color:rgba(0,0,0,.08)}
  [data-theme="light"] .social-btn{background:#f3f4f6;border-color:rgba(0,0,0,.08)}
  @media (prefers-reduced-motion:reduce){.social-modal-overlay,.social-modal,.social-modal-icon,.social-url{transition:none!important;animation:none!important;transform:none!important;opacity:1!important}.social-btn.primary::after{display:none}}`;
    try {
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
    let overlay = null, pendingUrl = '', pendingName = '';
    function ensure() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.className = 'social-modal-overlay';
      overlay.innerHTML = `
        <div class="social-modal" role="dialog" aria-modal="true" aria-labelledby="social-modal-title">
          <button type="button" class="social-close" aria-label="Close">&times;</button>
          <div class="social-modal-icon"><i></i></div>
          <h3 id="social-modal-title">Open LinkedIn?</h3>
          <p class="sub">You are about to open this in a <strong>new tab</strong>.</p>
          <div class="social-url"><i class="fa-solid fa-link"></i><span></span></div>
          <div class="social-actions">
            <button type="button" class="social-btn ghost">Stay here</button>
            <button type="button" class="social-btn primary">Open <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:6px;font-size:12px"></i></button>
          </div>
          <p class="social-hint">Right-click or long-press the icon to copy the link instead.</p>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) hideSocialModal(); });
      overlay.querySelector('.social-close').addEventListener('click', hideSocialModal);
      overlay.querySelector('.social-btn.ghost').addEventListener('click', hideSocialModal);
      overlay.querySelector('.social-btn.primary').addEventListener('click', confirmOpen);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSocialModal(); });
      return overlay;
    }
    function openSocialModal(brand, url) {
      pendingUrl = url; pendingName = brand.name;
      const ov = ensure();
      const iconBox = ov.querySelector('.social-modal-icon');
      const iconEl = ov.querySelector('.social-modal-icon i');
      iconBox.style.background = brand.color;
      iconEl.className = brand.icon;
      ov.querySelector('#social-modal-title').textContent = 'Open ' + brand.name + '?';
      ov.querySelector('.sub').innerHTML = 'You are about to open <strong>' + brand.name + '</strong> in a <strong>new tab</strong>.<br>' + brand.desc + '.';
      let clean = url.replace(/^https?:\/\/(www\.)?/, '');
      ov.querySelector('.social-url span').textContent = clean;
      const primary = ov.querySelector('.primary');
      primary.style.background = brand.color;
      primary.classList.remove('is-opening');
      primary.innerHTML = 'Open <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:6px;font-size:12px"></i>';
      // restart entrance animation
      ov.classList.remove('show');
      void ov.offsetWidth;
      ov.classList.add('show');
      try { ov.querySelector('.social-btn.ghost').focus(); } catch (e) {}
    }
    function confirmOpen() {
      if (!pendingUrl) return;
      const ov = ensure();
      const primary = ov.querySelector('.primary');
      primary.classList.add('is-opening');
      primary.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Opening...';
      const url = pendingUrl;
      setTimeout(() => {
        try { window.open(url, '_blank', 'noopener'); } catch (e) { window.location.href = url; }
        primary.innerHTML = '<i class="fa-solid fa-check"></i> Opened!';
        setTimeout(hideSocialModal, 650);
      }, 450);
    }
    function hideSocialModal() { if (overlay) overlay.classList.remove('show'); }
    window.showSocialModal = openSocialModal;
    window.hideSocialModal = hideSocialModal;
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href*="linkedin.com"],a[href*="github.com/Gl3nnnn"],a[href*="facebook.com/Gl3nQt"]') : null;
      if (!a) return;
      // only social icon buttons (home / contact / footer), not project cards or text links
      const isSocialBtn = a.closest && (a.closest('.social-icons') || a.closest('.contact-socials') || a.closest('.social') || a.closest('footer'));
      // blog post footers have text links - let those open normally
      if (a.closest && a.closest('.post-footer')) return;
      if (!isSocialBtn) {
        // footer wrapper is broad, so double-check it really is a brand icon link
        if (!(a.getAttribute('aria-label') && /linkedin|github|facebook/i.test(a.getAttribute('aria-label')))) return;
      }
      if (a.closest && a.closest('.social-modal-overlay')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return;
      e.preventDefault();
      const href = a.getAttribute('href') || '';
      const brand = BRANDS.find(b => href.includes(b.match)) || { name: 'link', color: '#1bb30e', icon: 'fa-solid fa-link', desc: 'External link' };
      openSocialModal(brand, href);
    });
  })();

