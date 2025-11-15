// ഇതാണ് 'contact.js' ഫയൽ.
// *** Vercel-ൽ പ്രവർത്തിക്കാനായി പാതകൾ ശരിയാക്കി ***

import { 
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js'; // appId ഇമ്പോർട്ട് ചെയ്യേണ്ട ആവശ്യമില്ല
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    // 1. പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ, മെനു, കാർട്ട്) ലോഡ് ചെയ്യുന്നു
    loadSiteSettings();
    
    // 2. ഈ പേജിന് മാത്രമുള്ള കോൺടാക്റ്റ് വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
    loadContactPageDetails();
});

/**
 * കോൺടാക്റ്റ് പേജിലെ പ്രധാന വിവരങ്ങൾ (മാപ്പിന് അടുത്തുള്ള) ലോഡ് ചെയ്യുന്നു
 */
async function loadContactPageDetails() {
    // DOM എലമെന്റുകൾ
    const contactPhoneMain = document.getElementById("contact-phone-main");
    const contactEmailMain = document.getElementById("contact-email-main");
    const contactAddressMain = document.getElementById("contact-address-main");

    if (!contactPhoneMain || !contactEmailMain || !contactAddressMain) {
        return;
    }

    try {
        // *** ഇതാണ് ശരിയായ പാത്ത് ***
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