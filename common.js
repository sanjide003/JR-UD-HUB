// ഈ ഫയലിൽ എല്ലാ പബ്ലിക് പേജുകൾക്കും (index, categories, product, contact)
// പൊതുവായി വേണ്ട ഫംഗ്ഷനുകൾ അടങ്ങിയിരിക്കുന്നു.

// ഫയർബേസിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ലോഗുകൾ കാണാൻ
setLogLevel('Debug');

/**
 * സൈറ്റിന്റെ പൊതുവായ വിവരങ്ങൾ (ലോഗോ, ഫൂട്ടർ, സോഷ്യൽ ലിങ്കുകൾ) ലോഡ് ചെയ്യുന്നു.
 * ഈ ഫംഗ്ഷൻ എല്ലാ പബ്ലിക് പേജുകളും വിളിക്കും.
 */
export async function loadSiteSettings() {
    // --- DOM Elements (Common) ---
    // Header
    const headerLogoLink = document.getElementById("header-logo-link");
    
    // Footer
    const footerCategoryList = document.getElementById("footer-category-list");
    const footerPhone = document.getElementById("footer-phone");
    const footerEmail = document.getElementById("footer-email");
    const footerAddress = document.getElementById("footer-address");
    const facebookLink = document.getElementById("facebook-link");
    const instagramLink = document.getElementById("instagram-link");

    // Common
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
                    // ഇമേജ് ഇല്ലെങ്കിൽ ടെക്സ്റ്റ് കാണിക്കുന്നു
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
            // പിശക് സംഭവിച്ചാൽ "Loading..." എന്ന് മാറ്റി ഒരു എറർ മെസ്സേജ് കാണിക്കുന്നു
            if (contactPhoneMain) contactPhoneMain.textContent = "Data not found";
            if (contactEmailMain) contactEmailMain.textContent = "Data not found";
            if (contactAddressMain) contactAddressMain.textContent = "Data not found";
        }
    } catch (error) {
        console.error("Error loading site settings: ", error);
        // പിശക് സംഭവിച്ചാൽ "Loading..." എന്ന് മാറ്റി ഒരു എറർ മെസ്സേജ് കാണിക്കുന്നു
        if (contactPhoneMain) contactPhoneMain.textContent = "Error loading data";
        if (contactEmailMain) contactEmailMain.textContent = "Error loading data";
        if (contactAddressMain) contactAddressMain.textContent = "Error loading data";
    }
}