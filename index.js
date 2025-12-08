// index.js - Restored Video Logic & Animations

import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, query, where, limit, orderBy, setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 

setLogLevel('Silent');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHeroSlider();
    loadTopDeals();
    loadTopTrendyDeals();
    loadTopDiscounts();
    loadHomeCategories();
    loadBanner();
    setupScrollAnimations();
});

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

async function loadBanner() {
    const container = document.getElementById('home-top-banner');
    if(!container) return;
    try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if(snap.exists() && snap.data().homeBannerUrl) {
            const url = optimizeImage(snap.data().homeBannerUrl, 1200, 85);
            container.innerHTML = `<img src="${url}" style="width:100%;border-radius:12px;display:block;">`;
            container.style.display = 'block';
        }
    } catch(e) {}
}

// *** RESTORED ORIGINAL VIDEO LOGIC ***
async function loadHeroSlider() {
    const wrapper = document.getElementById('hero-slider-wrapper');
    if (!wrapper) return;
    
    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            wrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/800x600/121212/D4AF37?text=JR-UD-HUB" alt="Hero"></div>`;
        } else {
            wrapper.innerHTML = '';
            snapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                let isVideo = slide.type === 'video';
                let videoId = '', embedUrl = '', finalUrl = slide.url;

                if (isVideo) {
                    // 1. Google Drive Video Handling
                    if (slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                        try { 
                            const id = slide.url.split('/d/')[1].split('/')[0]; 
                            finalUrl = `https://drive.google.com/uc?export=download&id=${id}`; 
                        } catch(e) {}
                    } 
                    // 2. YouTube & Shorts Handling (Original Logic)
                    else if (slide.url.includes('youtube.com') || slide.url.includes('youtu.be')) {
                        if (slide.url.includes('v=')) {
                            videoId = new URL(slide.url).searchParams.get('v');
                        } else if (slide.url.includes('shorts')) {
                            videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                        } else {
                            videoId = slide.url.split('youtu.be/')[1];
                        }
                        
                        if (videoId) {
                            // Mute & Autoplay parameters essential for background play
                            embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&autoplay=1&playsinline=1&rel=0`;
                        }
                    }
                }

                if (slide.type === 'image') {
                    const img = optimizeImage(slide.url, 1200, 90);
                    slideEl.innerHTML = `<img src="${img}" alt="Hero" loading="lazy">`;
                } else if (isVideo && embedUrl) {
                    // YouTube Iframe
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else if (isVideo) {
                    // Direct Video (MP4/Drive)
                    slideEl.innerHTML = `<video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline></video>`;
                }
                wrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true,
            speed: 1000,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.hero-pagination-dots', clickable: true },
            effect: 'fade',
            fadeEffect: { crossFade: true },
            // Video Play Logic on Slide Change
            on: {
                slideChangeTransitionEnd: function () {
                    const slides = document.querySelectorAll('.hero-slider-new .swiper-slide');
                    slides.forEach((s) => {
                        const vid = s.querySelector('video');
                        if(vid) {
                            if(s.classList.contains('swiper-slide-active')) vid.play().catch(()=>{});
                            else vid.pause();
                        }
                    });
                }
            }
        });

    } catch (error) { console.error("Slider Error", error); }
}

async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;
    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(doc => {
            const c = doc.data();
            const img = optimizeImage(c.imageUrl, 150);
            html += `
                <div class="swiper-slide">
                    <a href="categories.html?filter=${doc.id}" class="category-circle-item">
                        <div class="category-circle-img-box"><img src="${img}" class="category-circle-img" loading="lazy"></div>
                        <span class="category-circle-title">${c.name}</span>
                    </a>
                </div>`;
        });
        container.innerHTML = html;
        new Swiper('.category-swiper', {
            slidesPerView: 4, spaceBetween: 15,
            breakpoints: { 640: { slidesPerView: 5 }, 1024: { slidesPerView: 7 } }
        });
    } catch (e) {}
}

function createGlassCard(id, p, discount) {
    const img = optimizeImage(p.images?.[0], 400);
    const offer = discount ? `${discount}% OFF` : (p.mrp > p.price ? 'OFFER' : '');
    
    return `
        <div class="swiper-slide">
            <a href="product.html?id=${id}" class="clean-card-wrapper">
                <div class="clean-card-box">
                    ${offer ? `<div class="clean-card-offer-bar">${offer}</div>` : ''}
                    <img src="${img}" class="clean-card-img" loading="lazy" alt="${p.name}">
                    <div class="clean-card-info">
                        <div class="clean-card-title">${p.name}</div>
                        <div class="clean-card-price">₹${p.price}</div>
                    </div>
                </div>
            </a>
        </div>
    `;
}

async function loadTopDeals() {
    const grid = document.getElementById('top-deals-grid');
    const banner = document.getElementById('top-deals-banner-container');
    const section = document.getElementById('top-deals-section');
    if(!grid) return;

    try {
        const s = await getDoc(doc(db, "settings", "homeLayout"));
        if(s.exists() && s.data().topDealsBanner) {
            banner.innerHTML = `<img src="${optimizeImage(s.data().topDealsBanner, 1000)}" style="width:100%;display:block;">`;
            section.style.display = 'block';
        }
        const q = query(collection(db, "products"), where("isTopDeal", "==", true), limit(10));
        const snap = await getDocs(q);
        if(!snap.empty) {
            section.style.display = 'block';
            let html = '';
            snap.forEach(d => html += createGlassCard(d.id, d.data(), null));
            grid.innerHTML = html;
            new Swiper('.top-deals-swiper', { slidesPerView: 2.2, spaceBetween: 15, breakpoints: { 640: { slidesPerView: 3.5 }, 1024: { slidesPerView: 5 } } });
        }
    } catch(e) {}
}

async function loadTopTrendyDeals() {
    const grid = document.getElementById('top-sellers-grid');
    if(!grid) return;
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const snap = await getDocs(q);
        if(!snap.empty) {
            let html = '';
            snap.forEach(d => html += createGlassCard(d.id, d.data(), null));
            grid.innerHTML = html;
            new Swiper('.top-sellers-swiper-new', { slidesPerView: 2.2, spaceBetween: 15, breakpoints: { 640: { slidesPerView: 3.5 }, 1024: { slidesPerView: 5 } } });
        }
    } catch(e) {}
}

async function loadTopDiscounts() {
    const grid = document.getElementById('top-discount-grid');
    if(!grid) return;
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(40));
        const snap = await getDocs(q);
        let items = [];
        snap.forEach(d => {
            const p = d.data();
            if(!p.isTopDeal && !p.featured && p.mrp > p.price) {
                const disc = Math.round(((p.mrp - p.price)/p.mrp)*100);
                items.push({ id:d.id, ...p, disc });
            }
        });
        items.sort((a,b) => b.disc - a.disc);
        
        if(items.length) {
            let html = '';
            items.slice(0, 10).forEach(p => html += createGlassCard(p.id, p, p.disc));
            grid.innerHTML = html;
            new Swiper('.discount-swiper', { slidesPerView: 2.2, spaceBetween: 15, breakpoints: { 640: { slidesPerView: 3.5 }, 1024: { slidesPerView: 5 } } });
        }
    } catch(e) {}
}