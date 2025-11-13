// ഇതാണ് 'common.js' ഫയൽ.
// എല്ലാ പബ്ലിക് പേജുകൾക്കും (Home, Categories,...) വേണ്ടിയുള്ള പൊതുവായ കാര്യങ്ങൾ
// (ഹെഡർ, ഫൂട്ടർ, സൈഡ് മെനു, കാർട്ട് ഐക്കൺ) ഈ ഫയലാണ് നിർമ്മിക്കുന്നത്.

import { db, auth } from './firebase-config.js'; // അപ്‌ഡേറ്റ് ചെയ്ത കോൺഫിഗ്
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// --- പുതിയതായി ചേർത്തത് (Authentication) ---
import { 
    signInAnonymously, 
    signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// --- ---
import { getCartItemCount } from './cart.js'; // കാർട്ടിലെ എണ്ണം അറിയാൻ

// സൈറ്റ് സെറ്റിംഗ്സ് ഡാറ്റ ഒരിക്കൽ മാത്രം ലോഡ് ചെയ്യാൻ
let siteSettings = null;
let authPromise = null; // ഓതന്റിക്കേഷൻ പൂർത്തിയായോ എന്നറിയാൻ

/**
 * പ്ലാറ്റ്ഫോം ടോക്കൺ ഉപയോഗിച്ചോ അല്ലാതെയോ യൂസറെ സൈൻ ഇൻ ചെയ്യിക്കുന്നു
 * ഫയർസ്റ്റോർ റൂളുകൾ (allow read: if request.auth != null) പാലിക്കാൻ ഇത് സഹായിക്കുന്നു
 */
function authenticateUser() {
    if (authPromise) return authPromise; // ഒരിക്കൽ മാത്രം ചെയ്താൽ മതി

    authPromise = new Promise(async (resolve, reject) => {
        try {
            if (typeof __initial_auth_token !== 'undefined') {
                await signInWithCustomToken(auth, __initial_auth_token);
                console.log("Authenticated with custom token.");
            } else {
                await signInAnonymously(auth);
                console.log("Authenticated anonymously.");
            }
            resolve(auth.currentUser);
        } catch (error) {
            console.error("Authentication Error:", error);
            reject(error);
        }
    });
    return authPromise;
}

/**
 * ഫയർബേസിൽ നിന്ന് സൈറ്റ് സെറ്റിംഗ്സ് (ലോഗോ, ഫോൺ, സോഷ്യൽ ലിങ്കുകൾ) എടുക്കുന്നു
 */
async function fetchSiteSettings() {
    if (siteSettings) {
        return siteSettings; // നേരത്തെ ലോഡ് ചെയ്തെങ്കിൽ അത് തിരികെ നൽകുന്നു
    }
    try {
        // ഡാറ്റ എടുക്കുന്നതിന് മുമ്പ് ഓതന്റിക്കേഷൻ ഉറപ്പാക്കുന്നു
        await authenticateUser(); 
        
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            siteSettings = docSnap.data();
            return siteSettings;
        } else {
            console.log("No site settings found.");
            return {};
        }
    } catch (error) {
        console.error("Error fetching site settings: ", error);
        return {};
    }
}

/**
 * 1. പ്രധാന ഹെഡർ നിർമ്മിക്കുന്നു
 */
async function buildHeader() {
    const settings = await fetchSiteSettings();
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const logoImg = settings.logoImageUrl ? `<img src="${settings.logoImageUrl}" alt="Logo" class="header-logo-img">` : '';
    const logoText = settings.logoText ? `<span class="header-logo-text">${settings.logoText}</span>` : '';
    
    headerElement.innerHTML = `
        <!-- ഇടത് വശം: ലോഗോയും പേരും -->
        <a href="index.html" class="header-logo">
            ${logoImg}
            ${logoText}
        </a>

        <!-- വലത് വശം: ഐക്കണുകൾ -->
        <div class="header-icons">
            <!-- സെർച്ച് (ഭാവിയിൽ ഉപയോഗിക്കാം)
            <button class="header-icon-btn" id="search-btn" aria-label="Search">
                <svg ...>...</svg>
            </button>
            -->
            
            <!-- ഷോപ്പിംഗ് കാർട്ട് ഐക്കൺ -->
            <a href="cart.html" class="header-icon-btn cart-icon-wrapper" aria-label="Shopping Cart">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span class="cart-item-count" id="cart-item-count">0</span>
            </a>

            <!-- മെനു (ഹാംബർഗർ) ഐക്കൺ -->
            <button class="header-icon-btn" id="nav-open-btn" aria-label="Open Menu">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    // കാർട്ടിലെ എണ്ണം അപ്ഡേറ്റ് ചെയ്യുന്നു
    updateCartIcon();
}

/**
 * 2. വശത്തുള്ള മെനു (Side Nav) നിർമ്മിക്കുന്നു
 */
async function buildSideNav() {
    const settings = await fetchSiteSettings();
    const navElement = document.getElementById('side-nav');
    if (!navElement) return;

    navElement.innerHTML = `
        <div class="side-nav-header">
            <h3>Menu</h3>
            <button class="side-nav-close-btn" id="nav-close-btn" aria-label="Close Menu">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <ul class="side-nav-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="categories.html">Catalog</a></li>
            <li><a href="contact.html">Contact</a></li>
            <!-- ഭാവിയിൽ ഈ പേജുകൾ ചേർക്കാം
            <li><a href="#">Stores</a></li>
            <li><a href="#">About Us</a></li>
            -->
        </ul>
        <div class="side-nav-social">
            <a href="${settings.instagramUrl || '#'}" target="_blank" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
        </div>
    `;

    // മെനു തുറക്കാനും അടക്കാനുമുള്ള ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
    setupNavEvents();
}

/**
 * 3. പ്രധാന ഫൂട്ടർ നിർമ്മിക്കുന്നു
 */
async function buildFooter() {
    const settings = await fetchSiteSettings();
    const footerElement = document.getElementById('main-footer');
    if (!footerElement) return;

    footerElement.innerHTML = `
        <div class="footer-container">
            <div class="footer-col">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="categories.html">Products</a></li>
                    <li><a href="cart.html">Cart</a></li>
                    <li><a href="contact.html">Contact Us</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h3>Contact</h3>
                <ul>
                    <li class="contact-item-footer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>
                        <span>${settings.phone || 'N/A'}</span>
                    </li>
                    <li class="contact-item-footer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>
                        <span>${settings.email || 'N/A'}</span>
                    </li>
                </ul>
                <div class="footer-social-icons">
                    <a href="${settings.instagramUrl || '#'}" target="_blank" aria-label="Instagram">
                        <svg ...>...</svg>
                    </a>
                    <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                        <svg ...>...</svg>
                    </a>
                </div>
            </div>
            <div class="footer-col">
                <h3>Newsletter</h3>
                <p>Get notified about new products.</p>
                <!-- ഭാവിയിൽ ന്യൂസ് ലെറ്റർ ഫോം ഇവിടെ ചേർക്കാം -->
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; ${new Date().getFullYear()} ${settings.logoText || 'Al Ambar'}. All Rights Reserved.</p>
        </div>
    `;
}

/**
 * മെനു തുറക്കാനും അടക്കാനുമുള്ള ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 */
function setupNavEvents() {
    const navOpenBtn = document.getElementById('nav-open-btn');
    const navCloseBtn = document.getElementById('nav-close-btn');
    const sideNav = document.getElementById('side-nav');
    const navOverlay = document.getElementById('nav-overlay');

    if (navOpenBtn && navCloseBtn && sideNav && navOverlay) {
        navOpenBtn.addEventListener('click', () => {
            sideNav.classList.add('open');
            navOverlay.classList.add('open');
        });

        navCloseBtn.addEventListener('click', () => {
            sideNav.classList.remove('open');
            navOverlay.classList.remove('open');
        });

        navOverlay.addEventListener('click', () => {
            sideNav.classList.remove('open');
            navOverlay.classList.remove('open');
        });
    }
}

/**
 * കാർട്ടിലെ എണ്ണം ഹെഡർ ഐക്കണിൽ അപ്ഡേറ്റ് ചെയ്യുന്നു
 */
function updateCartIcon() {
    const cartCountElement = document.getElementById('cart-item-count');
    if (cartCountElement) {
        const count = getCartItemCount();
        cartCountElement.textContent = count;
        cartCountElement.style.display = count > 0 ? 'flex' : 'none';
    }
}

// 'cartUpdated' എന്ന ഇവന്റ് കേൾക്കാൻ
window.addEventListener('cartUpdated', updateCartIcon);

/**
 * എല്ലാ പൊതുവായ കാര്യങ്ങളും ലോഡ് ചെയ്യാനുള്ള പ്രധാന ഫംഗ്ഷൻ
 */
export async function loadSiteSettings() {
    // ആദ്യം ഓതന്റിക്കേഷൻ നടപ്പിലാക്കുന്നു
    await authenticateUser();
    // അതിനുശേഷം ഹെഡറും ഫൂട്ടറും ലോഡ് ചെയ്യുന്നു
    await buildHeader();
    await buildSideNav();
    await buildFooter();
}