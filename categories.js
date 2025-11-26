// ഇതാണ് 'categories.js' ഫയൽ.
// മാറ്റം: സെർച്ച് ലോജിക് (കാറ്റഗറി അടിസ്ഥാനത്തിൽ), ബട്ടൺ സ്റ്റൈൽ ലോജിക്.

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    startAfter,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Debug');

// --- DOM Elements ---
const productGrid = document.getElementById("category-product-grid");
const categoryNavDesktop = document.getElementById("category-nav-desktop");
const categoryNavMobile = document.getElementById("category-nav-mobile");
const loader = document.getElementById("infinite-scroll-loader");
const searchInput = document.getElementById("product-search-input"); 
const clearSearchBtn = document.getElementById("clear-search-btn");
const noResultsMsg = document.getElementById("no-results-message");

// --- State ---
let lastVisible = null; 
let isLoading = false; 
let currentCategoryId = 'all'; 
const productsPerPage = 12; 
let currentQuery = null;
let whatsappNumber = ''; 
let allProductsCache = []; 
let categoriesMap = new Map(); 

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadWhatsappNumber();
    await loadCategoryList(); 
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    startLoadingProducts(currentCategoryId); 
    setupSearch(); 
});

async function loadWhatsappNumber() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        }
    } catch (error) { console.error("Error fetching WhatsApp number: ", error); }
}

/**
 * 1. കാറ്റഗറി ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു
 */
async function loadCategoryList() {
    if (!categoryNavDesktop || !categoryNavMobile) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const catSnapshot = await getDocs(q);

        let navHtml = '';
        
        navHtml += `
            <a href="#" class="category-grid-item" data-id="all">
                <div class="category-grid-image-box">
                    <svg class="category-grid-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/>
                    </svg>
                </div>
                <span class="category-grid-name">All</span>
            </a>
        `;
        
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            categoriesMap.set(doc.id, category.name);

            const rawImage = category.imageUrl || 'https://placehold.co/80x80/333/D4AF37?text=C';
            const optimizedIcon = optimizeImage(rawImage, 150);

            navHtml += `
                <a href="#" class="category-grid-item" data-id="${doc.id}">
                    <div class="category-grid-image-box">
                        <img src="${optimizedIcon}" alt="${category.name}" class="category-grid-image" loading="lazy">
                    </div>
                    <span class="category-grid-name">${category.name}</span>
                </a>
            `;
        });

        categoryNavDesktop.innerHTML = navHtml;
        categoryNavMobile.innerHTML = navHtml;

        addNavClickListeners(categoryNavDesktop);
        addNavClickListeners(categoryNavMobile);
        
        updateActiveCategoryUI(currentCategoryId);

    } catch (error) {
        console.error("Error loading categories: ", error);
        categoryNavDesktop.innerHTML = '<p class="loading-placeholder">Error loading categories.</p>';
    }
}

function addNavClickListeners(navElement) {
    navElement.addEventListener('click', (e) => {
        const link = e.target.closest('.category-grid-item');
        if (!link) return;
        e.preventDefault();
        const categoryId = link.dataset.id;
        if (categoryId === currentCategoryId) return; 
        
        if(searchInput) searchInput.value = '';
        if(clearSearchBtn) clearSearchBtn.style.display = 'none';
        if(noResultsMsg) noResultsMsg.style.display = 'none';

        currentCategoryId = categoryId;
        startLoadingProducts(categoryId);
    });
}

async function startLoadingProducts(categoryId) {
    if (!productGrid) return;
    isLoading = false;
    productGrid.innerHTML = ''; 
    lastVisible = null; 
    window.scrollTo(0, 0); 
    
    const url = new URL(window.location);
    if (categoryId === 'all') {
        url.searchParams.delete('filter');
    } else {
        url.searchParams.set('filter', categoryId);
    }
    window.history.pushState({}, '', url);

    const productsRef = collection(db, "products");
    if (categoryId === 'all') {
        currentQuery = query(productsRef, orderBy("createdAt", "desc"));
    } else {
        currentQuery = query(productsRef, where("categoryId", "==", categoryId));
    }
    
    updateActiveCategoryUI(categoryId);
    await loadProducts();
}

async function loadProducts() {
    if (isLoading || !currentQuery) return;
    isLoading = true;
    if (loader) loader.style.display = 'flex';

    try {
        let q;
        if (lastVisible) {
            q = query(currentQuery, startAfter(lastVisible), limit(productsPerPage));
        } else {
            q = query(currentQuery, limit(productsPerPage));
        }

        const documentSnapshots = await getDocs(q);

        if (documentSnapshots.empty) {
            if (productGrid.innerHTML === '') {
                productGrid.innerHTML = '<p class="loading-placeholder-full">No products found in this category.</p>';
            }
            if (loader) loader.style.display = 'none';
            lastVisible = null; 
            return; 
        }

        lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        documentSnapshots.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            renderProductCard(product, productId); 
        });

    } catch (error) {
        console.error("Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder-full">Error loading products.</p>';
    } finally {
        isLoading = false;
        if (loader) loader.style.display = 'none';
    }
}

function renderProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'category-product-card';

    const price = product.price || 0;
    const mrp = product.mrp || 0;
    
    const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
    const imageUrl = optimizeImage(rawImage, 400, 80);

    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
    }

    const isInCart = isItemInCart(productId);
    const buttonText = isInCart ? "Remove" : "Cart";
    
    // *** മാറ്റം: എപ്പോഴും btn-secondary-new (Black Style) ***
    const buttonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

    card.innerHTML = `
        <a href="product.html?id=${productId}" class="cat-product-image-link">
            <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" loading="lazy" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
        </a>
        <div class="cat-product-content">
            <h3 class="cat-product-title">${product.name}</h3>
            <div class="price-container">
                ${priceHTML}
            </div>
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
                <a href="product.html?id=${productId}" class="btn btn-primary-new">
                    <span>View</span>
                </a>
            </div>
        </div>
    `;
    productGrid.appendChild(card);
}

function updateActiveCategoryUI(categoryId) {
    const allLinks = document.querySelectorAll('.category-grid-item'); 
    allLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.id === categoryId) {
            link.classList.add('active');
        }
    });
}

function setupSearch() {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        if (term.length > 0) {
            clearSearchBtn.style.display = 'block';
            if (loader) loader.style.display = 'none';
            currentQuery = null; 
            
            performSearch(term);
        } else {
            clearSearchBtn.style.display = 'none';
            noResultsMsg.style.display = 'none';
            startLoadingProducts(currentCategoryId);
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        noResultsMsg.style.display = 'none';
        startLoadingProducts(currentCategoryId);
    });
}

async function performSearch(searchTerm) {
    productGrid.innerHTML = '';
    isLoading = true; 
    if (loader) loader.style.display = 'flex';

    try {
        if (allProductsCache.length === 0) {
            const q = query(collection(db, "products")); 
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                allProductsCache.push({ id: doc.id, ...doc.data() });
            });
        }

        const searchTerms = searchTerm.split(/\s+/);

        const filteredProducts = allProductsCache.filter(product => {
            // *** മാറ്റം: നിലവിലെ കാറ്റഗറിയിലുള്ളത് മാത്രം കാണിക്കുക ***
            if (currentCategoryId !== 'all' && product.categoryId !== currentCategoryId) {
                return false;
            }

            const categoryName = categoriesMap.get(product.categoryId) || '';
            const productString = `
                ${product.name} 
                ${product.price} 
                ${product.description || ''} 
                ${product.specification || ''} 
                ${categoryName}
            `.toLowerCase();

            return searchTerms.every(term => productString.includes(term));
        });

        if (loader) loader.style.display = 'none';

        if (filteredProducts.length === 0) {
            noResultsMsg.style.display = 'block';
        } else {
            noResultsMsg.style.display = 'none';
            filteredProducts.forEach(product => {
                renderProductCard(product, product.id);
            });
        }

    } catch (error) {
        console.error("Search error:", error);
        if (loader) loader.style.display = 'none';
    }
}

// Ripple Effect Helper
function createRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute; width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px; border-radius: 50%;
        background: rgba(255, 255, 255, 0.3); transform: scale(0);
        animation: ripple-animation 0.6s ease-out; pointer-events: none;
    `;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to { transform: scale(2); opacity: 0; }
    }
`;
document.head.appendChild(style);

productGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');
    if (cartButton) {
        e.preventDefault();
        const id = cartButton.dataset.id;
        const buttonText = cartButton.querySelector('span');
        
        createRipple(e, cartButton); // Ripple Effect Add ചെയ്തു

        if (cartButton.classList.contains('added-to-cart')) {
            removeFromCart(id);
            cartButton.classList.remove('added-to-cart');
            // *** മാറ്റം: ക്ലാസ് മാറ്റുന്നില്ല, വെറും ടോഗിൾ മാത്രം ***
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
            // *** മാറ്റം: ക്ലാസ് മാറ്റുന്നില്ല ***
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible && currentQuery) { 
        loadProducts();
    }
}, { rootMargin: '200px' });

if (loader) { observer.observe(loader); }