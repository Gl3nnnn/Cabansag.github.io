let menuIcon = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

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
const PROJECTS = [
    { name: 'INVENTORY-NEW', language: 'PHP', description: 'Inventory management web system for tracking stock, suppliers and item movement in a small business.' },
    { name: 'accounting', language: 'Blade', description: 'Accounting and financial web application built with Laravel and Blade templating.' },
    { name: 'TechDesk', language: 'PHP', description: 'IT tech-desk ticketing app for logging, assigning and tracking technical support requests.' },
    { name: 'helpdesk', language: 'PHP', description: 'Helpdesk support system built to manage end-user tickets and recurring IT issues.' },
    { name: 'it_inventory', language: 'PHP', description: 'IT asset inventory system for recording hardware, assignments and equipment lifecycle.' },
    { name: 'InventoryTBF', language: 'JavaScript', description: 'Browser-based inventory tracker for monitoring stock levels and item records.' },
    { name: 'Issue-Tracker', language: 'JavaScript', description: 'Issue and bug tracking web application for capturing, triaging and managing defects.' },
    { name: 'games', language: 'JavaScript', description: 'Collection of small browser games built with vanilla JavaScript.' },
    { name: 'radios', language: 'JavaScript', description: 'Streaming-style radio player web app built with JavaScript.' },
    { name: 'SimpleStudentManager', language: 'Python', description: 'Command-line student management app for storing, searching and updating student records.' },
    { name: 'SimpleAssistant', language: 'Python', description: 'Desktop assistant application with task helpers and lightweight automation.' },
    { name: 'simplecalculator', language: 'Python', description: 'Desktop calculator application with a clean graphical interface.' }
];

// Rendered when nothing has loaded yet and before enrichment completes.
function projectsFromCurated() {
    return PROJECTS.map(p => ({
        name: p.name,
        language: p.language,
        description: p.description,
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
    const language = repo.language || 'N/A';
    const stars = repo.stargazers_count || 0;
    const url = repo.html_url || `https://github.com/${GITHUB_USER}/${name}`;
    const hasDemo = Boolean(repo.homepage);
    const ctaLabel = hasDemo ? 'Live Demo' : 'View Project';
    const ctaIcon = hasDemo ? 'fa-solid fa-rocket' : 'fa-solid fa-arrow-right';
    const pushed = formatPushed(repo.pushed_at);

    return `
        <a class="project-card" href="${url}" target="_blank" rel="noopener">
            <div class="project-top">
                <h3>${name}</h3>
                <span class="project-star"><i class="fa-solid fa-star"></i> ${stars}</span>
            </div>
            <p>${description}</p>
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
    container.innerHTML = ['All', ...langs].map(lang =>
        `<button type="button" class="chip${lang === activeLang ? ' active' : ''}" data-lang="${lang}">${lang}</button>`
    ).join('');
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

    const statProj = document.getElementById('hero-stat-projects');
    if (statProj) statProj.textContent = activeProjects.length + '+';

    if (activeProjects.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects to show at the moment.</p>`;
        return;
    }

    renderProjectFilters();
    renderProjectGrid();
}

async function loadProjects() {
    const CACHE_KEY = 'portfolio_projects_v2';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    const readCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.projects)) return null;
            return parsed;
        } catch (err) { return null; }
    };

    const cached = readCache();

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        renderProjects(cached.projects);
        return;
    }

    try {
        const res = await fetch(GITHUB_API_URL);
        if (res.status === 403 || res.status === 429) {
            // A rate limit is not a reason to blank the section - the curated
            // list is authoritative, so fall back to it and say so quietly.
            if (cached) { renderProjects(cached.projects); return; }
            renderProjects(projectsFromCurated());
            return;
        }
        if (!res.ok) throw new Error('GitHub API error: ' + res.status);
        const data = await res.json();
        const projects = enrichProjects(data);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), projects })); } catch (err) { /* ignore */ }
        renderProjects(projects);
    } catch (error) {
        console.warn('Could not load projects from GitHub; showing the curated list.', error);
        if (cached) { renderProjects(cached.projects); return; }
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
const skillBars = document.querySelectorAll('.skill-bar');
if (skillBars.length && 'IntersectionObserver' in window) {
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const fill = entry.target.querySelector('.skill-fill');
                if (fill) fill.style.width = (fill.dataset.level || 80) + '%';
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    skillBars.forEach(bar => skillObserver.observe(bar));
}

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

// Hero stats count-up animation when scrolled into view
if ('IntersectionObserver' in window) {
    const statEls = document.querySelectorAll('.hero-stat-count');
    if (statEls.length) {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                statObserver.unobserve(el);
                const target = parseInt(el.dataset.target || '0', 10);
                const suffix = el.dataset.suffix || '';
                const duration = 1500;
                const start = performance.now();
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