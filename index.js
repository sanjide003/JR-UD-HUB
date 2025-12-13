// index.js - Optimized for Free Plan (getDocs instead of onSnapshot)

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, // Use getDocs mostly
    doc, 
    getDoc, 
    query, 
    orderBy, 
    setLogLevel,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 

setLogLevel('Silent');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHomeBanner(); 
    loadHeroSlider();
    loadHeroText();
    
    // Product Loaders - All using Cache/Get strategy
    loadTopDeals();         
    loadTopTrendyDeals();   
    loadTopDiscounts();
    loadUnder799Products(); 
    loadHomeCategories(); 
    
    setupScrollReveal();
});

function setupScrollReveal() {
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    const sections = document.querySelectorAll('.home-section, .hero-text-section');
    sections.forEach(section => {
        section.classList.add('scroll-reveal');
        observer.observe(section);
    });
}

async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().homeBannerUrl && docSnap.data().homeBannerUrl.trim() !== '') {
            const bannerUrl = docSnap.data().homeBannerUrl;
            const optimizedUrl = optimizeImage(bannerUrl, 1500, 90); 
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Offer Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading banner");
        bannerContainer.style.display = 'none';
    }
}

async function loadHeroText() {
    const section = document.querySelector('.hero-text-section');
    if(!section) return;
    const text = section.innerText.trim();
    if(text.length < 5) {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
    }
}

async function loadHeroSlider() {
    const sliderContainer = document.querySelector('.hero-section-new');
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    if (!sliderWrapper || !sliderContainer) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        // This will use cache if available
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            sliderContainer.style.display = 'none';
            return;
        }

        sliderContainer.style.display = 'block';
        sliderWrapper.innerHTML = '';
        
        let hasPortraitContent = false;

        querySnapshot.forEach((doc) => {
            const s = doc.data();
            if(s.type === 'video' && s.url.includes('shorts')) {
                hasPortraitContent = true;
            }
        });

        if(hasPortraitContent) {
            sliderContainer.classList.add('aspect-portrait');
        } else {
            sliderContainer.classList.remove('aspect-portrait');
        }

        querySnapshot.forEach((doc) => {
            const slide = doc.data();
            const slideEl = document.createElement('div');
            slideEl.className = 'swiper-slide';

            let isVideo = slide.type === 'video';
            let videoId = '';
            let embedUrl = '';
            let finalUrl = slide.url;

            if (isVideo) {
                if (slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                    try { const id = slide.url.split('/d/')[1].split('/')[0]; finalUrl = `https://drive.google.com/uc?export=download&id=${id}`; } catch(e) {}
                } 
                else if (slide.url.includes('youtube.com/watch?v=')) {
                    videoId = new URL(slide.url).searchParams.get('v');
                }
                else if (slide.url.includes('youtube.com/shorts/')) {
                    videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                }
                else if (slide.url.includes('youtu.be/')) {
                    videoId = slide.url.split('youtu.be/')[1];
                }

                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1&autoplay=1`;
                }
            }

            if (slide.type === 'image') {
                const imgUrl = optimizeImage(slide.url, 1200, 90);
                slideEl.innerHTML = `<img src="${imgUrl}" alt="Hero" loading="lazy">`;
            }
            else if (isVideo && embedUrl) {
                slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%; pointer-events:none;"></iframe>`;
            }
            else if (isVideo) {
                slideEl.innerHTML = `<video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline preload="auto" style="width:100%; height:100%; object-fit: cover;"></video>`;
            }
            
            sliderWrapper.appendChild(slideEl);
        });

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true, 
            allowTouchMove: true,
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
        setupScrollVideoObserver();

    } catch (error) { 
        console.error("Error loading hero slider", error); 
        sliderContainer.style.display = 'none';
    }
}

function playActiveSlideVideo(swiper) {
    const slides = document.querySelectorAll('.hero-slider-new .swiper-slide');
    slides.forEach((slide) => {
        const video = slide.querySelector('video');
        if (video) {
            if (slide.classList.contains('swiper-slide-active')) {
                video.currentTime = 0; video.play().catch(e => {});
            } else { video.pause(); }
        }
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

function setupScrollVideoObserver() {
    const sliderContainer = document.querySelector('.hero-section-new');
    if (!sliderContainer) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const activeSlide = document.querySelector('.hero-slider-new .swiper-slide-active');
            if (!activeSlide) return;
            const video = activeSlide.querySelector('video');
            const iframe = activeSlide.querySelector('iframe');
            if (entry.isIntersecting) {
                if (video) video.play().catch(e => {});
                if (iframe) iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            } else {
                if (video) video.pause();
                if (iframe) iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        });
    }, { threshold: 0.5 });
    observer.observe(sliderContainer);
}

// *** Product Sections - Optimized ***

async function loadTopDeals() {
    const section = document.getElementById('top-deals-section');
    const bannerContainer = document.querySelector('.special-offer-header'); 
    const bannerImg = document.getElementById('top-deals-banner-img');
    const grid = document.getElementById('top-deals-grid');
    if (!section) return;
    
    try {
        const settingsRef = doc(db, "settings", "homeLayout");
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists() && settingsSnap.data().topDealsBanner) {
            const bannerUrl = optimizeImage(settingsSnap.data().topDealsBanner, 1000, 85);
            if(bannerImg) bannerImg.src = bannerUrl;
            
            if (settingsSnap.data().offerEndTime) {
                const endTime = settingsSnap.data().offerEndTime;
                if (endTime) {
                    let timerOverlay = document.getElementById('offer-countdown');
                    if (!timerOverlay) {
                        timerOverlay = document.createElement('div');
                        timerOverlay.id = 'offer-countdown';
                        timerOverlay.className = 'countdown-overlay';
                        bannerContainer.appendChild(timerOverlay);
                    }
                    startCountdown(endTime, timerOverlay);
                }
            } else {
                const existing = document.getElementById('offer-countdown');
                if(existing) existing.remove();
            }
            
            section.style.display = 'block'; 
        }
        
        // Use getDocs
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

function startCountdown(endTimeStr, displayElement) {
    const endDate = new Date(endTimeStr).getTime();
    update();
    const timerInterval = setInterval(update, 1000);

    function update() {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            displayElement.innerHTML = `<div class="countdown-box" style="background-color:#555; padding:6px 12px;"><span class="countdown-val">Expired</span></div>`;
            displayElement.classList.add('expired');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        let html = '';
        if (days > 0) {
             html += `<div class="countdown-box"><span class="countdown-val">${days}</span><span class="countdown-unit">Day</span></div>`;
        }
        html += `<div class="countdown-box"><span class="countdown-val">${hours.toString().padStart(2, '0')}</span><span class="countdown-unit">Hr</span></div>`;
        html += `<div class="countdown-box"><span class="countdown-val">${minutes.toString().padStart(2, '0')}</span><span class="countdown-unit">Min</span></div>`;
        html += `<div class="countdown-box"><span class="countdown-val">${seconds.toString().padStart(2, '0')}</span><span class="countdown-unit">Sec</span></div>`;
        
        displayElement.innerHTML = html;
    }
}

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
    } catch (error) {}
}

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
            breakpoints: { 640: { slidesPerView: 3.2, grid: { rows: 2 } }, 1024: { slidesPerView: 5.2, grid: { rows: 2 } } }
        });
    } catch(e) {}
}

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
    } catch (e) {}
}

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
                        <div class="category-circle-img-box"><img src="${imageUrl}" alt="${category.name}" class="category-circle-img" loading="lazy"></div>
                        <span class="category-circle-title">${category.name}</span>
                    </a>
                </div>`;
        });
        container.innerHTML = html;
        new Swiper('.category-swiper', {
            slidesPerView: 4, spaceBetween: 10, freeMode: true,
            breakpoints: { 640: { slidesPerView: 5 }, 1024: { slidesPerView: 7 } }
        });
    } catch (error) {}
}

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
                <div class="clean-card-box"><img src="${img}" class="clean-card-img" loading="lazy" alt="${product.name}"></div>
                <div class="clean-card-details">
                    <h3 class="clean-card-title">${product.name}</h3>
                    <div class="clean-card-price-row">₹${product.price}</div>
                    <button class="shop-now-btn">Shop Now</button>
                </div>
            </a>
        </div>`;
}