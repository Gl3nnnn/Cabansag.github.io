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

// Repos to always hide (forks, skill/learning clones, docs-only or sensitive copies)
const EXCLUDED = new Set([
    'Gl3nnnn',
    'Cabansag.github.io',
    'The-MALWARE-Repo',
    'jdeb',
    'DateTimeExtensions',
    'Microsoft-Activation-Scripts-MAS-',
    'skills-reusable-workflows',
    'skills-introduction-to-codeql',
    'skills-code-with-codespaces',
    'skills-change-commit-history',
    'skills-secure-repository-supply-chain',
    'skills-introduction-to-github'
]);

// Manual fallback in case the API request fails or is rate-limited
const FALLBACK_PROJECTS = [
    { name: 'INVENTORY-NEW', description: 'Inventory management web system built with PHP.', language: 'PHP', stars: 0, html_url: 'https://github.com/Gl3nnnn/INVENTORY-NEW' },
    { name: 'accounting', description: 'Accounting and financial web application built with Laravel (Blade views).', language: 'Blade', stars: 0, html_url: 'https://github.com/Gl3nnnn/accounting' },
    { name: 'TechDesk', description: 'IT tech-desk / ticketing web application.', language: 'PHP', stars: 0, html_url: 'https://github.com/Gl3nnnn/TechDesk' },
    { name: 'helpdesk', description: 'Helpdesk support and ticketing system.', language: 'PHP', stars: 0, html_url: 'https://github.com/Gl3nnnn/helpdesk' },
    { name: 'it_inventory', description: 'IT asset inventory system for managing equipment.', language: 'PHP', stars: 0, html_url: 'https://github.com/Gl3nnnn/it_inventory' },
    { name: 'InventoryTBF', description: 'Inventory tracker web app.', language: 'JavaScript', stars: 0, html_url: 'https://github.com/Gl3nnnn/InventoryTBF' },
    { name: 'Issue-Tracker', description: 'Issue and bug tracking web application.', language: 'JavaScript', stars: 0, html_url: 'https://github.com/Gl3nnnn/Issue-Tracker' },
    { name: 'games', description: 'Collection of browser games (live on GitHub Pages).', language: 'JavaScript', stars: 0, html_url: 'https://github.com/Gl3nnnn/games' },
    { name: 'radios', description: 'Radios / streaming-style web app.', language: 'JavaScript', stars: 0, html_url: 'https://github.com/Gl3nnnn/radios' },
    { name: 'SimpleStudentManager', description: 'Simple student management application in Python.', language: 'Python', stars: 0, html_url: 'https://github.com/Gl3nnnn/SimpleStudentManager' },
    { name: 'SimpleAssistant', description: 'Simple personal assistant application in Python.', language: 'Python', stars: 0, html_url: 'https://github.com/Gl3nnnn/SimpleAssistant' },
    { name: 'simplecalculator', description: 'Simple calculator built in Python.', language: 'Python', stars: 0, html_url: 'https://github.com/Gl3nnnn/simplecalculator' }
];

const projectsGrid = document.getElementById('projects-grid');
let activeProjects = [];

function isWorthShowing(repo) {
    if (repo.fork || EXCLUDED.has(repo.name)) return false;
    if (repo.name.startsWith('skills-') || repo.name.startsWith('skills_')) return false;
    return repo.description !== undefined;
}

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

function buildProjectCard(repo) {
    const name = repo.name;
    const description = (repo.description || 'No description available.').slice(0, 160);
    const language = repo.language || 'N/A';
    const stars = repo.stargazers_count || 0;
    const url = repo.html_url || `https://github.com/${GITHUB_USER}/${name}`;

    return `
        <a class="project-card" href="${url}" target="_blank" rel="noopener">
            <div class="project-top">
                <h3>${name}</h3>
                <span class="project-star"><i class="fa-solid fa-star"></i> ${stars}</span>
            </div>
            <p>${description}</p>
            <div class="project-meta">
                <span class="project-lang"><i class="${langIcon(language)}"></i> ${language}</span>
                <span class="project-link">View Project <i class="fa-solid fa-arrow-right"></i></span>
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

    projectsGrid.innerHTML = list.slice(0, 12).map(buildProjectCard).join('');
    observeReveal(projectsGrid);
}

function renderProjects(projects) {
    activeProjects = projects
        .filter(isWorthShowing)
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

    if (activeProjects.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects to show at the moment.</p>`;
        return;
    }

    renderProjectFilters();
    renderProjectGrid();
}

async function loadProjects() {
    try {
        const res = await fetch(GITHUB_API_URL);
        if (!res.ok) throw new Error('GitHub API error: ' + res.status);
        const data = await res.json();
        renderProjects(data);
    } catch (error) {
        console.warn('Could not load projects from GitHub, using fallback list.', error);
        renderProjects(FALLBACK_PROJECTS);
    }
}

loadProjects();

// Scroll reveal (runs immediately; dynamic cards call observeReveal after render)
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