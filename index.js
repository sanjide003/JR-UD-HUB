// ഇതാണ് 'index.js' ഫയൽ.
// *** "Add to Cart" ബട്ടൺ ടോഗിൾ ആക്കി മാറ്റി ***

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
// *** isItemInCart, removeFromCart എന്നിവ import ചെയ്തു ***
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
 * ഹോം പേജ് ബാനർ ലോഡ് ചെയ്യുന്നു
 */
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="Special Offer Banner">`;
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
 * 1. ഹീറോ സ്ലൈഡർ ലോഡ് ചെയ്യുന്നു
 */
async function loadHeroSlider() {
    // ... (ഈ ഫംഗ്ഷനിൽ മാറ്റമില്ല) ...
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
 * *** ബട്ടൺ ടോഗിൾ ലോജിക് ചേർത്തു ***
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
            
            // *** കാർട്ടിൽ ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു ***
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new"; // *** 'btn-secondary-icon' മാറ്റി 'btn-secondary-new' ആക്കി ***
            
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
                        <!-- *** ബട്ടൺ HTML അപ്ഡേറ്റ് ചെയ്തു *** -->
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
                            <span>View Details</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        const autoplayDelay = 4000; 

        new Swiper('.top-sellers-swiper-new', {
            // ... (Swiper കോഡിൽ മാറ്റമില്ല) ...
            loop: true,
            autoplay: { 
                delay: autoplayDelay, 
                disableOnInteraction: false 
            },
            speed: 1000,
            slidesPerView: 1, 
            spaceBetween: 20,
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
                640: { slidesPerView: 2 }, 
                900: { slidesPerView: 4 }, 
                1200: { slidesPerView: 4 } 
            }
        });
    } catch (error) { console.error("Error loading top sellers: ", error); grid.innerHTML = '<p>Error loading products.</p>'; }
}


/**
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadHomeCategories() {
    // ... (ഈ ഫംഗ്ഷനിൽ മാറ്റമില്ല) ...
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;

    const CATEGORIES_TO_SHOW = 3; 

    try {
        console.log("Fetching and shuffling categories from Firebase...");
        const catQuery = query(collection(db, "categories"));
        const catSnapshot = await getDocs(catQuery); 

        if (catSnapshot.empty) {
            grid.innerHTML = '<p>No categories to show.</p>'; 
            return;
        }

        let allCategories = [];
        catSnapshot.forEach((doc) => {
            allCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });

        for (let i = allCategories.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCategories[i], allCategories[j]] = [allCategories[j], allCategories[i]];
        }

        const categoriesToShow = allCategories.slice(0, CATEGORIES_TO_SHOW);

        renderCategories(grid, categoriesToShow);

    } catch (error) { 
        console.error("Error loading home categories: ", error); 
        grid.innerHTML = '<p>Error loading categories.</p>';
    }
}
function renderCategories(grid, categories) {
    // ... (ഈ ഫംഗ്ഷനിൽ മാറ്റമില്ല) ...
    grid.innerHTML = '';
    if (categories.length === 0) {
        grid.innerHTML = '<p>No categories to show.</p>';
        return;
    }
    
    categories.forEach((category) => {
        const catId = category.id;
        const card = document.createElement('a');
        card.className = 'category-card-home-new';
        card.href = `categories.html?filter=${catId}`;
        
        const imageUrl = category.imageUrl || 'https://placehold.co/260x360/1e1e1e/D4AF37?text=...';
        card.style.backgroundImage = `url('${imageUrl}')`;
        
        card.innerHTML = `
            <h3>${category.name}</h3>
        `;
        grid.appendChild(card);
    });
}


/**
 * 4. "Add to Cart" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 * *** ടോഗിൾ ലോജിക് ആക്കി മാറ്റി ***
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');

        if (button.classList.contains('added-to-cart')) {
            // കാർട്ടിൽ ഉണ്ട്, അതിനാൽ നീക്കം ചെയ്യുന്നു
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            button.classList.remove('btn-primary-new');
            button.classList.add('btn-secondary-new'); // *** 'btn-secondary-icon' മാറ്റി 'btn-secondary-new' ആക്കി ***
            if (buttonText) buttonText.textContent = 'Cart';
        } else {
            // കാർട്ടിൽ ഇല്ല, അതിനാൽ ചേർക്കുന്നു
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
            button.classList.remove('btn-secondary-new'); // *** 'btn-secondary-icon' മാറ്റി 'btn-secondary-new' ആക്കി ***
            if (buttonText) buttonText.textContent = 'Remove';
        }
    });
}