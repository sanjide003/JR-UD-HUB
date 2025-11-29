// ഇതാണ് categories.js - Modern Category Page with 10 Skeleton Cards

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where,
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js';
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

const productsGrid = document.getElementById('products-grid');
const categoryFilterScroll = document.getElementById('category-filter-scroll');

let allProducts = [];
let allCategories = [];
let currentFilter = 'all';

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();
    
    // URL ൽ നിന്ന് ഫിൽട്ടർ എടുക്കുക
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
        currentFilter = filterParam;
    }
    
    showSkeletonCards(); // ആദ്യം 10 സ്കെലിറ്റണുകൾ കാണിക്കുക
    await loadCategories();
    await loadProducts();
});

/**
 * 10 Skeleton Cards കാണിക്കുക
 */
function showSkeletonCards() {
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'product-card skeleton-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-image skeleton-shimmer"></div>
            <div class="product-card-content">
                <div class="skeleton-title skeleton-shimmer"></div>
                <div class="skeleton-price skeleton-shimmer"></div>
                <div class="skeleton-buttons">
                    <div class="skeleton-button skeleton-shimmer"></div>
                    <div class="skeleton-button skeleton-shimmer"></div>
                </div>
            </div>
        `;
        productsGrid.appendChild(skeletonCard);
    }
}

/**
 * കാറ്റഗറികൾ ലോഡ് ചെയ്യുക
 */
async function loadCategories() {
    if (!categoryFilterScroll) return;
    
    try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        
        allCategories = [];
        categoriesSnapshot.forEach((doc) => {
            allCategories.push({
                id: doc.id,
                name: doc.data().name
            });
        });
        
        renderCategoryFilters();
        
    } catch (error) {
        console.error("Error loading categories: ", error);
    }
}

/**
 * കാറ്റഗറി ഫിൽട്ടർ ബട്ടണുകൾ റെണ്ടർ ചെയ്യുക
 */
function renderCategoryFilters() {
    if (!categoryFilterScroll) return;
    
    categoryFilterScroll.innerHTML = '';
    
    // "All Products" ബട്ടൺ
    const allBtn = document.createElement('button');
    allBtn.className = `category-filter-btn ${currentFilter === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'All Products';
    allBtn.dataset.filter = 'all';
    categoryFilterScroll.appendChild(allBtn);
    
    // മറ്റ് കാറ്റഗറികൾ
    allCategories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = `category-filter-btn ${currentFilter === category.id ? 'active' : ''}`;
        btn.textContent = category.name;
        btn.dataset.filter = category.id;
        categoryFilterScroll.appendChild(btn);
    });
    
    // Click Event
    categoryFilterScroll.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-filter-btn')) {
            const filter = e.target.dataset.filter;
            currentFilter = filter;
            
            // URL അപ്ഡേറ്റ് ചെയ്യുക
            const newUrl = filter === 'all' 
                ? 'categories.html' 
                : `categories.html?filter=${filter}`;
            window.history.pushState({}, '', newUrl);
            
            // Active ക്ലാസ് മാറ്റുക
            document.querySelectorAll('.category-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Products ഫിൽട്ടർ ചെയ്യുക
            renderProducts();
        }
    });
}

/**
 * പ്രൊഡക്ടുകൾ ലോഡ് ചെയ്യുക
 */
async function loadProducts() {
    if (!productsGrid) return;
    
    try {
        const productsQuery = query(collection(db, "products"), orderBy("name"));
        const productsSnapshot = await getDocs(productsQuery);
        
        allProducts = [];
        productsSnapshot.forEach((doc) => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderProducts();
        
    } catch (error) {
        console.error("Error loading products: ", error);
        productsGrid.innerHTML = '<p class="error-message">Error loading products.</p>';
    }
}

/**
 * പ്രൊഡക്ടുകൾ റെണ്ടർ ചെയ്യുക
 */
function renderProducts() {
    if (!productsGrid) return;
    
    // ഫിൽട്ടർ ചെയ്ത പ്രൊഡക്ടുകൾ
    let filteredProducts = allProducts;
    if (currentFilter !== 'all') {
        filteredProducts = allProducts.filter(p => p.categoryId === currentFilter);
    }
    
    // എംപ്റ്റി സ്റ്റേറ്റ്
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h2>No Products Found</h2>
                <p>There are no products in this category yet.</p>
                <a href="categories.html" class="btn btn-primary-new">View All Products</a>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
    
    // *** 10-ൽ കുറവാണെങ്കിൽ ബാക്കി Skeleton Cards ചേർക്കുക ***
    const currentCount = filteredProducts.length;
    if (currentCount < 10) {
        const skeletonsNeeded = 10 - currentCount;
        for (let i = 0; i < skeletonsNeeded; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'product-card skeleton-card';
            skeletonCard.innerHTML = `
                <div class="skeleton-image skeleton-shimmer"></div>
                <div class="product-card-content">
                    <div class="skeleton-title skeleton-shimmer"></div>
                    <div class="skeleton-price skeleton-shimmer"></div>
                    <div class="skeleton-buttons">
                        <div class="skeleton-button skeleton-shimmer"></div>
                        <div class="skeleton-button skeleton-shimmer"></div>
                    </div>
                </div>
            `;
            productsGrid.appendChild(skeletonCard);
        }
    }
}

/**
 * പ്രൊഡക്ട് കാർഡ് സൃഷ്ടിക്കുക
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    
    const rawImage = product.images && product.images[0] 
        ? product.images[0] 
        : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';
    const imageUrl = optimizeImage(rawImage, 400, 80);
    
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        const discount = Math.round(((mrp - price) / mrp) * 100);
        priceHTML += `<span class="price-mrp product-mrp-red"><del>₹${mrp}</del></span>`;
        priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
    }
    
    const isInCart = isItemInCart(product.id);
    const buttonText = isInCart ? "Remove" : "Cart";
    const buttonClass = isInCart ? "btn-secondary-new added-to-cart" : "btn-secondary-new";
    
    card.innerHTML = `
        <a href="product.html?id=${product.id}" class="product-card-image-link">
            <img src="${imageUrl}" 
                 alt="${product.name}" 
                 class="product-card-image" 
                 loading="lazy"
                 onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
        </a>
        <div class="product-card-content">
            <h3 class="product-card-title">${product.name}</h3>
            <div class="price-container">
                ${priceHTML}
            </div>
            <div class="product-card-buttons">
                <button class="btn ${buttonClass} btn-add-to-cart"
                    data-id="${product.id}"
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
                <a href="product.html?id=${product.id}" class="btn btn-primary-new">
                    <span>View</span>
                </a>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * കാർട്ട് ബട്ടൺ ക്ലിക്ക് ഹാൻഡ്ലർ
 */
productsGrid.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (!button) return;
    
    e.preventDefault();
    
    const id = button.dataset.id;
    const buttonText = button.querySelector('span');
    
    createRipple(e, button);
    
    if (button.classList.contains('added-to-cart')) {
        removeFromCart(id);
        button.classList.remove('added-to-cart');
        if (buttonText) buttonText.textContent = 'Cart';
    } else {
        const product = {
            id: id,
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image,
            size: button.dataset.size
        };
        addToCart(id, product);
        button.classList.add('added-to-cart');
        if (buttonText) buttonText.textContent = 'Remove';
        showToast('Added to cart!');
    }
});

/**
 * റിപ്പിൾ ഇഫക്റ്റ്
 */
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

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to { transform: scale(2); opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * ടോസ്റ്റ് നോട്ടിഫിക്കേഷൻ
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; 
        transform: translateX(-50%) translateY(100px);
        background: var(--primary-gold); color: var(--bg-color);
        padding: 12px 24px; border-radius: 8px; font-weight: 600;
        z-index: 10000; opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}