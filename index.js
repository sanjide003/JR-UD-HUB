// Apple Watch Style Category Grid - index.js
// മാറ്റം: ഗൂഗിൾ ഡ്രൈവ് ലോജിക് ഒഴിവാക്കി.

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

setLogLevel('Debug');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHomeBanner(); 
    loadHeroSlider();
    loadTopSellers();
    loadHomeCategories(); 
    
    setupScrollReveal();
    document.documentElement.style.scrollBehavior = 'smooth';
});

/**
 * Scroll Reveal Animation Setup
 */
function setupScrollReveal() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

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
            const optimizedUrl = optimizeImage(bannerUrl, 1200, 85);
            bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Special Offer Banner" loading="lazy">`;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading home banner: ", error);
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
                
                // ഗൂഗിൾ ഡ്രൈവ് ലോജിക് നീക്കം ചെയ്തു.
                
                // YouTube Logic നിലനിർത്തി
                if (slide.url.includes('youtube.com/watch?v=')) {
                    videoId = new URL(slide.url).searchParams.get('v');
                    isVideo = true;
                }
                else if (slide.url.includes('youtube.com/shorts/')) {
                    videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                    isVideo = true;
                }

                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1&autoplay=1`;
                }

                if (slide.type === 'image') {
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 85);
                    slideEl.innerHTML = `<img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy">`;
                }
                else if (isVideo && embedUrl) {
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                }
                else if (isVideo) {
                    // Direct video link (e.g., Cloudinary, Firebase)
                    slideEl.innerHTML = `<video class="hero-video-element" src="${slide.url}" autoplay muted loop playsinline preload="auto"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: false, 
            effect: 'fade',
            fadeEffect: { crossFade: true },
            allowTouchMove: true,
            speed: 1200,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            },
            on: {
                slideChange: function() {
                    pauseInactiveVideos();
                }
            }
        });

        const firstSlideVideo = document.querySelector('.hero-video-element');
        if (firstSlideVideo) {
            firstSlideVideo.muted = true; 
            firstSlideVideo.play().catch(e => console.log("Initial play failed:", e));
        }

        setupSmartVideoAutoplay();

    } catch (error) { 
        console.error("Error loading hero slider: ", error); 
    }
}

function pauseInactiveVideos() {
    const videos = document.querySelectorAll('.hero-video-element');
    videos.forEach(video => {
        const slide = video.closest('.swiper-slide');
        if (!slide.classList.contains('swiper-slide-active')) {
            video.pause();
        } else {
            video.play().catch(e => console.log("Play failed:", e));
        }
    });
}

function setupSmartVideoAutoplay() {
    const videos = document.querySelectorAll('.hero-video-element, .hero-video-iframe');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.25 };

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const element = entry.target;
            const isYouTube = element.tagName === 'IFRAME';

            if (entry.isIntersecting) {
                if (isYouTube) {
                    element.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                } else {
                    element.play().catch(e => console.log("Autoplay prevented:", e));
                }
            } else {
                if (isYouTube) {
                    element.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                } else {
                    element.pause();
                }
            }
        });
    }, observerOptions);

    videos.forEach(video => {
        videoObserver.observe(video);
    });
}

/**
 * 2. "For You" (Top Sellers)
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    
    showSkeletonLoader(grid, 5);
    
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No featured products found.</p>'; 
            return;
        }
        
        grid.innerHTML = '';
        let delay = 0;
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide';
            card.style.animationDelay = `${delay}ms`;
            delay += 100;
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400, 80);
            
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn added-to-cart" : "btn"; 
            
            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         loading="lazy" 
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="top-sellers-product-info">
                    <div class="top-sellers-product-name">${product.name}</div>
                    <div class="top-sellers-product-price">₹${product.price || 0}</div>
                    <div class="top-sellers-buttons">
                        <button class="${buttonClass} btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${product.price}"
                            data-mrp="${product.mrp}"
                            data-image="${imageUrl}"
                            data-size="${product.size || ''}">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            <span>${buttonText}</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn">
                            <span>View</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        const autoplayDelay = 4000; 
        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: { delay: autoplayDelay, disableOnInteraction: false },
            speed: 800,
            slidesPerView: 1, 
            spaceBetween: 30,
            centeredSlides: true,
            pagination: { 
                el: '.top-sellers-pagination-new', 
                clickable: true,
                renderBullet: function (index, className) {
                    return '<span class="' + className + '"><span class="pagination-progress"></span></span>';
                }
            },
            on: {
                init: function (swiper) { updateProgressAnimation(swiper, autoplayDelay); },
                slideChangeTransitionStart: function (swiper) {
                    resetAllProgress(swiper);
                    updateProgressAnimation(swiper, autoplayDelay);
                }
            },
            breakpoints: { 
                640: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false }, 
                900: { slidesPerView: 4, spaceBetween: 20, centeredSlides: false }, 
                1200: { slidesPerView: 5, spaceBetween: 20, centeredSlides: false } 
            }
        });
        
    } catch (error) { 
        console.error("Error loading top sellers: ", error); 
        grid.innerHTML = '<p>Error loading products.</p>'; 
    }
}

function updateProgressAnimation(swiper, delay) {
    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
    if (activeBullet) {
        const progressEl = activeBullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.animation = `progress-fill ${delay / 1000}s linear forwards`;
        }
    }
}

function resetAllProgress(swiper) {
    swiper.pagination.bullets.forEach(bullet => {
        const progressEl = bullet.querySelector('.pagination-progress');
        if (progressEl) {
            progressEl.style.animation = 'none';
            void progressEl.offsetWidth;
            progressEl.style.transform = 'scaleX(0)';
        }
    });
}

function showSkeletonLoader(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'swiper-slide';
        skeleton.innerHTML = `
            <div class="skeleton" style="width: 100%; aspect-ratio: 4/5; margin-bottom: 0.5rem;"></div>
            <div style="padding: 0.75rem;">
                <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 0.5rem;"></div>
                <div class="skeleton" style="height: 20px; width: 50%; margin-bottom: 0.75rem;"></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div class="skeleton" style="height: 40px;"></div>
                    <div class="skeleton" style="height: 40px;"></div>
                </div>
            </div>
        `;
        container.appendChild(skeleton);
    }
}

/**
 * 3. SHOP BY CATEGORY - Random 3 Categories (Portrait)
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;

    try {
        const catQuery = query(collection(db, "categories"));
        const catSnapshot = await getDocs(catQuery); 

        if (catSnapshot.empty) {
            container.innerHTML = '<p>No categories found.</p>'; 
            return;
        }

        let categories = [];
        catSnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // *** Random ആയി 3 എണ്ണം തിരഞ്ഞെടുക്കുന്നു ***
        categories = shuffleArray(categories).slice(0, 3);

        container.innerHTML = ''; // Clear previous

        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-card-portrait'; // home.css -ൽ defined
            
            const imageUrl = optimizeImage(category.imageUrl || '', 600, 85);
            
            item.innerHTML = `
                <a href="categories.html?filter=${category.id}" style="display:block; width:100%; height:100%;">
                    <img src="${imageUrl}" alt="${category.name}" class="category-card-img">
                    <div class="category-card-overlay">
                        <h3 class="category-card-title">${category.name}</h3>
                        <span class="category-card-btn">Explore</span>
                    </div>
                </a>
            `;
            container.appendChild(item);
        });

    } catch (error) { 
        console.error("Error loading home categories: ", error); 
        container.innerHTML = '<p>Error loading categories.</p>';
    }
}

// Array Shuffle Helper
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Cart interactions
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');

        createRipple(e, button);

        if (button.classList.contains('added-to-cart')) {
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            if (buttonText) buttonText.textContent = 'Cart';
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
            showToast('Added to cart!');
        }
    });
}

function createRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute; width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px; border-radius: 50%;
        background: rgba(255, 255, 255, 0.4); transform: scale(0);
        animation: ripple-animation 0.6s ease-out; pointer-events: none;
    `;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to { transform: scale(2); opacity: 0; }
    }
`;
document.head.appendChild(style);

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; 
        transform: translateX(-50%) translateY(100px);
        background: var(--primary-gold); color: var(--bg-color);
        padding: 12px 24px; border-radius: 8px; font-weight: 600;
        z-index: 10000; opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}