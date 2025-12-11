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
 * ഹോം പേജ് ബാനർ
 */
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 800, 80);
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Special Offer Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading home banner");
        bannerContainer.style.display = 'none';
    }
}

/**
 * 1. ഹീറോ സ്ലൈഡർ (All Video Types + Scroll Logic)
 */
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/600x800/000000/D4AF37?text=JR+UD+HUB" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                let isVideo = slide.type === 'video';
                let videoId = '';
                let embedUrl = '';
                let finalUrl = slide.url;

                // --- Video URL Parsing (പഴയ കോഡിൽ നിന്ന്) ---
                if (isVideo) {
                    // Google Drive Link
                    if (slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                        try {
                            const id = slide.url.split('/d/')[1].split('/')[0];
                            finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
                        } catch(e) {}
                    } 
                    // YouTube Watch URL
                    else if (slide.url.includes('youtube.com/watch?v=')) {
                        videoId = new URL(slide.url).searchParams.get('v');
                    }
                    // YouTube Shorts URL
                    else if (slide.url.includes('youtube.com/shorts/')) {
                        videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                    }
                    // YouTube Short Link (youtu.be)
                    else if (slide.url.includes('youtu.be/')) {
                        videoId = slide.url.split('youtu.be/')[1];
                    }

                    if (videoId) {
                        // YouTube Embed with JS API enabled
                        embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1&autoplay=1`;
                    }
                }

                // --- HTML Content ---
                if (slide.type === 'image') {
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 85);
                    slideEl.innerHTML = `<img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy">`;
                }
                else if (isVideo && embedUrl) {
                    // YouTube Iframe
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%; pointer-events:none;"></iframe>`;
                }
                else if (isVideo) {
                    // Direct Video (MP4/Drive)
                    slideEl.innerHTML = `
                        <video class="hero-video-element" 
                               src="${finalUrl}" 
                               autoplay 
                               muted 
                               loop 
                               playsinline 
                               preload="auto"
                               style="width: 100%; height: 100%; object-fit: cover;">
                        </video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        // Swiper Configuration
        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true, 
            allowTouchMove: true,
            speed: 600,
            autoplay:{
                delay: 6000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            },
            on: {
                slideChangeTransitionEnd: function () {
                    playActiveSlideVideo(this);
                }
            }
        });

        // ആദ്യത്തെ സ്ലൈഡിലെ വീഡിയോ പ്ലേ ചെയ്യുന്നു
        playActiveSlideVideo(heroSwiper);
        
        // സ്ക്രോൾ ചെയ്യുമ്പോൾ പോസ്/റീസ്യൂം ചെയ്യാനുള്ള ഫംഗ്ഷൻ വിളിക്കുന്നു
        setupScrollVideoObserver();

    } catch (error) { console.error("Error loading hero slider"); }
}

// ആക്ടീവ് സ്ലൈഡിലെ വീഡിയോ പ്ലേ ചെയ്യാനും മറ്റുള്ളവ പോസ് ചെയ്യാനും
function playActiveSlideVideo(swiper) {
    const slides = document.querySelectorAll('.hero-slider-new .swiper-slide');
    
    slides.forEach((slide) => {
        // Direct Videos
        const video = slide.querySelector('video');
        if (video) {
            if (slide.classList.contains('swiper-slide-active')) {
                video.currentTime = 0;
                video.play().catch(e => {});
            } else {
                video.pause();
            }
        }
        
        // YouTube Iframes
        const iframe = slide.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            if (slide.classList.contains('swiper-slide-active')) {
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            } else {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        }
    });
}

// *** Scroll Observer (സ്ക്രോൾ ചെയ്യുമ്പോൾ Pause/Resume ആവാൻ) ***
function setupScrollVideoObserver() {
    const sliderContainer = document.querySelector('.hero-section-new');
    if (!sliderContainer) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // നിലവിൽ ആക്ടീവ് ആയിട്ടുള്ള സ്ലൈഡ് കണ്ടെത്തുന്നു
            const activeSlide = document.querySelector('.hero-slider-new .swiper-slide-active');
            if (!activeSlide) return;

            const video = activeSlide.querySelector('video');
            const iframe = activeSlide.querySelector('iframe');

            if (entry.isIntersecting) {
                // സ്ക്രീനിൽ സ്ലൈഡർ വന്നാൽ Play ചെയ്യുക
                if (video) video.play().catch(e => {});
                if (iframe) iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            } else {
                // സ്ക്രീനിൽ നിന്ന് പോയാൽ Pause ചെയ്യുക
                if (video) video.pause();
                if (iframe) iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        });
    }, { threshold: 0.5 }); // 50% ഭാഗം കാണുമ്പോഴേക്കും പ്രവർത്തിക്കും

    observer.observe(sliderContainer);
}

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
