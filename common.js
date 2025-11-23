// ഇതാണ് 'common.js' ഫയൽ.

import { db, auth } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    collection, 
    getDocs, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    signInAnonymously 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getCartItemCount } from './cart.js';

let siteSettings = null;
let authPromise = null;

/**
 * *** മാറ്റം: ഗൂഗിൾ ഡ്രൈവ് ലിങ്കുകളെ ഇമേജ് ലിങ്കായി മാറ്റുന്നു ***
 */
export function optimizeImage(url, width = 800, quality = 80) {
    if (!url) return 'https://placehold.co/100x100/1e1e1e/D4AF37?text=No+Image';

    // Google Drive Link Detection
    if (url.includes('drive.google.com') && url.includes('/d/')) {
        try {
            // ലിങ്കിൽ നിന്ന് ID എടുക്കുന്നു
            const id = url.split('/d/')[1].split('/')[0];
            // view ലിങ്ക് ആക്കി മാറ്റുന്നു
            return `https://drive.google.com/uc?export=view&id=${id}`;
        } catch (e) {
            console.error("Error converting Drive URL", e);
            return url;
        }
    }

    return url; 
}

function authenticateUser() {
    if (authPromise) return authPromise;

    authPromise = new Promise(async (resolve, reject) => {
        try {
            if (auth.currentUser) {
                resolve(auth.currentUser);
                return;
            }
            await signInAnonymously(auth);
            console.log("Authenticated anonymously.");
            resolve(auth.currentUser);
        } catch (error) {
            console.error("Authentication Error:", error);
            reject(error);
        }
    });
    return authPromise;
}

export async function fetchSiteSettings() {
    if (siteSettings) return siteSettings;

    const cachedSettings = localStorage.getItem('siteSettings');
    if (cachedSettings) {
        siteSettings = JSON.parse(cachedSettings);
        refreshSettingsBackground(); 
        return siteSettings;
    }

    return await refreshSettingsBackground();
}

async function refreshSettingsBackground() {
    try {
        await authenticateUser(); 
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            siteSettings = docSnap.data();
            localStorage.setItem('siteSettings', JSON.stringify(siteSettings));
            return siteSettings;
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
    return siteSettings || {};
}

// *** ഹെഡർ ***
async function buildHeader() {
    const settings = await fetchSiteSettings();
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const logoUrl = settings.logoImageUrl || ''; 
    const logoImg = settings.logoImageUrl ? `<img src="${optimizeImage(logoUrl, 150)}" alt="Logo" class="header-logo-img">` : '';
    const logoText = settings.logoText ? `<span class="header-logo-text">${settings.logoText}</span>` : '';
    const logoSubtitle = settings.logoSubtitle ? `<span class="header-logo-subtitle">${settings.logoSubtitle}</span>` : '';

    headerElement.innerHTML = `
        <div class="header-left-section">
            <a href="index.html" class="header-logo">
                ${logoImg}
                <div class="header-logo-content">
                    ${logoText}
                    ${logoSubtitle}
                </div>
            </a>
        </div>

        <nav class="header-nav-desktop">
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="explore.html">Explore</a></li>
                <li><a href="categories.html">Catalog</a></li>
                <li><a href="contact.html">Contact</a></li>
            </ul>
        </nav>

        <div class="header-right-section">
            <a href="cart.html" class="header-icon-btn cart-icon-wrapper" aria-label="Shopping Cart">
                <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span class="cart-item-count" id="cart-item-count">0</span>
            </a>
        </div>
    `;
    updateCartIcon();
}

async function buildFooter() {
    const settings = await fetchSiteSettings();
    const footerElement = document.getElementById('main-footer');
    if (!footerElement) return;
    
    footerElement.className = 'main-footer-new';

    let socialLinksHTML = '';
    if (settings.followWhatsapp) socialLinksHTML += `<a href="${settings.followWhatsapp}" target="_blank" aria-label="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg></a>`;
    if (settings.instagramUrl) socialLinksHTML += `<a href="${settings.instagramUrl}" target="_blank" aria-label="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.748.27 0 3.018 0 7.053c-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.202 4.305 2.949 7.053 7.053 7.053 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c4.305-.202 7.053-2.949 7.053-7.053.058-1.28.072 1.688.072-4.947s-.014-3.667-.072-4.947C21.725 2.748 19.227 0 15.028.072 13.748.014 13.34 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg></a>`;
    if (settings.facebookUrl) socialLinksHTML += `<a href="${settings.facebookUrl}" target="_blank" aria-label="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.9V12h2.538v-2.245c0-2.508 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.465l-1.26.001c-1.243 0-1.63.771-1.63 1.562V12h2.771l-.443 2.89H13.63v6.988C18.343 21.128 22 16.991 22 12z"/></svg></a>`;
    if (settings.youtubeUrl) socialLinksHTML += `<a href="${settings.youtubeUrl}" target="_blank" aria-label="YouTube"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19c-.23-.86-.9-1.52-1.76-1.76C18.26 5 12 5 12 5s-6.26 0-7.82.43c-.86.23-1.52.9-1.76 1.76C2 8.74 2 12 2 12s0 3.26.43 4.81c.23.86.9 1.52 1.76 1.76C5.74 19 12 19 12 19s6.26 0 7.82-.43c.86-.23 1.52-.9 1.76-1.76C22 15.26 22 12 22 12s0-3.26-.42-4.81zM9.75 15.5V8.5L15.75 12 9.75 15.5z"></path></svg></a>`;

    // *** മാറ്റം: type="button" ചേർത്തു ***
    footerElement.innerHTML = `
        <div class="footer-container-new">
            <div class="footer-accordion-item">
                <button type="button" class="footer-accordion-toggle" data-target="footer-content-1">
                    <span>ABOUT</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 11.293l-4.646-4.647a.5.5 0 0 1 .708-.708L8 9.879l4.939-4.939a.5.5 0 0 1 .708.708L8 11.293z"></path></svg>
                </button>
                <div class="footer-accordion-content" id="footer-content-1">
                    <ul>
                        <li><a href="contact.html">Contact Us</a></li>
                        <li><a href="about.html#store-locator">Store Locator</a></li>
                        <li><a href="about.html#shipping-policy">Shipping Policy</a></li>
                        <li><a href="about.html#privacy-policy">Privacy Policy</a></li>
                        <li><a href="about.html#terms-of-service">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="footer-accordion-item">
                <button type="button" class="footer-accordion-toggle" data-target="footer-content-3">
                    <span>QUICK LINKS</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 11.293l-4.646-4.647a.5.5 0 0 1 .708-.708L8 9.879l4.939-4.939a.5.5 0 0 1 .708.708L8 11.293z"></path></svg>
                </button>
                <div class="footer-accordion-content" id="footer-content-3">
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="explore.html">Explore</a></li>
                        <li><a href="categories.html">Catalog</a></li>
                        <li><a href="cart.html">Cart</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-social-new">
                ${socialLinksHTML}
            </div>

            <div class="footer-bottom-new">
                <p>&copy; ${new Date().getFullYear()} ${settings.logoText || 'Al Ambar'}. All Rights Reserved.</p>
                <p class="footer-powered-by">Powered by sanjideõō³</p>
            </div>
        </div>
    `;

    setupFooterAccordion();
}

function setupFooterAccordion() {
    const toggles = document.querySelectorAll('.footer-accordion-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.dataset.target;
            const content = document.getElementById(targetId);
            
            if (!content) return; 

            // *** മാറ്റം: Toggle Logic കൂടുതൽ കൃത്യമാക്കി ***
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                toggle.classList.remove('active');
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                toggle.classList.add('active');
            }
        });
    });
}

async function buildFloatingButtons() {
    const container = document.getElementById('floating-action-buttons');
    if (container) container.innerHTML = ''; 
}

function buildBottomNav(settings) {
    if (window.innerWidth > 768) return;

    const path = window.location.pathname;
    const pageName = path.split("/").pop().replace('.html', '') || "index";

    const homeActive = pageName === 'index' ? 'active' : '';
    const catalogActive = (pageName === 'categories' || pageName === 'product') ? 'active' : '';
    const exploreActive = pageName === 'explore' ? 'active' : '';
    const accountActive = (pageName === 'cart' || pageName === 'contact' || pageName === 'about') ? 'active' : '';

    let whatsappLinkHTML = '';
    if (settings && settings.whatsapp) {
        whatsappLinkHTML = `
            <li>
                <a href="https://wa.me/${settings.whatsapp}" target="_blank" class="user-menu-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                    <span>Chat on WhatsApp</span>
                </a>
            </li>
        `;
    }

    const navHTML = `
    <nav class="bottom-nav">
        <!-- 1. HOME -->
        <a href="index.html" class="bottom-nav-item ${homeActive}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Home</span>
        </a>

        <!-- 2. CATALOG -->
        <a href="categories.html" class="bottom-nav-item catalog-anim ${catalogActive}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Catalog</span>
        </a>

        <!-- 3. EXPLORE -->
        <a href="explore.html" class="bottom-nav-item ${exploreActive}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 10h4"/><path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/><path d="M5 7V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3"/><rect x="4" y="7" width="6" height="8" rx="2"/><rect x="14" y="7" width="6" height="8" rx="2"/><path d="M6 15v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4"/><path d="M16 15v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4"/>
            </svg>
            <span>Explore</span>
        </a>

        <!-- 4. ACCOUNT -->
        <button class="bottom-nav-item ${accountActive}" id="bottom-nav-account-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Account</span>
        </button>
    </nav>

    <!-- Account Menu Overlay -->
    <div class="user-menu-overlay" id="user-menu-overlay">
        <div class="user-menu-content">
            <div class="user-menu-header">
                <h3>My Account</h3>
                <button class="user-menu-close-btn" id="user-menu-close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <ul class="user-menu-list">
                ${whatsappLinkHTML}
                <li>
                    <a href="cart.html" class="user-menu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        <span>Your Orders</span>
                    </a>
                </li>
                <li>
                    <a href="contact.html" class="user-menu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>Contact Us</span>
                    </a>
                </li>
                <li>
                    <a href="about.html" class="user-menu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>About Us</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);
    setupBottomNavEvents();
}

function setupBottomNavEvents() {
    const accountBtn = document.getElementById('bottom-nav-account-btn');
    const overlay = document.getElementById('user-menu-overlay');
    const closeBtn = document.getElementById('user-menu-close-btn');

    if (accountBtn && overlay && closeBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.classList.add('open');
        });

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('open');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
        });
    }
}

function updateCartIcon() {
    const cartCountElement = document.getElementById('cart-item-count');
    if (cartCountElement) {
        const count = getCartItemCount();
        cartCountElement.textContent = count;
        cartCountElement.style.display = count > 0 ? 'flex' : 'none';
    }
}
window.addEventListener('cartUpdated', updateCartIcon);

export async function loadSiteSettings() {
    const preloader = document.getElementById('preloader');
    const preloaderLogo = document.getElementById('preloader-logo');
    
    try {
        await authenticateUser();
        const settings = await fetchSiteSettings();
        
        if (preloaderLogo && settings.logoImageUrl) {
            preloaderLogo.src = optimizeImage(settings.logoImageUrl, 150);
            preloaderLogo.style.display = 'block';
        }

        try { await buildHeader(); } catch (e) { console.error("Error building header:", e); }
        try { await buildFooter(); } catch (e) { console.error("Error building footer:", e); }
        try { await buildFloatingButtons(); } catch (e) { console.error("Error building floating buttons:", e); }
        
        try { buildBottomNav(settings); } catch (e) { console.error("Error building bottom nav:", e); }
        
    } catch (error) {
        console.error("Error during site initialization: ", error);
    } finally {
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500); 
        }
    }
}