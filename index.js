// index.js - Video Autoplay Fixed & Strict Image Sizing

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
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Silent');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadStickyCategories();
    loadHomeBanner(); 
    loadHeroSlider();
    loadTopDeals();         
    loadTopTrendyDeals();   
    loadTopDiscounts();     
});

/**
 * 1. Sticky Category Header
 */
async function loadStickyCategories() {
    const container = document.getElementById('home-category-list');
    if (!container) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snapshot = await getDocs(q);
        
        if(snapshot.empty) { container.innerHTML = ''; return; }

        let html = `
            <a href="categories.html" class="home-cat-item">
                <div class="home-cat-img-box">
                    <img src="https://placehold.co/60/fff/333?text=All" alt="All" class="home-cat-img">
                </div>
                <span class="home-cat-name">All</span>
            </a>
        `;

        snapshot.forEach(doc => {
            const data = doc.data();
            // Category Icon: Small size, transparent/white bg optimized
            const img = optimizeImage(data.imageUrl, 100);
            html += `
                <a href="categories.html?filter=${doc.id}" class="home-cat-item">
                    <div class="home-cat-img-box">
                        <img src="${img}" alt="${data.name}" class="home-cat-img" loading="lazy">
                    </div>
                    <span class="home-cat-name">${data.name}</span>
                </a>
            `;
        });
        container.innerHTML = html;

        // Scroll Logic
        const header = document.getElementById('sticky-category-header');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 150) {
                header.classList.add('compact');
            } else {
                header.classList.remove('compact');
            }
        });

    } catch(e) { console.error("Error loading categories", e); }
}

/**
 * 2. Hero Slider (FIXED: Autoplay & Video)
 */
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/800x450/000/fff?text=No+Slides" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                let isVideo = slide.type === 'video';
                let videoId = '', embedUrl = '', finalUrl = slide.url;

                if (isVideo) {
                    if (slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                        try { const id = slide.url.split('/d/')[1].split('/')[0]; finalUrl = `https://drive.google.com/uc?export=download&id=${id}`; } catch(e) {}
                    } 
                    else if (slide.url.includes('youtube.com') || slide.url.includes('youtu.be')) {
                        if (slide.url.includes('v=')) videoId = new URL(slide.url).searchParams.get('v');
                        else if (slide.url.includes('shorts')) videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                        else videoId = slide.url.split('youtu.be/')[1];
                        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&autoplay=1&playsinline=1`;
                    }
                }

                if (slide.type === 'image') {
                    const img = optimizeImage(slide.url, 1000, 90);
                    slideEl.innerHTML = `<img src="${img}" alt="Hero" loading="lazy">`;
                } else if (isVideo && embedUrl) {
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else if (isVideo) {
                    // Native Video
                    slideEl.innerHTML = `<video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline></video>`;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true,
            speed: 600,
            autoplay: {
                delay: 5000, // Autoplay Re-enabled
                disableOnInteraction: false,
            },
            pagination: { el: '.hero-pagination-dots', clickable: true },
            on: {
                slideChangeTransitionEnd: function () {
                    playActiveSlideVideo(this);
                }
            }
        });

        playActiveSlideVideo(heroSwiper);

    } catch (error) { console.error("Error loading hero slider"); }
}

function playActiveSlideVideo(swiper) {
    const slides = document.querySelectorAll('.hero-slider-new .swiper-slide');
    slides.forEach((slide) => {
        const video = slide.querySelector('video');
        if (video) {
            if (slide.classList.contains('swiper-slide-active')) {
                video.currentTime = 0;
                video.play().catch(e => {});
            } else {
                video.pause();
            }
        }
        // YouTube iframe logic usually handled by API, but 'autoplay=1' in URL helps.
    });
}

/**
 * 3. TOP DEALS (Blue Theme - Admin Controlled)
 */
async function loadTopDeals() {
    const section = document.getElementById('top-deals-section');
    const bannerContainer = document.getElementById('top-deals-banner-container');
    const grid = document.getElementById('top-deals-grid');
    if (!section) return;

    try {
        const settingsRef = doc(db, "settings", "homeLayout");
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists() && settingsSnap.data().topDealsBanner) {
            const bannerUrl = optimizeImage(settingsSnap.data().topDealsBanner, 1000, 85);
            bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="Top Deals" style="width:100%; border-radius:4px; display:block;">`;
        }

        const q = query(collection(db, "products"), where("isTopDeal", "==", true), limit(10));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            if (!settingsSnap.exists() || !settingsSnap.data().topDealsBanner) section.style.display = 'none';
            return;
        }

        let slidesHTML = '';
        snapshot.forEach(doc => {
            slidesHTML += createProductCardHTML(doc.id, doc.data());
        });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-deals-swiper', {
            slidesPerView: 2.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });

    } catch (e) { console.error(e); }
}

/**
 * 4. TOP TRENDY DEALS (Orange Theme - Featured)
 */
async function loadTopTrendyDeals() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) { grid.innerHTML = ''; return; }
        
        let slidesHTML = '';
        querySnapshot.forEach((doc) => {
            slidesHTML += createProductCardHTML(doc.id, doc.data());
        });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-sellers-swiper-new', {
            slidesPerView: 2.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });
        
    } catch (error) { console.error("Error loading trendy deals"); }
}

/**
 * 5. TOP DISCOUNT (Auto Calculated)
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
            if (p.mrp && p.price && p.mrp > p.price) {
                const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                products.push({ id: doc.id, ...p, discount });
            }
        });

        products.sort((a, b) => b.discount - a.discount);
        const topDiscounts = products.slice(0, 8);

        if (topDiscounts.length === 0) return;

        let html = '';
        topDiscounts.forEach(p => {
            html += createProductCardHTML(p.id, p, p.discount);
        });
        grid.innerHTML = html;

        new Swiper('.discount-swiper', {
            slidesPerView: 2.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 3.2 }, 1024: { slidesPerView: 5.2 } }
        });

    } catch(e) {}
}

/**
 * Helper: Create Standard Product Card HTML
 */
function createProductCardHTML(id, product, discountVal = null) {
    // *** Image Optimization: 300px square ***
    const img = optimizeImage(product.images?.[0] || '', 300, 80);
    
    let discountTag = '';
    if (discountVal) {
        discountTag = `<div style="position:absolute; top:5px; left:5px; background:#388e3c; color:#fff; font-size:0.6rem; padding:2px 4px; border-radius:2px; z-index:2;">${discountVal}% OFF</div>`;
    }

    return `
        <div class="swiper-slide">
            <a href="product.html?id=${id}" class="deal-card">
                ${discountTag}
                <div class="deal-img-box">
                    <img src="${img}" class="deal-img" loading="lazy" alt="${product.name}">
                </div>
                <div class="deal-info">
                    <div class="deal-title">${product.name}</div>
                    <div class="deal-price-box">
                        <span class="deal-price">₹${product.price}</span>
                    </div>
                    <div class="deal-btn-row">
                        <button class="btn-sm-primary btn-add-to-cart" data-id="${id}" 
                            data-name="${product.name}" data-price="${product.price}" 
                            data-mrp="${product.mrp}" data-image="${img}">
                            Add
                        </button>
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Banner Loader
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const optimizedUrl = optimizeImage(docSnap.data().homeBannerUrl, 800, 80);
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        }
    } catch (error) {}
}

// Add to Cart Listener
document.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (button) {
        e.preventDefault();
        e.stopPropagation(); // Prevent card click
        const id = button.dataset.id;
        
        if (button.classList.contains('added')) {
            removeFromCart(id);
            button.classList.remove('added');
            button.textContent = 'Add';
            button.style.background = 'var(--primary-gold)';
        } else {
            const product = {
                id: id, name: button.dataset.name, price: parseFloat(button.dataset.price),
                mrp: parseFloat(button.dataset.mrp), image: button.dataset.image, size: ''
            };
            addToCart(id, product);
            button.classList.add('added');
            button.textContent = 'Done';
            button.style.background = '#2ecc71';
        }
    }
});