// ഇതാണ് 'common.js' ഫയൽ.
// എല്ലാ പബ്ലിക് പേജുകൾക്കും (Home, Categories,...) വേണ്ടിയുള്ള പൊതുവായ കാര്യങ്ങൾ
// (ഹെഡർ, ഫൂട്ടർ, സൈഡ് മെനു, കാർട്ട് ഐക്കൺ) ഈ ഫയലാണ് നിർമ്മിക്കുന്നത്.
// പുതിയ ഫൂട്ടറും ഫ്ലോട്ടിംഗ് ബട്ടണുകളും ചേർത്തു.

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
 * 1. പ്രധാന ഹെഡർ നിർമ്മിക്കുന്നു (മാറ്റമില്ല)
 */
async function buildHeader() {
    const settings = await fetchSiteSettings();
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const logoImg = settings.logoImageUrl ? `<img src="${settings.logoImageUrl}" alt="Logo" class="header-logo-img">` : '';
    const logoText = settings.logoText ? `<span class="header-logo-text">${settings.logoText}</span>` : '';
    
    headerElement.innerHTML = `
        <a href="index.html" class="header-logo">
            ${logoImg}
            ${logoText}
        </a>
        <div class="header-icons">
            <a href="cart.html" class="header-icon-btn cart-icon-wrapper" aria-label="Shopping Cart">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
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
 * 2. വശത്തുള്ള മെനു (Side Nav) നിർമ്മിക്കുന്നു (മാറ്റമില്ല)
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
        </div>
    `;
    setupNavEvents();
}

/**
 * 3. പുതിയ അക്കോർഡിയൻ ഫൂട്ടർ നിർമ്മിക്കുന്നു
 */
async function buildFooter() {
    const settings = await fetchSiteSettings();
    const footerElement = document.getElementById('main-footer');
    if (!footerElement) return;
    
    // ഫൂട്ടർ എലമെന്റിന് പുതിയ ക്ലാസ് നൽകുന്നു
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

            <!-- ന്യൂസ് ലെറ്റർ -->
            <div class="footer-newsletter">
                <p>Get notified about new products</p>
                <form class="newsletter-form" id="newsletter-form">
                    <input type="email" class="newsletter-input" placeholder="Enter your email" required>
                    <button type="submit" class="newsletter-button" aria-label="Subscribe">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l-7 3.737c-.57.305-.755-.188-.363-.676l5.097-5.118-4.79-1.63z"></path></svg>
                    </button>
                </form>
            </div>

            <!-- സോഷ്യൽ ഐക്കണുകൾ -->
            <div class="footer-social-new">
                <a href="${settings.instagramUrl || '#'}" target="_blank" aria-label="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.308.196-6.106 1.99-6.3 6.3C.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.196 4.308 1.99 6.106 6.3 6.3 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c4.308-.196 6.106-1.99 6.3-6.3.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.196-4.308-1.99-6.106-6.3-6.3C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"></path></svg>
                </a>
                <a href="${settings.facebookUrl || '#'}" target="_blank" aria-label="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.9V12h2.538v-2.245c0-2.508 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.465l-1.26.001c-1.243 0-1.63.771-1.63 1.562V12h2.771l-.443 2.89H13.63v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>
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
 * ഫൂട്ടർ അക്കോർഡിയൻ പ്രവർത്തിപ്പിക്കുന്നു
 */
function setupFooterAccordion() {
    const toggles = document.querySelectorAll('.footer-accordion-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
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
    
    // ന്യൂസ് ലെറ്റർ
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for subscribing!'); // തൽക്കാലം
            newsletterForm.reset();
        });
    }
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.06 4.94a10.02 10.02 0 0 0-14.12 0 10.02 10.02 0 0 0 0 14.12 10.02 10.02 0 0 0 14.12 0 10.02 10.02 0 0 0 0-14.12zm-2.82 11.32a8.02 8.02 0 0 1-11.32 0 8.02 8.02 0 0 1 0-11.32 8.02 8.02 0 0 1 11.32 0 8.02 8.02 0 0 1 0 11.32zM12 5.9a6.1 6.1 0 0 0-6.1 6.1c0 1.5.5 2.9 1.4 4l-1 3.6 3.7-1c1.1.9 2.5 1.4 4 1.4a6.1 6.1 0 0 0 0-12.2zm0 10.4a4.3 4.3 0 0 1-3.5-1.7l-.3-.4-2.6.7.7-2.5-.4-.3a4.3 4.3 0 0 1-1.7-3.5 4.3 4.3 0 0 1 8.6 0 4.3 4.3 0 0 1-4.3 4.3zm2.8-3.5l-1.2-1.1c-.2-.1-.3-.1-.5 0l-.3.3c-.1.1-.2.2-.3.2-.1 0-.2 0-.3-.1l-1.3-.8c-.4-.2-.8-.6-.8-1s-.1-.8 0-1c.1-.1.2-.2.3-.3l.3-.3c.1-.1.1-.3 0-.5l-1.1-1.2c-.1-.2-.2-.2-.4-.2h-.3c-.2 0-.4.1-.5.2l-.6.6c-.2.2-.3.4-.3.7s0 .6.1.9c.1.2.3.5.5.7l.2.3c.3.4.6.7.9.9.4.3.8.5 1.2.7.5.2 1 .3 1.5.3h.1c.5 0 1-.1 1.4-.3.5-.2 1-.6 1.3-1l.3-.4c.1-.1.2-.3.2-.5v-.3c0-.2-.1-.4-.2-.5z"></path></svg>
            </a>
        `;
    }

    // Phone
    if (settings.phone) {
        html += `
            <a href="tel:${settings.phone}" class="float-btn phone" aria-label="Call Us">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.51 3.08 14.89 4.7a1.99 1.99 0 0 0-2.82 0l-1.24 1.24c-.1.1-.1.2-.1.3s0 .2.1.3l2.82 2.82c.1.1.2.1.3.1s.2-.1.3-.1l1.24-1.24c.78-.78.78-2.04 0-2.82l-1.62-1.62zM5.31 10.99c.1.1.2.1.3.1s.2-.1.3-.1l2.82-2.82c.1-.1.1-.2.1-.3s-.1-.2-.1-.3L7.4 6.3c-.78-.78-2.04-.78-2.82 0L3.08 7.8c-.78.78-.78 2.04 0 2.82L4.7 12.24l-1.62 1.62c-.78.78-.78 2.04 0 2.82l1.24 1.24c.1.1.2.1.3.1s.2-.1.3-.1l2.82-2.82c.1-.1.1-.2.1-.3s-.1-.2-.1-.3l-1.24-1.24c-.78-.78-.78-2.04 0-2.82L7.8 9.08l1.62 1.62c.78.78.78 2.04 0 2.82l-1.24 1.24c-.1.1-.1.2-.1.3s0 .2.1.3l2.82 2.82c.1.1.2.1.3.1s.2-.1.3-.1l1.24-1.24c.78-.78.78-2.04 0-2.82l-1.62-1.62 1.62-1.62c.78-.78.78-2.04 0-2.82L10.99 7.8c-.1-.1-.2-.1-.3-.1s-.2.1-.3.1L7.58 10.7l-1.62-1.62c-.78-.78-.78-2.04 0-2.82L7.8 4.7c.1-.1.2-.1.3-.1s.2.1.3.1l2.82 2.82c.1.1.1.2.1.3s-.1.2-.1.3L9.9 9.54l1.62 1.62c.78.78 2.04.78 2.82 0l1.62-1.62c.1-.1.2-.1.3-.1s.2.1.3.1l2.82 2.82c.1.1.1.2.1.3s-.1.2-.1.3l-1.24 1.24c-.78.78-2.04.78-2.82 0l-1.62-1.62-1.62 1.62c-.78.78-.78 2.04 0 2.82L13.1 19.8c.1.1.2.1.3.1s.2-.1.3-.1l2.82-2.82c.1-.1.1-.2.1-.3s-.1-.2-.1-.3l-1.24-1.24c-.78-.78-.78-2.04 0-2.82l1.62-1.62 1.62 1.62c.78.78.78 2.04 0 2.82l-1.62 1.62c-.1.1-.2.1-.3.1s-.2-.1-.3-.1l-2.82-2.82c-.1-.1-.1-.2-.1-.3s.1-.2.1-.3l1.24-1.24c.78-.78 2.04-.78 2.82 0l1.62 1.62c.78.78.78 2.04 0 2.82L19.8 20.9c-.1.1-.2.1-.3.1s-.2-.1-.3-.1l-2.82-2.82c-.1-.1-.1-.2-.1-.3s.1-.2.1-.3l1.24-1.24c.78-.78 2.04-.78 2.82 0l1.62 1.62c.78.78.78 2.04 0 2.82l-1.62 1.62c-.1.1-.2.1-.3.1s-.2.1-.3-.1z"></path></svg>
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
    await buildFloatingButtons(); // <-- പുതിയതായി ചേർത്തു
}