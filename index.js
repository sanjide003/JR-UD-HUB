// ഇതാണ് 'index.js' ഫയൽ.
// "Boutique Video" കോഡ് നീക്കം ചെയ്തു.

import { db, appId } from './firebase-config.js'; // *** appId ഇമ്പോർട്ട് ചെയ്യുന്നു ***
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
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ

setLogLevel('Debug');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    // 1. പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ, മെനു, കാർട്ട്, ഫ്ലോട്ടിംഗ് ബട്ടണുകൾ)
    loadSiteSettings();
    
    // 2. ഈ പേജിന് മാത്രമുള്ള കാര്യങ്ങൾ
    loadHeroSlider();
    loadTopSellers();
    loadHomeCategories();
    // setupBoutiqueVideo(); // <-- ഈ ഫംഗ്ഷൻ നീക്കം ചെയ്തു
});

/**
 * 1. ഹീറോ സെക്ഷനിലെ പശ്ചാത്തല സ്ലൈഡർ ലോഡ് ചെയ്യുന്നു
 */
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    const heroSection = document.getElementById('hero-section-new');
    if (!sliderWrapper || !heroSection) return;

    try {
        // *** ഡാറ്റാബേസ് പാത്ത് ശരിയാക്കി ***
        const q = query(collection(db, `artifacts/${appId}/public/data/heroSlides`), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No hero slides found.");
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/600x800/000000/D4AF37?text=Al+Ambar" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = ''; // Loading... നീക്കം ചെയ്യുന്നു
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                if (slide.type === 'video') {
                    slideEl.innerHTML = `
                        <video src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>
                    `;
                } else if (slide.type === 'image') {
                    slideEl.innerHTML = `
                        <img src="${slide.url}" alt="Hero Background Image">
                    `;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }

        // സ്ലൈഡർ ആരംഭിക്കുന്നു
        new Swiper('.hero-slider-new', {
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            autoplay: {
                delay: 4000, // 4 സെക്കൻഡ്
                disableOnInteraction: false
            },
            allowTouchMove: true, // മൊബൈലിൽ സ്വൈപ്പ് ചെയ്യാൻ
            speed: 1000,
        });

    } catch (error) {
        console.error("Error loading hero slider: ", error);
    }
}


/**
 * 2. "Top Sellers" കറൗസൽ ലോഡ് ചെയ്യുന്നു (പുതിയ ഡിസൈൻ)
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;

    try {
        // *** ഡാറ്റാബേസ് പാത്ത് ശരിയാക്കി ***
        const q = query(
            collection(db, `artifacts/${appId}/public/data/products`), 
            where("featured", "==", true), 
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No featured products found.</p>';
            return;
        }

        grid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide';

            // വില (MRP ഇല്ലെങ്കിൽ കാണിക്കില്ല)
            let priceHTML = `₹${product.price || 0} /-`;
            
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            // പുതിയ HTML ഘടന
            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="top-sellers-product-info">
                    <div class="top-sellers-product-name">${product.name} ${product.size ? `(${product.size})` : ''}</div>
                    <div class="top-sellers-product-price">${priceHTML}</div>
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
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5S10.62 14.5 12 14.5s2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"></path></svg>
                            <span>VIEW</span>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // കറൗസൽ ആരംഭിക്കുന്നു
        new Swiper('.top-sellers-swiper-new', {
            slidesPerView: 1,
            spaceBetween: 20,
            pagination: { // ഡോട്ടുകൾ ചേർക്കുന്നു
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                640: { slidesPerView: 2 },
                900: { slidesPerView: 4 }, // 2 കോളം ആക്കി
                1200: { slidesPerView: 4 }, // 2 കോളം ആക്കി
            }
        });

    } catch (error) {
        console.error("Error loading top sellers: ", error);
        grid.innerHTML = '<p>Error loading products.</p>';
    }
}

/**
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു (പുതിയ ഡിസൈൻ)
 */
async function loadHomeCategories() {
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;

    try {
        // *** ഡാറ്റാബേസ് പാത്ത് ശരിയാക്കി ***
        const catQuery = query(
            collection(db, `artifacts/${appId}/public/data/categories`),
            orderBy("name"),
            limit(8) // കൂടുതൽ കാറ്റഗറികൾ കാണിക്കാം
        );
        const catSnapshot = await getDocs(catQuery);

        if (catSnapshot.empty) {
            grid.innerHTML = '<p>No categories to show.</p>';
            return;
        }

        grid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            const catId = doc.id;
            const card = document.createElement('a');
            card.className = 'category-card-home-new';
            card.href = `categories.html?filter=${catId}`;
            
            const imageUrl = category.imageUrl || 'https://placehold.co/100x100/1e1e1e/D4AF37?text=...';
            
            card.innerHTML = `
                <div class="cat-card-home-img-wrapper">
                    <img src="${imageUrl}" 
                         alt="${category.name}"
                         onerror="this.src='https://placehold.co/100x100/1e1e1e/D4AF37?text=Error'">
                </div>
                <h3>${category.name}</h3>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading home categories: ", error);
        grid.innerHTML = '<p>Error loading categories.</p>';
    }
}

/*
 * 4. ബൊട്ടീക് വീഡിയോ മോഡൽ പ്രവർത്തിപ്പിക്കുന്നു - ഈ ഭാഗം നീക്കം ചെയ്തു
 */

/*
 * YouTube URL-ൽ നിന്ന് ID വേർതിരിച്ചെടുക്കുന്നു - ഈ ഭാഗം നീക്കം ചെയ്തു
 */

/**
 * ഹോം പേജിലെ "Add to Cart" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;

        e.preventDefault(); // ലിങ്ക് ആണെങ്കിൽ തടയുന്നു

        const id = button.dataset.id;
        const product = {
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image
        };

        // കാർട്ടിലേക്ക് ചേർക്കുന്നു
        addToCart(id, product);

        // ഉപഭോക്താവിനെ അറിയിക്കുന്നു
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