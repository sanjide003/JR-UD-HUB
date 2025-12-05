// index.js - Advanced Home Page Logic (Flipkart Style)

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

// Global Cache for Products to avoid multiple reads
let allProductsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    loadHomeBanner(); 
    loadHeroSlider();
    
    // 1. Fetch Categories for Icon Nav
    loadIconNav();

    // 2. Fetch Products ONCE and distribute to sections
    await fetchAllProductsAndDistribute();
});

/**
 * 1. ICON NAVIGATION (Categories)
 */
async function loadIconNav() {
    const container = document.getElementById('icon-nav-bar');
    if (!container) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snapshot = await getDocs(q);
        
        // Add 'All' as first item
        let html = `
            <a href="categories.html" class="icon-nav-item">
                <div class="icon-nav-img-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </div>
                <span class="icon-nav-text">All</span>
            </a>
        `;

        snapshot.forEach(doc => {
            const data = doc.data();
            const iconUrl = optimizeImage(data.imageUrl || '', 100);
            html += `
                <a href="categories.html?filter=${doc.id}" class="icon-nav-item">
                    <div class="icon-nav-img-box">
                        <img src="${iconUrl}" alt="${data.name}" class="icon-nav-img" loading="lazy">
                    </div>
                    <span class="icon-nav-text">${data.name}</span>
                </a>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading icon nav:", error);
        container.innerHTML = '';
    }
}

/**
 * 2. MASTER PRODUCT FETCHER
 * Fetches products and fills: Deals, Grid, Budget sections
 */
async function fetchAllProductsAndDistribute() {
    try {
        // Fetch up to 50 latest products
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        
        allProductsCache = [];
        snapshot.forEach(doc => {
            allProductsCache.push({ id: doc.id, ...doc.data() });
        });

        // Distribute to sections
        populateDealsOfDay(allProductsCache);
        populateTopDiscountGrid(allProductsCache);
        populateTrendyDeals(allProductsCache);
        populateBudgetBuys(allProductsCache);

    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

/**
 * 2.1 Deals of the Day (High Discount Items)
 * Logic: Show items with discount > 10%
 */
function populateDealsOfDay(products) {
    const container = document.getElementById('deals-of-day-grid');
    if (!container) return;

    // Calculate discount and sort by highest discount
    const discountedProducts = products.map(p => {
        let discount = 0;
        if (p.mrp && p.mrp > p.price) {
            discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
        }
        return { ...p, discount };
    }).filter(p => p.discount > 5).sort((a, b) => b.discount - a.discount).slice(0, 8); // Top 8 deals

    if (discountedProducts.length === 0) {
        // If no discounts, show random items
        renderSwiperCards(container, products.slice(0, 8));
    } else {
        renderSwiperCards(container, discountedProducts, true);
    }

    // Init Swiper
    new Swiper('.deals-section.blue-theme .deals-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 10,
        freeMode: true
    });
}

/**
 * 2.2 Top Discount Grid (2x2 Layout)
 * Logic: Take top 4 from the discounted list
 */
function populateTopDiscountGrid(products) {
    const container = document.getElementById('top-discount-grid');
    if (!container) return;

    const top4 = products.map(p => {
        let discount = 0;
        if (p.mrp && p.mrp > p.price) {
            discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
        }
        return { ...p, discount };
    }).sort((a, b) => b.discount - a.discount).slice(0, 4);

    let html = '';
    top4.forEach(p => {
        const img = optimizeImage(p.images?.[0] || '', 200);
        const discountTag = p.discount > 0 ? `<span class="grid-badge">${p.discount}% OFF</span>` : '';
        html += `
            <a href="product.html?id=${p.id}" class="grid-item-card">
                ${discountTag}
                <img src="${img}" alt="${p.name}" class="grid-img" loading="lazy">
                <div class="grid-name">${p.name}</div>
                <div class="grid-discount">₹${p.price}</div>
            </a>
        `;
    });
    container.innerHTML = html;
}

/**
 * 2.3 Trendy Deals (Orange Section)
 * Logic: Random mix or 'Featured' items
 */
function populateTrendyDeals(products) {
    const container = document.getElementById('trending-deals-grid');
    if (!container) return;

    // Filter featured items, or just shuffle
    let trendy = products.filter(p => p.featured);
    if (trendy.length < 4) trendy = products.sort(() => 0.5 - Math.random()).slice(0, 8);

    renderSwiperCards(container, trendy);

    new Swiper('.deals-section.orange-theme .deals-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 10,
        freeMode: true
    });
}

/**
 * 2.4 Budget Buys (Under 999)
 * Logic: Filter price < 999
 */
function populateBudgetBuys(products) {
    const container = document.getElementById('budget-buys-grid');
    if (!container) return;

    const budgetItems = products.filter(p => p.price <= 999).slice(0, 10);
    
    if (budgetItems.length === 0) {
        document.querySelector('.budget-section').style.display = 'none';
        return;
    }

    let html = '';
    budgetItems.forEach(p => {
        const img = optimizeImage(p.images?.[0] || '', 200);
        html += `
            <div class="swiper-slide">
                <a href="product.html?id=${p.id}" class="budget-card">
                    <div class="deal-img-box"><img src="${img}" alt="${p.name}" class="deal-img" loading="lazy"></div>
                    <div class="deal-info">
                        <div class="deal-name">${p.name}</div>
                        <div class="deal-price">₹${p.price}</div>
                    </div>
                </a>
            </div>
        `;
    });
    container.innerHTML = html;

    new Swiper('.budget-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 10,
        freeMode: true
    });
}

/**
 * Helper: Render Cards for Blue/Orange sections
 */
function renderSwiperCards(container, items, showTag = false) {
    let html = '';
    items.forEach(p => {
        const img = optimizeImage(p.images?.[0] || '', 200);
        const tag = showTag && p.discount > 0 ? `${p.discount}% OFF` : p.categoryName || 'Hot Deal';
        html += `
            <div class="swiper-slide">
                <a href="product.html?id=${p.id}" class="deal-card">
                    <div class="deal-img-box"><img src="${img}" alt="${p.name}" class="deal-img" loading="lazy"></div>
                    <div class="deal-info">
                        <div class="deal-name">${p.name}</div>
                        <div class="deal-price">₹${p.price}</div>
                        <div class="deal-tag">${tag}</div>
                    </div>
                </a>
            </div>
        `;
    });
    container.innerHTML = html;
}

// --- EXISTING FUNCTIONS (Hero Slider & Banner) ---

async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 800, 80);
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        }
    } catch (error) { console.error("Error loading banner"); }
}

async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper) return;
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/800x400/000000/D4AF37?text=JR+UD+HUB" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                if (slide.type === 'image') {
                    const imgUrl = optimizeImage(slide.url, 1000, 85);
                    slideEl.innerHTML = `<img src="${imgUrl}" alt="Hero" loading="lazy">`;
                } else if (slide.type === 'video') {
                    slideEl.innerHTML = `<video src="${slide.url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }
        new Swiper('.hero-slider-new', {
            loop: true, autoplay: { delay: 5000 },
            pagination: { el: '.hero-pagination-dots', clickable: true }
        });
    } catch (error) { console.error("Error loading hero slider"); }
}
