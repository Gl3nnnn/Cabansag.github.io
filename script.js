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
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
};

// Close mobile menu when a link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        menuIcon.classList.remove('bx-x');
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
        <div class="project-card" onclick="window.open('${url}', '_blank')">
            <div class="project-top">
                <h3>${name}</h3>
                <span class="project-star"><i class="fa-solid fa-star"></i> ${stars}</span>
            </div>
            <p>${description}</p>
            <div class="project-meta">
                <span class="project-lang"><i class="${langIcon(language)}"></i> ${language}</span>
                <a href="${url}" target="_blank" class="project-link">View Project</a>
            </div>
        </div>
    `;
}

function renderProjects(projects) {
    activeProjects = projects.filter(isWorthShowing);

    if (activeProjects.length === 0) {
        projectsGrid.innerHTML = `<p class="project-error">No projects to show at the moment.</p>`;
        return;
    }

    projectsGrid.innerHTML = activeProjects.slice(0, 12).map(buildProjectCard).join('');
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