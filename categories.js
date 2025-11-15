// ============================================
// categories.js - Updated with fixes
// ============================================

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
import { loadSiteSettings } from './common.js';
import { addToCart } from './cart.js';

setLogLevel('Debug');

// === DOM Elements ===
const pageTitle = document.getElementById("page-title");
const productGrid = document.getElementById("product-grid"); // ✅ صحیح ID
const categoryNavDesktop = document.getElementById("category-nav-desktop");
const categoryNavMobile = document.getElementById("category-nav-mobile");
const loader = document.getElementById("infinite-scroll-loader");

// === Pagination State ===
let lastVisible = null;
let isLoading = false;
let currentCategoryId = 'all';
const productsPerPage = 12;
let currentQuery = null;

// === Page Load ===
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadCategoryList();
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    startLoadingProducts(currentCategoryId);
});

/**
 * 1. Category List Load کریں
 */
async function loadCategoryList() {
    if (!categoryNavDesktop || !categoryNavMobile) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const catSnapshot = await getDocs(q);

        let navHtml = '';
        
        // "All Products" لنک
        navHtml += `
            <a href="#" class="category-nav-link" data-id="all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-5.5 9h11L12 2zm0 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 8h12v-2H6v2z"/></svg>
                <span>All Products</span>
            </a>
        `;
        
        // دوسری categories
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            navHtml += `
                <a href="#" class="category-nav-link" data-id="${doc.id}">
                    <img src="${category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C'}" alt="${category.name}" class="category-nav-icon">
                    <span>${category.name}</span>
                </a>
            `;
        });

        categoryNavDesktop.innerHTML = navHtml;
        categoryNavMobile.innerHTML = navHtml;

        addNavClickListeners(categoryNavDesktop);
        addNavClickListeners(categoryNavMobile);
        
        updateActiveCategoryUI(currentCategoryId);

    } catch (error) {
        console.error("❌ Error loading categories: ", error);
        categoryNavDesktop.innerHTML = '<p class="loading-placeholder">Error loading categories.</p>';
    }
}

/**
 * 2. Category Link Click Events
 */
function addNavClickListeners(navElement) {
    navElement.addEventListener('click', (e) => {
        const link = e.target.closest('.category-nav-link');
        if (!link) return;
        
        e.preventDefault();
        const categoryId = link.dataset.id;
        
        if (categoryId === currentCategoryId) return;

        currentCategoryId = categoryId;
        startLoadingProducts(categoryId);
    });
}

/**
 * 3. Start Loading Products
 */
async function startLoadingProducts(categoryId) {
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
        pageTitle.textContent = "All Products";
        currentQuery = query(productsRef, orderBy("name"));
    } else {
        try {
            const catDoc = await getDoc(doc(db, "categories", categoryId));
            if (catDoc.exists()) {
                pageTitle.textContent = catDoc.data().name;
            }
            currentQuery = query(
                productsRef,
                where("categoryId", "==", categoryId),
                orderBy("createdAt", "desc")
            );
        } catch (e) {
            console.error("❌ Error fetching category name", e);
        }
    }
    
    updateActiveCategoryUI(categoryId);
    await loadProducts();
}

/**
 * 4. Load Products (Infinite Scroll)
 */
async function loadProducts() {
    if (isLoading || !currentQuery) return;
    isLoading = true;
    loader.style.display = 'flex';

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
            loader.style.display = 'none';
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
            const imageUrl = product.images && product.images[0] 
                ? product.images[0] 
                : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

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
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
                            <span>Add to Cart</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-icon">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5S10.62 14.5 12 14.5s2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"></path></svg>
                            <span>View</span>
                        </a>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
        });

    } catch (error) {
        console.error("❌ Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder-full">Error loading products.</p>';
    } finally {
        isLoading = false;
        loader.style.display = 'none';
    }
}

/**
 * 5. Update Active Category UI
 */
function updateActiveCategoryUI(categoryId) {
    const allLinks = document.querySelectorAll('.category-nav-link');
    allLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.id === categoryId) {
            link.classList.add('active');
        }
    });
}

/**
 * 6. "Add to Cart" Button Click
 */
productGrid.addEventListener('click', (e) => {
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

    button.innerHTML = '✓ Added!';
    button.disabled = true;
    button.style.backgroundColor = '#2ecc71';
    
    setTimeout(() => {
        button.innerHTML = `
            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
            <span>Add to Cart</span>
        `;
        button.disabled = false;
        button.style.backgroundColor = '';
    }, 2000);
});

/**
 * 7. Infinite Scroll Observer
 */
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) {
        loadProducts();
    }
}, {
    rootMargin: '200px'
});

if (loader) {
    observer.observe(loader);
}