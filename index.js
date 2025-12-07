// index.js - Updated with Premium Button Styles for Home Page

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
    loadTopSellers();
    loadHomeCategories();
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
 * 1. ഹീറോ സ്ലൈഡർ
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

                if (isVideo) {
                    if (slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                        try {
                            const id = slide.url.split('/d/')[1].split('/')[0];
                            finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
                        } catch(e) {}
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
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 85);
                    slideEl.innerHTML = `<img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy">`;
                }
                else if (isVideo && embedUrl) {
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%; pointer-events:none;"></iframe>`;
                }
                else if (isVideo) {
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

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true, 
            allowTouchMove: true,
            speed: 600,
            autoplay: {
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

        playActiveSlideVideo(heroSwiper);
        setupScrollVideoObserver();

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

/**
 * 2. "For You" (Top Sellers)
 * മാറ്റം: ബട്ടണുകളെ കൂടുതൽ ആകർഷകമാക്കാൻ ക്ലാസുകൾ മാറ്റി.
 * Cart = Gold (Primary), View = Outline (Secondary)
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    
    grid.innerHTML = '<div class="swiper-slide" style="height:250px; background:#111;"></div>';
    
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="text-align:center; padding:20px;">No featured products.</p>'; 
            return;
        }
        
        grid.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide';
            
            const imageUrl = optimizeImage(product.images?.[0] || '', 400, 75);
            const isInCart = isItemInCart(productId);
            
            // *** മാറ്റം: Cart ബട്ടൺ ഗോൾഡ് (Primary), View ബട്ടൺ ഔട്ട്‌ലൈൻ (Secondary) ***
            // ഇത് കാണാൻ കൂടുതൽ ഭംഗിയായിരിക്കും
            const buttonText = isInCart ? "Remove" : "Add";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-primary-new"; 
            
            card.innerHTML = `
                <div class="media-container">
                    <a href="product.html?id=${productId}" style="display:block; height:100%;">
                        <img src="${imageUrl}" alt="${product.name}" class="top-sellers-product-image" loading="lazy">
                    </a>
                    <div class="text-overlay">
                        <div class="top-sellers-product-name">${product.name}</div>
                        <div class="top-sellers-product-price">₹${product.price || 0}</div>
                    </div>
                </div>
                <div class="top-sellers-buttons">
                    <button class="btn ${buttonClass} btn-add-to-cart"
                        data-id="${productId}"
                        data-name="${product.name}"
                        data-price="${product.price}"
                        data-mrp="${product.mrp}"
                        data-image="${imageUrl}"
                        data-size="${product.size || ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span>${buttonText}</span>
                    </button>
                    <a href="product.html?id=${productId}" class="btn btn-secondary-new">
                        <span>View</span>
                    </a>
                </div>
            `;
            grid.appendChild(card);
        });

        const autoplayDelay = 4000; 

        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: { delay: autoplayDelay, disableOnInteraction: false },
            speed: 600,
            slidesPerView: 1, 
            spaceBetween: 20, 
            centeredSlides: true,
            pagination: { 
                el: '.top-sellers-pagination-new', 
                clickable: true,
                renderBullet: function (index, className) {
                    return `<span class="${className}"><span class="pagination-progress"></span></span>`;
                }
            },
            on: {
                init: function (swiper) { startProgressBar(swiper, autoplayDelay); },
                slideChangeTransitionStart: function (swiper) {
                    resetProgressBars(swiper);
                    startProgressBar(swiper, autoplayDelay);
                }
            },
            breakpoints: { 
                640: { slidesPerView: 2, spaceBetween: 20 }, 
                1024: { slidesPerView: 4, spaceBetween: 30 } 
            }
        });
        
    } catch (error) { 
        console.error("Error loading top sellers"); 
        grid.innerHTML = '<p>Error loading products.</p>'; 
    }
}

function startProgressBar(swiper, delay) {
    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
    if (activeBullet) {
        const progressEl = activeBullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.transition = 'none';
            progressEl.style.width = '0%';
            setTimeout(() => {
                progressEl.style.transition = `width ${delay}ms linear`;
                progressEl.style.width = '100%';
            }, 50);
        }
    }
}

function resetProgressBars(swiper) {
    if (!swiper.pagination.bullets) return;
    swiper.pagination.bullets.forEach(bullet => {
        const progressEl = bullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.transition = 'none';
            progressEl.style.width = '0%';
        }
    });
}

/**
 * 3. SHOP BY CATEGORY
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
        categories = categories.sort(() => 0.5 - Math.random()).slice(0, 3);
        container.innerHTML = ''; 
        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-card-portrait';
            const imageUrl = optimizeImage(category.imageUrl || '', 600, 75);
            item.innerHTML = `
                <a href="categories.html?filter=${category.id}" style="display:block; width:100%; height:100%;">
                    <img src="${imageUrl}" alt="${category.name}" class="category-card-img" loading="lazy">
                    <div class="category-card-overlay">
                        <h3 class="category-card-title">${category.name}</h3>
                        <span class="category-card-btn">Explore</span>
                    </div>
                </a>
            `;
            container.appendChild(item);
        });
    } catch (error) { console.error("Error loading home categories"); }
}

document.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (button) {
        e.preventDefault();
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');
        if (button.classList.contains('added-to-cart')) {
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            if (buttonText) buttonText.textContent = 'Add';
        } else {
            const product = {
                id: id, 
                name: button.dataset.name,
                price: parseFloat(button.dataset.price),
                mrp: parseFloat(button.dataset.mrp),
                image: button.dataset.image,
                size: button.dataset.size 
            };
            addToCart(id, product);
            button.classList.add('added-to-cart');
            if (buttonText) buttonText.textContent = 'Remove';
        }
    }
});