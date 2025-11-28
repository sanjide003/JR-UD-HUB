// index.js - Performance Optimized
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

setLogLevel('Silent'); // ലോഗുകൾ കുറച്ചു

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
            const optimizedUrl = optimizeImage(bannerUrl, 1000, 80); // Quality 80
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

                if (slide.type === 'image') {
                    const optimizedHeroImg = optimizeImage(slide.url, 800, 80);
                    slideEl.innerHTML = `<img src="${optimizedHeroImg}" alt="Hero Image" loading="lazy">`;
                } else if (slide.type === 'video') {
                    // വീഡിയോകൾക്ക് Poster ഇമേജ് നൽകുന്നത് നല്ലതാണ് (Optional Optimization)
                    slideEl.innerHTML = `<video class="hero-video-element" src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>`;
                }
                
                sliderWrapper.appendChild(slideEl);
            });
        }

        new Swiper('.hero-slider-new', {
            loop: true, 
            effect: 'slide', // Fade-ന് പകരം Slide ആക്കി (Performance Better)
            speed: 600,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.hero-pagination-dots',
                clickable: true,
            }
        });

    } catch (error) { 
        console.error("Error loading hero slider"); 
    }
}

/**
 * 2. "For You" (Top Sellers)
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;
    
    // ലളിതമായ ലോഡിംഗ് ടെക്സ്റ്റ്
    grid.innerHTML = '<div class="swiper-slide" style="width:100%; text-align:center;">Loading...</div>';
    
    try {
        const q = query(collection(db, "products"), where("featured", "==", true), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No featured products found.</p>'; 
            return;
        }
        
        grid.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide';
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 300, 75); // സൈസ് കുറച്ചു
            
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn added-to-cart" : "btn"; 
            
            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         loading="lazy">
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

        // Initialize Swiper without complex animations
        new Swiper('.top-sellers-swiper-new', {
            loop: false,
            speed: 500,
            slidesPerView: 2, 
            spaceBetween: 10,
            pagination: { 
                el: '.top-sellers-pagination-new', 
                clickable: true,
            },
            breakpoints: { 
                640: { slidesPerView: 3, spaceBetween: 15 }, 
                900: { slidesPerView: 4, spaceBetween: 20 }, 
                1200: { slidesPerView: 5, spaceBetween: 20 } 
            }
        });
        
    } catch (error) { 
        console.error("Error loading top sellers"); 
        grid.innerHTML = '<p>Error loading products.</p>'; 
    }
}

/**
 * 3. SHOP BY CATEGORY - Random 3 Categories
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

        categories = shuffleArray(categories).slice(0, 3);
        container.innerHTML = ''; 

        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-card-portrait';
            
            const imageUrl = optimizeImage(category.imageUrl || '', 400, 80);
            
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

    } catch (error) { 
        console.error("Error loading home categories"); 
        container.innerHTML = '<p>Error loading categories.</p>';
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Cart Interaction Setup
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
            showToast('Added to cart');
        }
    });
}

function showToast(message) {
    // ലളിതമായ ടോസ്റ്റ് നോട്ടിഫിക്കേഷൻ
    let toast = document.getElementById('simple-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'simple-toast';
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #333; color: #fff; padding: 10px 20px;
            border-radius: 5px; z-index: 2000; font-size: 0.9rem;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}