// ഇതാണ് 'product.js' ഫയൽ.
// മാറ്റം: 'Buy on WhatsApp' ക്ലിക്ക് ചെയ്യുമ്പോൾ കാർട്ട് പേജിലെ അതേ ഫോർമാറ്റിൽ മെസ്സേജ് അയക്കുന്നു.

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
    onSnapshot,
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Debug');

const productDetailContent = document.getElementById('product-detail-content');
const relatedProductsGrid = document.getElementById('related-products-grid');
let currentProduct = null;
let whatsappNumber = ''; 
let currentUser = null;

// ഓതന്റിക്കേഷൻ ലിസണർ
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
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
    await loadSiteSettings();
    loadProductDetails();
});

async function loadProductDetails() {
    if (!productDetailContent) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            productDetailContent.innerHTML = '<p class="error-message">Product ID not found.</p>';
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
            specification: product.specification || ''
        };

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
        if (product.images && product.images.length > 0) {
            let slidesHTML = '';
            product.images.forEach((imgUrl) => {
                const optimizedUrl = optimizeImage(imgUrl, 1000, 90);
                slidesHTML += `
                    <div class="swiper-slide">
                        <img src="${optimizedUrl}" alt="${product.name}">
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

        let descriptionHTML = 'No description available.';
        if (product.description) {
            let linkifiedText = linkify(product.description);
            descriptionHTML = linkifiedText.replace(/\n/g, '<br>');
        }

        let specificationHTML = '';
        if (product.specification) {
            const points = product.specification.split('\n').filter(line => line.trim() !== '');
            if (points.length > 0) {
                specificationHTML = '<ul class="product-specs-list">';
                points.forEach(point => {
                    const cleanPoint = point.replace(/^-\s*/, '').trim();
                    specificationHTML += `<li>${cleanPoint}</li>`;
                });
                specificationHTML += '</ul>';
            }
        }

        const isInCart = isItemInCart(productIdStr);
        const cartButtonText = isInCart ? "Remove" : "Add to Cart";
        const cartButtonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

        // ആക്ഷൻ ബാർ HTML
        const actionBarHTML = `
            <div class="product-action-bar">
                <div class="action-group">
                    <button title="Like" class="like-btn" data-id="${productIdStr}">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                    <span class="action-count like-count">0</span>
                </div>
                <div class="action-group">
                    <button title="Rate" class="comment-btn" data-id="${productIdStr}">
                        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <span class="action-count rating-count">0</span>
                </div>
                <div class="action-group">
                    <button title="Share" class="share-btn" data-id="${productIdStr}" data-name="${product.name}" data-price="${price}">
                        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
            
            <!-- റേറ്റിംഗ് ബോക്സ് -->
            <div class="rating-box" id="rating-box-main" style="display: none;">
                <!-- റേറ്റിംഗ് സമ്മറി -->
                <div class="rating-summary">
                    <div class="rating-bar-row"><span>5 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>4 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>3 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>2 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>1 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
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
                <!-- 1. ലൈക്ക്, കമന്റ്, ഷെയർ ബട്ടണുകൾ -->
                ${actionBarHTML}

                <!-- 2. പ്രൊഡക്റ്റ് പേര് -->
                <h1 class="product-title">${product.name}</h1>
                
                <!-- 3. വില -->
                <div class="price-container large">
                    ${priceHTML}
                </div>

                <!-- 4. സ്പെസിഫിക്കേഷൻ -->
                ${specificationHTML ? `<div class="product-specification-section">${specificationHTML}</div>` : ''}

                <!-- 5. ഡിസ്ക്രിപ്ഷൻ -->
                <div class="product-description">
                    ${descriptionHTML}
                </div>
                
                <div class="product-actions-grid">
                    <!-- Add to Cart Button -->
                    <button class="btn ${cartButtonClass}" id="add-to-cart-btn">
                        <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span>${cartButtonText}</span>
                    </button>
                    
                    <!-- WhatsApp Button -->
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
        
        setupProductActionButtons();
        setupRealtimeListeners(productIdStr); 

        if (product.categoryId) {
            loadRelatedProducts(product.categoryId, productIdStr);
        }

    } catch (error) {
        console.error("Error loading product details: ", error);
        productDetailContent.innerHTML = '<p class="error-message">Error loading product details.</p>';
    }
}

// *** റിയൽ ടൈം അപ്ഡേറ്റ്സ് ***
function setupRealtimeListeners(productId) {
    // Likes
    const likesRef = collection(db, "products", productId, "likes");
    onSnapshot(likesRef, (snapshot) => {
        const count = snapshot.size;
        const likeCountSpan = document.querySelector('.like-count');
        if (likeCountSpan) likeCountSpan.textContent = count;

        if (currentUser) {
            const isLiked = snapshot.docs.some(doc => doc.id === currentUser.uid);
            const likeBtn = document.querySelector('.like-btn');
            const svg = likeBtn.querySelector('svg');
            
            if (isLiked) {
                likeBtn.classList.add('liked');
                svg.style.fill = 'var(--error-red)';
                svg.style.stroke = 'var(--error-red)';
            } else {
                likeBtn.classList.remove('liked');
                svg.style.fill = 'none';
                svg.style.stroke = 'currentColor';
            }
        }
    });

    // Ratings
    const ratingsRef = collection(db, "products", productId, "ratings");
    onSnapshot(ratingsRef, (snapshot) => {
        const count = snapshot.size;
        const ratingCountSpan = document.querySelector('.rating-count');
        if (ratingCountSpan) ratingCountSpan.textContent = count;

        // Calculate Summary
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        snapshot.forEach(doc => {
            const val = doc.data().rating;
            if (counts[val] !== undefined) counts[val]++;
        });
        updateRatingSummary(counts, count);

        // User Rating
        if (currentUser) {
            const userRatingDoc = snapshot.docs.find(doc => doc.id === currentUser.uid);
            if (userRatingDoc) {
                updateStarUI(userRatingDoc.data().rating);
            }
        }
    });
}

function updateRatingSummary(counts, total) {
    const summaryRows = document.querySelectorAll('.rating-bar-row');
    const keys = [5, 4, 3, 2, 1];
    
    keys.forEach((starVal, index) => {
        const row = summaryRows[index];
        const count = counts[starVal];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        const fill = row.querySelector('.bar-fill');
        const countSpan = row.querySelector('.bar-count');
        
        if (fill) fill.style.width = `${percentage}%`;
        if (countSpan) countSpan.textContent = count;
        
        if (starVal >= 4) fill.style.backgroundColor = 'var(--success-green)';
        else if (starVal === 3) fill.style.backgroundColor = '#f1c40f';
        else fill.style.backgroundColor = 'var(--error-red)';
    });
}

function updateStarUI(value) {
    const stars = document.querySelectorAll('.star');
    const feedback = document.querySelector('.rating-feedback');
    
    let colorClass = '';
    if (value <= 2) colorClass = 'red-star';
    else if (value === 3) colorClass = 'yellow-star';
    else colorClass = 'green-star';

    stars.forEach(s => {
        s.className = 'star'; 
        if (parseInt(s.dataset.value) <= value) {
            s.classList.add('filled', colorClass);
        }
    });
    
    if (feedback) feedback.textContent = `You rated: ${value} stars`;
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

// Ripple Animation Style Injection
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to { transform: scale(2); opacity: 0; }
    }
`;
document.head.appendChild(style);

function setupProductActionButtons() {
    const container = document.querySelector('.product-info');
    if(!container) return;

    container.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Like
        const likeBtn = target.closest('.like-btn');
        if(likeBtn && currentUser) {
            e.preventDefault();
            const productId = likeBtn.dataset.id;
            const userLikeRef = doc(db, "products", productId, "likes", currentUser.uid);
            try {
                if (likeBtn.classList.contains('liked')) {
                    await deleteDoc(userLikeRef);
                } else {
                    await setDoc(userLikeRef, { timestamp: serverTimestamp() });
                    likeBtn.style.transform = 'scale(1.2)';
                    setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);
                }
            } catch(err) { console.error(err); }
        }

        // Rating Toggle
        const commentBtn = target.closest('.comment-btn');
        if(commentBtn) {
            e.preventDefault();
            const ratingBox = document.getElementById('rating-box-main');
            ratingBox.style.display = ratingBox.style.display === 'none' ? 'block' : 'none';
        }

        // Star Click
        if(target.classList.contains('star') && currentUser) {
            const star = target;
            const productId = star.parentElement.dataset.id;
            const value = parseInt(star.dataset.value);
            const userRatingRef = doc(db, "products", productId, "ratings", currentUser.uid);
            try {
                await setDoc(userRatingRef, { rating: value, timestamp: serverTimestamp() });
            } catch(err) { console.error(err); }
        }

        // Share
        const shareBtn = target.closest('.share-btn');
        if(shareBtn) {
            e.preventDefault();
            if (!navigator.share) return;
            const name = shareBtn.dataset.name;
            const price = shareBtn.dataset.price;
            const url = window.location.href;
            try {
                await navigator.share({ title: name, text: `Check out ${name}!\nPrice: ₹${price}`, url: url });
            } catch(err) { console.error(err); }
        }
        
        // Cart Logic
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
                addToCart(id, currentProduct);
                cartButton.classList.add('added-to-cart');
                if (buttonText) buttonText.textContent = 'Remove';
            }
        }
        
        // WhatsApp Logic (പുതിയ ഫോർമാറ്റ്)
        const whatsappButton = target.closest('#buy-on-whatsapp-btn');
        if (whatsappButton) {
            e.preventDefault();
            if (whatsappNumber && currentProduct) {
                // *** മാറ്റം: പുതിയ ഫോർമാറ്റ് ജനറേഷൻ ***
                const itemTotal = currentProduct.price;
                const itemMRP = (currentProduct.mrp > currentProduct.price) ? currentProduct.mrp : currentProduct.price;
                const itemDiscount = itemMRP - itemTotal;
                
                // ക്വാണ്ടിറ്റി 1 എന്ന് കണക്കാക്കുന്നു (സിംഗിൾ പ്രോഡക്റ്റ് ബൈ ആയതിനാൽ)
                // വേണമെങ്കിൽ കാർട്ടിലെ ക്വാണ്ടിറ്റി ചെക്ക് ചെയ്യാം, പക്ഷെ ഇത് 'Buy Now' ആണ്.
                const qty = 1; 
                const finalTotal = itemTotal * qty;
                const finalMRP = itemMRP * qty;
                const finalDiscount = itemDiscount * qty;

                // currentProduct-ൽ quantity ഫീൽഡ് ഇല്ല, അതിനാൽ താൽക്കാലികമായി ചേർക്കുന്നു
                const productForMsg = { ...currentProduct, quantity: qty };

                const message = generateWhatsAppMessage([productForMsg], finalTotal, finalMRP, finalDiscount);
                window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
            }
        }
    });
}

// *** WhatsApp Message Generator Function (Reused from Cart Page Logic) ***
function generateWhatsAppMessage(items, totalAmount, totalMRP, discount) {
    let message = "ഹായ് 👋\n";
    message += "ഞാൻ താഴെയുള്ള പ്രോഡക്റ്റ് ഓർഡർ ചെയ്യാൻ ആഗ്രഹിക്കുന്നു.\n";
    message += "____________________\n\n";

    items.forEach(item => {
        const itemId = item.id; 
        const productLink = `${window.location.origin}/product.html?id=${itemId}`;
        
        message += `🛍️ ${item.name}\n`;
        
        if (item.size) {
            message += `Size : ${item.size}\n`; 
        }
        
        message += `Qty : ${item.quantity}\n`;
        message += `Price : ₹${item.price.toFixed(2)}\n\n`;
        message += `🔗 Product link :  ${productLink}\n\n`; 
    });

    // Summary Section
    message += `💰 *Total : ₹${totalMRP.toFixed(2)}*\n`;
    
    if (discount > 0) {
        message += `🎁 Discount : ₹${discount.toFixed(2)}\n\n`;
    } else {
        message += `\n`;
    }

    message += `✅ \`Payable amount : ₹${totalAmount.toFixed(2)}\`\n`;
    
    message += "\n____________________\n\n";
    
    // Footer
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
            
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400);

            let priceHTML = `<span class="price-main">₹${price}</span>`;
            if (mrp > price) {
                priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
            }

            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
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
                        <a href="product.html?id=${productId}" class="btn btn-primary-new"><span>View</span></a>
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
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});