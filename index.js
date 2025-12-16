// index.js - Optimized Home Page Logic

import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings, fetchSiteSettings, optimizeImage } from './common.js'; 

setLogLevel('Silent');

const productsGrid = document.getElementById('home-products-grid');
const bannerContainer = document.getElementById('home-banner-container');
const categoriesContainer = document.getElementById('home-categories-container');

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    loadHomeData();
});

async function loadHomeData() {
    // 1. Load Banner
    const settings = await fetchSiteSettings();
    if (settings && settings.homeBannerUrl) {
        const optimizedBanner = optimizeImage(settings.homeBannerUrl, 800); // Optimize banner
        bannerContainer.innerHTML = `<img src="${optimizedBanner}" alt="Welcome" loading="eager">`;
        bannerContainer.style.display = 'block';
    } else {
        bannerContainer.style.display = 'none';
    }

    // 2. Load Products (Limit 10 for speed)
    loadFeaturedProducts();

    // 3. Load Categories (Simple list)
    loadHomeCategories();
}

async function loadFeaturedProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(12));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            productsGrid.innerHTML = '<p class="home-loader">No products found.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const id = doc.id;
            
            // Image Handling
            let imageSrc = 'https://placehold.co/400x400/222/D4AF37?text=No+Image';
            if (product.images && product.images.length > 0) {
                imageSrc = optimizeImage(product.images[0], 400); // 400px optimized width
            }

            // Price Logic
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            let priceDisplay = `<span class="card-price">₹${price}</span>`;
            let badgeHtml = '';

            if (mrp > price) {
                priceDisplay += `<span class="card-mrp">₹${mrp}</span>`;
                const discount = Math.round(((mrp - price) / mrp) * 100);
                badgeHtml = `<span class="card-badge">${discount}% OFF</span>`;
            }

            // Compact Button HTML
            html += `
                <div class="home-product-card" onclick="window.location.href='product.html?id=${id}'" style="cursor: pointer;">
                    <div class="card-image-container">
                        ${badgeHtml}
                        <img src="${imageSrc}" alt="${product.name}" loading="lazy">
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${product.name}</h3>
                        <div class="card-price-row">${priceDisplay}</div>
                        <div class="card-actions">
                            <button class="btn-shop-now" onclick="event.stopPropagation(); window.location.href='product.html?id=${id}'">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                                SHOP NOW
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        productsGrid.innerHTML = html;

    } catch (error) {
        console.error("Home products error:", error);
        productsGrid.innerHTML = '<p class="home-loader">Error loading products.</p>';
    }
}

async function loadHomeCategories() {
    try {
        const q = query(collection(db, "categories"), limit(8));
        const snapshot = await getDocs(q);
        
        let html = '';
        snapshot.forEach(doc => {
            const cat = doc.data();
            const img = cat.imageUrl ? optimizeImage(cat.imageUrl, 100) : 'https://placehold.co/100x100/333/fff?text=C';
            html += `
                <a href="categories.html?filter=${doc.id}" style="text-align: center; text-decoration: none; min-width: 70px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; margin: 0 auto 5px; border: 1px solid var(--primary-gold);">
                        <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-color);">${cat.name}</span>
                </a>
            `;
        });
        if(html) categoriesContainer.innerHTML = html;
        else categoriesContainer.parentElement.style.display = 'none';

    } catch(e) { console.error(e); }
}