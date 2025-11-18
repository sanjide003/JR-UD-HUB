// ഇതാണ് പുതിയ 'explore.js' ഫയൽ.
// *** ഷെയർ ബട്ടൺ (Web Share API) പ്രവർത്തിപ്പിച്ചു ***

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    limit,
    startAfter,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';
import { addToCart } from './cart.js';

setLogLevel('Debug');

// --- DOM Elements ---
const feedContainer = document.getElementById("explore-feed");
const loader = document.getElementById("explore-scroll-loader");

// --- State ---
let categoriesMap = new Map(); 
let lastVisible = null;
let isLoading = false;
const productsPerPage = 5; 

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadCategories();   
    await loadProducts();     
});

/**
 * 1. എല്ലാ കാറ്റഗറി വിവരങ്ങളും (പേര്, ഇമേജ്) എടുത്ത് 'categoriesMap'-ൽ സേവ് ചെയ്യുന്നു.
 */
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
    } catch (error) {
        console.error("Error loading categories map: ", error);
    }
}

/**
 * 2. എല്ലാ പ്രൊഡക്ടുകളും ലോഡ് ചെയ്യുന്നു (ഇൻഫിനിറ്റ് സ്ക്രോൾ)
 */
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

        documentSnapshots.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'explore-card';
            
            card.innerHTML = `
                ${buildCategoryHeader(product.categoryId)}
                ${buildImageSlider(productId, product.images, product.name)}
                ${buildCardContent(productId, product)}
            `;
            
            feedContainer.appendChild(card);
        });
        
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

/**
 * 3. കാറ്റഗറി ഹെഡർ (മുകൾ ഭാഗം) നിർമ്മിക്കുന്നു
 */
function buildCategoryHeader(categoryId) {
    const category = categoriesMap.get(categoryId);
    if (!category) {
        return ''; 
    }
    
    const categoryLink = `categories.html?filter=${categoryId}`;
    const categoryImg = category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C';

    return `
        <a href="${categoryLink}" class="explore-card-header">
            <img src="${categoryImg}" alt="${category.name}" class="explore-category-img">
            <span class="explore-category-name">${category.name}</span>
        </a>
    `;
}

/**
 * 4. ഇമേജ് സ്ലൈഡർ നിർമ്മിക്കുന്നു
 */
function buildImageSlider(productId, images, productName) {
    const productLink = `product.html?id=${productId}`;
    let slidesHTML = '';

    if (images && images.length > 0) {
        images.forEach(imgUrl => {
            slidesHTML += `
                <div class="swiper-slide">
                    <a href="${productLink}">
                        <img src="${imgUrl}" alt="${productName}">
                    </a>
                </div>
            `;
        });
    } else {
        slidesHTML = `
            <div class="swiper-slide">
                <a href="${productLink}">
                    <img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="${productName}">
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

/**
 * 5. കാർഡിന്റെ താഴത്തെ ഭാഗം (വിവരണം, ബട്ടണുകൾ) നിർമ്മിക്കുന്നു
 * *** ഷെയർ ബട്ടണിൽ ഡാറ്റ ആട്രിബ്യൂട്ടുകൾ ചേർത്തു ***
 */
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

    const imageUrl = product.images && product.images[0] ? product.images[0] : '';

    return `
        <div class="explore-card-content">
            <div class="explore-action-icons">
                <button title="Like" class="like-btn">
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <button title="Comment" class="comment-btn">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
                
                <!-- *** ഷെയർ ബട്ടണിൽ ഡാറ്റ ചേർത്തു *** -->
                <button title="Share" class="share-btn"
                    data-id="${productId}"
                    data-name="${product.name}"
                    data-price="${price}">
                    <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
                
                <button title="Add to Cart" class="bookmark-btn"
                    data-id="${productId}"
                    data-name="${product.name}"
                    data-price="${price}"
                    data-mrp="${mrp}"
                    data-image="${imageUrl}"
                    data-size="${product.size || ''}">
                    <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </button>
            </div>

            <h3 class="explore-product-title">${product.name}</h3>
            <div class="price-container">
                ${priceHTML}
            </div>

            <div class="explore-product-description" data-full-text="${product.description || ''}">
                ${descriptionHTML}
            </div>
        </div>
    `;
}

/**
 * 6. ഇൻഫിനിറ്റ് സ്ക്രോൾ നിരീക്ഷകൻ (Observer)
 */
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) { 
        loadProducts();
    }
}, {
    rootMargin: '400px'
});

if (loader) {
    observer.observe(loader);
}

/**
 * 7. "Add to Cart", "Show More", "Share" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 * *** 'async' ചേർത്തു, ഷെയർ ബട്ടൺ ലോജിക് ചേർത്തു ***
 */
feedContainer.addEventListener('click', async (e) => { // *** async ആക്കി ***
    const target = e.target;
    const bookmarkButton = target.closest('.bookmark-btn');
    const shareButton = target.closest('.share-btn'); // *** ഷെയർ ബട്ടൺ കണ്ടെത്തി ***
    
    // "Add to Cart" (ബുക്ക്മാർക്ക് ഐക്കണിൽ)
    if (bookmarkButton && !bookmarkButton.disabled) {
        e.preventDefault();
        
        if (bookmarkButton.classList.contains('added-to-cart')) return;

        const id = bookmarkButton.dataset.id;
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
        setTimeout(() => {
            bookmarkButton.classList.remove('added-to-cart');
        }, 1500); 
    }

    // *** പുതിയത്: ഷെയർ ബട്ടൺ ലോജിക് ***
    if (shareButton) {
        e.preventDefault();
        
        // 1. Web Share API ബ്രൗസറിൽ ലഭ്യമാണോ എന്ന് പരിശോധിക്കുന്നു
        if (!navigator.share) {
            // ലഭ്യമല്ലെങ്കിൽ ഫീഡ്‌ബാക്ക് നൽകുന്നു
            const originalIcon = shareButton.innerHTML;
            shareButton.innerHTML = 'Not Supported';
            setTimeout(() => { shareButton.innerHTML = originalIcon; }, 2000);
            return;
        }

        // 2. ഷെയർ ചെയ്യാനുള്ള ഡാറ്റ തയ്യാറാക്കുന്നു
        const id = shareButton.dataset.id;
        const name = shareButton.dataset.name;
        const price = shareButton.dataset.price;
        const productLink = `${window.location.origin}/product.html?id=${id}`;

        const shareData = {
            title: name,
            text: `Check out ${name}!\nPrice: ₹${price}\n`,
            url: productLink
        };

        // 3. ഷെയർ ഡയലോഗ് തുറക്കുന്നു
        try {
            await navigator.share(shareData);
            
            // വിജയകരമായി ഷെയർ ചെയ്താൽ
            const originalIcon = shareButton.innerHTML;
            shareButton.innerHTML = '<svg viewBox="0 0 24 24" style="stroke: var(--success-green);"><path d="M20 6 9 17l-5-5"></path></svg>'; // ശരി (Tick)
            shareButton.classList.add('shared-success');
            setTimeout(() => {
                shareButton.innerHTML = originalIcon;
                shareButton.classList.remove('shared-success');
            }, 2000);

        } catch (err) {
            console.error('Error sharing:', err);
            // യൂസർ ക്യാൻസൽ ചെയ്താൽ
            const originalIcon = shareButton.innerHTML;
            shareButton.innerHTML = '<svg viewBox="0 0 24 24" style="stroke: var(--error-red);"><path d="M18 6 6 18M6 6l12 12"></path></svg>'; // തെറ്റ് (X)
            shareButton.classList.add('shared-fail');
            setTimeout(() => {
                shareButton.innerHTML = originalIcon;
                shareButton.classList.remove('shared-fail');
            }, 2000);
        }
    }

    // "Show More" ബട്ടൺ (വിവരണം മുഴുവൻ കാണിക്കാൻ)
    if (target.classList.contains('read-more-btn')) {
        const descriptionDiv = target.closest('.explore-product-description');
        const fullText = descriptionDiv.dataset.fullText.replace(/\n/g, '<br>'); 
        descriptionDiv.innerHTML = fullText;
    }
});