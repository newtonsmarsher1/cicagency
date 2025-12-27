// API Configuration
const API_CONFIG = {
    // Automatically detect environment
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.endsWith('.local'))
        ? `${window.location.origin}/api`
        : 'https://cicagency.onrender.com/api',

    // Helper to get full URL
    getUrl: (endpoint) => {
        const baseUrl = API_CONFIG.BASE_URL.endsWith('/')
            ? API_CONFIG.BASE_URL.slice(0, -1)
            : API_CONFIG.BASE_URL;
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${baseUrl}${path}`;
    }
};

// Global export
window.API_CONFIG = API_CONFIG;
window.API_BASE_URL = API_CONFIG.BASE_URL; // Legacy support for existing pages

// 🔒 Code Protection & Anti-Debug features
/* 
(function () {
    // Disable Right Click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // Disable Keyboard Shortcuts for DevTools
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome/Firefox DevTools)
        // Ctrl+U (View Source)
        if (e.ctrlKey && (e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()) || e.key.toUpperCase() === 'U')) {
            e.preventDefault();
            return false;
        }
    });

    // 🛑 Aggressive Anti-Debug: Freeze DevTools if opened
    setInterval(function () {
        // Only run if console is open/docked (detected by timing)
        const startTime = performance.now();
        debugger;
        const endTime = performance.now();

        // If execution paused significantly (>100ms), DevTools is likely open
        if (endTime - startTime > 100) {
            document.body.innerHTML = '<div style="background:black;color:red;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;font-size:24px;font-weight:bold;font-family:sans-serif;">⚠️ Developer Tools Detected<br>Access to source code is restricted.</div>';
        }
    }, 1000);

    // Disable Selection (blocks simple highlighting)
    const style = document.createElement('style');
    style.innerHTML = 'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }';
    document.head.appendChild(style);

    // Clear console continuously
    setInterval(() => { try { console.clear(); } catch (e) { } }, 500);
})();
*/
