// index.js - Circular Cats, No Autoplay, Smart Discount Filter

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
            // *** മാറ്റം: Autoplay പൂർണ്ണമായും ഓഫ് ചെയ്തു ***
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
 * 3. SPECIAL OFFER (Admin Controlled)
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
 * 4. TOP TRENDY DEALS (Featured)
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
 * 5. TOP DISCOUNT (Exclusive - Excludes Featured & Top Deals)
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
            
            // *** മാറ്റം: Top Deal അല്ലെങ്കിൽ Featured ആണെങ്കിൽ ഇത് ഒഴിവാക്കുക ***
            if (p.isTopDeal === true || p.featured === true) {
                return; 
            }

            if (p.mrp && p.price && p.mrp > p.price) {
                const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                products.push({ id: doc.id, ...p, discount });
            }
        });

        // Sort by discount
        products.sort((a, b) => b.discount - a.discount);
        const topDiscounts = products.slice(0, 8);

        if (topDiscounts.length === 0) {
            document.querySelector('.orange-section').style.display = 'none';
            return;
        }

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
 * 6. RANDOM CATEGORIES (Bottom - Circular)
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;
    try {
        const catQuery = query(collection(db, "categories"));
        const catSnapshot = await getDocs(catQuery); 
        if (catSnapshot.empty) { container.innerHTML = ''; return; }
        
        let categories = [];
        catSnapshot.forEach((doc) => { categories.push({ id: doc.id, ...doc.data() }); });
        
        categories = categories.sort(() => 0.5 - Math.random()).slice(0, 4);
        
        container.innerHTML = ''; 
        categories.forEach(category => {
            const item = document.createElement('div');
            // *** മാറ്റം: പുതിയ ക്ലാസ്സ് (Circular) ഉപയോഗിക്കുന്നു ***
            item.className = 'category-circle-item'; 
            const imageUrl = optimizeImage(category.imageUrl || '', 150, 75);
            item.innerHTML = `
                <a href="categories.html?filter=${category.id}" style="display:contents;">
                    <div class="category-circle-img-box">
                        <img src="${imageUrl}" alt="${category.name}" class="category-circle-img" loading="lazy">
                    </div>
                    <span class="category-circle-title">${category.name}</span>
                </a>
            `;
            container.appendChild(item);
        });
    } catch (error) { console.error("Error loading home categories"); }
}

function createProductCardHTML(id, product, discountVal = null) {
    const img = optimizeImage(product.images?.[0] || '', 300, 80);
    let discountTag = '';
    if (discountVal) {
        discountTag = `<div class="discount-circle"><span>${discountVal}%</span><span>OFF</span></div>`;
    }

    const isInCart = isItemInCart(id);
    const btnText = isInCart ? "Done" : "Add";
    const btnClass = isInCart ? "btn-sm-primary btn-add-to-cart added" : "btn-sm-primary btn-add-to-cart";
    const btnStyle = isInCart ? "background:#2ecc71;" : "";

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
                        <button class="${btnClass}" style="${btnStyle}" data-id="${id}" 
                            data-name="${product.name}" data-price="${product.price}" 
                            data-mrp="${product.mrp}" data-image="${img}">
                            ${btnText}
                        </button>
                    </div>
                </div>
            </a>
        </div>
    `;
}

document.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (button) {
        e.preventDefault();
        e.stopPropagation();
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