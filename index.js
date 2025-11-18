// ഇതാണ് 'index.js' ഫയൽ.
// *** Smart Video Autoplay & Image Optimization നടപ്പിലാക്കി ***

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
import { loadSiteSettings, optimizeImage } from './common.js'; // *** optimizeImage ഇറക്കുമതി ചെയ്തു ***
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
 * ഹോം പേജ് ബാനർ (ഒപ്റ്റിമൈസ് ചെയ്തത്)
 */
async function loadHomeBanner() {
    const bannerContainer = document.getElementById('home-top-banner');
    if (!bannerContainer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().homeBannerUrl) {
            const bannerUrl = docSnap.data().homeBannerUrl;
            // *** ബാനർ ഇമേജ് 1200px വീതിയിൽ ഒപ്റ്റിമൈസ് ചെയ്യുന്നു ***
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
 * 1. ഹീറോ സ്ലൈഡർ (സ്മാർട്ട് വീഡിയോ പ്ലേയർ സഹിതം)
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

                // വീഡിയോ ആണോ എന്ന് പരിശോധിക്കുന്നു
                let isVideo = slide.type === 'video';
                let videoId = '';
                let embedUrl = '';

                // YouTube ലിങ്കാണെങ്കിൽ
                if (slide.url.includes('youtube.com/watch?v=')) {
                    videoId = new URL(slide.url).searchParams.get('v');
                    isVideo = true;
                }
                else if (slide.url.includes('youtube.com/shorts/')) {
                    videoId = new URL(slide.url).pathname.split('/shorts/')[1];
                    isVideo = true;
                }

                // YouTube Embed URL നിർമ്മിക്കുന്നു (Autoplay ഒഴിവാക്കി)
                if (videoId) {
                    // enablejsapi=1 എന്നത് വീഡിയോയെ JS വഴി നിയന്ത്രിക്കാൻ സഹായിക്കും
                    embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&playsinline=1`;
                }

                if (slide.type === 'image') {
                    // *** ഇമേജ് ഒപ്റ്റിമൈസേഷൻ (800px മതിയാകും, ക്വാളിറ്റി 85) ***
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 85);
                    slideEl.innerHTML = `<img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy">`;
                }
                else if (isVideo && embedUrl) {
                    // YouTube iframe
                    slideEl.innerHTML = `<iframe class="hero-video-iframe" src="${embedUrl}" frameborder="0" allow="encrypted-media" allowfullscreen></iframe>`;
                }
                else if (isVideo) {
                    // Direct Video (MP4)
                    // *** Autoplay നീക്കം ചെയ്തു, പകരം 'playsinline' മാത്രം ***
                    // preload="metadata" മാത്രം നൽകുന്നു (ഡാറ്റ ലാഭിക്കാൻ)
                    slideEl.innerHTML = `<video class="hero-video-element" src="${slide.url}" muted loop playsinline preload="metadata"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        // Swiper സെറ്റപ്പ്
        const heroSwiper = new Swiper('.hero-slider-new', {
            loop: false, // വീഡിയോ ഉള്ളതുകൊണ്ട് ലൂപ്പ് ഒഴിവാക്കുന്നത് നല്ലതാണ്
            effect: 'fade',
            fadeEffect: { crossFade: true },
            allowTouchMove: true,
            speed: 1000,
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            },
        });

        // *** സ്മാർട്ട് വീഡിയോ പ്ലേയർ (Intersection Observer) ***
        // സ്ക്രീനിൽ കാണുമ്പോൾ മാത്രം പ്ലേ ചെയ്യാനുള്ള സംവിധാനം
        setupSmartVideoAutoplay();

    } catch (error) { console.error("Error loading hero slider: ", error); }
}

/**
 * വീഡിയോ സ്ക്രീനിൽ വരുമ്പോൾ മാത്രം പ്ലേ ചെയ്യാനുള്ള ഫംഗ്ഷൻ
 */
function setupSmartVideoAutoplay() {
    const videos = document.querySelectorAll('.hero-video-element');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // 50% വീഡിയോ സ്ക്രീനിൽ വന്നാൽ മാത്രം പ്ലേ ചെയ്യുക
    };

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // സ്ക്രീനിൽ ഉണ്ട് -> പ്ലേ ചെയ്യുക
                video.play().catch(e => console.log("Autoplay prevented:", e));
            } else {
                // സ്ക്രീനിൽ ഇല്ല -> പോസ് ചെയ്യുക (ഡാറ്റ ലാഭം!)
                video.pause();
            }
        });
    }, observerOptions);

    videos.forEach(video => {
        videoObserver.observe(video);
    });
}


/**
 * 2. "For You" (Top Sellers) ലോഡ് ചെയ്യുന്നു (Image Optimization സഹിതം)
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
            
            // *** ഇമേജ് ഒപ്റ്റിമൈസേഷൻ (400px മതി, ക്വാളിറ്റി 80) ***
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400, 80);
            
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new"; 
            
            // loading="lazy" ചേർത്തു
            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         loading="lazy" 
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="top-sellers-product-info">
                    <div class="top-sellers-product-name">${product.name} ${product.size ? `(${product.size})` : ''}</div>
                    <div class="top-sellers-product-price">₹${product.price || 0} /-</div>
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
                            <span>View Details</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // ... (Swiper കോഡിൽ മാറ്റമില്ല) ...
        const autoplayDelay = 4000; 
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
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു (Image Optimization സഹിതം)
 */
async function loadHomeCategories() {
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;

    const CATEGORIES_TO_SHOW = 3; 

    try {
        // കാഷെയിൽ (LocalStorage) ഉണ്ടോ എന്ന് ആദ്യം നോക്കാം - common.js-ൽ എഴുതിയത് പോലെ ഇവിടെയും ചെയ്യാം
        // ലളിതമാക്കാൻ ഇപ്പോൾ നേരിട്ട് വിളിക്കുന്നു, പക്ഷെ ഇമേജ് ഒപ്റ്റിമൈസ് ചെയ്യുന്നു
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
        
        // *** ഇമേജ് ഒപ്റ്റിമൈസേഷൻ (400px മതി) ***
        const rawImage = category.imageUrl || 'https://placehold.co/260x360/1e1e1e/D4AF37?text=...';
        const imageUrl = optimizeImage(rawImage, 400, 80);
        
        card.style.backgroundImage = `url('${imageUrl}')`;
        
        card.innerHTML = `
            <h3>${category.name}</h3>
        `;
        grid.appendChild(card);
    });
}

// ... (Add to Cart logic - പഴയതുപോലെ തന്നെ) ...
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