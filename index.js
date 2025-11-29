import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, query, where, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHomeData();
});

async function loadHomeData() {
    // 1. Banner
    const settingsDoc = await getDoc(doc(db, "settings", "global"));
    if (settingsDoc.exists() && settingsDoc.data().homeBannerUrl) {
        const banner = document.getElementById('home-top-banner');
        banner.innerHTML = `<img src="${optimizeImage(settingsDoc.data().homeBannerUrl, 1200)}" loading="lazy">`;
        banner.style.display = 'block';
    }

    // 2. Hero Slider
    const heroSnap = await getDocs(query(collection(db, "heroSlides"), orderBy("order")));
    const heroWrapper = document.getElementById('hero-slider-wrapper');
    heroSnap.forEach(doc => {
        const s = doc.data();
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        if (s.type === 'video') {
            slide.innerHTML = `<video src="${s.url}" autoplay muted loop playsinline></video>`;
        } else {
            slide.innerHTML = `<img src="${optimizeImage(s.url, 800)}" loading="lazy">`;
        }
        heroWrapper.appendChild(slide);
    });
    new Swiper('.hero-slider', { loop: true, autoplay: { delay: 4000 }, pagination: { el: '.swiper-pagination' } });

    // 3. Top Sellers
    const prodSnap = await getDocs(query(collection(db, "products"), where("featured", "==", true), limit(8)));
    const sellerGrid = document.getElementById('top-sellers-grid');
    if (prodSnap.empty) sellerGrid.innerHTML = '<div style="padding:20px;">No featured products.</div>';
    
    prodSnap.forEach(doc => {
        const p = doc.data();
        const div = document.createElement('div');
        div.className = 'swiper-slide product-card';
        const img = p.images?.[0] ? optimizeImage(p.images[0], 400) : 'https://placehold.co/300x400';
        div.innerHTML = `
            <a href="product.html?id=${doc.id}">
                <img src="${img}" loading="lazy" alt="${p.name}">
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">₹${p.price}</div>
                </div>
            </a>
        `;
        sellerGrid.appendChild(div);
    });
    new Swiper('.top-sellers-swiper', {
        slidesPerView: 2, spaceBetween: 10,
        breakpoints: { 640: { slidesPerView: 3 }, 1024: { slidesPerView: 5 } }
    });

    // 4. Categories (Random 3)
    const catSnap = await getDocs(collection(db, "categories"));
    const catContainer = document.getElementById('category-grid-home');
    let cats = [];
    catSnap.forEach(d => cats.push({id: d.id, ...d.data()}));
    cats.sort(() => 0.5 - Math.random()).slice(0, 3).forEach(c => {
        const img = optimizeImage(c.imageUrl, 400);
        const div = document.createElement('a');
        div.className = 'cat-card-simple';
        div.href = `categories.html?filter=${c.id}`;
        div.innerHTML = `<img src="${img}" loading="lazy"><div class="cat-overlay">${c.name}</div>`;
        catContainer.appendChild(div);
    });
}