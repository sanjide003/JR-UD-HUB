// ഇതാണ് 'product.js' ഫയൽ.
// ഉൽപ്പന്നം വിശദമായി കാണിക്കുന്ന പേജിന് (product.html) മാത്രം വേണ്ടിയുള്ള കാര്യങ്ങൾ ഈ ഫയൽ ചെയ്യുന്നു.
// **** "Add to Cart" ബട്ടൺ അപ്‌ഡേറ്റ് ചെയ്തു ****

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
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ ഇമ്പോർട്ട് ചെയ്യുന്നു

setLogLevel('Debug');

const productDetailContent = document.getElementById('product-detail-content');
const relatedProductsGrid = document.getElementById('related-products-grid');
let currentProduct = null; // നിലവിലെ ഉൽപ്പന്നത്തിന്റെ ഡാറ്റ സേവ് ചെയ്യാൻ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (പുതിയ ഹെഡർ, ഫൂട്ടർ, മെനു)
    loadProductDetails(); // ഈ പേജിലെ ഉൽപ്പന്നം
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

        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            productDetailContent.innerHTML = '<p class="error-message">Product not found.</p>';
            return;
        }

        const product = docSnap.data();
        const productIdStr = docSnap.id;
        
        // കാർട്ടിൽ ചേർക്കാൻ വേണ്ടി ഉൽപ്പന്നത്തിന്റെ ഡാറ്റ സേവ് ചെയ്യുന്നു
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
        let priceHTML = `<span class="price-main">₹${price}</span>`;
        if (mrp > price) {
            const discount = Math.round(((mrp - price) / mrp) * 100);
            priceHTML += `<span class="price-mrp"><del>₹${mrp}</del></span>`;
            priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
        }

        // ഫോട്ടോ ഗാലറി
        let galleryHTML = '';
        if (product.images && product.images.length > 0) {
            const mainImage = product.images[0];
            let thumbnailsHTML = '';
            
            product.images.forEach((imgUrl, index) => {
                thumbnailsHTML += `
                    <img src="${imgUrl}" alt="Thumbnail ${index + 1}" class="thumbnail-image ${index === 0 ? 'active' : ''}" data-image="${imgUrl}">
                `;
            });

            galleryHTML = `
                <div class="product-gallery">
                    <div class="main-image-wrapper">
                        <img src="${mainImage}" alt="${product.name}" id="main-product-image">
                    </div>
                    <div class="thumbnail-wrapper">
                        ${thumbnailsHTML}
                    </div>
                </div>
            `;
        } else {
            galleryHTML = `
                <div class="product-gallery">
                    <img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${product.name}" id="main-product-image">
                </div>
            `;
        }

        // ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ
        const infoHTML = `
            <div class="product-info">
                <h1 class="product-title">${product.name}</h1>
                <div class="price-container large">
                    ${priceHTML}
                </div>
                <div class="product-description">
                    ${product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.'}
                </div>
                <div class="product-size">
                    <strong>Size:</strong> ${product.size || 'N/A'}
                </div>
                <!-- **** ഐക്കൺ ഇതിനകം ശരിയാണ് **** -->
                <button class="btn btn-primary btn-add-to-cart-main" id="add-to-cart-btn">
                    <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    Add to Cart
                </button>
                <div id="add-to-cart-feedback" style="display: none;"></div>
            </div>
        `;

        productDetailContent.innerHTML = galleryHTML + infoHTML;

        // ഗാലറി ക്ലിക്കുകൾ കൈകാര്യം ചെയ്യുന്നു
        setupGalleryEvents();
        
        // "Add to Cart" ബട്ടൺ കൈകാര്യം ചെയ്യുന്നു
        setupCartButton();

        // ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
        if (product.categoryId) {
            loadRelatedProducts(product.categoryId, productIdStr);
        }

    } catch (error) {
        console.error("Error loading product details: ", error);
        productDetailContent.innerHTML = '<p class="error-message">Error loading product details.</p>';
    }
}

/**
 * ഫോട്ടോ ഗാലറിയിലെ ക്ലിക്കുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 */
function setupGalleryEvents() {
    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumbnail-image');
    
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // പഴയ active ക്ലാസ് മാറ്റുന്നു
            document.querySelector('.thumbnail-image.active')?.classList.remove('active');
            // പുതിയ active ക്ലാസ് ചേർക്കുന്നു
            thumb.classList.add('active');
            // വലിയ ഫോട്ടോ മാറ്റുന്നു
            mainImage.src = thumb.dataset.image;
        });
    });
}

/**
 * "Add to Cart" ബട്ടൺ പ്രവർത്തിപ്പിക്കുന്നു
 */
function setupCartButton() {
    const button = document.getElementById('add-to-cart-btn');
    const feedback = document.getElementById('add-to-cart-feedback');
    
    if (!button) return;

    button.addEventListener('click', () => {
        if (currentProduct) {
            addToCart(currentProduct.id, currentProduct);
            
            button.innerHTML = 'Added!';
            button.disabled = true;
            feedback.textContent = `${currentProduct.name} has been added to your cart.`;
            feedback.style.display = 'block';

            setTimeout(() => {
                // **** ഐക്കൺ സഹിതം തിരികെ കൊണ്ടുവരുന്നു ****
                button.innerHTML = `
                    <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    Add to Cart
                `;
                button.disabled = false;
                feedback.style.display = 'none';
            }, 2500);
        }
    });
}

/**
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadRelatedProducts(categoryId, excludeProductId) {
    if (!relatedProductsGrid) return;

    try {
        const q = query(
            collection(db, "products"),
            where("categoryId", "==", categoryId),
            limit(5) // 4 എണ്ണം കാണിക്കാൻ 5 എണ്ണം എടുക്കുന്നു
        );

        const querySnapshot = await getDocs(q);
        relatedProductsGrid.innerHTML = '';
        let count = 0;

        querySnapshot.forEach((doc) => {
            if (doc.id === excludeProductId || count >= 4) {
                return; // നിലവിലെ ഉൽപ്പന്നമോ 4 എണ്ണം തികഞ്ഞാലോ ഒഴിവാക്കുന്നു
            }
            
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'product-card'; // ഹോം പേജിലെ അതേ സ്റ്റൈൽ

            // വിലയും ഡിസ്കൗണ്ടും
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            let priceHTML = `<span class="price-main">₹${price}</span>`;
            if (mrp > price) {
                const discount = Math.round(((mrp - price) / mrp) * 100);
                priceHTML += `<span class="price-mrp"><del>₹${mrp}</del></span>`;
                priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
            }
            
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            // **** ഐക്കൺ ചേർത്തു ****
            card.innerHTML = `
                <a href="product.html?id=${productId}" class="product-card-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="product-card-image">
                </a>
                <div class="product-card-content">
                    <h3 class="product-card-title">${product.name}</h3>
                    <div class="price-container">${priceHTML}</div>
                    <div class="product-card-buttons">
                        <button class="btn btn-secondary btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}"
                            data-mrp="${mrp}"
                            data-image="${imageUrl}">
                            <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            Add to Cart
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary">View Product</a>
                    </div>
                </div>
            `;
            relatedProductsGrid.appendChild(card);
            count++;
        });

        if (count === 0) {
            relatedProductsGrid.innerHTML = '<p>No related products found.</p>';
        }

    } catch (error) {
        console.error("Error loading related products: ", error);
    }
}

// ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങളുടെ "Add to Cart" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
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
        // **** ഐക്കൺ സഹിതം തിരികെ കൊണ്ടുവരുന്നു ****
        button.innerHTML = `
            <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Add to Cart
        `;
        button.disabled = false;
    }, 2000);
});