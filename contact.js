// ഇതാണ് 'contact.js' 
import { 
    doc,
    getDoc,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; // ഹെഡറും ഫൂട്ടറും ലോഡ് ചെയ്യാൻ

setLogLevel('Debug');

// --- DOM Elements ---
const phoneEl = document.getElementById('contact-phone-main');
const emailEl = document.getElementById('contact-email-main');
const addressEl = document.getElementById('contact-address-main');
const socialIconsEl = document.getElementById('contact-social-icons');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => {
    // 1. ഹെഡർ, ഫൂട്ടർ, ഫ്ലോട്ടിംഗ് ബട്ടണുകൾ എന്നിവ ലോഡ് ചെയ്യുന്നു
    await loadSiteSettings(); 
    
    // 2. കോൺടാക്റ്റ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
    loadContactDetails();
});

/**
 * ഫയർബേസിൽ നിന്ന് കോൺടാക്റ്റ് വിവരങ്ങളും സോഷ്യൽ ലിങ്കുകളും ലോഡ് ചെയ്യുന്നു
 */
async function loadContactDetails() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.error("Site settings document not found!");
            return;
        }

        const settings = docSnap.data();

        // 1. ഫോൺ നമ്പർ
        if (phoneEl) {
            if (settings.phone) {
                phoneEl.href = `tel:${settings.phone}`;
                phoneEl.textContent = settings.phone;
            } else {
                phoneEl.textContent = 'Not available';
            }
        }

        // 2. ഇമെയിൽ
        if (emailEl) {
            if (settings.email) {
                emailEl.href = `mailto:${settings.email}`;
                emailEl.textContent = settings.email;
            } else {
                emailEl.textContent = 'Not available';
            }
        }

        // 3. വിലാസം
        if (addressEl) {
            addressEl.textContent = settings.address || 'Not available';
        }

        // 4. സോഷ്യൽ മീഡിയ ഐക്കണുകൾ
        if (socialIconsEl) {
            let socialLinksHTML = '';

            // WhatsApp
            if (settings.followWhatsapp) {
                socialLinksHTML += `
                    <a href="${settings.followWhatsapp}" target="_blank" aria-label="WhatsApp" class="contact-social-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                    </a>`;
            }
            // Instagram
            if (settings.instagramUrl) {
                socialLinksHTML += `
                    <a href="${settings.instagramUrl}" target="_blank" aria-label="Instagram" class="contact-social-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.333 2.175 8.741 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.748.27 0 3.018 0 7.053c-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.202 4.305 2.949 7.053 7.053 7.053 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c4.305-.202 7.053-2.949 7.053-7.053.058-1.28.072 1.688.072-4.947s-.014-3.667-.072-4.947C21.725 2.748 19.227 0 15.028.072 13.748.014 13.34 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>
                    </a>`;
            }
            // Facebook
            if (settings.facebookUrl) {
                socialLinksHTML += `
                    <a href="${settings.facebookUrl}" target="_blank" aria-label="Facebook" class="contact-social-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.9V12h2.538v-2.245c0-2.508 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.465l-1.26.001c-1.243 0-1.63.771-1.63 1.562V12h2.771l-.443 2.89H13.63v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                    </a>`;
            }
            // YouTube
            if (settings.youtubeUrl) {
                socialLinksHTML += `
                    <a href="${settings.youtubeUrl}" target="_blank" aria-label="YouTube" class="contact-social-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19c-.23-.86-.9-1.52-1.76-1.76C18.26 5 12 5 12 5s-6.26 0-7.82.43c-.86.23-1.52.9-1.76 1.76C2 8.74 2 12 2 12s0 3.26.43 4.81c.23.86.9 1.52 1.76 1.76C5.74 19 12 19 12 19s6.26 0 7.82-.43c.86-.23 1.52-.9 1.76-1.76C22 15.26 22 12 22 12s0-3.26-.42-4.81zM9.75 15.5V8.5L15.75 12 9.75 15.5z"></path></svg>
                    </a>`;
            }

            socialIconsEl.innerHTML = socialLinksHTML || '<span class="loading-placeholder">No social links found.</span>';
        }

    } catch (error) {
        console.error("Error loading contact details: ", error);
        if (addressEl) addressEl.textContent = 'Error loading details.';
        if (socialIconsEl) socialIconsEl.innerHTML = '<span class="loading-placeholder">Error loading links.</span>';
    }
}