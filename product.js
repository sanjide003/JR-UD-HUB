// product.js - Cart Image Fix & Data Saving

import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where, 
    limit,
    setDoc,
    deleteDoc,
    runTransaction,
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Silent');

const productDetailContent = document.getElementById('product-detail-content');
const relatedProductsGrid = document.getElementById('related-products-grid');
let currentProduct = null;
let whatsappNumber = ''; 
let currentUser = null;
let appTitle = "JR UD HUB"; 
let orderConfig = { codEnabled: false, codFee: 0 }; 

const paymentModal = document.getElementById('payment-modal');
const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
const paymentRadios = document.getElementsByName('payment_mode');
const codWarningBox = document.getElementById('cod-warning-box');
const codWarningText = document.getElementById('cod-warning-text');

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (currentProduct) checkProductUserInteraction();
    } else {
        signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
    }
});

function linkify(text) {
    if (!text) return '';
    const urlRegex = /(\b(https|http|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url, p1, p2, p3) {
        const href = p3 ? 'http://' + p3 : p1;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadAppTitle(); 
    await loadSiteSettings();
    await loadOrderSettings(); 
    loadProductDetails();
    setupModalListeners(); 
});

async function loadAppTitle() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            if(docSnap.data().logoText) appTitle = docSnap.data().logoText;
            if(docSnap.data().whatsapp) whatsappNumber = docSnap.data().whatsapp;
        }
    } catch (e) { console.error("Error loading settings:", e); }
}

async function loadOrderSettings() {
    try {
        const docRef = doc(db, "settings", "orderConfig");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            orderConfig = docSnap.data();
        }
    } catch (error) { console.error("Error fetching order config: ", error); }
}

function setupModalListeners() {
    if(!paymentModal) return;

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'cod' && orderConfig.codEnabled) {
                codWarningText.textContent = `Due to handling costs, a nominal fee of ₹${orderConfig.codFee} will be charged for orders placed using this option. Avoid this fee by paying online now.`;
                codWarningBox.style.display = 'block';
            } else {
                codWarningBox.style.display = 'none';
            }
        });
    });

    if(cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
        });
    }
}

async function loadProductDetails() {
    if (!productDetailContent) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            productDetailContent.innerHTML = '<p class="error-message">Product ID not found.</p>';
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
        
        currentProduct = { id: productIdStr, ...product };
        renderProductUI(product, productIdStr);
        setupProductActionButtons();
        
        if (product.categoryId) {
            loadRelatedProducts(product.categoryId, productIdStr);
        }
        
        if(currentUser) checkProductUserInteraction();

    } catch (error) {
        console.error("Error loading product details: ", error);
        productDetailContent.innerHTML = '<p class="error-message">Error loading product details.</p>';
    }
}

function getDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function renderProductUI(product, productIdStr) {
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        const discount = Math.round(((mrp - price) / mrp) * 100);
        priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
        priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
    }

    let moreLinksHTML = '';
    if (product.moreLinks && product.moreLinks.length > 0) {
        moreLinksHTML = '<div class="product-more-links">';
        product.moreLinks.forEach(link => {
            moreLinksHTML += `<a href="${link.url}" class="product-promotion-link" target="_blank" rel="noopener noreferrer"><span>${link.title}</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg></a>`;
        });
        moreLinksHTML += '</div>';
    }

    let slidesHTML = '';
    if (product.images && product.images.length > 0) {
        product.images.forEach((imgUrl) => {
            const optimizedUrl = optimizeImage(imgUrl, 1000, 90);
            slidesHTML += `<div class="swiper-slide"><img src="${optimizedUrl}" alt="${product.name}"></div>`;
        });
    } else {
        slidesHTML = `<div class="swiper-slide"><img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${product.name}"></div>`;
    }
    const galleryHTML = `<div class="product-gallery-swiper swiper-container"><div class="swiper-wrapper">${slidesHTML}</div><div class="swiper-pagination"></div>${moreLinksHTML}</div>`;

    let descriptionHTML = '';
    if (product.description) {
        let linkifiedText = linkify(product.description);
        descriptionHTML = `<h3 class="product-section-heading">Description</h3><div class="product-description"><div class="description-content" id="desc-content">${linkifiedText.replace(/\n/g, '<br>')}</div></div>`;
    }

    const deliveryDate = getDeliveryDate();
    const deliveryHTML = `
        <div class="delivery-details-section">
            <h3 class="delivery-heading">Delivery details</h3>
            <div class="delivery-card-list">
                <div class="delivery-row">
                    <div class="del-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
                    <div class="del-content"><span class="del-label">HOME</span><span class="del-value">Check availability at your location</span></div>
                    <div class="del-action"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
                </div>
                <div class="delivery-row">
                    <div class="del-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>
                    <div class="del-content"><span class="del-value" style="font-weight: 600;">Delivery by ${deliveryDate}</span></div>
                </div>
                <div class="delivery-row">
                    <div class="del-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
                    <div class="del-content"><span class="del-text-muted">Dealing with you by</span><span class="del-value">${appTitle}</span></div>
                </div>
            </div>
            <div class="trust-grid">
                <div class="trust-item"><div class="trust-icon-circle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div><span>Online Payment</span></div>
                <div class="trust-item"><div class="trust-icon-circle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><span>Cash on Delivery</span></div>
                <div class="trust-item"><div class="trust-icon-circle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><span>Quality Assured</span></div>
            </div>
        </div>
    `;

    let specificationHTML = '';
    if (product.specification) {
        const points = product.specification.split('\n').filter(line => line.trim() !== '');
        if (points.length > 0) {
            let listHTML = '<ul class="product-specs-list">';
            points.forEach(point => { listHTML += `<li>${point.replace(/^-\s*/, '').trim()}</li>`; });
            listHTML += '</ul>';
            specificationHTML = `<h3 class="product-section-heading">Specification</h3><div class="product-specification-section">${listHTML}</div>`;
        }
    }

    const isInCart = isItemInCart(productIdStr);
    const cartButtonText = isInCart ? "Remove" : "Add to Cart";
    const cartButtonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

    const likeCount = product.likeCount || 0;
    const ratingCount = product.ratingCount || 0;

    const actionBarHTML = `
        <div class="product-action-bar">
            <div class="action-group">
                <button title="Like" class="like-btn" data-id="${productIdStr}">
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <span class="action-count like-count">${likeCount}</span>
            </div>
            <div class="action-group">
                <button title="Rate" class="comment-btn" data-id="${productIdStr}">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
                <span class="action-count rating-count">${ratingCount}</span>
            </div>
            <div class="action-group">
                <button title="Share" class="share-btn" data-id="${productIdStr}" data-name="${product.name}" data-price="${price}">
                    <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>
        
        <div class="rating-box" id="rating-box-main" style="display: none;">
            <div class="rating-summary" id="rating-summary-main">
                <small style="color:#aaa;">Loading ratings...</small>
            </div>
            <hr class="rating-divider">
            <p class="rating-title">Rate this product</p>
            <div class="star-rating" data-id="${productIdStr}">
                ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">&#9733;</span>`).join('')}
            </div>
            <div class="rating-feedback">Tap a star to rate</div>
        </div>
    `;

    const infoHTML = `
        <div class="product-info">
            ${actionBarHTML}
            <h1 class="product-title">${product.name}</h1>
            <div class="price-container large">${priceHTML}</div>
            ${descriptionHTML ? descriptionHTML : ''}
            ${deliveryHTML} 
            ${specificationHTML ? specificationHTML : ''}
            <div class="product-actions-grid">
                <button class="btn ${cartButtonClass}" id="add-to-cart-btn">
                    <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    <span>${cartButtonText}</span>
                </button>
                <a class="btn btn-whatsapp" id="buy-on-whatsapp-btn" href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                    Buy on WhatsApp
                </a>
            </div>
            <div id="add-to-cart-feedback" style="display: none;"></div>
        </div>
    `;

    productDetailContent.innerHTML = galleryHTML + infoHTML;
    
    new Swiper('.product-gallery-swiper', {
        loop: true,
        autoplay: { delay: 3000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        allowTouchMove: true,
        speed: 600,
    });
}

async function checkProductUserInteraction() {
    if (!currentUser || !currentProduct) return;
    const productId = currentProduct.id;

    try {
        const likeDoc = await getDoc(doc(db, "products", productId, "likes", currentUser.uid));
        const likeBtn = document.querySelector('.like-btn');
        if(likeBtn) {
            if(likeDoc.exists()) {
                likeBtn.classList.add('liked');
                likeBtn.querySelector('svg').style.fill = 'var(--error-red)';
                likeBtn.querySelector('svg').style.stroke = 'var(--error-red)';
            }
        }
    } catch(e) {}

    try {
        const ratingDoc = await getDoc(doc(db, "products", productId, "ratings", currentUser.uid));
        if(ratingDoc.exists()) {
            updateStarUI(ratingDoc.data().rating);
        }
    } catch(e) {}
}

function updateStarUI(value) {
    const stars = document.querySelectorAll('.star');
    const feedback = document.querySelector('.rating-feedback');
    const colorClass = `filled-${value}`; 
    stars.forEach(s => {
        s.className = 'star'; 
        if (parseInt(s.dataset.value) <= value) {
            s.classList.add(colorClass); 
        }
    });
    const messages = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
    if (feedback) feedback.textContent = value > 0 ? messages[value - 1] : "Tap a star to rate";
}

function createRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    ripple.style.cssText = `
        position: absolute; width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px; border-radius: 50%;
        background: rgba(212, 175, 55, 0.4); transform: scale(0);
        animation: ripple-animation 0.6s ease-out; pointer-events: none;
    `;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

const style = document.createElement('style');
style.textContent = `@keyframes ripple-animation { to { transform: scale(2); opacity: 0; } }`;
document.head.appendChild(style);

function setupProductActionButtons() {
    const container = document.querySelector('.product-info');
    if(!container) return;
    container.addEventListener('click', async (e) => {
        const target = e.target;
        
        const likeBtn = target.closest('.like-btn');
        if(likeBtn && currentUser && currentProduct) {
            e.preventDefault();
            const productId = likeBtn.dataset.id;
            const productRef = doc(db, "products", productId);
            const userLikeRef = doc(db, "products", productId, "likes", currentUser.uid);

            try {
                await runTransaction(db, async (transaction) => {
                    const likeDoc = await transaction.get(userLikeRef);
                    const productDoc = await transaction.get(productRef);
                    
                    if (!productDoc.exists()) throw "Product not found";
                    
                    let newCount = productDoc.data().likeCount || 0;

                    if (likeDoc.exists()) {
                        transaction.delete(userLikeRef);
                        newCount = Math.max(0, newCount - 1);
                        transaction.update(productRef, { likeCount: newCount });
                        
                        likeBtn.classList.remove('liked');
                        likeBtn.querySelector('svg').style.fill = 'none';
                        likeBtn.querySelector('svg').style.stroke = 'currentColor';
                    } else {
                        transaction.set(userLikeRef, { timestamp: serverTimestamp() });
                        newCount++;
                        transaction.update(productRef, { likeCount: newCount });
                        
                        likeBtn.classList.add('liked');
                        likeBtn.querySelector('svg').style.fill = 'var(--error-red)';
                        likeBtn.querySelector('svg').style.stroke = 'var(--error-red)';
                        likeBtn.style.transform = 'scale(1.2)';
                        setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
                    }
                    
                    const countSpan = likeBtn.parentElement.querySelector('.like-count');
                    if(countSpan) countSpan.textContent = newCount;
                });
            } catch(err) { console.error("Like error:", err); }
        }

        const commentBtn = target.closest('.comment-btn');
        if(commentBtn) {
            e.preventDefault();
            const ratingBox = document.getElementById('rating-box-main');
            ratingBox.style.display = ratingBox.style.display === 'none' ? 'block' : 'none';
            if(ratingBox.style.display === 'block') loadRatingBars(currentProduct.id);
        }

        if(target.classList.contains('star') && currentUser && currentProduct) {
            const star = target;
            const productId = star.parentElement.dataset.id;
            const value = parseInt(star.dataset.value);
            const productRef = doc(db, "products", productId);
            const userRatingRef = doc(db, "products", productId, "ratings", currentUser.uid);

            try {
                await runTransaction(db, async (transaction) => {
                    const ratingDoc = await transaction.get(userRatingRef);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw "Product not found";

                    let currentCount = productDoc.data().ratingCount || 0;

                    if (!ratingDoc.exists()) {
                        transaction.set(userRatingRef, { rating: value, timestamp: serverTimestamp() });
                        currentCount++;
                        transaction.update(productRef, { ratingCount: currentCount });
                    } else {
                        transaction.update(userRatingRef, { rating: value, timestamp: serverTimestamp() });
                    }
                    updateStarUI(value);
                    const countSpan = document.querySelector('.rating-count');
                    if(countSpan) countSpan.textContent = currentCount;
                });
            } catch(err) { console.error(err); }
        }

        const shareBtn = target.closest('.share-btn');
        if(shareBtn) {
            e.preventDefault();
            if (!navigator.share) return;
            const name = shareBtn.dataset.name;
            const price = shareBtn.dataset.price;
            const url = window.location.href;
            try {
                await navigator.share({ title: name, text: `Check out ${name}!\nPrice: ₹${price}\n`, url: url });
            } catch(err) { console.error(err); }
        }
        
        const cartButton = target.closest('#add-to-cart-btn');
        if (cartButton) {
            if (!currentProduct) return;
            const buttonText = cartButton.querySelector('span');
            const id = currentProduct.id;
            createRipple(e, cartButton);
            if (cartButton.classList.contains('added-to-cart')) {
                removeFromCart(id);
                cartButton.classList.remove('added-to-cart');
                if (buttonText) buttonText.textContent = 'Add to Cart';
            } else {
                // *** Fix for Cart Image ***
                const rawImage = (currentProduct.images && currentProduct.images.length > 0) ? currentProduct.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
                
                const product = {
                    id: id,
                    name: currentProduct.name,
                    price: currentProduct.price,
                    mrp: currentProduct.mrp,
                    image: rawImage, 
                    size: currentProduct.size || ''
                };
                
                addToCart(id, product);
                cartButton.classList.add('added-to-cart');
                if (buttonText) buttonText.textContent = 'Remove';
            }
        }
        
        const whatsappButton = target.closest('#buy-on-whatsapp-btn');
        if (whatsappButton) {
            e.preventDefault();
            if(paymentModal) {
                paymentModal.style.display = 'flex';
                paymentRadios[0].checked = true; 
                codWarningBox.style.display = 'none';
                
                confirmPaymentBtn.onclick = () => {
                    let selectedMode = 'online';
                    paymentRadios.forEach(r => { if(r.checked) selectedMode = r.value; });
                    handleSingleOrder(currentProduct, selectedMode);
                    paymentModal.style.display = 'none';
                };
            } else {
                handleSingleOrder(currentProduct, 'online');
            }
        }
    });
}

function handleSingleOrder(product, paymentMode = 'online') {
    if (!whatsappNumber) return;
    if (product) {
        const itemTotal = product.price;
        const itemMRP = (product.mrp > product.price) ? product.mrp : product.price;
        const itemDiscount = itemMRP - itemTotal;
        const qty = 1; 
        const productForMsg = { ...product, quantity: qty };
        
        const message = generateWhatsAppMessage([productForMsg], itemTotal, itemMRP, itemDiscount, paymentMode);
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }
}

function generateWhatsAppMessage(items, totalAmount, totalMRP, discount, paymentMode) {
    let message = "ഹായ് 👋\n";
    message += "ഞാൻ താഴെയുള്ള പ്രോഡക്റ്റ് ഓർഡർ ചെയ്യാൻ ആഗ്രഹിക്കുന്നു.\n";
    message += "____________________\n\n";

    items.forEach(item => {
        const itemId = item.id; 
        const productLink = `${window.location.origin}/product.html?id=${itemId}`;
        message += `🛍️ ${item.name}\n`;
        if (item.size) message += `Size : ${item.size}\n`; 
        message += `Qty : ${item.quantity}\n`;
        message += `Price : ₹${item.price.toFixed(2)}\n\n`;
        message += `🔗 Product link :  ${productLink}\n\n`; 
    });

    message += `*Price Details*\n`;
    message += `-------------------\n`;
    message += `Price (${items.length} items) : ₹${totalMRP.toFixed(2)}\n`;
    
    if (discount > 0) message += `Discount : - ₹${discount.toFixed(2)}\n`;

    let finalPayable = totalAmount;

    // Add COD Fee
    if (paymentMode === 'cod' && orderConfig.codEnabled) {
        const fee = Number(orderConfig.codFee) || 0;
        finalPayable += fee;
        message += `Delivery/Handling Fee : ₹${fee.toFixed(2)}\n`;
    } else {
        message += `Delivery Charges : FREE\n`;
    }

    message += `-------------------\n`;
    message += `*Total Amount : ₹${finalPayable.toFixed(2)}*\n`;
    message += `-------------------\n\n`;

    if (paymentMode === 'cod') {
        message += `💳 Payment Mode: *Cash on Delivery*\n`;
    } else {
        message += `💳 Payment Mode: *Online Payment*\n`;
    }

    message += "\n____________________\n\n";
    message += "ദയവായി എത്രയും പെട്ടെന്ന് പ്രോസസ് ചെയ്യുക.\n\n";
    
    if (discount > 0) {
        message += `\`You saved ₹${discount.toFixed(2)} on this order!\``;
    }

    return message;
}

async function loadRelatedProducts(categoryId, excludeProductId) {
    if (!relatedProductsGrid) return;
    try {
        const q = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(10));
        // Use getDocs for cache benefits
        const querySnapshot = await getDocs(q);
        
        relatedProductsGrid.innerHTML = `<div class="swiper related-products-swiper"><div class="swiper-wrapper" id="related-products-wrapper"></div></div>`;
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
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400);

            let priceHTML = `<span class="price-main">₹${price}</span>`;
            let discountBadge = '';
            if (mrp > price) {
                priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
                const discount = Math.round(((mrp - price) / mrp) * 100);
                discountBadge = `<span class="product-discount-badge">${discount}% OFF</span>`;
            }

            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link" style="position: relative;">
                    ${discountBadge}
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" loading="lazy" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    <div class="price-container">${priceHTML}</div>
                    <div class="cat-product-buttons">
                        <button class="btn ${buttonClass} btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${price}"
                            data-mrp="${product.mrp}"
                            data-image="${imageUrl}"
                            data-size="${product.size || ''}">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            <span>${buttonText}</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-new"><span>View</span></a>
                    </div>
                </div>
            `;
            swiperWrapper.appendChild(card);
            count++;
        });

        if (count > 0) {
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
        } else {
            relatedProductsGrid.innerHTML = '<p class="loading-placeholder">No related products found.</p>';
        }

    } catch (error) { console.error("Error loading related products: ", error); }
}

async function loadRatingBars(productId) {
    const summaryContainer = document.getElementById(`rating-summary-${productId}`);
    if (!summaryContainer) return;
    
    const ratingsRef = collection(db, "products", productId, "ratings");
    const snapshot = await getDocs(ratingsRef);
    
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const total = snapshot.size;
    
    snapshot.forEach(doc => {
        const val = doc.data().rating;
        if (counts[val] !== undefined) counts[val]++;
    });
    
    let html = '';
    const keys = [5, 4, 3, 2, 1];
    keys.forEach((starVal) => {
        const count = counts[starVal];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        let color = starVal === 1 ? '#ff4d4d' : starVal === 2 ? '#ff9f43' : starVal === 3 ? '#feca57' : starVal === 4 ? '#1dd1a1' : '#10ac84';
        html += `
            <div class="rating-bar-row">
                <span>${starVal} <span class="star-icon">&#9733;</span></span> 
                <div class="bar-bg"><div class="bar-fill" style="width: ${percentage}%; background-color: ${color};"></div></div> 
                <span class="bar-count">${count}</span>
            </div>
        `;
    });
    summaryContainer.innerHTML = html;
}

relatedProductsGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');
    if (cartButton) {
        e.preventDefault();
        const id = cartButton.dataset.id;
        const buttonText = cartButton.querySelector('span');
        createRipple(e, cartButton);
        if (cartButton.classList.contains('added-to-cart')) {
            removeFromCart(id);
            cartButton.classList.remove('added-to-cart');
            if (buttonText) buttonText.textContent = 'Cart';
        } else {
            // *** Fix for Related Products Cart Image ***
            const rawImage = cartButton.dataset.image;
            
            const product = {
                id: id, 
                name: cartButton.dataset.name,
                price: parseFloat(cartButton.dataset.price),
                mrp: parseFloat(cartButton.dataset.mrp),
                image: rawImage, // Using raw image from dataset
                size: cartButton.dataset.size 
            };
            addToCart(id, product);
            cartButton.classList.add('added-to-cart');
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});