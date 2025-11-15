// ഇതാണ് 'product.js' ഫയൽ.
// *** എല്ലാ പുതിയ മാറ്റങ്ങളും വരുത്തി ***
// 1. Swiper ഗാലറി (ഓട്ടോപ്ലേ, ഡോട്ടുകൾ സഹിതം)
// 2. വിവരങ്ങളുടെ ക്രമം മാറ്റി (Name -> Size -> Price)
// 3. 'Add to Cart' ഐക്കൺ 'ബാഗ്' ആക്കി
// 4. 'You May Also Like' ബട്ടണുകൾ അപ്ഡേറ്റ് ചെയ്തു

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
let whatsappNumber = '';

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

        // വിലയും ഡിസ്കൗണ്ടും
        const price = product.price || 0;
        const mrp = product.mrp || 0;
        let priceHTML = `<span class="price-main">₹${price}</span>`; // CSS ഇത് വെള്ള നിറമാക്കും
        if (mrp > price) {
            const discount = Math.round(((mrp - price) / mrp) * 100);
            priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`; // CSS ഇത് ചുവപ്പ് നിറമാക്കും
            priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
        }

        // *** പുതിയ മാറ്റം: Swiper ഗാലറി ***
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
                    <!-- ഡോട്ടുകൾ (Pagination) -->
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

        // *** പുതിയ മാറ്റം: വിവരങ്ങളുടെ ക്രമം മാറ്റി (Name -> Size -> Price) ***
        const infoHTML = `
            <div class="product-info">
                <h1 class="product-title">${product.name}</h1>
                
                <!-- Size പേരിന് താഴെയാക്കി -->
                <div class="product-size">
                    <strong>Size:</strong> ${product.size || 'N/A'}
                </div>
                
                <!-- വില Size-ന് താഴെയാക്കി -->
                <div class="price-container large">
                    ${priceHTML}
                </div>
                
                <div class="product-description">
                    ${product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.'}
                </div>
                
                <div class="product-actions-grid">
                    <!-- ബട്ടൺ 1: Add to Cart (പുതിയ വെള്ള ബാഗ് ഐക്കൺ) -->
                    <button class="btn-secondary-new" id="add-to-cart-btn">
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        Add to Cart
                    </button>
                    
                    <!-- ബട്ടൺ 2: Buy on WhatsApp (പുതിയ വെള്ള ഐക്കൺ) -->
                    <a class="btn-primary-new" id="buy-on-whatsapp-btn" href="#">
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                        Buy on WhatsApp
                    </a>
                </div>
                <div id="add-to-cart-feedback" style="display: none;"></div>
            </div>
        `;

        productDetailContent.innerHTML = galleryHTML + infoHTML;
        
        // *** പുതിയ മാറ്റം: Swiper സ്ലൈഡർ പ്രവർത്തിപ്പിക്കുന്നു ***
        new Swiper('.product-gallery-swiper', {
            loop: true,
            autoplay: {
                delay: 3000, // 3 സെക്കൻഡ്
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            allowTouchMove: true,
            speed: 600,
        });
        
        // ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
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
    
    // 1. "Add to Cart" ബട്ടൺ
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
                    // *** പുതിയ മാറ്റം: വെള്ള ബാഗ് ഐക്കൺ തിരികെ കൊണ്ടുവരുന്നു ***
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
    
    // 2. "Buy on WhatsApp" ബട്ടൺ
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
                message += `${productLink}`;
                
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
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadRelatedProducts(categoryId, excludeProductId) {
    if (!relatedProductsGrid) return;
    try {
        const q = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(5));
        const querySnapshot = await getDocs(q);
        relatedProductsGrid.innerHTML = '';
        let count = 0;
        querySnapshot.forEach((doc) => {
            if (doc.id === excludeProductId || count >= 4) return;
            
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'category-product-card';
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            // *** പുതിയ മാറ്റം: 'You May Also Like' ബട്ടണുകൾ അപ്ഡേറ്റ് ചെയ്തു ***
            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    <!-- 'product.js'-ലെ പ്രധാന ബട്ടണുകൾക്ക് സമാനമായ ഗ്രിഡ് -->
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
                        <!-- വെള്ള WhatsApp ഐക്കൺ -->
                        <a href="product.html?id=${productId}" class="btn btn-primary-new">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                            <span>Buy</span>
                        </a>
                    </div>
                </div>
            `;
            relatedProductsGrid.appendChild(card);
            count++;
        });
        if (count === 0) {
            relatedProductsGrid.innerHTML = '<p class="loading-placeholder">No related products found.</p>';
        }
    } catch (error) { console.error("Error loading related products: ", error); }
}

relatedProductsGrid.addEventListener('click', (e) => {
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
    button.innerHTML = 'Added!';
    button.disabled = true;
    setTimeout(() => {
        // *** പുതിയ മാറ്റം: വെള്ള ബാഗ് ഐക്കൺ തിരികെ കൊണ്ടുവരുന്നു ***
        button.innerHTML = `
            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>Cart</span>
        `;
        button.disabled = false;
    }, 2000);
});