// ഇതാണ് 'contact.js' ഫയൽ.
// *** 'loadSiteSettings' പൂർത്തിയാവാൻ കാത്തുനിൽക്കാൻ 'await' ചേർത്തു ***

import { 
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => { // <-- ഇവിടെ async ചേർത്തു
    
    // 1. പൊതുവായ കാര്യങ്ങൾ ലോഡ് ചെയ്യാൻ കാത്തുനിൽക്കുന്നു
    // *** 'await' ചേർത്തത് കാരണം, ഇത് പൂർത്തിയായ ശേഷം മാത്രമേ അടുത്ത ഘട്ടത്തിലേക്ക് പോകൂ ***
    await loadSiteSettings();
    
    // 2. ഇപ്പോൾ കോൺടാക്റ്റ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
    // ഈ സമയത്തിനുള്ളിൽ ലോഗിൻ പൂർത്തിയായിട്ടുണ്ടാവും.
    loadContactPageDetails();
});

/**
 * കോൺടാക്റ്റ് പേജിലെ പ്രധാന വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadContactPageDetails() {
    const contactPhoneMain = document.getElementById("contact-phone-main");
    const contactEmailMain = document.getElementById("contact-email-main");
    const contactAddressMain = document.getElementById("contact-address-main");

    if (!contactPhoneMain || !contactEmailMain || !contactAddressMain) {
        return;
    }

    try {
        // 'common.js' ലോഗിൻ പൂർത്തിയാക്കിയതുകൊണ്ട് ഈ കോഡ് ഇനി ശരിയായി പ്രവർത്തിക്കും
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const settings = docSnap.data();

            // ഫോൺ
            if (settings.phone) {
                contactPhoneMain.textContent = settings.phone;
                contactPhoneMain.href = `tel:${settings.phone}`;
            } else {
                contactPhoneMain.textContent = "Not available";
            }
            
            // ഇമെയിൽ
            if (settings.email) {
                contactEmailMain.textContent = settings.email;
                contactEmailMain.href = `mailto:${settings.email}`;
            } else {
                contactEmailMain.textContent = "Not available";
            }
            
            // വിലാസം
            if (settings.address) {
                contactAddressMain.textContent = settings.address;
            } else {
                contactAddressMain.textContent = "Not available";
            }
            
        } else {
            console.log("No site settings found at 'settings/global'.");
            contactPhoneMain.textContent = "Error loading";
            contactEmailMain.textContent = "Error loading";
            contactAddressMain.textContent = "Error loading";
        }
    } catch (error) {
        console.error("Error loading contact page settings: ", error);
        contactPhoneMain.textContent = "Error loading";
        contactEmailMain.textContent = "Error loading";
        contactAddressMain.textContent = "Error loading";
    }
}