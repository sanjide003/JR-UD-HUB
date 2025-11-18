// ഇതാണ് 'categories.js' ഫയൽ.
// *** മുകളിലെ തലക്കെട്ട് (h1) നീക്കം ചെയ്തു ***
// *** കാറ്റഗറി ലിസ്റ്റ് പുതിയ ഗ്രിഡ് രൂപത്തിലാക്കി ***

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

// --- DOM Elements ---
const pageTitle = document.getElementById("page-title"); // *** ഇത് ഇപ്പോൾ null ആയിരിക്കും, പക്ഷെ കുഴപ്പമില്ല ***
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

/**
 * WhatsApp നമ്പർ ഫയർബേസിൽ നിന്ന് എടുക്കുന്നു
 */
async function loadWhatsappNumber() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        } else {
            console.log("WhatsApp number not found in settings.");
        }
    } catch (error) {
        console.error("Error fetching WhatsApp number: ", error);
    }
}

/**
 * 1. കാറ്റഗറി ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു (പുതിയ ഗ്രിഡ് രൂപത്തിൽ)
 */
async function loadCategoryList() {
    if (!categoryNavDesktop || !categoryNavMobile) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const catSnapshot = await getDocs(q);

        let navHtml = '';
        
        // "All Products" ബട്ടൺ പുതിയ സ്റ്റൈലിൽ
        navHtml += `
            <a href="#" class="category-grid-item" data-id="all">
                <div class="category-grid-image-box">
                    <svg class="category-grid-image" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5.5c0 .28-.22.5-.5.5h-4.3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5zm-15 0c0 .28-.22.5-.5.5H3.2c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5zm10 9c0 .28-.22.5-.5.5h-4.3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5zm-10 0c0 .28-.22.5-.5.5H3.2c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5zm10-4.5c0 .28-.22.5-.5.5h-4.3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5zm-10 0c0 .28-.22.5-.5.5H3.2c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h4.3c.28 0 .5.22.5.5z"/></svg>
                </div>
                <span class="category-grid-name">All Products</span>
            </a>
        `;
        
        // മറ്റ് കാറ്റഗറികൾ
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            navHtml += `
                <a href="#" class="category-grid-item" data-id="${doc.id}">
                    <div class="category-grid-image-box">
                        <img src="${category.imageUrl || 'https://placehold.co/80x80/333/D4AF37?text=C'}" alt="${category.name}" class="category-grid-image">
                    </div>
                    <span class="category-grid-name">${category.name}</span>
                </a>
            `;
        });

        // *** ഒരേ HTML മൊബൈലിലും ഡെസ്ക്ടോപ്പിലും കാണിക്കുന്നു ***
        categoryNavDesktop.innerHTML = navHtml;
        categoryNavMobile.innerHTML = navHtml;

        addNavClickListeners(categoryNavDesktop);
        addNavClickListeners(categoryNavMobile);
        
        updateActiveCategoryUI(currentCategoryId);

    } catch (error) {
        console.error("Error loading categories: ", error);
        categoryNavDesktop.innerHTML = '<p class="loading-placeholder">Error loading categories.</p>';
        categoryNavMobile.innerHTML = '<p class="loading-placeholder">Error loading categories.</p>';
    }
}

/**
 * 2. കാറ്റഗറി ലിങ്കുകൾക്ക് ക്ലിക്ക് ഇവന്റുകൾ ചേർക്കുന്നു
 */
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

/**
 * 3. പുതിയ കാറ്റഗറി തിരഞ്ഞെടുക്കുമ്പോൾ ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യാൻ തുടങ്ങുന്നു
 * *** തലക്കെട്ട് (h1) അപ്ഡേറ്റ് ചെയ്യുന്നത് നീക്കം ചെയ്തു ***
 */
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
        // pageTitle.textContent = "All Products"; // *** ഈ വരി നീക്കം ചെയ്തു ***
        currentQuery = query(productsRef, orderBy("name"));
    } else {
        try {
            // const catDoc = await getDoc(doc(db, "categories", categoryId));
            // if (catDoc.exists()) {
                // pageTitle.textContent = catDoc.data().name; // *** ഈ വരി നീക്കം ചെയ്തു ***
            // }
            currentQuery = query(productsRef, 
                where("categoryId", "==", categoryId)
            );
        } catch (e) { console.error("Error fetching category name", e); }
    }
    
    updateActiveCategoryUI(categoryId);
    await loadProducts();
}

/**
 * 4. ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു (ഇൻഫിനിറ്റ് സ്ക്രോൾ)
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
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            let priceHTML = `<span class="price-main">₹${price}</span>`;
            if (mrp > price) {
                const discount = Math.round(((mrp - price) / mrp) * 100);
                priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
                priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
            }

            card.innerHTML = `
                <a href="product.html?id=${productId}" class="cat-product-image-link">
                    <img src="${imageUrl}" alt="${product.name}" class="cat-product-image" onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="cat-product-content">
                    <h3 class="cat-product-title">${product.name}</h3>
                    
                    <div class="price-container">
                        ${priceHTML}
                    </div>

                    <div class="cat-product-buttons">
                        <button class="btn btn-secondary-new btn-add-to-cart"
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
                            <span>Cart</span>
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

/**
 * 5. ആക്ടീവ് കാറ്റഗറി ലിങ്ക് ഹൈലൈറ്റ് ചെയ്യുന്നു
 */
function updateActiveCategoryUI(categoryId) {
    const allLinks = document.querySelectorAll('.category-grid-item'); 
    allLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.id === categoryId) {
            link.classList.add('active');
        }
    });
}

/**
 * 6. "Add to Cart" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
 */
productGrid.addEventListener('click', (e) => {
    const cartButton = e.target.closest('.btn-add-to-cart');

    if (cartButton) {
        e.preventDefault();
        const id = cartButton.dataset.id;
        const product = {
            id: id, 
            name: cartButton.dataset.name,
            price: parseFloat(cartButton.dataset.price),
            mrp: parseFloat(cartButton.dataset.mrp),
            image: cartButton.dataset.image,
            size: cartButton.dataset.size 
        };

        addToCart(id, product);

        cartButton.innerHTML = 'Added!';
        cartButton.disabled = true;
        setTimeout(() => {
            cartButton.innerHTML = `
                <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span>Cart</span>
            `;
            cartButton.disabled = false;
        }, 2000);
    }
});

/**
 * 7. ഇൻഫിനിറ്റ് സ്ക്രോൾ നിരീക്ഷകൻ (Observer)
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