// ============================================
// contact.js - Contact Page Script
// ============================================

import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';

// === Page Load ===
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadContactPageDetails();
});

/**
 * Contact Page کی معلومات لوڈ کریں
 */
async function loadContactPageDetails() {
    const contactPhoneMain = document.getElementById("contact-phone-main");
    const contactEmailMain = document.getElementById("contact-email-main");
    const contactAddressMain = document.getElementById("contact-address-main");

    if (!contactPhoneMain || !contactEmailMain || !contactAddressMain) {
        console.warn("⚠️ Contact elements not found in DOM");
        return;
    }

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const settings = docSnap.data();

            // Phone
            if (settings.phone) {
                contactPhoneMain.textContent = settings.phone;
                contactPhoneMain.href = `tel:${settings.phone}`;
            } else {
                contactPhoneMain.textContent = "Not available";
            }
            
            // Email
            if (settings.email) {
                contactEmailMain.textContent = settings.email;
                contactEmailMain.href = `mailto:${settings.email}`;
            } else {
                contactEmailMain.textContent = "Not available";
            }
            
            // Address
            if (settings.address) {
                contactAddressMain.textContent = settings.address;
            } else {
                contactAddressMain.textContent = "Not available";
            }

            console.log("✅ Contact details loaded successfully!");
            
        } else {
            console.log("⚠️ No site settings found at 'settings/global'.");
            contactPhoneMain.textContent = "Error loading";
            contactEmailMain.textContent = "Error loading";
            contactAddressMain.textContent = "Error loading";
        }
    } catch (error) {
        console.error("❌ Error loading contact page settings: ", error);
        contactPhoneMain.textContent = "Error loading";
        contactEmailMain.textContent = "Error loading";
        contactAddressMain.textContent = "Error loading";
    }
}