// categories.js - Fixed Layout with Dummy Cards

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Silent');

const productGrid = document.getElementById("category-product-grid");
const categoryNavSection = document.getElementById("category-nav-section");
const stickyHeader = document.getElementById("sticky-header-container");
const productsScrollContainer = document.getElementById("products-scroll-container");
const searchWrapper = document.getElementById("search-wrapper");
const searchIconBtn = document.getElementById("search-icon-btn");
const loader = document.getElementById("infinite-scroll-loader");
const searchInput = document.getElementById("product-search-input"); 
const clearSearchBtn = document.getElementById("clear-search-btn");
const noResultsMsg = document.getElementById("no-results-message");
const resetFiltersBtn = document.getElementById("reset-filters-btn");
const priceFilter = document.getElementById("price-range-filter");
const sortFilter = document.getElementById("sort-by-filter");
const discountChips = document.querySelectorAll(".discount-chip");

let currentCategoryId = 'all'; 
let allProductsCache = []; 
let categoriesMap = new Map(); 
let activeDiscount = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadCategoryList(); 
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    await loadAllProductsCache();
    setupEventListeners();
    setupScrollAnimation(); 
    updateActiveCategoryUI(currentCategoryId);
    applyFilters(); 
});

function setupScrollAnimation() {
    if (!productsScrollContainer) return;

    productsScrollContainer.addEventListener('scroll', () => {
        const scrollTop = productsScrollContainer.scrollTop;
        
        // Always allow compact mode because min-height ensures scrolling
        if (scrollTop > 20) {
            stickyHeader.classList.add('compact');
        } else {
            stickyHeader.classList.remove('compact');
            if (scrollTop <= 20) {
                searchWrapper.classList.remove('expanded');
            }
        }
    });

    if (searchIconBtn) {
        searchIconBtn.addEventListener('click', () => {
            if (stickyHeader.classList.contains('compact')) {
                searchWrapper.classList.toggle('expanded');
                if (searchWrapper.classList.contains('expanded')) {
                    searchInput.focus();
                }
            }
        });
    }
}

async function loadCategoryList() {
    if (!categoryNavSection) return;
    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const catSnapshot = await getDocs(q);

        let navHtml = `
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

        categoryNavSection.innerHTML = navHtml;
        addNavClickListeners(categoryNavSection);

    } catch (error) { console.error("Error loading categories"); }
}

async function loadAllProductsCache() {
    if (loader) loader.style.display = 'flex';
    try {
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);
        allProductsCache = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let discountPercent = 0;
            if (data.mrp && data.mrp > data.price) {
                discountPercent = Math.round(((data.mrp - data.price) / data.mrp) * 100);
            }
            allProductsCache.push({
                id: doc.id,
                ...data,
                discountPercent: discountPercent,
                categoryName: categoriesMap.get(data.categoryId) || ''
            });
        });
    } catch (error) { console.error("Error loading products cache"); } 
    finally { if (loader) loader.style.display = 'none'; }
}

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        clearSearchBtn.style.display = e.target.value.length > 0 ? 'block' : 'none';
        applyFilters();
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });
    priceFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);

    discountChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const val = parseInt(chip.dataset.value);
            if (activeDiscount === val) {
                activeDiscount = null;
                chip.classList.remove('active');
            } else {
                activeDiscount = val;
                discountChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
            applyFilters();
        });
    });

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetAllFilters);
    }
}

function addNavClickListeners(navElement) {
    navElement.addEventListener('click', (e) => {
        const link = e.target.closest('.category-grid-item');
        if (!link) return;
        e.preventDefault();
        const categoryId = link.dataset.id;
        
        if (categoryId !== currentCategoryId) {
            currentCategoryId = categoryId;
            updateActiveCategoryUI(categoryId);
            const url = new URL(window.location);
            if (categoryId === 'all') url.searchParams.delete('filter');
            else url.searchParams.set('filter', categoryId);
            window.history.pushState({}, '', url);
            applyFilters();
            productsScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
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

function resetAllFilters() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    priceFilter.value = 'all';
    sortFilter.value = 'default';
    activeDiscount = null;
    discountChips.forEach(c => c.classList.remove('active'));
    currentCategoryId = 'all';
    updateActiveCategoryUI('all');
    applyFilters();
}

function applyFilters() {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    let filtered = [...allProductsCache];

    if (currentCategoryId !== 'all') {
        filtered = filtered.filter(p => p.categoryId === currentCategoryId);
    }

    const term = searchInput.value.toLowerCase().trim();
    if (term.length > 0) {
        const searchTerms = term.split(/\s+/);
        filtered = filtered.filter(p => {
            const text = `${p.name} ${p.price} ${p.description || ''} ${p.specification || ''} ${p.categoryName}`.toLowerCase();
            return searchTerms.every(t => text.includes(t));
        });
    }

    const priceRange = priceFilter.value;
    if (priceRange !== 'all') {
        if (priceRange === '0-500') filtered = filtered.filter(p => p.price < 500);
        else if (priceRange === '500-1000') filtered = filtered.filter(p => p.price >= 500 && p.price <= 1000);
        else if (priceRange === '1000-2000') filtered = filtered.filter(p => p.price >= 1000 && p.price <= 2000);
        else if (priceRange === '2000-5000') filtered = filtered.filter(p => p.price >= 2000 && p.price <= 5000);
        else if (priceRange === '5000+') filtered = filtered.filter(p => p.price > 5000);
    }

    if (activeDiscount !== null) {
        filtered = filtered.filter(p => p.discountPercent >= activeDiscount);
    }

    const sortVal = sortFilter.value;
    if (sortVal === 'low-high') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'high-low') {
        filtered.sort((a, b) => b.price - a.price);
    }

    // Hide default "No Results" text, we use Dummy Cards instead
    if (noResultsMsg) noResultsMsg.style.display = 'none';

    // Render Real Products
    filtered.forEach(product => {
        renderProductCard(product, product.id);
    });

    // *** ADD DUMMY CARDS TO FILL SPACE ***
    // Ensure at least 8 cards (4 rows) to maintain scroll & layout
    const MIN_CARDS = 8;
    const remainingSlots = MIN_CARDS - filtered.length;

    if (remainingSlots > 0) {
        for (let i = 0; i < remainingSlots; i++) {
            renderDummyCard();
        }
    }
}

// Function to render "No Product" Dummy Card
function renderDummyCard() {
    const card = document.createElement('div');
    card.className = 'category-product-card dummy-card';
    card.style.opacity = '0.4'; 
    card.style.pointerEvents = 'none'; // Not clickable
    card.style.borderColor = 'transparent';

    card.innerHTML = `
        <div class="cat-product-image-link" style="background-color: #111; display: flex; align-items: center; justify-content: center;">
            <span style="color: #333; font-size: 0.75rem; font-weight: 600;">No Product</span>
        </div>
        <div class="cat-product-content">
            <div style="background-color: #1a1a1a; height: 1em; width: 80%; margin-bottom: 5px; border-radius: 4px;"></div>
            <div style="background-color: #1a1a1a; height: 1em; width: 50%; border-radius: 4px;"></div>
            <div class="price-container" style="margin-top: auto;">
                <div style="background-color: #1a1a1a; height: 1em; width: 40%; border-radius: 4px;"></div>
            </div>
            <div class="cat-product-buttons">
                <div style="background-color: #1a1a1a; height: 30px; border-radius: 4px;"></div>
                <div style="background-color: #1a1a1a; height: 30px; border-radius: 4px;"></div>
            </div>
        </div>
    `;
    productGrid.appendChild(card);
}

function renderProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'category-product-card';
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    const rawImage = product.images && product.images[0] ? product.images[0] : '';
    const imageUrl = optimizeImage(rawImage, 400, 80);
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
    }
    const isInCart = isItemInCart(productId);
    const buttonText = isInCart ? "Remove" : "Cart";
    const buttonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";

    card.innerHTML = `
        <a href="product.html?id=${productId}" class="cat-product-image-link">
            <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" loading="lazy">
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
                    <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    <span>${buttonText}</span>
                </button>
                <a href="product.html?id=${productId}" class="btn btn-primary-new"><span>View</span></a>
            </div>
        </div>
    `;
    productGrid.appendChild(card);
}

document.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (button) {
        e.preventDefault();
        const id = button.dataset.id;
        const buttonText = button.querySelector('span');
        if (button.classList.contains('added-to-cart')) {
            removeFromCart(id);
            button.classList.remove('added-to-cart');
            if (buttonText) buttonText.textContent = 'Cart';
        } else {
            const product = allProductsCache.find(p => p.id === id); 
            if (product) {
                const cartProduct = { id: product.id, name: product.name, price: product.price, mrp: product.mrp, image: product.images && product.images[0] ? product.images[0] : '', size: product.size || '' };
                addToCart(id, cartProduct);
                button.classList.add('added-to-cart');
                if (buttonText) buttonText.textContent = 'Remove';
            }
        }
    }
});
