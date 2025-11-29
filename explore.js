// ഇതാണ് 'explore.js' ഫയൽ.
// മാറ്റങ്ങൾ:
// 1. Grid View: ലളിതമായ ഇമേജ് ഗ്രിഡ് (വിശദാംശങ്ങൾ ഇല്ല).
// 2. Load Count: 21 എണ്ണം വീതം ലോഡ് ചെയ്യുന്നു (3 കൊണ്ട് ഹരിക്കാവുന്നത്).

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    limit,
    startAfter,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, fetchSiteSettings, optimizeImage } from './common.js'; 
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Silent');

const feedContainer = document.getElementById("explore-feed");
const loader = document.getElementById("explore-scroll-loader");
let lastVisible = null;
let isLoading = false;
const PRODUCTS_PER_PAGE = 21; // ഗ്രിഡിന് അനുയോജ്യമായ എണ്ണം (3x7)
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    const settings = await fetchSiteSettings();
    if (settings && settings.homeBannerUrl) {
        loadExploreBanner(settings.homeBannerUrl);
    }
    await loadProducts();     
});

function loadExploreBanner(bannerUrl) {
    const bannerContainer = document.getElementById('explore-top-banner');
    if (!bannerContainer || !bannerUrl) return;
    const optimizedUrl = optimizeImage(bannerUrl, 1200, 85);
    bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Special Offer Banner" loading="lazy">`;
    bannerContainer.style.display = 'block';
}

async function loadProducts() {
    if (isLoading) return;
    isLoading = true;
    if (loader) loader.style.display = 'flex';
    if (lastVisible === null) feedContainer.innerHTML = ''; 

    try {
        const productsRef = collection(db, "products");
        let q;
        
        if (lastVisible) {
            q = query(productsRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(PRODUCTS_PER_PAGE));
        } else {
            q = query(productsRef, orderBy("createdAt", "desc"), limit(PRODUCTS_PER_PAGE));
        }

        const documentSnapshots = await getDocs(q);
        if (documentSnapshots.empty) {
            if (feedContainer.innerHTML === '') {
                feedContainer.innerHTML = '<p class="loading-placeholder-full">No products found.</p>';
            }
            if (loader) loader.style.display = 'none';
            return;
        }
        
        lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // പ്രൊഡക്റ്റ് ലൂപ്പ്
        documentSnapshots.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            
            // ലളിതമായ ഇമേജ് കാർഡ് (No slider, no buttons)
            const card = document.createElement('a');
            card.href = `product.html?id=${productId}`;
            card.className = 'explore-card';
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/300x300/1e1e1e/D4AF37?text=No+Image';
            // ചെറിയ സൈസ് ഇമേജ് (Grid-ന് 300px ധാരാളം)
            const imageUrl = optimizeImage(rawImage, 300, 70);

            card.innerHTML = `
                <img src="${imageUrl}" alt="${product.name}" loading="lazy">
            `;
            feedContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading products: ", error);
        feedContainer.innerHTML = '<p class="loading-placeholder-full">Error loading products.</p>';
    } finally {
        isLoading = false;
        if (loader) loader.style.display = 'none';
    }
}

// *** Infinite Scroll ***
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) { 
        loadProducts();
    }
}, { rootMargin: '200px' }); // താഴെ എത്തുന്നതിന് അല്പം മുൻപേ ലോഡ് ചെയ്യും

if (loader) { observer.observe(loader); }