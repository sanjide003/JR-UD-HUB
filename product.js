// ഇതാണ് 'product.js' ഫയൽ.
// *** Vercel-ൽ പ്രവർത്തിക്കാനായി പാതകൾ ശരിയാക്കി ***

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
import { db } from './firebase-config.js'; // appId ഇമ്പോർട്ട് ചെയ്യേണ്ട ആവശ്യമില്ല
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

        // *** ഇതാണ് ശരിയായ പാത്ത് ***
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
                <button class="btn-primary-new btn-add-to-cart-main" id="add-to-cart-btn">
                    <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
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
            document.querySelector('.thumbnail-image.active')?.classList.remove('active');
            thumb.classList.add('active');
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
                button.innerHTML = `
                    <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
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
        // *** ഇതാണ് ശരിയായ പാത്ത് ***
        const q = query(
            collection(db, "products"),
            where("categoryId", "==", categoryId),
            limit(5) 
        );

        const querySnapshot = await getDocs(q);
        relatedProductsGrid.innerHTML = '';
        let count = 0;

        querySnapshot.forEach((doc) => {
            if (doc.id === excludeProductId || count >= 4) {
                return; 
            }
            
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'category-product-card'; // കാറ്റഗറി പേജിലെ അതേ സ്റ്റൈൽ

            const price = product.price || 0;
            const mrp = product.mrp || 0;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    <div class="cat-product-buttons">
                        <button class="btn btn-secondary-icon btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}"
                            data-mrp="${mrp}"
                            data-image="${imageUrl}">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
                            <span>Add to Cart</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-icon">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5S10.62 14.5 12 14.5s2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"></path></svg>
                            <span>View</span>
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
        button.innerHTML = `
            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
            <span>Add to Cart</span>
        `;
        button.disabled = false;
    }, 2000);
});