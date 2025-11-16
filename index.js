// ഇതാണ് 'index.js' ഫയൽ.
// *** ടോപ്പ് സെല്ലർ ഡോട്ടുകൾക്ക് ആനിമേഷൻ ചേർത്തു ***
// *** കാറ്റഗറി ഓട്ടോപ്ലേ നിർത്തി ***

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
import { loadSiteSettings } from './common.js';
import { addToCart } from './cart.js';

setLogLevel('Debug');

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadHeroSlider();
    loadTopSellers();
    loadHomeCategories();
});

/**
 * 1. ഹീറോ സ്ലൈഡർ ലോഡ് ചെയ്യുന്നു (Mute ബട്ടൺ ഇല്ലാതെ)
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

                let embedUrl = '';
                let isVideo = slide.type === 'video';
                let videoId = '';

                if (slide.url.includes('youtube.com/watch?v=')) {
                    videoId = new URL(slide.url).searchParams.get('v');
                    isVideo = true;
                }
                else if (slide.url.includes('youtube.com/shorts/')) {
                    videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                    isVideo = true;
                }

                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&playsinline=1`;
                }

                if (slide.type === 'image') {
                    slideEl.innerHTML = `<img src="${slide.url}" alt="Hero Image">`;
                }
                else if (isVideo && embedUrl) {
                    slideEl.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                }
                else if (isVideo) {
                    slideEl.innerHTML = `<video src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            allowTouchMove: true,
            speed: 1000,
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            },
        });
        
        heroSwiper.on('slideChange', function () {
            const allIframes = sliderWrapper.querySelectorAll('iframe');
            allIframes.forEach(iframe => {
                iframe.src = iframe.src; 
            });
            
            const allVideos = sliderWrapper.querySelectorAll('video');
            allVideos.forEach(video => {
                video.pause();
                if (video.closest('.swiper-slide-active')) {
                   video.muted = true; 
                   video.play();
                }
            });
        });

        heroSwiper.on('touchStart', function(swiper, event) {
            const target = event.target;
            if (target.tagName === 'IFRAME') {
                swiper.allowTouchMove = false;
            }
        });
        heroSwiper.on('touchEnd', function(swiper) {
             swiper.allowTouchMove = true;
        });

    } catch (error) { console.error("Error loading hero slider: ", error); }
}


/**
 * 2. "Top Sellers" കറൗസൽ ലോഡ് ചെയ്യുന്നു
 * *** പുതിയ ആനിമേറ്റഡ് ഡോട്ടുകൾ ചേർത്തു ***
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
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            
            // *** ഡോട്ടുകൾ കാർഡിനുള്ളിൽ നിന്ന് നീക്കം ചെയ്തു ***
            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="top-sellers-product-info">
                    <div class="top-sellers-product-name">${product.name} ${product.size ? `(${product.size})` : ''}</div>
                    <div class="top-sellers-product-price">₹${product.price || 0} /-</div>
                    <div class="top-sellers-buttons">
                        <button class="btn btn-secondary-icon btn-add-to-cart"
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
                            <span>ADD TO CART</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-new">
                            <span>View Details</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // *** പുതിയ ആനിമേറ്റഡ് ഡോട്ടുകൾക്ക് വേണ്ടിയുള്ള കോഡ് ***
        const autoplayDelay = 4000; // 4 സെക്കൻഡ് (CSS-മായി മാച്ച് ചെയ്യണം)

        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: { 
                delay: autoplayDelay, 
                disableOnInteraction: false 
            },
            speed: 1000,
            slidesPerView: 1, 
            spaceBetween: 20,
            pagination: { 
                el: '.top-sellers-pagination-new', // *** HTML-ലെ പുതിയ കണ്ടെയ്നർ ***
                clickable: true,
                // *** പ്രോഗ്രസ് ബാർ നിർമ്മിക്കാൻ ***
                renderBullet: function (index, className) {
                    return '<span class="' + className + '"><span class="pagination-progress"></span></span>';
                }
            },
            // *** ആനിമേഷൻ പ്രവർത്തിപ്പിക്കാൻ ***
            on: {
                init: function (swiper) {
                    // തുടക്കത്തിൽ ആദ്യത്തെ ഡോട്ട് ആനിമേറ്റ് ചെയ്യുന്നു
                    const activeBullet = swiper.pagination.bullets[swiper.realIndex];
                    if (activeBullet) {
                        const progressEl = activeBullet.querySelector('.pagination-progress');
                        if (progressEl) {
                            progressEl.style.animation = `progress-fill ${autoplayDelay / 1000}s linear forwards`;
                        }
                    }
                },
                slideChangeTransitionStart: function (swiper) {
                    // എല്ലാ ആനിമേഷനുകളും റീസെറ്റ് ചെയ്യുന്നു
                    swiper.pagination.bullets.forEach(bullet => {
                        const progressEl = bullet.querySelector('.pagination-progress');
                        if (progressEl) {
                            progressEl.style.animation = 'none';
                        }
                    });
                    
                    // പുതിയ ആക്ടീവ് ഡോട്ട് ആനിമേറ്റ് ചെയ്യുന്നു
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
                640: { slidesPerView: 2 }, 
                900: { slidesPerView: 4 }, 
                1200: { slidesPerView: 4 } 
            }
        });
    } catch (error) { console.error("Error loading top sellers: ", error); grid.innerHTML = '<p>Error loading products.</p>'; }
}

/**
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു
 * *** ഓട്ടോപ്ലേ നിർത്തി, ലൂപ്പ് നീക്കം ചെയ്തു ***
 */
async function loadHomeCategories() {
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;
    try {
        const catQuery = query(collection(db, "categories"), orderBy("name"), limit(8));
        const catSnapshot = await getDocs(catQuery);
        if (catSnapshot.empty) {
            grid.innerHTML = '<p>No categories to show.</p>'; return;
        }
        grid.innerHTML = '';
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            const catId = doc.id;
            const card = document.createElement('a');
            card.className = 'swiper-slide category-card-home-new';
            card.href = `categories.html?filter=${catId}`;
            const imageUrl = category.imageUrl || 'https://placehold.co/260x360/1e1e1e/D4AF37?text=...';
            card.innerHTML = `
                <div class="cat-card-home-img-wrapper">
                    <img src="${imageUrl}" alt="${category.name}" onerror="this.src='https://placehold.co/260x360/1e1e1e/D4AF37?text=Error'">
                </div>
                <h3>${category.name}</h3>
            `;
            grid.appendChild(card);
        });
        new Swiper('.category-swiper-new', {
            loop: false, // *** 'true' മാറ്റി ***
            speed: 1000,
            // autoplay: { delay: 2500, disableOnInteraction: false, }, // *** ഓട്ടോപ്ലേ നീക്കം ചെയ്തു ***
            slidesPerView: 3,
            spaceBetween: 15,
            breakpoints: {
                640: { slidesPerView: 4, spaceBetween: 20 },
                900: { slidesPerView: 6, spaceBetween: 20 },
                1200: { slidesPerView: 7, spaceBetween: 20 },
            }
        });
    } catch (error) { console.error("Error loading home categories: ", error); grid.innerHTML = '<p>Error loading categories.</p>'; }
}

/**
 * 4. "Add to Cart" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 * *** ഐക്കൺ മാറ്റി ***
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        const id = button.dataset.id;
        const product = {
            id: id, 
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image,
            size: button.dataset.size 
        };
        addToCart(id, product);
        button.innerHTML = 'ADDED!';
        button.disabled = true;
        setTimeout(() => {
            button.innerHTML = `
                <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span>ADD TO CART</span>
            `;
            button.disabled = false;
        }, 2000);
    });
}