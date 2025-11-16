// ഇതാണ് 'index.js' ഫയൽ.
// *** "Buy" ബട്ടൺ മാറ്റി "View Details" എന്നാക്കി (ഐക്കൺ നീക്കം ചെയ്തു) ***

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
    
    // Mute ബട്ടൺ കോഡ് പൂർണ്ണമായും നീക്കം ചെയ്തു

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
                    // YouTube വീഡിയോകൾ എപ്പോഴും Mute=1 ആയിരിക്കും
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&playsinline=1`;
                }

                if (slide.type === 'image') {
                    slideEl.innerHTML = `<img src="${slide.url}" alt="Hero Image">`;
                }
                else if (isVideo && embedUrl) {
                    // YouTube വീഡിയോ
                    slideEl.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                }
                else if (isVideo) {
                    // നേരിട്ടുള്ള .mp4 വീഡിയോ (എപ്പോഴും Muted)
                    slideEl.innerHTML = `<video src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        // --- സ്ലൈഡർ ആരംഭിക്കുന്നു ---
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
        
        // --- Mute ബട്ടൺ ക്ലിക്ക് ഇവന്റ് നീക്കം ചെയ്തു ---

        // --- സ്ലൈഡ് മാറുമ്പോൾ ---
        heroSwiper.on('slideChange', function () {
            // 1. എല്ലാ YouTube വീഡിയോകളും നിർത്തുന്നു
            const allIframes = sliderWrapper.querySelectorAll('iframe');
            allIframes.forEach(iframe => {
                iframe.src = iframe.src; 
            });
            
            // 2. എല്ലാ .mp4 വീഡിയോകളും നിർത്തുന്നു
            const allVideos = sliderWrapper.querySelectorAll('video');
            allVideos.forEach(video => {
                video.pause();
                // 3. പുതിയ സ്ലൈഡിലെ വീഡിയോ പ്ലേ ചെയ്യുന്നു (എപ്പോഴും Muted ആയി)
                if (video.closest('.swiper-slide-active')) {
                   video.muted = true; // ശബ്ദം ഇല്ലെന്ന് ഉറപ്പാക്കുന്നു
                   video.play();
                }
            });
        });

        // YouTube-ൽ ക്ലിക്ക് ചെയ്യുമ്പോൾ സ്ലൈഡ് നിർത്താൻ (സ്വൈപ്പ് ശരിയാക്കാൻ)
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
                            data-image="${imageUrl}">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
                            <span>ADD TO CART</span>
                        </button>
                        <!-- *** ഇതാണ് മാറ്റം വരുത്തിയ ബട്ടൺ: "View Details" *** -->
                        <a href="product.html?id=${productId}" class="btn btn-primary-new">
                            <span>View Details</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: { delay: 3000, disableOnInteraction: false, },
            speed: 1000,
            slidesPerView: 1, 
            spaceBetween: 20,
            pagination: { el: '.swiper-pagination', clickable: true },
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
            loop: true,
            speed: 1000,
            autoplay: { delay: 2500, disableOnInteraction: false, },
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
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;
        e.preventDefault(); 
        const id = button.dataset.id;
        const product = {
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image
        };
        addToCart(id, product);
        button.innerHTML = 'ADDED!';
        button.disabled = true;
        setTimeout(() => {
            button.innerHTML = `
                <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
                <span>ADD TO CART</span>
            `;
            button.disabled = false;
        }, 2000);
    });
}