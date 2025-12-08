// common.js - Enhanced Image & Link Handler

import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getCartItemCount } from './cart.js';

let siteSettings = null;
let authPromise = null;

/**
 * Universal Image Optimizer
 * Google Drive, Blogspot, Direct Links, Unsplash എന്നിവയെല്ലാം സപ്പോർട്ട് ചെയ്യുന്നു.
 */
export function optimizeImage(url, width = 800, quality = 80) {
    if (!url) return 'https://placehold.co/100x100/121212/D4AF37?text=No+Image';

    // 1. Google Drive Links (Convert to Direct Link & Proxy)
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        try {
            let id = null;
            if (url.includes('/d/')) {
                id = url.split('/d/')[1].split('/')[0];
            } else if (url.includes('id=')) {
                id = url.split('id=')[1].split('&')[0];
            }
            if (id) {
                // Using wsrv.nl proxy to handle Drive images cleanly and fast
                const directLink = `https://drive.google.com/uc?export=view&id=${id}`;
                return `https://wsrv.nl/?url=${encodeURIComponent(directLink)}&w=${width}&q=${quality}&output=webp`;
            }
        } catch (e) { console.error("Drive Link Error", e); }
    }

    // 2. Direct Links (Already optimized or standard)
    // Blogspot, Unsplash, etc.
    if (url.startsWith('http')) {
        if (url.includes('wsrv.nl') || url.includes('placehold.co')) return url;
        
        // Use proxy for resizing and caching
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
    }

    return url; 
}

// ... (ബാക്കിയുള്ള Auth, Header, Footer ഫംഗ്ഷനുകൾ മാറ്റമില്ലാതെ തുടരുന്നു) ...
// (താങ്കളുടെ പഴയ common.js ലെ ബാക്കി കോഡുകൾ അതേപടി നിലനിർത്തുക - Authentication & Layout Builders)

// User Authentication
function authenticateUser() {
    if (authPromise) return authPromise;
    authPromise = new Promise(async (resolve, reject) => {
        try {
            if (auth.currentUser) {
                resolve(auth.currentUser);
                return;
            }
            await signInAnonymously(auth);
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
    } catch (error) { console.error("Settings Error:", error); }
    return siteSettings || {};
}

// Header & Footer Builders (Keeping the same logic, just ensuring classes match new CSS)
async function buildHeader() {
    const settings = await fetchSiteSettings();
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const logoUrl = settings.logoImageUrl || ''; 
    const logoImg = settings.logoImageUrl ? `<img src="${optimizeImage(logoUrl, 200)}" alt="Logo">` : '';
    const logoText = settings.logoText ? `<span class="header-logo-text">${settings.logoText}</span>` : '';

    headerElement.innerHTML = `
        <a href="index.html" class="header-logo">
            ${logoImg}
            ${logoText ? `<div style="display:flex;flex-direction:column;line-height:1;">${logoText}</div>` : ''}
        </a>
        
        <nav class="header-nav-desktop">
            <ul>
                <li><a href="index.html">HOME</a></li>
                <li><a href="explore.html">EXPLORE</a></li>
                <li><a href="categories.html">CATALOG</a></li>
                <li><a href="cart.html">CART</a></li>
            </ul>
        </nav>

        <div class="header-right-section">
            <a href="cart.html" class="header-icon-btn" aria-label="Cart">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
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
    
    let socialLinksHTML = '';
    if (settings.followWhatsapp) socialLinksHTML += `<a href="${settings.followWhatsapp}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg></a>`;
    if (settings.instagramUrl) socialLinksHTML += `<a href="${settings.instagramUrl}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.748.27 0 3.018 0 7.053c-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.202 4.305 2.949 7.053 7.053 7.053 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c4.305-.202 7.053-2.949 7.053-7.053.058-1.28.072 1.688.072-4.947s-.014-3.667-.072-4.947C21.725 2.748 19.227 0 15.028.072 13.748.014 13.34 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg></a>`;
    if (settings.facebookUrl) socialLinksHTML += `<a href="${settings.facebookUrl}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.9V12h2.538v-2.245c0-2.508 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.465l-1.26.001c-1.243 0-1.63.771-1.63 1.562V12h2.771l-.443 2.89H13.63v6.988C18.343 21.128 22 16.991 22 12z"/></svg></a>`;

    footerElement.innerHTML = `
        <div class="footer-social-new">${socialLinksHTML}</div>
        <div style="font-size:0.8rem; color:#666;">
            &copy; ${new Date().getFullYear()} ${settings.logoText || 'JR-UD-HUB'}. All Rights Reserved.
        </div>
        <div style="margin-top:20px; font-size:0.8rem;">
            <a href="about.html" style="color:#888; margin:0 10px;">About</a>
            <a href="contact.html" style="color:#888; margin:0 10px;">Contact</a>
            <a href="about.html#terms" style="color:#888; margin:0 10px;">Terms</a>
        </div>
    `;
}

async function buildFloatingButtons() {
    const container = document.getElementById('floating-action-buttons');
    if (!container) return;
    const s = await fetchSiteSettings();
    if(s.whatsapp) {
        container.innerHTML = `
        <a href="https://wa.me/${s.whatsapp}" target="_blank" class="float-btn" style="background:#25D366;border:none;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#fff" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
        </a>`;
    }
}

function buildBottomNav() {
    if (window.innerWidth > 768) return;
    const navHTML = `
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item active"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg><span>Home</span></a>
        <a href="categories.html" class="bottom-nav-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg><span>Shop</span></a>
        <a href="explore.html" class="bottom-nav-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg><span>Explore</span></a>
        <a href="cart.html" class="bottom-nav-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span>Cart</span></a>
    </nav>`;
    document.body.insertAdjacentHTML('beforeend', navHTML);
}

function updateCartIcon() {
    const el = document.getElementById('cart-item-count');
    if (el) {
        const c = getCartItemCount();
        el.textContent = c;
        el.style.display = c > 0 ? 'flex' : 'none';
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
        await buildHeader();
        await buildFooter();
        await buildFloatingButtons();
        buildBottomNav();
    } catch (error) { console.error(error); } 
    finally {
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => { preloader.style.display = 'none'; }, 500); 
        }
    }
}