function setHljsTheme(isDark) {
    var dark = document.getElementById('hljs-dark');
    var light = document.getElementById('hljs-light');
    if (dark && light) {
        dark.disabled = !isDark;
        light.disabled = isDark;
    }
}

function setDarkModeIcon(isDark) {
    var sun = document.getElementById('darkmode-icon-sun');
    var moon = document.getElementById('darkmode-icon-moon');
    if (sun && moon) {
        sun.style.display = isDark ? 'block' : 'none';
        moon.style.display = isDark ? 'none' : 'block';
    }
}

function applyDarkMode(isDark) {
    var html = document.documentElement;
    if (isDark) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    setHljsTheme(isDark);
    setDarkModeIcon(isDark);
}

function toggleDarkMode() {
    var isDark = document.documentElement.classList.contains('dark');
    var newMode = !isDark;
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    applyDarkMode(newMode);
}

function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;

    // Migrate old key
    var oldKey = localStorage.getItem('is_darkmode_set');
    if (oldKey === 'true') return 'dark';
    if (oldKey === 'false') return 'light';

    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function toggleBackToTop() {
    var e = document.getElementById('back-to-top');
    if (e) {
        if (window.scrollY === 0) e.classList.add('hidden');
        else e.classList.remove('hidden');
    }
}

function backToTop() {
    window.scrollTo(0, 0);
}

// Initialize theme
applyDarkMode(getPreferredTheme() === 'dark');

// Listen for system theme changes (only applies if user hasn't set a manual preference)
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        var stored = localStorage.getItem('theme');
        if (!stored) {
            applyDarkMode(e.matches);
        }
    });
}

// Event listeners
document
    .getElementById('darkmode-toggle')
    .addEventListener('click', toggleDarkMode);

document
    .getElementById('back-to-top')
    .addEventListener('click', backToTop);

window.addEventListener('scroll', toggleBackToTop);
