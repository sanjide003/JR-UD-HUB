// ഈ ഫയലിൽ എല്ലാ പബ്ലിക് പേജുകൾക്കും പൊതുവായി വേണ്ട ഫംഗ്ഷനുകൾ
// **** വിട്ടുപോയ ഇമ്പോർട്ടുകൾ ഇവിടെ ചേർത്തു ****
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug');

/**
 * സൈറ്റിന്റെ പൊതുവായ വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു.
 */
export async function loadSiteSettings() {
    // --- DOM Elements (Common) ---
    const headerLogoLink = document.getElementById("header-logo-link");
    const footerCategoryList = document.getElementById("footer-category-list");
    const footerPhone = document.getElementById("footer-phone");
    const footerEmail = document.getElementById("footer-email");
    const footerAddress = document.getElementById("footer-address");
    const facebookLink = document.getElementById("facebook-link");
    const instagramLink = document.getElementById("instagram-link");
    const whatsappFloatBtn = document.getElementById("whatsapp-float-btn");

    // Contact Page (contact.html-ൽ മാത്രം)
    const contactPhoneMain = document.getElementById("contact-phone-main");
    const contactEmailMain = document.getElementById("contact-email-main");
    const contactAddressMain = document.getElementById("contact-address-main");

    try {
        // 1. ഫൂട്ടറിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു
        if (footerCategoryList) {
            const catSnapshot = await getDocs(collection(db, "categories"));
            footerCategoryList.innerHTML = '';
            catSnapshot.forEach((doc) => {
                const category = doc.data();
                const footerLink = document.createElement('li');
                footerLink.innerHTML = `<a href="categories.html?filter=${doc.id}">${category.name}</a>`;
                footerCategoryList.appendChild(footerLink);
            });
        }

        // 2. മറ്റ് സെറ്റിംഗ്സ് (global) ലോഡ് ചെയ്യുന്നു
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const settings = docSnap.data();

            // 1. Logo Image
            if (headerLogoLink) {
                if (settings.logoImageUrl) {
                    headerLogoLink.innerHTML = `<img src="${settings.logoImageUrl}" alt="Al Ambar Perfumes" class="logo-image">`;
                } else {
                    headerLogoLink.innerHTML = `<span class="logo-text">AL AMBAR</span>`;
                }
            }
            
            // 2. WhatsApp
            if (settings.whatsapp) {
                const whatsappLink = `https://wa.me/${settings.whatsapp}?text=Hello%20Al%20Ambar`;
                if (whatsappFloatBtn) whatsappFloatBtn.href = whatsappLink;
            }
            
            // 3. Phone (Footer + Contact Page)
            if (settings.phone) {
                if (footerPhone) {
                    footerPhone.textContent = settings.phone;
                    footerPhone.href = `tel:${settings.phone}`;
                }
                if (contactPhoneMain) {
                    contactPhoneMain.textContent = settings.phone;
                    contactPhoneMain.href = `tel:${settings.phone}`;
                }
            }
            
            // 4. Email (Footer + Contact Page)
            if (settings.email) {
                if (footerEmail) {
                    footerEmail.textContent = settings.email;
                    footerEmail.href = `mailto:${settings.email}`;
                }
                if (contactEmailMain) {
                    contactEmailMain.textContent = settings.email;
                    contactEmailMain.href = `mailto:${settings.email}`;
                }
            }
            
            // 5. Address (Footer + Contact Page)
            if (settings.address) {
                if (footerAddress) footerAddress.textContent = settings.address;
                if (contactAddressMain) contactAddressMain.textContent = settings.address;
            }

            // 6. Social Media Links
            if (facebookLink) facebookLink.href = settings.facebookUrl || '#';
            if (instagramLink) instagramLink.href = settings.instagramUrl || '#';

        } else {
            console.log("No site settings found. Using default values.");
            if (contactPhoneMain) contactPhoneMain.textContent = "Data not found";
            // ... (മറ്റുള്ളവയും)
        }
    } catch (error) {
        console.error("Error loading site settings: ", error);
        if (contactPhoneMain) contactPhoneMain.textContent = "Error loading data";
        // ... (മറ്റുള്ളവയും)
    }
}