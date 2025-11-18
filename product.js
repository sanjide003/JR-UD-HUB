// ഇതാണ് 'product.js' ഫയൽ.
// *** "Add to Cart" ബട്ടൺ ടോഗിൾ ആക്കി മാറ്റി ***

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
// *** isItemInCart, removeFromCart എന്നിവ import ചെയ്തു ***
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Debug');

const productDetailContent = document.getElementById('product-detail-content');
const relatedProductsGrid = document.getElementById('related-products-grid');
let currentProduct = null;
let whatsappNumber = ''; 

/**
 * ടെക്സ്റ്റിലെ ലിങ്കുകൾ ക്ലിക്ക് ചെയ്യാൻ
 */
function linkify(text) {
    // ... (ഈ ഫംഗ്ഷനിൽ മാറ്റമില്ല) ...
    if (!text) return '';
    const urlRegex = /(\b(https|http|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    return text.replace(urlRegex, function(url, p1, p2, p3) {
        const href = p3 ? 'http://' + p3 : p1;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}


// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    loadProductDetails();
});

/**
 * URL-ൽ നിന്ന് ID എടുത്ത് ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ കാണിക്കുന്നു
 * *** പ്രധാന "Add to Cart" ബട്ടൺ അപ്ഡേറ്റ് ചെയ്തു ***
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
            image: product.images && product.images[0] ? product.images[0] : '',
            size: product.size || ''
        };

        const price = product.price || 0;
        const mrp = product.mrp || 0;
        let priceHTML = `<span class="price-main">₹${price}</span>`;
        if (mrp > price) {
            const discount = Math.round(((mrp - price) / mrp) * 100);
            priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
            priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
        }

        // "More Links" (Paid Promotion) HTML
        let moreLinksHTML = '';
        // ... (ഈ ഭാഗത്ത് മാറ്റമില്ല) ...
        if (product.moreLinks && product.moreLinks.length > 0) {
            moreLinksHTML = '<div class="product-more-links">';
            product.moreLinks.forEach(link => {
                moreLinksHTML += `
                    <a href="${link.url}" class="product-promotion-link" target="_blank" rel="noopener noreferrer">
                        <span>${link.title}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </a>
                `;
            });
            moreLinksHTML += '</div>';
        }

        let galleryHTML = '';
        // ... (ഈ ഭാഗത്ത് മാറ്റമില്ല) ...
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
                    ${moreLinksHTML}
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
                    ${moreLinksHTML}
                </div>
            `;
        }

        // ഡിസ്ക്രിപ്ഷൻ ലിങ്കാക്കുന്നു
        let descriptionHTML = 'No description available.';
        // ... (ഈ ഭാഗത്ത് മാറ്റമില്ല) ...
        if (product.description) {
            let linkifiedText = linkify(product.description);
            descriptionHTML = linkifiedText.replace(/\n/g, '<br>');
        }

        // *** പ്രധാന "Add to Cart" ബട്ടൺ അപ്ഡേറ്റ് ചെയ്തു ***
        const isInCart = isItemInCart(productIdStr);
        const cartButtonText = isInCart ? "Remove from Cart" : "Add to Cart";
        const cartButtonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new";

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
                    ${descriptionHTML}
                </div>
                
                <div class="product-actions-grid">
                    <!-- *** ബട്ടൺ HTML അപ്ഡേറ്റ് ചെയ്തു *** -->
                    <button class="btn ${cartButtonClass}" id="add-to-cart-btn">
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span>${cartButtonText}</span>
                    </button>
                    
                    <a class="btn btn-primary-new" id="buy-on-whatsapp-btn" href="#">
                        Buy on WhatsApp
                    </a>
                </div>
                <div id="add-to-cart-feedback" style="display: none;"></div>
            </div>
        `;

        productDetailContent.innerHTML = galleryHTML + infoHTML;
        
        new Swiper('.product-gallery-swiper', {
            // ... (Swiper കോഡിൽ മാറ്റമില്ല) ...
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
 * *** "Add to Cart" ടോഗിൾ ലോജിക് ആക്കി മാറ്റി ***
 */
function setupProductActionButtons() {
    const cartButton = document.getElementById('add-to-cart-btn');
    const whatsappButton = document.getElementById('buy-on-whatsapp-btn');
    const feedback = document.getElementById('add-to-cart-feedback'); // *** ഇത് ഇപ്പോൾ ഉപയോഗിക്കുന്നില്ല, പക്ഷെ അവിടെ നിൽക്കട്ടെ ***
    
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            if (!currentProduct) return;

            const buttonText = cartButton.querySelector('span');
            const id = currentProduct.id;

            if (cartButton.classList.contains('added-to-cart')) {
                // കാർട്ടിൽ ഉണ്ട്, അതിനാൽ നീക്കം ചെയ്യുന്നു
                removeFromCart(id);
                cartButton.classList.remove('added-to-cart');
                cartButton.classList.remove('btn-primary-new');
                cartButton.classList.add('btn-secondary-new');
                if (buttonText) buttonText.textContent = 'Add to Cart';

            } else {
                // കാർട്ടിൽ ഇല്ല, അതിനാൽ ചേർക്കുന്നു
                addToCart(id, currentProduct);
                cartButton.classList.add('added-to-cart');
                cartButton.classList.add('btn-primary-new');
                cartButton.classList.remove('btn-secondary-new');
                if (buttonText) buttonText.textContent = 'Remove from Cart';
            }
        });
    }
    
    if (whatsappButton) {
        // ... (ഈ ഫംഗ്ഷനിൽ മാറ്റമില്ല) ...
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
                if(currentProduct.size) {
                    message += `*Size: ${currentProduct.size}*\n`;
                }
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
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 * *** ബട്ടൺ ടോഗിൾ ലോജിക് ചേർത്തു ***
 */
async function loadRelatedProducts(categoryId, excludeProductId) {
    if (!relatedProductsGrid) return;
    try {
        const q = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(10));
        const querySnapshot = await getDocs(q);
        
        relatedProductsGrid.innerHTML = `
            <div class="swiper related-products-swiper">
                <div class="swiper-wrapper" id="related-products-wrapper"></div>
            </div>
        `;
        const swiperWrapper = document.getElementById('related-products-wrapper');

        let count = 0;
        querySnapshot.forEach((doc) => {
            if (doc.id === excludeProductId || count >= 9) return; 
            
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide category-product-card'; 
            
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            let priceHTML = `<span class="price-main">₹${price}</span>`;
            if (mrp > price) {
                priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
            }

            // *** കാർട്ടിൽ ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു ***
            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new";

            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    
                    <div class="price-container">
                        ${priceHTML}
                    </div>

                    <div class="cat-product-buttons">
                        <!-- *** ബട്ടൺ HTML അപ്ഡേറ്റ് ചെയ്തു *** -->
                        <button class="btn ${buttonClass} btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}"
                            data-mrp="${mrp}"
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
            swiperWrapper.appendChild(card);
            count++;
        });

        if (count === 0) {
            relatedProductsGrid.innerHTML = '<p class="loading-placeholder">No related products found.</p>';
        } else {
            new Swiper('.related-products-swiper', {
                // ... (Swiper കോഡിൽ മാറ്റമില്ല) ...
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
// *** ടോഗിൾ ലോജിക് ആക്കി മാറ്റി ***
relatedProductsGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');

    if (cartButton) {
        e.preventDefault();
        
        const id = cartButton.dataset.id;
        const buttonText = cartButton.querySelector('span');

        if (cartButton.classList.contains('added-to-cart')) {
            // കാർട്ടിൽ ഉണ്ട്, അതിനാൽ നീക്കം ചെയ്യുന്നു
            removeFromCart(id);
            cartButton.classList.remove('added-to-cart');
            cartButton.classList.remove('btn-primary-new');
            cartButton.classList.add('btn-secondary-new');
            if (buttonText) buttonText.textContent = 'Cart';
        } else {
            // കാർട്ടിൽ ഇല്ല, അതിനാൽ ചേർക്കുന്നു
            const product = {
                id: id, 
                name: cartButton.dataset.name,
                price: parseFloat(cartButton.dataset.price),
                mrp: parseFloat(cartButton.dataset.mrp),
                image: cartButton.dataset.image,
                size: cartButton.dataset.size 
            };
            addToCart(id, product);
            cartButton.classList.add('added-to-cart');
            cartButton.classList.add('btn-primary-new');
            cartButton.classList.remove('btn-secondary-new');
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});