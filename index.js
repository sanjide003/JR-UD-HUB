// index.js - Updated Logic for Manual Special Discounts

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

let allProductsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    loadHomeBanner(); 
    loadSpecialDiscountBanner(); 
    loadIconNav();
    loadHeroSlider();
    await fetchAllProductsAndDistribute();
});

// 1. HOME BANNER
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 1200, 90); 
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        }
    } catch (error) { console.error("Error loading banner"); }
}

// 1.5 SPECIAL DISCOUNT BANNER
async function loadSpecialDiscountBanner() {
    const bannerContainer = document.getElementById('special-discount-banner');
    if (!bannerContainer) return;
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().specialDiscountBannerUrl) {
            const bannerUrl = docSnap.data().specialDiscountBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 1200, 90); 
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Big Discount Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        }
    } catch (error) { console.error("Error loading special banner"); }
}

// 2. ICON NAV
async function loadIconNav() {
    const container = document.getElementById('icon-nav-bar');
    if (!container) return;
    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snapshot = await getDocs(q);
        
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
    } catch (error) { console.error("Error loading icon nav:", error); }
}

// 3. HERO SLIDER
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper) return;
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/800x450/000000/D4AF37?text=No+Slides" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                let isVideo = slide.type === 'video';
                let videoId = '';
                let embedUrl = '';
                let isShorts = false; 

                if (isVideo) {
                    try {
                        const urlObj = new URL(slide.url);
                        if (urlObj.hostname.includes('youtube.com')) {
                            if (urlObj.pathname.startsWith('/shorts/')) {
                                videoId = urlObj.pathname.split('/shorts/')[1];
                                isShorts = true;
                            } else if (urlObj.searchParams.has('v')) {
                                videoId = urlObj.searchParams.get('v');
                            }
                        } else if (urlObj.hostname.includes('youtu.be')) {
                            videoId = urlObj.pathname.slice(1);
                        }
                        if (videoId) {
                            embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1&autoplay=1`;
                        }
                    } catch (e) { console.error("Invalid Video URL"); }
                }

                if (slide.type === 'image') {
                    const imgUrl = optimizeImage(slide.url, 1200, 90);
                    slideEl.innerHTML = `<img src="${imgUrl}" alt="Hero" loading="lazy">`;
                } 
                else if (isVideo && embedUrl) {
                    if (isShorts) {
                        slideEl.innerHTML = `<div class="video-wrapper-3-4"><iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
                    } else {
                        slideEl.innerHTML = `<div class="video-wrapper-16-9"><iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
                    }
                } 
                else if (isVideo) {
                    slideEl.innerHTML = `<div class="video-wrapper-3-4"><video class="hero-video-element" src="${slide.url}" autoplay muted loop playsinline></video></div>`;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }

        new Swiper('.hero-slider-new', {
            loop: true, autoHeight: true, 
            autoplay: { delay: 6000, disableOnInteraction: false },
            pagination: { el: '.hero-pagination-dots', clickable: true },
            allowTouchMove: true,
            on: { slideChangeTransitionEnd: function () { playActiveSlideVideo(this); } }
        });
    } catch (error) { console.error("Error loading hero slider"); }
}

function playActiveSlideVideo(swiper) {
    const slides = document.querySelectorAll('.hero-slider-new .swiper-slide');
    slides.forEach((slide) => {
        const video = slide.querySelector('video');
        const iframe = slide.querySelector('iframe');
        if (slide.classList.contains('swiper-slide-active')) {
            if (video) { video.currentTime = 0; video.play().catch(e => {}); }
            if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } else {
            if (video) video.pause();
            if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    });
}

// 4. PRODUCT FETCHING
async function fetchAllProductsAndDistribute() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        
        allProductsCache = [];
        snapshot.forEach(doc => {
            allProductsCache.push({ id: doc.id, ...doc.data() });
        });

        populateSpecialDiscounts(allProductsCache); // *** Manual List ***
        populateDealsOfDay(allProductsCache);
        populateTopDiscountGrid(allProductsCache);
        populateTrendyDeals(allProductsCache); // *** Manual List ***
        
        populateBudgetSection(allProductsCache, 999, 'budget-buys-999', 'section-budget-999');
        populateBudgetSection(allProductsCache, 599, 'budget-buys-599', 'section-budget-599');

        initBudgetSwipers();

    } catch (error) { console.error("Error fetching products:", error); }
}

// *** UPDATED: Populate items MANUALLY marked as 'specialDiscount' ***
function populateSpecialDiscounts(products) {
    const container = document.getElementById('special-discount-grid');
    const section = document.getElementById('special-discount-section');
    if (!container || !section) return;

    // Filter by specialDiscount flag
    const items = products.filter(p => p.specialDiscount === true);

    if (items.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    renderSwiperCards(container, items, true);

    new Swiper('.deals-section.red-theme .deals-swiper', {
        slidesPerView: 3, spaceBetween: 10, freeMode: false, 
        breakpoints: { 768: { slidesPerView: 4 }, 1024: { slidesPerView: 5 } }
    });
}

// *** UPDATED: Populate items MANUALLY marked as 'featured' (Trendy Deals) ***
function populateTrendyDeals(products) {
    const container = document.getElementById('trending-deals-grid');
    if (!container) return;
    
    // Filter by featured flag
    let trendy = products.filter(p => p.featured === true);
    
    renderSwiperCards(container, trendy);
    
    new Swiper('.deals-section.orange-theme .deals-swiper', {
        slidesPerView: 3, spaceBetween: 10, freeMode: false,
        breakpoints: { 768: { slidesPerView: 4 }, 1024: { slidesPerView: 5 } }
    });
}

function populateDealsOfDay(products) {
    const container = document.getElementById('deals-of-day-grid');
    if (!container) return;
    // Keep this auto or change to manual if needed. Currently auto (random/latest)
    const items = products.slice(0, 10); 
    renderSwiperCards(container, items, true);

    new Swiper('.deals-section.blue-theme .deals-swiper', {
        slidesPerView: 3, spaceBetween: 10, freeMode: false, 
        breakpoints: { 768: { slidesPerView: 4 }, 1024: { slidesPerView: 5 } }
    });
}

function populateBudgetSection(products, priceLimit, containerId, sectionId) {
    const container = document.getElementById(containerId);
    const section = document.getElementById(sectionId);
    if (!container || !section) return;

    const budgetItems = products.filter(p => p.price <= priceLimit).slice(0, 10);
    
    if (budgetItems.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
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
}

function initBudgetSwipers() {
    new Swiper('.budget-swiper', { 
        slidesPerView: 3, spaceBetween: 10,
        breakpoints: { 768: { slidesPerView: 4 }, 1024: { slidesPerView: 6 } }
    });
}

function populateTopDiscountGrid(products) {
    const container = document.getElementById('top-discount-grid');
    if (!container) return;
    const top4 = products.map(p => {
        let discount = 0;
        if (p.mrp && p.mrp > p.price) { discount = Math.round(((p.mrp - p.price) / p.mrp) * 100); }
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

function renderSwiperCards(container, items, showTag = false) {
    let html = '';
    items.forEach(p => {
        const img = optimizeImage(p.images?.[0] || '', 200);
        // Calculate discount tag
        let discount = 0;
        if (p.mrp && p.mrp > p.price) {
             discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
        }
        const tag = (showTag && discount > 0) ? `${discount}% OFF` : (p.categoryName || 'Hot Deal');
        
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