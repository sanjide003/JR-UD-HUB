// explore.js - Optimized for Speed & Theme Compatible

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    limit,
    startAfter,
    orderBy,
    setDoc,
    deleteDoc,
    onSnapshot, 
    runTransaction,
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, fetchSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Silent');

const feedContainer = document.getElementById("explore-feed");
const loader = document.getElementById("explore-scroll-loader");
let categoriesMap = new Map(); 
let lastVisible = null;
let isLoading = false;
const PRODUCTS_PER_PAGE = 10; 
let currentUser = null;

// ലൈവ് അപ്ഡേറ്റുകൾ ട്രാക്ക് ചെയ്യാൻ
const activeListeners = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setupUserInteractionListeners();
    } else {
        signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
    }
});

function linkify(text) {
    if (!text) return '';
    const urlRegex = /(\b(https|http|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url, p1, p2, p3) {
        let href = url;
        if (p3 && !p1) { href = 'http://' + href; }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="explore-desc-link">${url}</a>`;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    const settings = await fetchSiteSettings();
    if (settings && settings.homeBannerUrl) {
        loadExploreBanner(settings.homeBannerUrl);
    }
    await loadCategories();   
    await loadProducts();     
});

function loadExploreBanner(bannerUrl) {
    const bannerContainer = document.getElementById('explore-top-banner');
    if (!bannerContainer || !bannerUrl) return;
    const optimizedUrl = optimizeImage(bannerUrl, 1200, 85);
    bannerContainer.innerHTML = `<img src="${optimizedUrl}" alt="Special Offer Banner" loading="lazy">`;
    bannerContainer.style.display = 'block';
}

async function loadCategories() {
    try {
        const q = query(collection(db, "categories"));
        const catSnapshot = await getDocs(q);
        catSnapshot.forEach((doc) => {
            const data = doc.data();
            categoriesMap.set(doc.id, {
                name: data.name,
                imageUrl: data.imageUrl
            });
        });
    } catch (error) { console.error("Error loading categories map: ", error); }
}

async function loadProducts() {
    if (isLoading) return;
    isLoading = true;
    if (loader) loader.style.display = 'flex';
    if (lastVisible === null) feedContainer.innerHTML = ''; 

    try {
        const productsRef = collection(db, "products");
        let q;
        
        if (lastVisible) {
            q = query(productsRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(PRODUCTS_PER_PAGE));
        } else {
            q = query(productsRef, orderBy("createdAt", "desc"), limit(PRODUCTS_PER_PAGE));
        }

        const documentSnapshots = await getDocs(q);
        if (documentSnapshots.empty) {
            if (feedContainer.innerHTML === '') {
                feedContainer.innerHTML = '<p class="loading-placeholder-full">No products found.</p>';
            }
            if (loader) loader.style.display = 'none';
            return;
        }
        
        lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        for (const docSnap of documentSnapshots.docs) {
            const product = docSnap.data();
            const productId = docSnap.id;
            
            const card = document.createElement('div');
            card.className = 'explore-card';
            card.id = `product-card-${productId}`; 
            
            card.innerHTML = `
                ${buildCategoryHeader(product.categoryId)}
                ${buildImageSlider(productId, product.images, product.name)}
                ${buildCardContent(productId, product)}
            `;
            feedContainer.appendChild(card);
            
            setupProductListener(productId);
        }
        
        if(currentUser) setupUserInteractionListeners();

        new Swiper('.explore-image-swiper', {
            loop: false,
            allowTouchMove: true,
        });

    } catch (error) {
        console.error("Error loading products: ", error);
        feedContainer.innerHTML = '<p class="loading-placeholder-full">Error loading products.</p>';
    } finally {
        isLoading = false;
        if (loader) loader.style.display = 'none';
    }
}

// 1. PRODUCT LISTENER (Updates Counts Only)
function setupProductListener(productId) {
    const card = document.getElementById(`product-card-${productId}`);
    if (!card) return;

    const productRef = doc(db, "products", productId);
    
    const unsubscribe = onSnapshot(productRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const likeCountSpan = card.querySelector('.like-count');
            if (likeCountSpan) likeCountSpan.textContent = data.likeCount || 0;
            const ratingCountSpan = card.querySelector('.rating-count');
            if (ratingCountSpan) ratingCountSpan.textContent = data.ratingCount || 0;
        }
    });
    activeListeners.push(unsubscribe);
}

// 2. USER STATUS LISTENER (My Like)
function setupUserInteractionListeners() {
    if (!currentUser) return;
    const cards = document.querySelectorAll('.explore-card');
    
    cards.forEach((card) => {
        const productId = card.id.replace('product-card-', '');
        
        const likeRef = doc(db, "products", productId, "likes", currentUser.uid);
        onSnapshot(likeRef, (docSnap) => {
            const likeBtn = card.querySelector('.like-btn');
            if(likeBtn) {
                if (docSnap.exists()) {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('svg').style.fill = 'var(--error-red)';
                    likeBtn.querySelector('svg').style.stroke = 'var(--error-red)';
                } else {
                    likeBtn.classList.remove('liked');
                    likeBtn.querySelector('svg').style.fill = 'none';
                    likeBtn.querySelector('svg').style.stroke = 'currentColor';
                }
            }
        });

        const ratingRef = doc(db, "products", productId, "ratings", currentUser.uid);
        onSnapshot(ratingRef, (docSnap) => {
            if (docSnap.exists()) {
                updateStarUI(card, docSnap.data().rating);
            }
        });
    });
}

function buildCategoryHeader(categoryId) {
    const category = categoriesMap.get(categoryId);
    if (!category) return ''; 
    const categoryLink = `categories.html?filter=${categoryId}`;
    const rawImg = category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C';
    const categoryImg = optimizeImage(rawImg, 50);
    return `
        <a href="${categoryLink}" class="explore-card-header">
            <img src="${categoryImg}" alt="${category.name}" class="explore-category-img" loading="lazy">
            <span class="explore-category-name">${category.name}</span>
        </a>
    `;
}

function buildImageSlider(productId, images, productName) {
    const productLink = `product.html?id=${productId}`;
    let slidesHTML = '';
    if (images && images.length > 0) {
        images.forEach(imgUrl => {
            const optimizedUrl = optimizeImage(imgUrl, 600, 85);
            slidesHTML += `<div class="swiper-slide"><a href="${productLink}"><img src="${optimizedUrl}" alt="${productName}" loading="lazy"></a></div>`;
        });
    } else {
        slidesHTML = `<div class="swiper-slide"><a href="${productLink}"><img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${productName}" loading="lazy"></a></div>`;
    }
    return `<div class="explore-image-swiper swiper-container"><div class="swiper-wrapper">${slidesHTML}</div></div>`;
}

function buildCardContent(productId, product) {
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        priceHTML += `<span class="price-mrp product-mrp-red" style="margin-left: 5px;"><del>₹${mrp}</del></span>`;
    }

    let descriptionHTML = '';
    const rawDesc = product.description || '';
    const formattedDesc = linkify(rawDesc).replace(/\n/g, '<br>');
    if (rawDesc) {
        descriptionHTML = `<div class="description-text truncated" id="desc-text-${productId}"><span style="color:var(--text-color); font-weight:500;">${product.name}</span> <span class="desc-content">${formattedDesc}</span></div><button class="read-more-btn" id="read-more-${productId}" data-id="${productId}">more</button>`;
    } else {
        descriptionHTML = `<div class="description-text"><span style="color:var(--text-color); font-weight:500;">${product.name}</span></div>`;
    }

    const rawImage = product.images && product.images[0] ? product.images[0] : '';
    const imageUrl = optimizeImage(rawImage, 400);
    const isInCart = isItemInCart(productId);
    const activeClass = isInCart ? 'added-to-cart' : '';
    
    // *** മാറ്റം: ഇവിടെ ഇൻലൈൻ സ്റ്റൈൽ (style="fill:...") ഒഴിവാക്കി. CSS-ൽ ഇത് നിയന്ത്രിക്കും ***
    const buttonTitle = isInCart ? 'Remove from Cart' : 'Add to Cart';

    const likeCount = product.likeCount || 0;
    const ratingCount = product.ratingCount || 0;

    return `
        <div class="explore-card-content">
            <div class="explore-action-icons">
                <div class="action-group">
                    <button title="Like" class="like-btn" data-id="${productId}">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                    <span class="action-count like-count">${likeCount}</span>
                </div>

                <div class="action-group">
                    <button title="Rate" class="comment-btn" data-id="${productId}">
                        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <span class="action-count rating-count">${ratingCount}</span>
                </div>

                <button title="Share" class="share-btn" data-id="${productId}" data-name="${product.name}" data-price="${price}"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
                <button title="${buttonTitle}" class="bookmark-btn ${activeClass}" data-id="${productId}" data-name="${product.name}" data-price="${price}" data-mrp="${mrp}" data-image="${imageUrl}" data-size="${product.size || ''}"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
            </div>
            
            <div class="rating-box" id="rating-box-${productId}" style="display: none;">
                <div class="rating-summary" id="rating-summary-${productId}"></div>
                <hr class="rating-divider">
                <p class="rating-title">Rate this product</p>
                <div class="star-rating" data-id="${productId}">
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">&#9733;</span>`).join('')}
                </div>
                <div class="rating-feedback">Tap a star to rate</div>
            </div>

            <div class="explore-product-title">${product.name}</div>
            <div class="price-container">${priceHTML}</div>
            <div class="explore-product-description">${descriptionHTML}</div>
        </div>
    `;
}

function updateStarUI(card, value) {
    const stars = card.querySelectorAll('.star');
    const feedback = card.querySelector('.rating-feedback');
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

feedContainer.addEventListener('click', async (e) => { 
    const target = e.target;
    if (!currentUser) return; 

    if (target.classList.contains('read-more-btn')) {
        const id = target.dataset.id;
        const textContainer = document.getElementById(`desc-text-${id}`);
        if (textContainer.classList.contains('truncated')) {
            textContainer.classList.remove('truncated');
            target.textContent = 'less';
        } else {
            textContainer.classList.add('truncated');
            target.textContent = 'more';
        }
        return;
    }

    const likeButton = target.closest('.like-btn');
    if (likeButton) {
        e.preventDefault();
        const productId = likeButton.dataset.id;
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
                    likeButton.classList.remove('liked');
                    likeButton.querySelector('svg').style.fill = 'none';
                    likeButton.querySelector('svg').style.stroke = 'currentColor';
                } else {
                    transaction.set(userLikeRef, { timestamp: serverTimestamp() });
                    newCount++;
                    transaction.update(productRef, { likeCount: newCount });
                    likeButton.classList.add('liked');
                    likeButton.querySelector('svg').style.fill = 'var(--error-red)';
                    likeButton.querySelector('svg').style.stroke = 'var(--error-red)';
                    likeButton.style.transform = 'scale(1.2)';
                    setTimeout(() => likeButton.style.transform = 'scale(1)', 200);
                }
            });
        } catch (err) { 
            console.error("Like Transaction Error:", err);
        }
    }

    const commentButton = target.closest('.comment-btn');
    if (commentButton) {
        e.preventDefault();
        const id = commentButton.dataset.id;
        const ratingBox = document.getElementById(`rating-box-${id}`);
        ratingBox.style.display = ratingBox.style.display === 'none' ? 'block' : 'none';
        if(ratingBox.style.display === 'block') loadRatingBars(id);
    }

    if (target.classList.contains('star')) {
        const star = target;
        const ratingContainer = star.parentElement;
        const productId = ratingContainer.dataset.id;
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
                updateStarUI(document.getElementById(`product-card-${productId}`), value);
            });
        } 
        catch (err) { console.error("Rating Error:", err); }
    }

    const bookmarkButton = target.closest('.bookmark-btn');
    if (bookmarkButton) {
        e.preventDefault();
        const id = bookmarkButton.dataset.id;
        // *** മാറ്റം: നേരിട്ട് നിറം മാറ്റുന്നത് ഒഴിവാക്കി, ക്ലാസ്സ് മാത്രം മാറ്റുന്നു ***
        if (bookmarkButton.classList.contains('added-to-cart')) {
            removeFromCart(id);
            bookmarkButton.classList.remove('added-to-cart');
            bookmarkButton.title = 'Add to Cart';
        } else {
            const product = {
                id: id,
                name: bookmarkButton.dataset.name,
                price: parseFloat(bookmarkButton.dataset.price),
                mrp: parseFloat(bookmarkButton.dataset.mrp),
                image: bookmarkButton.dataset.image,
                size: bookmarkButton.dataset.size 
            };
            addToCart(id, product);
            bookmarkButton.classList.add('added-to-cart');
            bookmarkButton.title = 'Remove from Cart';
        }
    }

    const shareButton = target.closest('.share-btn'); 
    if (shareButton) {
        e.preventDefault();
        if (!navigator.share) return;
        const id = shareButton.dataset.id;
        const name = shareButton.dataset.name;
        const price = shareButton.dataset.price;
        const productLink = `${window.location.origin}/product.html?id=${id}`;
        const shareData = { title: name, text: `Check out ${name}!\nPrice: ₹${price}\n`, url: productLink };
        try { await navigator.share(shareData); } catch (err) { console.error('Error sharing:', err); }
    }
});

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
        
        let color = '#ff4d4d'; // Red
        if (starVal === 2) color = '#ff9f43';
        if (starVal === 3) color = '#feca57';
        if (starVal === 4) color = '#1dd1a1';
        if (starVal === 5) color = '#10ac84';

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

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) { 
        loadProducts();
    }
}, { rootMargin: '400px' });
if (loader) { observer.observe(loader); }