// Keeps the public storefront in one document while changing views.
// Admin remains a separate protected page.
const PUBLIC_VIEWS = {
    'index.html': { script: 'index.js', init: 'initHomePage' },
    'categories.html': { script: 'categories.js', init: 'initCategoriesPage' },
    'explore.html': { script: 'explore.js', init: 'initExplorePage' },
    'product.html': { script: 'product.js', init: 'initProductPage' },
    'cart.html': { script: 'cart-page.js', init: 'initCartPage' },
    'about.html': { script: 'about.js', init: 'initAboutPage' },
    'contact.html': { script: 'contact.js', init: 'initContactPage' }
};

const SHELL_IDS = new Set(['preloader', 'main-header', 'nav-overlay', 'main-footer', 'floating-action-buttons']);
let navigationInProgress = false;
document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href !== 'public.css' && !href.includes('swiper')) link.dataset.publicViewStyle = 'true';
});

function isPublicRoute(url) {
    return url.origin === location.origin && PUBLIC_VIEWS[url.pathname.split('/').pop() || 'index.html'];
}

function pageStyleLinks(doc) {
    return [...doc.querySelectorAll('link[rel="stylesheet"]')]
        .map(link => link.getAttribute('href'))
        .filter(href => href && href !== 'public.css' && !href.includes('swiper'));
}

function updatePageStyles(doc) {
    document.querySelectorAll('link[data-public-view-style]').forEach(link => link.remove());
    pageStyleLinks(doc).forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.publicViewStyle = 'true';
        document.head.appendChild(link);
    });
}

function replaceViewContent(doc) {
    const nextMain = doc.querySelector('main');
    if (!nextMain) throw new Error('Page content was not found.');
    document.querySelector('main')?.replaceWith(nextMain.cloneNode(true));

    document.querySelectorAll('[data-spa-view-extra]').forEach(node => node.remove());
    [...doc.body.children].forEach(node => {
        if (node.matches('script, main') || SHELL_IDS.has(node.id) || node.tagName === 'HEADER' || node.tagName === 'FOOTER') return;
        const extra = node.cloneNode(true);
        extra.dataset.spaViewExtra = 'true';
        document.body.appendChild(extra);
    });
}

async function loadView(url, pushState = true) {
    if (navigationInProgress) return;
    navigationInProgress = true;
    document.body.classList.add('view-loading');
    try {
        const response = await fetch(url.href, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Unable to load ${url.pathname}`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        updatePageStyles(doc);
        replaceViewContent(doc);
        document.title = doc.title;
        if (pushState) history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);

        const page = PUBLIC_VIEWS[url.pathname.split('/').pop() || 'index.html'];
        const module = await import(`./${page.script}?view=${encodeURIComponent(url.href)}&t=${Date.now()}`);
        await module[page.init]();
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (url.hash) document.querySelector(url.hash)?.scrollIntoView();
    } catch (error) {
        console.error('Page navigation failed:', error);
        location.href = url.href;
    } finally {
        navigationInProgress = false;
        document.body.classList.remove('view-loading');
    }
}

document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (!isPublicRoute(url)) return;
    const current = `${location.pathname}${location.search}`;
    const target = `${url.pathname}${url.search}`;
    if (current === target) return;
    event.preventDefault();
    loadView(url);
});

window.addEventListener('popstate', () => loadView(new URL(location.href), false));
