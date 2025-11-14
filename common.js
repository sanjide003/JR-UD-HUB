// ഇതാണ് 'common.js' ഫയൽ.
// എല്ലാ പബ്ലിക് പേജുകൾക്കും (Home, Categories,...) വേണ്ടിയുള്ള പൊതുവായ കാര്യങ്ങൾ
// (ഹെഡർ, ഫൂട്ടർ, സൈഡ് മെനു, കാർട്ട് ഐക്കൺ) ഈ ഫയലാണ് നിർമ്മിക്കുന്നത്.
// *** ന്യൂസ്‌ലെറ്റർ ഭാഗം നീക്കം ചെയ്തു ***

import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    signInAnonymously, 
    signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getCartItemCount } from './cart.js'; // കാർട്ടിലെ എണ്ണം അറിയാൻ

// സൈറ്റ് സെറ്റിംഗ്സ് ഡാറ്റ ഒരിക്കൽ മാത്രം ലോഡ് ചെയ്യാൻ
let siteSettings = null;
let authPromise = null;

/**
 * യൂസറെ സൈൻ ഇൻ ചെയ്യിക്കുന്നു
 */
function authenticateUser() {
    if (authPromise) return authPromise;

    authPromise = new Promise(async (resolve, reject) => {
        try {
            // Vercel/GitHub ഹോസ്റ്റിംഗിനായി __initial_auth_token ഒഴിവാക്കി
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

/**
 * ഫയർബേസിൽ നിന്ന് സൈറ്റ് സെറ്റിംഗ്സ് (ലോഗോ, ഫോൺ, സോഷ്യൽ ലിങ്കുകൾ) എടുക്കുന്നു
 */
async function fetchSiteSettings() {
    if (siteSettings) {
        return siteSettings; // നേരത്തെ ലോഡ് ചെയ്തെങ്കിൽ അത് തിരികെ നൽകുന്നു
    }
    try {
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
 * 1. പ്രധാന ഹെഡർ നിർമ്മിക്കുന്നു (സബ്ടൈറ്റിൽ ചേർത്തു)
 */
async function buildHeader() {
    const settings = await fetchSiteSettings();
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const logoImg = settings.logoImageUrl ? `<img src="${settings.logoImageUrl}" alt="Logo" class="header-logo-img">` : '';
    const logoText = settings.logoText ? `<span class="header-logo-text">${settings.logoText}</span>` : '';
    // പുതിയ സബ്ടൈറ്റിൽ
    const logoSubtitle = settings.logoSubtitle ? `<span class="header-logo-subtitle">${settings.logoSubtitle}</span>` : '';

    headerElement.innerHTML = `
        <a href="index.html" class="header-logo">
            ${logoImg}
            <div class="header-logo-text-wrapper">
                ${logoText}
                ${logoSubtitle}
            </div>
        </a>
        <div class="header-icons">
            <a href="cart.html" class="header-icon-btn cart-icon-wrapper" aria-label="Shopping Cart">
                <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span class="cart-item-count" id="cart-item-count">0</span>
            </a>
            <button class="header-icon-btn" id="nav-open-btn" aria-label="Open Menu">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
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
        </ul>
        <div class="side-nav-social">
            <a href="${settings.instagramUrl || '#'}" target="_blank" aria-label="Instagram">
                <!-- ഇൻസ്റ്റാഗ്രാം ഐക്കൺ -->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                <!-- ഫേസ്ബുക്ക് ഐക്കൺ -->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
        </div>
    `;
    setupNavEvents();
}

/**
 * 3. പുതിയ അക്കോർഡിയൻ ഫൂട്ടർ നിർമ്മിക്കുന്നു (ന്യൂസ്‌ലെറ്റർ ഇല്ലാതെ)
 */
async function buildFooter() {
    const settings = await fetchSiteSettings();
    const footerElement = document.getElementById('main-footer');
    if (!footerElement) return;
    
    footerElement.className = 'main-footer-new';

    footerElement.innerHTML = `
        <div class="footer-container-new">
            <!-- ഐറ്റം 1: About -->
            <div class="footer-accordion-item">
                <button class="footer-accordion-toggle" data-target="footer-content-1">
                    <span>ABOUT OUDARABIA</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 11.293l-4.646-4.647a.5.5 0 0 1 .708-.708L8 9.879l4.939-4.939a.5.5 0 0 1 .708.708L8 11.293z"></path></svg>
                </button>
                <div class="footer-accordion-content" id="footer-content-1">
                    <ul>
                        <li><a href="#">Our Story</a></li>
                        <li><a href="contact.html">Contact Us</a></li>
                        <li><a href="#">Store Locator</a></li>
                    </ul>
                </div>
            </div>
            
            <!-- ഐറ്റം 2: Customer Care -->
            <div class="footer-accordion-item">
                <button class="footer-accordion-toggle" data-target="footer-content-2">
                    <span>CUSTOMER CARE</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 11.293l-4.646-4.647a.5.5 0 0 1 .708-.708L8 9.879l4.939-4.939a.5.5 0 0 1 .708.708L8 11.293z"></path></svg>
                </button>
                <div class="footer-accordion-content" id="footer-content-2">
                    <ul>
                        <li><a href="#">Shipping Policy</a></li>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            
            <!-- ഐറ്റം 3: Quick Links -->
            <div class="footer-accordion-item">
                <button class="footer-accordion-toggle" data-target="footer-content-3">
                    <span>QUICK LINKS</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 11.293l-4.646-4.647a.5.5 0 0 1 .708-.708L8 9.879l4.939-4.939a.5.5 0 0 1 .708.708L8 11.293z"></path></svg>
                </button>
                <div class="footer-accordion-content" id="footer-content-3">
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="categories.html">Perfumes</a></li>
                        <li><a href="cart.html">Cart</a></li>
                    </ul>
                </div>
            </div>

            <!-- 
                *** ന്യൂസ് ലെറ്റർ ഭാഗം ഇവിടെ നിന്ന് നീക്കം ചെയ്തു ***
            -->

            <!-- സോഷ്യൽ ഐക്കണുകൾ -->
            <div class="footer-social-new">
                <a href="${settings.instagramUrl || '#'}" target="_blank" aria-label="Instagram">
                    <!-- ശരിയായ ഇൻസ്റ്റാഗ്രാം ഐക്കൺ -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.333 2.175 8.741 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.748.27 0 3.018 0 7.053c-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.202 4.305 2.949 7.053 7.053 7.053 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c4.305-.202 7.053-2.949 7.053-7.053.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947C21.725 2.748 19.227 0 15.028.072 13.748.014 13.34 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
                </a>
                <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                    <!-- ശരിയായ ഫേസ്ബുക്ക് ഐക്കൺ -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.9V12h2.538v-2.245c0-2.508 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.465l-1.26.001c-1.243 0-1.63.771-1.63 1.562V12h2.771l-.443 2.89H13.63v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
            </div>

            <!-- കോപ്പിറൈറ്റ് -->
            <div class="footer-bottom-new">
                <p>&copy; ${new Date().getFullYear()} ${settings.logoText || 'Al Ambar'}. All Rights Reserved.</p>
            </div>
        </div>
    `;

    // അക്കോർഡിയൻ പ്രവർത്തിപ്പിക്കുന്നു
    setupFooterAccordion();
}

/**
 * ഫൂട്ടർ അക്കോർഡിയൻ പ്രവർത്തിപ്പിക്കുന്നു (ന്യൂസ്‌ലെറ്റർ ഇല്ലാതെ)
 */
function setupFooterAccordion() {
    const toggles = document.querySelectorAll('.footer-accordion-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            // ഡെസ്ക്ടോപ്പിൽ ഈ ഫംഗ്ഷൻ പ്രവർത്തിക്കേണ്ടതില്ല
            if (window.innerWidth >= 768) return; 

            const targetId = toggle.dataset.target;
            const content = document.getElementById(targetId);
            
            if (content.style.maxHeight) {
                // അടയ്ക്കുന്നു
                content.style.maxHeight = null;
                toggle.classList.remove('active');
            } else {
                // തുറക്കുന്നു
                content.style.maxHeight = content.scrollHeight + "px";
                toggle.classList.add('active');
            }
        });
    });
    
    // *** ന്യൂസ്‌ലെറ്റർ ഫോം ലോജിക് ഇവിടെ നിന്ന് നീക്കം ചെയ്തു ***
}


/**
 * 4. പുതിയ ഫ്ലോട്ടിംഗ് ഐക്കണുകൾ നിർമ്മിക്കുന്നു
 */
async function buildFloatingButtons() {
    const settings = await fetchSiteSettings();
    const container = document.getElementById('floating-action-buttons');
    if (!container) return;

    let html = '';
    
    // WhatsApp
    if (settings.whatsapp) {
        html += `
            <a href="https://wa.me/${settings.whatsapp}" class="float-btn whatsapp" target="_blank" aria-label="Chat on WhatsApp">
                <!-- ശരിയായ WhatsApp ഐക്കൺ -->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.598-3.825-1.598-5.968C.143 6.318 6.318 0 11.857 0s11.857 6.318 11.857 11.857S17.396 24 11.857 24c-2.096 0-4.079-.553-5.871-1.57L.057 24zm6.597-3.807c1.688.971 3.619 1.501 5.662 1.501 5.49 0 9.941-4.452 9.941-9.941S17.818 1.957 12.327 1.957s-9.94 4.451-9.94 9.94c0 2.21.75 4.31 2.067 5.968l-1.39 5.021 5.173-1.389zM12.327 3.911c4.49 0 8.143 3.654 8.143 8.143s-3.654 8.143-8.143 8.143-8.143-3.654-8.143-8.143S7.837 3.911 12.327 3.911zm4.112 11.238c-.276-.136-1.637-.803-1.89-.894-.254-.092-.438-.136-.622.136-.186.273-.717.894-.88 1.061-.164.168-.328.188-.613.051-.286-.136-1.203-.442-2.29-1.409-.849-.75-1.418-1.676-1.582-1.952-.164-.273-.018-.43.118-.561.121-.117.276-.302.414-.448.139-.147.186-.254.28-.423.093-.168.047-.312-.023-.448-.071-.136-.622-1.496-.851-2.049-.225-.542-.451-.468-.622-.475-.164-.007-.35-.007-.521-.007s-.438.069-.668.337c-.225.273-.865.842-.865 2.049 0 1.208.884 2.379 1.002 2.546.118.168 1.74 2.66 4.223 3.731.583.254 1.041.405 1.399.516.59.188 1.116.161 1.517.1.451-.07 1.364-.557 1.558-1.092.196-.535.196-1.002.139-1.108-.059-.108-.225-.188-.475-.325z"/></svg>
            </a>
        `;
    }

    // Phone
    if (settings.phone) {
        html += `
            <a href="tel:${settings.phone}" class="float-btn phone" aria-label="Call Us">
                <!-- ശരിയായ ഫോൺ ഐക്കൺ -->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </a>
        `;
    }
    
    container.innerHTML = html;
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
    await buildFloatingButtons();
}