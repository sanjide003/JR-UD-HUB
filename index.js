// index.js - New Card Style (No Buttons) & Swipeable Categories

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
    loadTopDeals();         
    loadTopTrendyDeals();   
    loadTopDiscounts();     
    loadHomeCategories(); 
});

// Banner
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

/**
 * 2. Hero Slider (Autoplay OFF)
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
                    slideEl.innerHTML = `<video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline></video>`;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true,
            speed: 600,
            autoplay: false, 
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
    });
}

/**
 * 3. SPECIAL OFFER (Blue Style)
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
            bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="Special Offer">`;
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
        snapshot.forEach(doc => {
            slidesHTML += createCleanProductCard(doc.id, doc.data());
        });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-deals-swiper', {
            slidesPerView: 3.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 4.2 }, 1024: { slidesPerView: 5.2 } }
        });

    } catch (e) { console.error(e); }
}

/**
 * 4. TOP TRENDY DEALS (Orange Style)
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
            slidesHTML += createCleanProductCard(doc.id, doc.data());
        });
        grid.innerHTML = slidesHTML;

        new Swiper('.top-sellers-swiper-new', {
            slidesPerView: 3.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 4.2 }, 1024: { slidesPerView: 5.2 } }
        });
        
    } catch (error) { console.error("Error loading trendy deals"); }
}

/**
 * 5. TOP DISCOUNT (Exclusive & Auto)
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
            
            // Exclude manually featured items
            if (p.isTopDeal === true || p.featured === true) {
                return; 
            }

            if (p.mrp && p.price && p.mrp > p.price) {
                const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                products.push({ id: doc.id, ...p, discount });
            }
        });

        products.sort((a, b) => b.discount - a.discount);
        const topDiscounts = products.slice(0, 8);

        if (topDiscounts.length === 0) {
            document.querySelector('.orange-section').style.display = 'none';
            return;
        }

        let html = '';
        topDiscounts.forEach(p => {
            html += createCleanProductCard(p.id, p, p.discount);
        });
        grid.innerHTML = html;

        new Swiper('.discount-swiper', {
            slidesPerView: 3.2,
            spaceBetween: 10,
            breakpoints: { 640: { slidesPerView: 4.2 }, 1024: { slidesPerView: 5.2 } }
        });

    } catch(e) {}
}

/**
 * 6. SHOP BY CATEGORY (Swiper with 4 visible)
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;
    try {
        const catQuery = query(collection(db, "categories"), orderBy("name")); // Load ALL categories
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

        // Initialize Swiper for Categories - 4 per view
        new Swiper('.category-swiper', {
            slidesPerView: 4, 
            spaceBetween: 10,
            freeMode: true,   
            breakpoints: {
                640: { slidesPerView: 5 },
                1024: { slidesPerView: 7 }
            }
        });

    } catch (error) { console.error("Error loading home categories"); }
}

/**
 * HELPER: CLEAN CARD DESIGN (No Buttons, Flutter Style)
 */
function createCleanProductCard(id, product, discountVal = null) {
    const img = optimizeImage(product.images?.[0] || '', 300, 80);
    
    // Determine Offer Text
    let offerText = "";
    if (discountVal) {
        offerText = `Up to ${discountVal}% Off`;
    } else if (product.mrp > product.price) {
        const d = Math.round(((product.mrp - product.price) / product.mrp) * 100);
        offerText = `Min ${d}% Off`;
    } else {
        offerText = `From ₹${product.price}`;
    }

    return `
        <div class="swiper-slide">
            <a href="product.html?id=${id}" class="clean-card-wrapper">
                <div class="clean-card-box">
                    <img src="${img}" class="clean-card-img" loading="lazy" alt="${product.name}">
                    <div class="clean-card-offer-bar">${offerText}</div>
                </div>
                <div class="clean-card-title">${product.name}</div>
            </a>
        </div>
    `;
}