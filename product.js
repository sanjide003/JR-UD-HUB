// ഇതാണ് 'product.js' ഫയൽ.
// *** "Buy on WhatsApp" ബട്ടണുകളിൽ നിന്ന് ഐക്കൺ നീക്കം ചെയ്തു ***

import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';
import { addToCart } from './cart.js';

setLogLevel('Debug');

const productDetailContent = document.getElementById('product-detail-content');
const relatedProductsGrid = document.getElementById('related-products-grid');
let currentProduct = null;
let whatsappNumber = ''; // WhatsApp നമ്പർ സേവ് ചെയ്യാൻ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    loadProductDetails();
});

/**
 * URL-ൽ നിന്ന് ID എടുത്ത് ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ കാണിക്കുന്നു
 */
async function loadProductDetails() {
    if (!productDetailContent) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            productDetailContent.innerHTML = '<p class="error-message">Product ID not found. Please go back and try again.</p>';
            return;
        }

        try {
            const settingsDoc = await getDoc(doc(db, "settings", "global"));
            if (settingsDoc.exists() && settingsDoc.data().whatsapp) {
                whatsappNumber = settingsDoc.data().whatsapp;
            }
        } catch (e) { console.error("Could not load whatsapp number", e); }

        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            productDetailContent.innerHTML = '<p class="error-message">Product not found.</p>';
            return;
        }

        const product = docSnap.data();
        const productIdStr = docSnap.id;
        
        currentProduct = {
            id: productIdStr,
            name: product.name,
            price: product.price || 0,
            mrp: product.mrp || 0,
            image: product.images && product.images[0] ? product.images[0] : ''
        };

        const price = product.price || 0;
        const mrp = product.mrp || 0;
        let priceHTML = `<span class="price-main">₹${price}</span>`;
        if (mrp > price) {
            const discount = Math.round(((mrp - price) / mrp) * 100);
            priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
            priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
        }

        let galleryHTML = '';
        if (product.images && product.images.length > 0) {
            let slidesHTML = '';
            product.images.forEach((imgUrl) => {
                slidesHTML += `
                    <div class="swiper-slide">
                        <img src="${imgUrl}" alt="${product.name}">
                    </div>
                `;
            });
            galleryHTML = `
                <div class="product-gallery-swiper swiper-container">
                    <div class="swiper-wrapper">
                        ${slidesHTML}
                    </div>
                    <div class="swiper-pagination"></div>
                </div>
            `;
        } else {
            galleryHTML = `
                <div class="product-gallery-swiper swiper-container">
                    <div class="swiper-wrapper">
                         <div class="swiper-slide">
                            <img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${product.name}">
                        </div>
                    </div>
                </div>
            `;
        }

        const infoHTML = `
            <div class="product-info">
                <h1 class="product-title">${product.name}</h1>
                <div class="product-size">
                    <strong>Size:</strong> ${product.size || 'N/A'}
                </div>
                <div class="price-container large">
                    ${priceHTML}
                </div>
                <div class="product-description">
                    ${product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.'}
                </div>
                
                <div class="product-actions-grid">
                    <!-- ബട്ടൺ 1: Add to Cart (പുതിയ ഡിസൈൻ) -->
                    <button class="btn-secondary-new" id="add-to-cart-btn">
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        Add to Cart
                    </button>
                    
                    <!-- ബട്ടൺ 2: Buy on WhatsApp (ഐക്കൺ നീക്കം ചെയ്തു) -->
                    <a class="btn-primary-new" id="buy-on-whatsapp-btn" href="#">
                        Buy on WhatsApp
                    </a>
                </div>
                <div id="add-to-cart-feedback" style="display: none;"></div>
            </div>
        `;

        productDetailContent.innerHTML = galleryHTML + infoHTML;
        
        new Swiper('.product-gallery-swiper', {
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            allowTouchMove: true,
            speed: 600,
        });
        
        setupProductActionButtons();

        if (product.categoryId) {
            loadRelatedProducts(product.categoryId, productIdStr);
        }

    } catch (error) {
        console.error("Error loading product details: ", error);
        productDetailContent.innerHTML = '<p class="error-message">Error loading product details.</p>';
    }
}


/**
 * "Add to Cart", "Buy on WhatsApp" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 */
function setupProductActionButtons() {
    const cartButton = document.getElementById('add-to-cart-btn');
    const whatsappButton = document.getElementById('buy-on-whatsapp-btn');
    const feedback = document.getElementById('add-to-cart-feedback');
    
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            if (currentProduct) {
                addToCart(currentProduct.id, currentProduct);
                feedback.textContent = `${currentProduct.name} has been added to your cart.`;
                feedback.style.display = 'block';
                feedback.style.color = 'var(--success-green)';
                cartButton.innerHTML = 'Added!';
                cartButton.disabled = true;
                setTimeout(() => {
                    cartButton.innerHTML = `
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        Add to Cart
                    `;
                    cartButton.disabled = false;
                    feedback.style.display = 'none';
                }, 2500);
            }
        });
    }
    
    if (whatsappButton) {
        if (!whatsappNumber) {
            whatsappButton.style.display = 'none';
            return;
        }
        whatsappButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentProduct) {
                const productLink = window.location.href; 
                let message = `Hi, I'm interested in this product:\n\n`;
                message += `*${currentProduct.name}*\n`;
                message += `*Price: ₹${currentProduct.price.toFixed(2)}*\n\n`; 
                message += `Product Link:\n${productLink}`;
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                 feedback.textContent = `Could not get product details.`;
                 feedback.style.display = 'block';
                 feedback.style.color = 'var(--error-red)';
            }
        });
    }
}

/**
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു (പുതിയ സ്ലൈഡർ രൂപത്തിൽ)
 */
async function loadRelatedProducts(categoryId, excludeProductId) {
    if (!relatedProductsGrid) return;
    try {
        // *** 9 എണ്ണം വരെ കാണിക്കാൻ ലിമിറ്റ് 10 ആക്കി ***
        const q = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(10));
        const querySnapshot = await getDocs(q);
        
        // *** Swiper HTML ഘടന ചേർത്തു ***
        relatedProductsGrid.innerHTML = `
            <div class="swiper related-products-swiper">
                <div class="swiper-wrapper" id="related-products-wrapper"></div>
            </div>
        `;
        const swiperWrapper = document.getElementById('related-products-wrapper');

        let count = 0;
        querySnapshot.forEach((doc) => {
            if (doc.id === excludeProductId || count >= 9) return; // 9 എണ്ണമായി പരിമിതപ്പെടുത്തി
            
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            // *** swiper-slide ക്ലാസ്സ് ചേർത്തു ***
            card.className = 'swiper-slide category-product-card';
            
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            // *** 'You May Also Like' ബട്ടണുകൾ പുതിയ ഡിസൈൻ ആക്കി ***
            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    <div class="product-actions-grid related-buttons">
                        <!-- വെള്ള ബാഗ് ഐക്കൺ -->
                        <button class="btn btn-secondary-new btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}"
                            data-mrp="${mrp}"
                            data-image="${imageUrl}">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            <span>Cart</span>
                        </button>
                        <!-- "Buy" ബട്ടണിൽ നിന്ന് ഐക്കൺ നീക്കം ചെയ്തു -->
                        <button class="btn btn-primary-new btn-buy-whatsapp-related"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}">
                            <span>Buy</span>
                        </button>
                    </div>
                </div>
            `;
            swiperWrapper.appendChild(card);
            count++;
        });

        if (count === 0) {
            relatedProductsGrid.innerHTML = '<p class="loading-placeholder">No related products found.</p>';
        } else {
            // *** 'You May Also Like' സ്ലൈഡർ പ്രവർത്തിപ്പിക്കുന്നു ***
            new Swiper('.related-products-swiper', {
                loop: false,
                slidesPerView: 2.2,
                spaceBetween: 15,
                allowTouchMove: true,
                breakpoints: {
                    640: { slidesPerView: 3.2, spaceBetween: 20 },
                    900: { slidesPerView: 4.2, spaceBetween: 20 },
                }
            });
        }

    } catch (error) { console.error("Error loading related products: ", error); }
}

// 'You May Also Like' സെക്ഷനിലെ ബട്ടണുകൾ
relatedProductsGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');
    const buyButton = e.target.closest('.btn-buy-whatsapp-related'); 

    if (cartButton) {
        e.preventDefault();
        const id = cartButton.dataset.id;
        const product = {
            name: cartButton.dataset.name,
            price: parseFloat(cartButton.dataset.price),
            mrp: parseFloat(cartButton.dataset.mrp),
            image: cartButton.dataset.image
        };
        addToCart(id, product);
        cartButton.innerHTML = 'Added!';
        cartButton.disabled = true;
        setTimeout(() => {
            cartButton.innerHTML = `
                <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span>Cart</span>
            `;
            cartButton.disabled = false;
        }, 2000);
    } 
    else if (buyButton) {
        e.preventDefault();
        if (!whatsappNumber) {
            console.error("WhatsApp number not found.");
            // *** alert() മാറ്റി കസ്റ്റം ഫീഡ്ബാക്ക് ഉപയോഗിക്കാം, പക്ഷെ ഇവിടെ alert ആണ് എളുപ്പം ***
            // *** തൽക്കാലം alert() ഒഴിവാക്കുന്നു, കൺസോളിൽ ലോഗ് ചെയ്യുന്നു ***
            console.error("Could not send message. WhatsApp number is not configured.");
            return;
        }
        
        const id = buyButton.dataset.id;
        const name = buyButton.dataset.id;
        const price = parseFloat(buyButton.dataset.price);
        
        const productLink = `${window.location.origin}${window.location.pathname.replace('product.html', 'product.html')}?id=${id}`;
        
        let message = `Hi, I'm interested in this product:\n\n`;
        message += `*${name}*\n`;
        message += `*Price: ₹${price.toFixed(2)}*\n\n`;
        message += `Product Link:\n${productLink}`;
        
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
});