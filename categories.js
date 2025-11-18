// ഇതാണ് 'categories.js' ഫയൽ.
// *** Image Optimization & Lazy Loading നടപ്പിലാക്കി ***

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
import { loadSiteSettings, optimizeImage } from './common.js'; // *** optimizeImage ഇറക്കുമതി ചെയ്തു ***
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Debug');

// --- DOM Elements ---
const pageTitle = document.getElementById("page-title"); 
const productGrid = document.getElementById("category-product-grid");
const categoryNavDesktop = document.getElementById("category-nav-desktop");
const categoryNavMobile = document.getElementById("category-nav-mobile");
const loader = document.getElementById("infinite-scroll-loader");

// --- State ---
let lastVisible = null; 
let isLoading = false; 
let currentCategoryId = 'all'; 
const productsPerPage = 12; 
let currentQuery = null;
let whatsappNumber = ''; 

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadWhatsappNumber();
    loadCategoryList(); 
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    startLoadingProducts(currentCategoryId); 
});

async function loadWhatsappNumber() {
    try {
        // ... (പഴയതുപോലെ തന്നെ) ...
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        }
    } catch (error) { console.error("Error fetching WhatsApp number: ", error); }
}

/**
 * 1. കാറ്റഗറി ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു (ഒപ്റ്റിമൈസ് ചെയ്ത ചിത്രങ്ങൾ)
 */
async function loadCategoryList() {
    if (!categoryNavDesktop || !categoryNavMobile) return;

    try {
        // കാഷെയിൽ ഉണ്ടോ എന്ന് പരിശോധിക്കാം (ലളിതമാക്കാൻ ഇപ്പോൾ നേരിട്ട് വിളിക്കുന്നു)
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
                <span class="category-grid-name">All Products</span>
            </a>
        `;
        
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            // *** കാറ്റഗറി ഐക്കൺ ഒപ്റ്റിമൈസ് ചെയ്യുന്നു (വളരെ ചെറിയ വലിപ്പം മതി - 150px) ***
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
        currentCategoryId = categoryId;
        startLoadingProducts(categoryId);
        
        const sideNav = document.getElementById('side-nav');
        const navOverlay = document.getElementById('nav-overlay');
        if (sideNav && sideNav.classList.contains('open')) {
            sideNav.classList.remove('open');
            navOverlay.classList.remove('open');
        }
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
        currentQuery = query(productsRef, orderBy("name"));
    } else {
        try {
            currentQuery = query(productsRef, where("categoryId", "==", categoryId));
        } catch (e) { console.error("Error query", e); }
    }
    
    updateActiveCategoryUI(categoryId);
    await loadProducts();
}

/**
 * 4. ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു (Image Optimization + Lazy Loading)
 */
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
            const card = document.createElement('div');
            card.className = 'category-product-card';

            const price = product.price || 0;
            const mrp = product.mrp || 0;
            
            // *** ഇമേജ് ഒപ്റ്റിമൈസേഷൻ (400px മതി) ***
            const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
            const imageUrl = optimizeImage(rawImage, 400, 80);

            let priceHTML = `<span class="price-main">₹${price}</span>`;
            if (mrp > price) {
                priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
            }

            const isInCart = isItemInCart(productId);
            const buttonText = isInCart ? "Remove" : "Cart";
            const buttonClass = isInCart ? "btn-primary-new added-to-cart" : "btn-secondary-new";

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
        });

    } catch (error) {
        console.error("Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder-full">Error loading products.</p>';
    } finally {
        isLoading = false;
        if (loader) loader.style.display = 'none';
    }
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

productGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');
    if (cartButton) {
        e.preventDefault();
        const id = cartButton.dataset.id;
        const buttonText = cartButton.querySelector('span');
        if (cartButton.classList.contains('added-to-cart')) {
            removeFromCart(id);
            cartButton.classList.remove('added-to-cart');
            cartButton.classList.remove('btn-primary-new');
            cartButton.classList.add('btn-secondary-new');
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
            cartButton.classList.add('btn-primary-new');
            cartButton.classList.remove('btn-secondary-new');
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) { 
        loadProducts();
    }
}, { rootMargin: '200px' });

if (loader) { observer.observe(loader); }