// ഇതാണ് പുതിയ 'explore.js' ഫയൽ.

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
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

setLogLevel('Debug');

const feedContainer = document.getElementById("explore-feed");
const loader = document.getElementById("explore-scroll-loader");
let categoriesMap = new Map(); 
let lastVisible = null;
let isLoading = false;
const productsPerPage = 5; 
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        signInAnonymously(auth).catch((error) => console.error("Auth Error:", error));
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadCategories();   
    await loadProducts();     
});

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
            q = query(productsRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(productsPerPage));
        } else {
            q = query(productsRef, orderBy("createdAt", "desc"), limit(productsPerPage));
        }

        const documentSnapshots = await getDocs(q);
        if (documentSnapshots.empty) {
            if (feedContainer.innerHTML === '') {
                feedContainer.innerHTML = '<p class="loading-placeholder-full">No products found.</p>';
            }
            if (loader) loader.style.display = 'none';
            lastVisible = null; 
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
            
            setupRealtimeListeners(productId);
        }
        
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

function buildCategoryHeader(categoryId) {
    const category = categoriesMap.get(categoryId);
    if (!category) return ''; 
    
    const categoryLink = `categories.html?filter=${categoryId}`;
    const rawImg = category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C';
    const categoryImg = optimizeImage(rawImg, 100);

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
            const optimizedUrl = optimizeImage(imgUrl, 800, 85);
            slidesHTML += `
                <div class="swiper-slide">
                    <a href="${productLink}">
                        <img src="${optimizedUrl}" alt="${productName}" loading="lazy">
                    </a>
                </div>
            `;
        });
    } else {
        slidesHTML = `
            <div class="swiper-slide">
                <a href="${productLink}">
                    <img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${productName}" loading="lazy">
                </a>
            </div>
        `;
    }

    return `
        <div class="explore-image-swiper swiper-container">
            <div class="swiper-wrapper">
                ${slidesHTML}
            </div>
        </div>
    `;
}

function buildCardContent(productId, product) {
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        const discount = Math.round(((mrp - price) / mrp) * 100);
        priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
        priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
    }

    let descriptionHTML = '';
    if (product.description) {
        if (product.description.length > 100) {
            descriptionHTML = `${product.description.substring(0, 100)}... <button class="read-more-btn">Show More</button>`;
        } else {
            descriptionHTML = product.description;
        }
    }

    const rawImage = product.images && product.images[0] ? product.images[0] : '';
    const imageUrl = optimizeImage(rawImage, 400);
    
    const isInCart = isItemInCart(productId);
    const activeClass = isInCart ? 'added-to-cart' : '';
    const svgFill = isInCart ? 'style="fill: var(--primary-gold); color: var(--primary-gold);"' : '';
    const buttonTitle = isInCart ? 'Remove from Cart' : 'Add to Cart';

    return `
        <div class="explore-card-content">
            <div class="explore-action-icons">
                <div class="action-group">
                    <button title="Like" class="like-btn" data-id="${productId}">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                    <span class="action-count like-count">0</span>
                </div>

                <div class="action-group">
                    <button title="Rate" class="comment-btn" data-id="${productId}">
                        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <span class="action-count rating-count">0</span>
                </div>

                <button title="Share" class="share-btn" data-id="${productId}" data-name="${product.name}" data-price="${price}"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
                
                <button title="${buttonTitle}" class="bookmark-btn ${activeClass}" data-id="${productId}" data-name="${product.name}" data-price="${price}" data-mrp="${mrp}" data-image="${imageUrl}" data-size="${product.size || ''}"><svg viewBox="0 0 24 24" ${svgFill}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
            </div>
            
            <!-- *** റേറ്റിംഗ് ബോക്സ് *** -->
            <div class="rating-box" id="rating-box-${productId}" style="display: none;">
                <!-- *** മാറ്റം: റേറ്റിംഗ് സമ്മറി (Progress Bars) *** -->
                <div class="rating-summary" id="rating-summary-${productId}">
                    <div class="rating-bar-row"><span>5 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>4 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>3 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>2 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                    <div class="rating-bar-row"><span>1 <span class="star-icon">&#9733;</span></span> <div class="bar-bg"><div class="bar-fill" style="width: 0%;"></div></div> <span class="bar-count">0</span></div>
                </div>
                
                <hr class="rating-divider">

                <p class="rating-title">Rate this product</p>
                <div class="star-rating" data-id="${productId}">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <span class="star" data-value="${i}">&#9733;</span>
                    `).join('')}
                </div>
                <div class="rating-feedback">Tap a star to rate</div>
                <div class="comment-input-disabled">
                    <input type="text" placeholder="Comments are disabled" disabled>
                </div>
            </div>

            <h3 class="explore-product-title">${product.name}</h3>
            <div class="price-container">${priceHTML}</div>
            <div class="explore-product-description" data-full-text="${product.description || ''}">${descriptionHTML}</div>
        </div>
    `;
}

function setupRealtimeListeners(productId) {
    const card = document.getElementById(`product-card-${productId}`);
    if (!card) return;

    // 1. Likes Listener
    const likesRef = collection(db, "products", productId, "likes");
    onSnapshot(likesRef, (snapshot) => {
        const count = snapshot.size;
        const likeCountSpan = card.querySelector('.like-count');
        if (likeCountSpan) likeCountSpan.textContent = count;

        if (currentUser) {
            const isLiked = snapshot.docs.some(doc => doc.id === currentUser.uid);
            const likeBtn = card.querySelector('.like-btn');
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

    // 2. Ratings Listener
    const ratingsRef = collection(db, "products", productId, "ratings");
    onSnapshot(ratingsRef, (snapshot) => {
        const count = snapshot.size;
        const ratingCountSpan = card.querySelector('.rating-count');
        if (ratingCountSpan) ratingCountSpan.textContent = count;

        // *** മാറ്റം: സ്റ്റാർ കൗണ്ട് കണക്കാക്കുന്നു ***
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        snapshot.forEach(doc => {
            const val = doc.data().rating;
            if (counts[val] !== undefined) counts[val]++;
        });

        // *** സമ്മറി അപ്ഡേറ്റ് ചെയ്യുന്നു ***
        updateRatingSummary(card, counts, count);

        // യൂസറുടെ റേറ്റിംഗ് ചെക്ക് ചെയ്യുന്നു
        if (currentUser) {
            const userRatingDoc = snapshot.docs.find(doc => doc.id === currentUser.uid);
            if (userRatingDoc) {
                const rating = userRatingDoc.data().rating;
                updateStarUI(card, rating);
            }
        }
    });
}

// *** പുതിയത്: സമ്മറി അപ്ഡേറ്റ് ഫംഗ്ഷൻ ***
function updateRatingSummary(card, counts, total) {
    const summaryRows = card.querySelectorAll('.rating-bar-row');
    // 5 മുതൽ 1 വരെ താഴേക്ക്
    const keys = [5, 4, 3, 2, 1]; 
    
    keys.forEach((starVal, index) => {
        const row = summaryRows[index]; // 0 -> 5 star, 1 -> 4 star...
        const count = counts[starVal];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        const fill = row.querySelector('.bar-fill');
        const countSpan = row.querySelector('.bar-count');
        
        if (fill) fill.style.width = `${percentage}%`;
        if (countSpan) countSpan.textContent = count;
        
        // കളർ സെറ്റ് ചെയ്യുന്നു (Progress Bar)
        if (starVal >= 4) fill.style.backgroundColor = 'var(--success-green)';
        else if (starVal === 3) fill.style.backgroundColor = '#f1c40f'; // Yellow
        else fill.style.backgroundColor = 'var(--error-red)';
    });
}

function updateStarUI(card, value) {
    const stars = card.querySelectorAll('.star');
    const feedback = card.querySelector('.rating-feedback');
    
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


const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) { 
        loadProducts();
    }
}, { rootMargin: '400px' });
if (loader) { observer.observe(loader); }

feedContainer.addEventListener('click', async (e) => { 
    const target = e.target;
    if (!currentUser) return; 

    const likeButton = target.closest('.like-btn');
    if (likeButton) {
        e.preventDefault();
        const productId = likeButton.dataset.id;
        const userLikeRef = doc(db, "products", productId, "likes", currentUser.uid);
        
        try {
            if (likeButton.classList.contains('liked')) {
                await deleteDoc(userLikeRef);
            } else {
                await setDoc(userLikeRef, { timestamp: serverTimestamp() });
                likeButton.style.transform = 'scale(1.2)';
                setTimeout(() => likeButton.style.transform = 'scale(1)', 200);
            }
        } catch (err) { console.error("Like error:", err); }
    }

    const commentButton = target.closest('.comment-btn');
    if (commentButton) {
        e.preventDefault();
        const id = commentButton.dataset.id;
        const ratingBox = document.getElementById(`rating-box-${id}`);
        if (ratingBox.style.display === 'none') {
            ratingBox.style.display = 'block';
        } else {
            ratingBox.style.display = 'none';
        }
    }

    if (target.classList.contains('star')) {
        const star = target;
        const ratingContainer = star.parentElement;
        const productId = ratingContainer.dataset.id;
        const value = parseInt(star.dataset.value);
        const userRatingRef = doc(db, "products", productId, "ratings", currentUser.uid);

        try {
            await setDoc(userRatingRef, { rating: value, timestamp: serverTimestamp() });
        } catch (err) { console.error("Rating error:", err); }
    }

    const bookmarkButton = target.closest('.bookmark-btn');
    const shareButton = target.closest('.share-btn'); 
    
    if (bookmarkButton) {
        e.preventDefault();
        const id = bookmarkButton.dataset.id;
        const svg = bookmarkButton.querySelector('svg');
        if (bookmarkButton.classList.contains('added-to-cart')) {
            removeFromCart(id);
            bookmarkButton.classList.remove('added-to-cart');
            if (svg) svg.style.fill = 'none'; 
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
            if (svg) svg.style.fill = 'var(--primary-gold)'; 
            bookmarkButton.title = 'Remove from Cart';
        }
    }

    if (shareButton) {
        e.preventDefault();
        if (!navigator.share) return;
        const id = shareButton.dataset.id;
        const name = shareButton.dataset.name;
        const price = shareButton.dataset.price;
        const productLink = `${window.location.origin}/product.html?id=${id}`;
        const shareData = { title: name, text: `Check out ${name}!\nPrice: ₹${price}\n`, url: productLink };
        try {
            await navigator.share(shareData);
            const originalIcon = shareButton.innerHTML;
            shareButton.innerHTML = '<svg viewBox="0 0 24 24" style="stroke: var(--success-green);"><path d="M20 6 9 17l-5-5"></path></svg>'; 
            shareButton.classList.add('shared-success');
            setTimeout(() => {
                shareButton.innerHTML = originalIcon;
                shareButton.classList.remove('shared-success');
            }, 2000);
        } catch (err) { console.error('Error sharing:', err); }
    }

    if (target.classList.contains('read-more-btn')) {
        const descriptionDiv = target.closest('.explore-product-description');
        const fullText = descriptionDiv.dataset.fullText.replace(/\n/g, '<br>'); 
        descriptionDiv.innerHTML = fullText;
    }
});