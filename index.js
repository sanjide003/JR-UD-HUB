// ഇതാണ് 'index.js' ഫയൽ.

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
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/600x800/000000/D4AF37?text=Al+Ambar" alt="Placeholder"></div>`;
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

                if (isVideo && slide.url.includes('drive.google.com') && slide.url.includes('/d/')) {
                    try {
                        const id = slide.url.split('/d/')[1].split('/')[0];
                        finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
                    } catch(e) {}
                } 
                else if (slide.url.includes('youtube.com/watch?v=')) {
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
                    slideEl.innerHTML = `<video class="hero-video-element" src="${finalUrl}" autoplay muted loop playsinline preload="auto"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        new Swiper('.hero-slider-new', {
            loop: false, 
            effect: 'fade',
            fadeEffect: { crossFade: true },
            allowTouchMove: true,
            speed: 1000,
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            },
        });

        const firstSlideVideo = document.querySelector('.hero-video-element');
        if (firstSlideVideo) {
            firstSlideVideo.muted = true; 
            firstSlideVideo.play().catch(e => console.log("Initial play failed:", e));
        }

        setupSmartVideoAutoplay();

    } catch (error) { console.error("Error loading hero slider: ", error); }
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
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No featured products found.</p>'; return;
        }
        grid.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide';
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400, 80);
            
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new"; 
            
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
                        <button class="btn ${buttonClass} btn-add-to-cart"
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
                        <a href="product.html?id=${productId}" class="btn btn-primary-new">
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
            autoplay: { 
                delay: autoplayDelay, 
                disableOnInteraction: false 
            },
            speed: 1000,
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
                init: function (swiper) {
                    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
                    if (activeBullet) {
                        const progressEl = activeBullet.querySelector('.pagination-progress');
                        if (progressEl) {
                            progressEl.style.animation = `progress-fill ${autoplayDelay / 1000}s linear forwards`;
                        }
                    }
                },
                slideChangeTransitionStart: function (swiper) {
                    swiper.pagination.bullets.forEach(bullet => {
                        const progressEl = bullet.querySelector('.pagination-progress');
                        if (progressEl) {
                            progressEl.style.animation = 'none';
                        }
                    });
                    
                    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
                    if (activeBullet) {
                        const progressEl = activeBullet.querySelector('.pagination-progress');
                        if (progressEl) {
                            progressEl.style.animation = `progress-fill ${autoplayDelay / 1000}s linear forwards`;
                        }
                    }
                }
            },
            breakpoints: { 
                640: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false }, 
                900: { slidesPerView: 4, spaceBetween: 20, centeredSlides: false }, 
                1200: { slidesPerView: 5, spaceBetween: 20, centeredSlides: false } 
            }
        });
    } catch (error) { console.error("Error loading top sellers: ", error); grid.innerHTML = '<p>Error loading products.</p>'; }
}


/**
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ (മാറ്റം: Infinite Swiper)
 */
async function loadHomeCategories() {
    const container = document.getElementById("category-grid-home");
    if (!container) return;

    try {
        // *** എല്ലാ കാറ്റഗറികളും എടുക്കുന്നു ***
        const catQuery = query(collection(db, "categories"));
        const catSnapshot = await getDocs(catQuery); 

        if (catSnapshot.empty) {
            container.innerHTML = '<p>No categories to show.</p>'; 
            return;
        }

        let slidesHTML = '';
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            const catId = doc.id;
            
            const rawImage = category.imageUrl || 'https://placehold.co/260x360/1e1e1e/D4AF37?text=...';
            const imageUrl = optimizeImage(rawImage, 400, 80);
            
            // *** Swiper Slide ഉണ്ടാക്കുന്നു ***
            slidesHTML += `
                <div class="swiper-slide">
                    <a href="categories.html?filter=${catId}" class="category-card-home-new" style="background-image: url('${imageUrl}')">
                        <h3>${category.name}</h3>
                    </a>
                </div>
            `;
        });

        // *** ഗ്രിഡ് ലേഔട്ട് മാറ്റി Swiper Structure നൽകുന്നു ***
        // Class മാറ്റി 'swiper' ആക്കുന്നു
        container.className = 'swiper home-category-swiper'; 
        container.innerHTML = `
            <div class="swiper-wrapper">
                ${slidesHTML}
            </div>
        `;

        // *** Swiper Initialize ചെയ്യുന്നു ***
        new Swiper('.home-category-swiper', {
            loop: true, // ഇൻഫിനിറ്റ് ലൂപ്പ്
            slidesPerView: 2.2, // മൊബൈലിൽ 2.2 എണ്ണം (വലുതായി കാണാൻ)
            spaceBetween: 15,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            breakpoints: {
                640: { slidesPerView: 3.2, spaceBetween: 20 },
                900: { slidesPerView: 4.5, spaceBetween: 20 },
                1200: { slidesPerView: 5.5, spaceBetween: 25 }
            }
        });

    } catch (error) { 
        console.error("Error loading home categories: ", error); 
        container.innerHTML = '<p>Error loading categories.</p>';
    }
}

const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');

        if (button.classList.contains('added-to-cart')) {
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            button.classList.remove('btn-primary-new');
            button.classList.add('btn-secondary-new'); 
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
            button.classList.add('btn-primary-new');
            button.classList.remove('btn-secondary-new'); 
            if (buttonText) buttonText.textContent = 'Remove';
        }
    });
}