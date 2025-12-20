// product.js - Footer & Header Loading Enabled

import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    limit,
    orderBy, 
    runTransaction,
    serverTimestamp,
    onSnapshot,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Silent');

const productDetailContent = document.getElementById('product-detail-content');
const categoryProductsGrid = document.getElementById('category-products-grid');
const randomProductsGrid = document.getElementById('random-products-grid');
const randomProductsWrapper = document.getElementById('random-products-section-wrapper');

let currentProduct = null;
let whatsappNumber = ''; 
let currentUser = null;
let appTitle = "JR UD HUB"; 
let orderConfig = { codEnabled: false, codFee: 0 }; 

let productUnsubscribe = null;

const paymentModal = document.getElementById('payment-modal');
const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
const paymentRadios = document.getElementsByName('payment_mode');
const codWarningBox = document.getElementById('cod-warning-box');
const codWarningText = document.getElementById('cod-warning-text');

// *** Initialize Page ***
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load Header & Footer
    await loadSiteSettings();
    
    // 2. Initialize Auth
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            initProductPage();
        } else {
            signInAnonymously(auth).catch(console.error);
        }
    });

    // 3. Setup Payment Modal Listeners
    setupPaymentModalListeners();
});

async function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        if(productDetailContent) productDetailContent.innerHTML = '<p class="error-msg">Product ID missing.</p>';
        return;
    }

    try {
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            whatsappNumber = data.whatsappNumber || '';
            appTitle = data.logoText || "JR UD HUB";
            orderConfig = {
                codEnabled: data.codEnabled === true,
                codFee: data.codFee || 0
            };
        }

        // Realtime Listener for Product
        const productRef = doc(db, "products", productId);
        productUnsubscribe = onSnapshot(productRef, (docSnap) => {
            if (docSnap.exists()) {
                currentProduct = { id: docSnap.id, ...docSnap.data() };
                renderProductDetails(currentProduct);
                loadRelatedProducts(currentProduct.category, currentProduct.id);
                loadRandomProducts(currentProduct.id);
                updateActionButtons(currentProduct.id);
            } else {
                if(productDetailContent) productDetailContent.innerHTML = '<p class="error-msg">Product not found.</p>';
            }
        }, (error) => {
            console.error("Error fetching product:", error);
            if(productDetailContent) productDetailContent.innerHTML = '<p class="error-msg">Error loading product.</p>';
        });

    } catch (error) {
        console.error("Error initializing product page:", error);
    }
}

function renderProductDetails(product) {
    if (!productDetailContent) return;

    document.title = `${product.name} - ${appTitle}`;

    // Images
    const images = product.images || [];
    const mainImage = images.length > 0 ? images[0] : 'https://placehold.co/600x600?text=No+Image';
    
    let slidesHTML = '';
    if (images.length > 0) {
        images.forEach(img => {
            slidesHTML += `<div class="swiper-slide"><img src="${optimizeImage(img, 800)}" alt="${product.name}"></div>`;
        });
    } else {
        slidesHTML = `<div class="swiper-slide"><img src="${mainImage}" alt="${product.name}"></div>`;
    }

    // Price & Discount
    const price = product.price;
    const mrp = product.mrp || price;
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    
    const discountHTML = discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : '';
    const originalPriceHTML = discount > 0 ? `<span class="original-price">₹${mrp}</span>` : '';

    // Description & Specifications
    const description = product.description || "No description available.";
    
    // Create Specs HTML
    let specsHTML = '';
    if (product.specifications && Object.keys(product.specifications).length > 0) {
        let listItems = '';
        for (const [key, value] of Object.entries(product.specifications)) {
            listItems += `
                <div class="spec-item">
                    <span class="spec-label">${key}</span>
                    <span class="spec-value">${value}</span>
                </div>`;
        }
        specsHTML = `
            <div class="specs-container">
                <div class="specs-title" onclick="toggleSpecs(this)">
                    Specifications 
                    <svg class="specs-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="specs-list" id="specs-list-content">
                    ${listItems}
                </div>
            </div>`;
    }

    // Variants (Simple Implementation)
    let variantsHTML = '';
    if (product.variants && product.variants.length > 0) { // Assuming variants is array of strings for now
         // Complex variant logic omitted for brevity, showing simple chips if strictly needed
    }

    // Action Buttons
    const cartBtnText = isItemInCart(product.id) ? "GO TO CART" : "ADD TO CART";
    const cartBtnClass = isItemInCart(product.id) ? "btn-secondary-new added" : "btn-secondary-new";
    
    // WhatsApp Button Logic
    let whatsappBtnHTML = '';
    if(whatsappNumber) {
        const msg = encodeURIComponent(`Hi, I'm interested in ${product.name}. Details: ${window.location.href}`);
        whatsappBtnHTML = `<a href="https://wa.me/${whatsappNumber}?text=${msg}" target="_blank" class="whatsapp-order-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
            Order on WhatsApp
        </a>`;
    }

    // HTML Construction
    const html = `
    <div class="product-detail-grid">
        <!-- Gallery -->
        <div class="product-gallery-section">
            <div class="swiper product-gallery-swiper">
                <div class="swiper-wrapper">${slidesHTML}</div>
                <div class="swiper-pagination"></div>
            </div>
        </div>

        <!-- Info -->
        <div class="product-info-container">
            <span class="product-brand">${product.category || 'General'}</span>
            <h1 class="product-title">${product.name}</h1>
            
            <div class="product-price-block">
                <span class="current-price">₹${price}</span>
                ${originalPriceHTML}
                ${discountHTML}
            </div>

            ${whatsappBtnHTML}

            <div class="product-description-section">
                <p class="product-description-text">${description}</p>
                ${specsHTML}
            </div>

            <!-- Mobile: Sticky Bottom / Desktop: Inline -->
            <div class="product-actions-grid">
                <button class="btn-secondary-new action-btn-large ${isItemInCart(product.id) ? 'added' : ''}" id="p-add-cart-btn" onclick="handleAddToCart()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    ${cartBtnText}
                </button>
                <button class="btn-primary-new action-btn-large" onclick="openPaymentModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    BUY NOW
                </button>
            </div>
        </div>
    </div>`;

    productDetailContent.innerHTML = html;

    // Init Swiper
    new Swiper('.product-gallery-swiper', {
        pagination: { el: '.swiper-pagination', clickable: true },
        loop: images.length > 1
    });
}

// Global scope toggle function for Specs
window.toggleSpecs = function(headerElement) {
    const list = headerElement.nextElementSibling;
    const icon = headerElement.querySelector('.specs-toggle-icon');
    
    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden');
        icon.classList.remove('rotated');
    } else {
        list.classList.add('hidden');
        icon.classList.add('rotated');
    }
};

window.handleAddToCart = function() {
    if (!currentProduct) return;
    const btn = document.getElementById('p-add-cart-btn');
    
    if (isItemInCart(currentProduct.id)) {
        window.location.href = 'cart.html';
    } else {
        addToCart(currentProduct.id, {
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            mrp: currentProduct.mrp,
            image: currentProduct.images?.[0] || ''
        });
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> GO TO CART`;
        btn.classList.add('added');
        // Animation
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    }
    updateActionButtons(currentProduct.id); 
};

function updateActionButtons(id) {
    // Only needed if we want realtime updates from other tabs
}

// --- Payment & Buy Now Logic ---
window.openPaymentModal = function() {
    if(!paymentModal) return;
    paymentModal.style.display = 'flex';
    setTimeout(() => paymentModal.classList.add('open'), 10);
    
    // Reset selection
    if(paymentRadios.length > 0) paymentRadios[0].checked = true;
    handlePaymentMethodChange();
};

function closePaymentModal() {
    paymentModal.classList.remove('open');
    setTimeout(() => paymentModal.style.display = 'none', 300);
}

function setupPaymentModalListeners() {
    if(cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closePaymentModal);
    
    if(paymentRadios) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });
    }

    if(confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', async () => {
            const selected = document.querySelector('input[name="payment_mode"]:checked');
            if(!selected) return;
            
            const mode = selected.value;
            const productToBuy = [{
                id: currentProduct.id,
                name: currentProduct.name,
                price: currentProduct.price,
                image: currentProduct.images?.[0] || '',
                quantity: 1
            }];
            
            // Save to temp storage for checkout page
            localStorage.setItem('direct_buy_product', JSON.stringify(productToBuy));
            
            if(mode === 'cod' && !orderConfig.codEnabled) {
                alert("COD is currently disabled.");
                return;
            }

            // Redirect to checkout
            window.location.href = `checkout.html?mode=direct&payment=${mode}`;
        });
    }
}

function handlePaymentMethodChange() {
    const selected = document.querySelector('input[name="payment_mode"]:checked');
    if (!selected || !codWarningBox) return;

    if (selected.value === 'cod') {
        if (!orderConfig.codEnabled) {
            codWarningBox.style.display = 'block';
            codWarningBox.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
            codWarningText.style.color = '#e74c3c';
            codWarningText.textContent = "Cash on Delivery is currently unavailable.";
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.style.opacity = '0.5';
        } else if (orderConfig.codFee > 0) {
            codWarningBox.style.display = 'block';
            codWarningBox.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            codWarningText.style.color = '#D4AF37';
            codWarningText.textContent = `Extra ₹${orderConfig.codFee} will be charged for COD.`;
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.style.opacity = '1';
        } else {
            codWarningBox.style.display = 'none';
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.style.opacity = '1';
        }
    } else {
        codWarningBox.style.display = 'none';
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.style.opacity = '1';
    }
}

// --- Related & Random Products ---
async function loadRelatedProducts(category, currentId) {
    if (!categoryProductsGrid || !category) return;
    try {
        const q = query(collection(db, "products"), where("category", "==", category), limit(6));
        const snapshot = await getDocs(q);
        
        let html = '';
        let count = 0;
        snapshot.forEach(doc => {
            if (doc.id !== currentId) {
                html += createProductCard(doc.id, doc.data());
                count++;
            }
        });
        
        if (count > 0) {
            categoryProductsGrid.innerHTML = html;
        } else {
            document.querySelector('.related-products-section').style.display = 'none';
        }
    } catch (e) { console.error(e); }
}

async function loadRandomProducts(currentId) {
    if (!randomProductsGrid) return;
    try {
        // Just fetching latest for now as random needs more logic/indexes
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(6));
        const snapshot = await getDocs(q);
        
        let html = '';
        let count = 0;
        snapshot.forEach(doc => {
            if (doc.id !== currentId) {
                html += createProductCard(doc.id, doc.data());
                count++;
            }
        });

        if (count > 0 && randomProductsWrapper) {
            randomProductsGrid.innerHTML = html;
            randomProductsWrapper.style.display = 'block';
        } else if (randomProductsWrapper) {
            randomProductsWrapper.style.display = 'none';
        }
    } catch (e) { console.error(e); }
}

function createProductCard(id, product) {
    const img = optimizeImage(product.images?.[0] || '', 400);
    const btnText = isItemInCart(id) ? "Cart" : "Add";
    const btnClass = isItemInCart(id) ? "added-to-cart" : "";
    
    return `
    <div class="product-card">
        <a href="product.html?id=${id}" class="product-link">
            <div class="product-image-container">
                <img src="${img}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price-row">
                    <span class="product-price">₹${product.price}</span>
                    ${product.mrp > product.price ? `<span class="product-mrp">₹${product.mrp}</span>` : ''}
                </div>
            </div>
        </a>
        <button class="btn-add-to-cart ${btnClass}" data-id="${id}" data-name="${product.name}" data-price="${product.price}" data-mrp="${product.mrp}" data-image="${product.images?.[0]||''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            <span>${btnText}</span>
        </button>
    </div>`;
}

// Listener for related products grids
const grids = [categoryProductsGrid, randomProductsGrid];
grids.forEach(grid => {
    if(!grid) return;
    grid.addEventListener('click', (e) => {
        const cartButton = e.target.closest('.btn-add-to-cart');
        if (cartButton) {
            e.preventDefault();
            const id = cartButton.dataset.id;
            const buttonText = cartButton.querySelector('span');
            // Ripple effect logic if needed
            
            if (cartButton.classList.contains('added-to-cart')) {
                removeFromCart(id);
                cartButton.classList.remove('added-to-cart');
                if (buttonText) buttonText.textContent = 'Add';
            } else {
                const rawImage = cartButton.dataset.image;
                const product = {
                    id: id, 
                    name: cartButton.dataset.name,
                    price: parseFloat(cartButton.dataset.price),
                    mrp: parseFloat(cartButton.dataset.mrp),
                    image: rawImage
                };
                addToCart(id, product);
                cartButton.classList.add('added-to-cart');
                if (buttonText) buttonText.textContent = 'Cart';
            }
        } 
    });
});