// ഇതാണ് 'categories.js' ഫയൽ.
// മാറ്റങ്ങൾ:
// 1. Pagination: 10 പ്രോഡക്റ്റുകൾ വീതം ലോഡ് ചെയ്യുന്നു.
// 2. Server-side Filtering: ഫയർബേസിൽ നിന്ന് നേരിട്ട് ഫിൽറ്റർ ചെയ്യുന്നു.
// 3. Default Sort: Newest First (ഏറ്റവും പുതിയത് ആദ്യം).

import {
    collection,
    getDocs,
    query,
    where,
    limit,
    orderBy,
    startAfter,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

setLogLevel('Silent');

// --- DOM Elements ---
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

// Filter Elements
const priceFilter = document.getElementById("price-range-filter");
const sortFilter = document.getElementById("sort-by-filter");
const discountChips = document.querySelectorAll(".discount-chip");

// --- State ---
let currentCategoryId = 'all'; 
let lastVisibleDoc = null; // അവസാനമായി ലോഡ് ചെയ്ത ഡോക്യുമെന്റ്
let isFetching = false;    // ഇപ്പോൾ ലോഡ് ചെയ്യുന്നുണ്ടോ എന്നറിയാൻ
let hasMoreProducts = true; // ഇനിയും പ്രോഡക്റ്റുകൾ ഉണ്ടോ എന്നറിയാൻ
const PRODUCTS_PER_PAGE = 10; // ഒരു തവണ 10 എണ്ണം

let activePriceRange = 'all';
let activeSort = 'newest'; // Default sort changed to newest
let activeDiscount = null;
let currentSearchTerm = '';

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadCategoryList(); 
    
    // URL-ൽ നിന്ന് ഫിൽറ്റർ എടുക്കുന്നു
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    // സോർട്ട് ഡ്രോപ്പ്ഡൗണിൽ 'Newest' ഓപ്ഷൻ ചേർക്കുന്നു (HTML-ൽ ഇല്ലെങ്കിൽ)
    ensureNewestOption();

    setupEventListeners();
    setupScrollAnimation(); 
    updateActiveCategoryUI(currentCategoryId);
    
    // ആദ്യത്തെ 10 പ്രോഡക്റ്റുകൾ ലോഡ് ചെയ്യുന്നു
    loadProducts(true); 
});

function ensureNewestOption() {
    // നിലവിലുള്ള ഓപ്ഷനുകൾ പരിശോധിക്കുന്നു, 'newest' ഇല്ലെങ്കിൽ ചേർക്കും
    let hasNewest = false;
    for(let i=0; i<sortFilter.options.length; i++) {
        if(sortFilter.options[i].value === 'newest') hasNewest = true;
    }
    
    if(!hasNewest) {
        const option = document.createElement('option');
        option.value = 'newest';
        option.text = 'Newest First';
        sortFilter.insertBefore(option, sortFilter.firstChild);
    }
    // Default selection
    sortFilter.value = 'newest';
}

// --- SCROLL ANIMATION LOGIC ---
function setupScrollAnimation() {
    if (!productsScrollContainer) return;

    productsScrollContainer.addEventListener('scroll', () => {
        const scrollTop = productsScrollContainer.scrollTop;
        
        // Sticky Header Compact Mode
        if (scrollTop > 30) {
            stickyHeader.classList.add('compact');
        } else {
            stickyHeader.classList.remove('compact');
            searchWrapper.classList.remove('expanded');
        }

        // Infinite Scroll Logic
        // താഴെ എത്താറായോ എന്ന് നോക്കുന്നു (50px buffer)
        if (productsScrollContainer.scrollTop + productsScrollContainer.clientHeight >= productsScrollContainer.scrollHeight - 100) {
            loadProducts(false); // Load next batch
        }
    });

    searchIconBtn.addEventListener('click', () => {
        if (stickyHeader.classList.contains('compact')) {
            searchWrapper.classList.toggle('expanded');
            if (searchWrapper.classList.contains('expanded')) {
                searchInput.focus();
            }
        }
    });
}

// --- Data Loading ---
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
            const rawImage = category.imageUrl || 'https://placehold.co/80x80/333/D4AF37?text=C';
            const optimizedIcon = optimizeImage(rawImage, 80, 60);

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

    } catch (error) {
        console.error("Error loading categories: ", error);
    }
}

// *** MAIN PRODUCT LOADING FUNCTION ***
async function loadProducts(isReset = false) {
    if (isFetching) return;
    if (isReset) {
        lastVisibleDoc = null;
        hasMoreProducts = true;
        productGrid.innerHTML = ''; // ക്ലിയർ ചെയ്യുന്നു
        noResultsMsg.style.display = 'none';
    }

    if (!hasMoreProducts) return;

    isFetching = true;
    if (loader) loader.style.display = 'flex';

    try {
        let constraints = [];
        const productsRef = collection(db, "products");

        // 1. Category Filter
        if (currentCategoryId !== 'all') {
            constraints.push(where("categoryId", "==", currentCategoryId));
        }

        // 2. Sorting & Price Filter
        // ഫയർബേസിൽ ഒരേ സമയം Range Filter-ഉം Sort-ഉം വേറെ ഫീൽഡുകളിൽ നൽകാൻ ബുദ്ധിമുട്ടാണ് (Requires Index).
        // അതിനാൽ ലളിതമായ രീതി ഉപയോഗിക്കുന്നു.
        
        if (activeSort === 'newest') {
            constraints.push(orderBy("createdAt", "desc"));
        } else if (activeSort === 'low-high') {
            constraints.push(orderBy("price", "asc"));
        } else if (activeSort === 'high-low') {
            constraints.push(orderBy("price", "desc"));
        } else {
            // Default Fallback
            constraints.push(orderBy("createdAt", "desc"));
        }

        // 3. Pagination
        if (lastVisibleDoc) {
            constraints.push(startAfter(lastVisibleDoc));
        }

        constraints.push(limit(PRODUCTS_PER_PAGE));

        // Query നിർമ്മിക്കുന്നു
        // ശ്രദ്ധിക്കുക: സെർച്ച് ഉണ്ടെങ്കിൽ ഇത് ക്ലയന്റ് സൈഡിൽ ചെയ്യേണ്ടി വരും, കാരണം ഫയർബേസിന് 'LIKE' ക്വറി ഇല്ല.
        // എന്നാൽ യൂസർ 10 എണ്ണം ലോഡ് ചെയ്യാനാണ് പറഞ്ഞത്. സെർച്ച് ചെയ്യുമ്പോൾ മാത്രം നമ്മൾ ലോജിക് മാറ്റും.
        
        let q;
        let finalDocs = [];

        if (currentSearchTerm) {
            // *** സെർച്ച് മോഡ് ***
            // സെർച്ച് ചെയ്യുമ്പോൾ മാത്രം എല്ലാ ഡാറ്റയും എടുത്ത് ഫിൽറ്റർ ചെയ്യുന്നു (മറ്റൊരു വഴി ഫയർബേസിൽ ഇല്ലാത്തതുകൊണ്ട്)
            // എന്നാൽ ഇത് "Load all" എന്നതിന് എതിരായതുകൊണ്ട്, ഒരു ലിമിറ്റ് വെക്കുന്നു.
             q = query(productsRef, orderBy("name"), limit(100)); // 100 എണ്ണത്തിൽ തിരയുന്നു (For performance)
             const snapshot = await getDocs(q);
             const term = currentSearchTerm.toLowerCase();
             finalDocs = snapshot.docs.filter(doc => doc.data().name.toLowerCase().includes(term));
             hasMoreProducts = false; // സെർച്ചിൽ പേജിനേഷൻ തൽക്കാലം ഒഴിവാക്കുന്നു
        } else {
            // *** നോർമൽ മോഡ് (Pagination) ***
            q = query(productsRef, ...constraints);
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                hasMoreProducts = false;
                if (isReset) noResultsMsg.style.display = 'block';
            } else {
                lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
                finalDocs = snapshot.docs;
                
                // 10-ൽ കുറവാണെങ്കിൽ ഇനി ലോഡ് ചെയ്യാൻ ഒന്നുമില്ല
                if (snapshot.docs.length < PRODUCTS_PER_PAGE) {
                    hasMoreProducts = false;
                }
            }
        }

        // Client-side Filtering for Price Range & Discount (Firestore Limitations പരിഹരിക്കാൻ)
        // നാം 10 എണ്ണം എടുക്കുന്നു, അതിൽ ഫിൽറ്റർ ചെയ്യുന്നു. 
        // Note: ഇത് പെർഫെക്റ്റ് അല്ല, എന്നാലും 10 എണ്ണം വെച്ച് ലോഡ് ചെയ്യാൻ ഇതാണ് നല്ലത്.
        
        for (const docSnap of finalDocs) {
            const product = docSnap.data();
            const productId = docSnap.id;
            
            // Apply Price Filter Logic
            let passPrice = true;
            if (activePriceRange !== 'all') {
                const p = product.price;
                if (activePriceRange === '0-500' && p >= 500) passPrice = false;
                else if (activePriceRange === '500-1000' && (p < 500 || p > 1000)) passPrice = false;
                else if (activePriceRange === '1000-2000' && (p < 1000 || p > 2000)) passPrice = false;
                else if (activePriceRange === '2000-5000' && (p < 2000 || p > 5000)) passPrice = false;
                else if (activePriceRange === '5000+' && p <= 5000) passPrice = false;
            }

            // Apply Discount Filter Logic
            let passDiscount = true;
            if (activeDiscount !== null) {
                let discountPercent = 0;
                if (product.mrp && product.mrp > product.price) {
                    discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);
                }
                if (discountPercent < activeDiscount) passDiscount = false;
            }

            if (passPrice && passDiscount) {
                renderProductCard(product, productId);
            }
        }
        
        // ഫിൽറ്റർ ചെയ്ത ശേഷം ഗ്രിഡ് കാലിയാണെങ്കിൽ മെസ്സേജ് കാണിക്കുക
        if (productGrid.children.length === 0 && !hasMoreProducts) {
             noResultsMsg.style.display = 'block';
        } else {
             noResultsMsg.style.display = 'none';
        }

    } catch (error) {
        console.error("Error loading products:", error);
    } finally {
        isFetching = false;
        if (loader) loader.style.display = 'none';
    }
}


function setupEventListeners() {
    // Search with Debounce
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        clearSearchBtn.style.display = val.length > 0 ? 'block' : 'none';
        
        debounceTimer = setTimeout(() => {
            currentSearchTerm = val;
            loadProducts(true); // Reset and search
        }, 500);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        clearSearchBtn.style.display = 'none';
        loadProducts(true);
    });

    priceFilter.addEventListener('change', (e) => {
        activePriceRange = e.target.value;
        loadProducts(true);
    });

    sortFilter.addEventListener('change', (e) => {
        activeSort = e.target.value;
        loadProducts(true);
    });

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
            loadProducts(true);
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
            
            // URL Update
            const url = new URL(window.location);
            if (categoryId === 'all') url.searchParams.delete('filter');
            else url.searchParams.set('filter', categoryId);
            window.history.pushState({}, '', url);
            
            loadProducts(true); // Reset list for new category
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
    currentSearchTerm = '';
    clearSearchBtn.style.display = 'none';
    
    priceFilter.value = 'all';
    activePriceRange = 'all';
    
    sortFilter.value = 'newest';
    activeSort = 'newest';
    
    activeDiscount = null;
    discountChips.forEach(c => c.classList.remove('active'));
    
    loadProducts(true);
}

function renderProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'category-product-card';

    const price = product.price || 0;
    const mrp = product.mrp || 0;
    
    const rawImage = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
    const imageUrl = optimizeImage(rawImage, 250, 60);

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

if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `@keyframes ripple-animation { to { transform: scale(2); opacity: 0; } }`;
    document.head.appendChild(style);
}

productGrid.addEventListener('click', (e) => {
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
            // Cart-ലേക്ക് ചേർക്കുമ്പോൾ ഫുൾ ഡാറ്റ ആവശ്യമില്ല, ബട്ടണിലെ ഡാറ്റ മതി
            const cartProduct = {
                id: id,
                name: cartButton.dataset.name,
                price: parseFloat(cartButton.dataset.price),
                mrp: parseFloat(cartButton.dataset.mrp),
                image: cartButton.dataset.image,
                size: cartButton.dataset.size 
            };
            addToCart(id, cartProduct);
            cartButton.classList.add('added-to-cart');
            if (buttonText) buttonText.textContent = 'Remove';
        }
    } 
});