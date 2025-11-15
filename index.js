// ഇതാണ് 'index.js' ഫയൽ.
// *** "Top Sellers" ബട്ടണുകൾ ശരിയാക്കി ***
// *** സ്ലൈഡറുകൾ സ്മൂത്ത് ആക്കാൻ 'speed: 1000' ചേർത്തു ***

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
 * 1. ഹീറോ സ്ലൈഡർ ലോഡ് ചെയ്യുന്നു
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
                if (slide.type === 'video') {
                    slideEl.innerHTML = `<video src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>`;
                } else if (slide.type === 'image') {
                    slideEl.innerHTML = `<img src="${slide.url}" alt="Hero Background Image">`;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }
        new Swiper('.hero-slider-new', {
            loop: true, 
            effect: 'fade', // ഹീറോ സ്ലൈഡർ 'fade' ഉപയോഗിക്കുന്നു
            fadeEffect: { crossFade: true },
            autoplay: { delay: 4000, disableOnInteraction: false },
            allowTouchMove: true, 
            speed: 1000,
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
            
            // *** ബട്ടണുകൾ ഉൾപ്പെടെയുള്ള പൂർണ്ണമായ HTML കോഡ് ***
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
                    <!-- *** ബട്ടണുകൾ ഇവിടെ തിരികെ ചേർത്തു *** -->
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
                        <a href="product.html?id=${productId}" class="btn btn-primary-icon">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                            <span>Buy</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // "Top Sellers" സ്ലൈഡർ കോൺഫിഗറേഷൻ
        new Swiper('.top-sellers-swiper-new', {
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            speed: 1000, // <-- സ്ലൈഡ് സ്മൂത്ത് ആക്കാൻ
            slidesPerView: 1, 
            spaceBetween: 20,
            pagination: { 
                el: '.swiper-pagination', 
                clickable: true 
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
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു (സ്ലൈഡർ ആയി)
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

        // കാറ്റഗറി സ്ലൈഡർ കോൺഫിഗറേഷൻ
        new Swiper('.category-swiper-new', {
            loop: true,
            speed: 1000, // <-- സ്ലൈഡ് സ്മൂത്ത് ആക്കാൻ
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            slidesPerView: 3,
            spaceBetween: 15,
            breakpoints: {
                640: { slidesPerView: 4, spaceBetween: 20 },
                900: { slidesPerView: 6, spaceBetween: 20 },
                1200: { slidesPerView: 7, spaceBetween: 20 },
            }
        });

    } catch (error) {
        console.error("Error loading home categories: ", error);
        grid.innerHTML = '<p>Error loading categories.</p>';
    }
}

/**
 * ഹോം പേജിലെ "Add to Cart" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
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