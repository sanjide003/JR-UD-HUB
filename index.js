// index.js - Merged: Old Hero Logic + New Product Card Logic

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    limit, 
    orderBy, 
    setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 

setLogLevel('Silent');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHomeBanner(); 
    loadHeroSlider();
    
    // Product Loaders (From Previous Turn - Screenshot Style)
    loadTopDeals();         
    loadTopTrendyDeals();   
    loadTopDiscounts();
    loadUnder799Products(); 
    loadHomeCategories(); 
    
    setupScrollReveal();
});


/**
 * 3. SPECIAL OFFER (Standard Card)
 */
async function loadTopDeals() {
    const section = document.getElementById('top-deals-section');
    const bannerContainer = document.getElementById('top-deals-banner-img');
    const grid = document.getElementById('top-deals-grid');
    if (!section) return;

    try {
        const settingsRef = doc(db, "settings", "homeLayout");
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists() && settingsSnap.data().topDealsBanner) {
            const bannerUrl = optimizeImage(settingsSnap.data().topDealsBanner, 1000, 85);
            if(bannerContainer) bannerContainer.src = bannerUrl;
            section.style.display = 'block'; 
        }

        const q = query(collection(db, "products"), where("isTopDeal", "==", true), limit(10));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            if (!settingsSnap.exists() || !settingsSnap.data().topDealsBanner) section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        let slidesHTML = '';
        snapshot.forEach(doc => { slidesHTML += createNewStyleProductCard(doc.id, doc.data()); });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-deals-swiper', {
            slidesPerView: 2.2, spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });
    } catch (e) { console.error(e); }
}

/**
 * 4. TOP TRENDY DEALS (Screenshot Style)
 */
async function loadTopTrendyDeals() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) { grid.innerHTML = ''; return; }
        
        let slidesHTML = '';
        querySnapshot.forEach((doc) => { slidesHTML += createNewStyleProductCard(doc.id, doc.data()); });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-sellers-swiper-new', {
            slidesPerView: 2.2, spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });
    } catch (error) { console.error("Error loading trendy deals"); }
}

/**
 * 5. TOP DISCOUNT (Screenshot Style - 2 ROWS)
 */
async function loadTopDiscounts() {
    const grid = document.getElementById("top-discount-grid");
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        let products = [];
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.isTopDeal === true || p.featured === true) return;
            if (p.mrp && p.price && p.mrp > p.price) {
                const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                products.push({ id: doc.id, ...p, discount });
            }
        });

        products.sort((a, b) => b.discount - a.discount);
        const topDiscounts = products.slice(0, 20); 

        if (topDiscounts.length === 0) {
            document.querySelector('.orange-section').style.display = 'none';
            return;
        }

        let html = '';
        topDiscounts.forEach(p => { html += createNewStyleProductCard(p.id, p, p.discount); });
        grid.innerHTML = html;

        new Swiper('.discount-swiper', {
            slidesPerView: 2.2,
            grid: { rows: 2, fill: 'row' },
            spaceBetween: 10,
            breakpoints: { 
                640: { slidesPerView: 3.2, grid: { rows: 2 } }, 
                1024: { slidesPerView: 5.2, grid: { rows: 2 } } 
            }
        });
    } catch(e) {}
}

/**
 * 6. UNDER 799 (Standard Style)
 */
async function loadUnder799Products() {
    const grid = document.getElementById("under-799-grid");
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), where("price", "<=", 799), orderBy("price", "desc"), limit(15));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return; 

        let slidesHTML = '';
        snapshot.forEach(doc => { slidesHTML += createNewStyleProductCard(doc.id, doc.data()); });
        grid.innerHTML = slidesHTML;

        new Swiper('.under-799-swiper', {
            slidesPerView: 2.2, spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });
    } catch (e) { console.error("Error loading Under 799:", e); }
}

/**
 * 7. CATEGORIES
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;
    try {
        const catQuery = query(collection(db, "categories"), orderBy("name")); 
        const catSnapshot = await getDocs(catQuery); 
        if (catSnapshot.empty) { container.innerHTML = ''; return; }
        
        let html = '';
        catSnapshot.forEach(doc => {
            const category = doc.data();
            const imageUrl = optimizeImage(category.imageUrl || '', 150, 75);
            html += `
                <div class="swiper-slide">
                    <a href="categories.html?filter=${doc.id}" class="category-circle-item">
                        <div class="category-circle-img-box">
                            <img src="${imageUrl}" alt="${category.name}" class="category-circle-img" loading="lazy">
                        </div>
                        <span class="category-circle-title">${category.name}</span>
                    </a>
                </div>
            `;
        });
        container.innerHTML = html;

        new Swiper('.category-swiper', {
            slidesPerView: 4, spaceBetween: 10, freeMode: true,
            breakpoints: { 640: { slidesPerView: 5 }, 1024: { slidesPerView: 7 } }
        });
    } catch (error) { console.error("Error loading home categories"); }
}

/**
 * HELPER: CARD GENERATOR
 */
function createNewStyleProductCard(id, product, discountVal = null) {
    const img = optimizeImage(product.images?.[0] || '', 500, 500);
    
    let badgeHTML = "";
    if (discountVal) {
        badgeHTML = `<div class="card-discount-badge red">${discountVal}% OFF</div>`;
    } else if (product.mrp > product.price) {
        const d = Math.round(((product.mrp - product.price) / product.mrp) * 100);
        badgeHTML = `<div class="card-discount-badge">${d}% OFF</div>`;
    }

    return `
        <div class="swiper-slide">
            <a href="product.html?id=${id}" class="clean-card-wrapper">
                ${badgeHTML}
                <div class="clean-card-box">
                    <img src="${img}" class="clean-card-img" loading="lazy" alt="${product.name}">
                </div>
                <div class="clean-card-details">
                    <h3 class="clean-card-title">${product.name}</h3>
                    <div class="clean-card-price-row">₹${product.price}</div>
                    <button class="shop-now-btn">Shop Now</button>
                </div>
            </a>
        </div>
    `;
}