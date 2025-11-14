// ഇതാണ് 'categories.js' ഫയൽ.
// *** "ഇൻഫിനിറ്റ് സ്ക്രോൾ" + പുതിയ സൈഡ്ബാർ ലേഔട്ട് ***

import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter, 
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; 
import { addToCart } from './cart.js'; 

setLogLevel('Debug');

const productGrid = document.getElementById("product-grid");
const pageTitle = document.getElementById("page-title");
const categorySidebar = document.getElementById("category-sidebar-nav");
const loader = document.getElementById("infinite-scroll-loader");
const noMoreProductsMessage = document.getElementById("no-more-products");

const PRODUCTS_PER_PAGE = 12; 
let lastVisible = null; 
let isLoading = false; 
let noMoreProducts = false; 
let baseQuery = null; 
let currentCategoryId = null;

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ
    loadAllCategoriesSidebar(); // 1. സൈഡ്ബാർ ലോഡ് ചെയ്യുന്നു
    setupInfiniteScroll(); // 2. സ്ക്രോൾ നിരീക്ഷിക്കുന്നു
    loadCategoryInfo(); // 3. ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യാൻ തുടങ്ങുന്നു
});

/**
 * 1. എല്ലാ കാറ്റഗറികളും സൈഡ്ബാറിൽ ലോഡ് ചെയ്യുന്നു
 */
async function loadAllCategoriesSidebar() {
    if (!categorySidebar) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        currentCategoryId = urlParams.get('filter'); // നിലവിലെ കാറ്റഗറി ID

        const catQuery = query(collection(db, "categories"), orderBy("name"));
        const catSnapshot = await getDocs(catQuery);

        let sidebarHtml = '<ul class="category-sidebar-list">';
        
        // "All Products" ലിങ്ക്
        sidebarHtml += `
            <li>
                <a href="categories.html" class="category-sidebar-link ${!currentCategoryId ? 'active' : ''}">
                    <!-- "All" ഐക്കൺ -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    <span>All Products</span>
                </a>
            </li>
        `;

        // മറ്റ് കാറ്റഗറികൾ
        catSnapshot.forEach(doc => {
            const category = doc.data();
            const isActive = doc.id === currentCategoryId;
            const imageUrl = category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C';
            
            sidebarHtml += `
                <li>
                    <a href="categories.html?filter=${doc.id}" class="category-sidebar-link ${isActive ? 'active' : ''}">
                        <img src="${imageUrl}" alt="${category.name}" class="category-sidebar-icon">
                        <span>${category.name}</span>
                    </a>
                </li>
            `;
        });

        sidebarHtml += '</ul>';
        categorySidebar.innerHTML = sidebarHtml;

    } catch (error) {
        console.error("Error loading categories sidebar: ", error);
        categorySidebar.innerHTML = '<p>Error loading categories.</p>';
    }
}

/**
 * 2. കാറ്റഗറി വിവരങ്ങൾ എടുക്കുകയും ആദ്യ ബാച്ച് ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുകയും ചെയ്യുന്നു
 */
async function loadCategoryInfo() {
    if (!productGrid || !pageTitle) return;

    try {
        if (currentCategoryId) {
            // കാറ്റഗറിയുടെ പേര് എടുത്ത് തലക്കെട്ടിൽ വെക്കുന്നു
            const catDoc = await getDoc(doc(db, "categories", currentCategoryId));
            if (catDoc.exists()) {
                pageTitle.textContent = catDoc.data().name;
            } else {
                pageTitle.textContent = "Category Not Found";
            }
            // ആ കാറ്റഗറിയിലുള്ള ഉൽപ്പന്നങ്ങൾ മാത്രം എടുക്കുന്നു
            baseQuery = query(
                collection(db, "products"),
                where("categoryId", "==", currentCategoryId),
                orderBy("name") 
            );
        } else {
            // കാറ്റഗറി ഇല്ലെങ്കിൽ, എല്ലാ ഉൽപ്പന്നങ്ങളും എടുക്കുന്നു
            pageTitle.textContent = "All Products";
            baseQuery = query(
                collection(db, "products"),
                orderBy("name") 
            );
        }

        // ആദ്യത്തെ ബാച്ച് ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
        fetchMoreProducts();

    } catch (error) {
        console.error("Error setting up category query: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading data.</p>';
    }
}

/**
 * 3. അടുത്ത ബാച്ച് ഉൽപ്പന്നങ്ങൾ ഫയർബേസിൽ നിന്ന് എടുക്കുന്നു
 */
async function fetchMoreProducts() {
    if (isLoading || noMoreProducts || !baseQuery) return;

    isLoading = true;
    loader.classList.add('active'); 

    try {
        let productsQuery = baseQuery;

        if (lastVisible) {
            productsQuery = query(baseQuery, startAfter(lastVisible), limit(PRODUCTS_PER_PAGE));
        } else {
            productsQuery = query(baseQuery, limit(PRODUCTS_PER_PAGE));
        }

        const querySnapshot = await getDocs(productsQuery);
        
        const initialLoader = productGrid.querySelector('.loading-placeholder-full');
        if (initialLoader) {
            initialLoader.remove();
        }

        if (querySnapshot.empty) {
            noMoreProducts = true;
            noMoreProductsMessage.style.display = 'block';
            if (!lastVisible) {
                 productGrid.innerHTML = '<p class="loading-placeholder">No products found in this category.</p>';
            }
        } else {
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            querySnapshot.forEach((doc) => {
                renderProductCard(doc.data(), doc.id); // പുതിയ കാർഡ് ഡിസൈൻ
            });
        }
    } catch (error) {
        console.error("Error loading more products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products. Check console.</p>';
    } finally {
        isLoading = false;
        loader.classList.remove('active'); 
    }
}

/**
 * 4. ഒരു ഉൽപ്പന്നത്തിന്റെ പുതിയ കാർഡ് HTML ആക്കി പേജിൽ ചേർക്കുന്നു
 */
function renderProductCard(product, productId) {
    const card = document.createElement('div');
    // *** പുതിയ കാർഡ് സ്റ്റൈൽ ***
    card.className = 'product-card-simple'; 

    const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

    // *** പുതിയ HTML ഘടന (ഐക്കണുകൾ സഹിതം) ***
    card.innerHTML = `
        <a href="product.html?id=${productId}" class="product-card-simple-image-link">
            <img src="${imageUrl}" 
                 alt="${product.name}" 
                 class="product-card-simple-image"
                 onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
        </a>
        <h3 class="product-card-simple-title">${product.name}</h3>
        <div class="product-card-simple-buttons">
            <button class="btn btn-secondary btn-add-to-cart"
                data-id="${productId}"
                data-name="${product.name}"
                data-price="${product.price || 0}"
                data-mrp="${product.mrp || 0}"
                data-image="${imageUrl}">
                <!-- Add to Cart ഐക്കൺ -->
                <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Add to Cart
            </button>
            <a href="product.html?id=${productId}" class="btn btn-primary">
                <!-- View Product ഐക്കൺ -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                View Product
            </a>
        </div>
    `;
    productGrid.appendChild(card);
}

/**
 * 5. ഇൻഫിനിറ്റ് സ്ക്രോൾ നിരീക്ഷകൻ (Observer) സെറ്റ് ചെയ്യുന്നു
 */
function setupInfiniteScroll() {
    const options = {
        root: null, 
        rootMargin: '0px',
        threshold: 0.5 
    };

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            fetchMoreProducts(); 
        }
    }, options);

    if (loader) {
        observer.observe(loader);
    }
}


/**
 * 6. "Add to Cart" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
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

    button.innerHTML = 'Added!';
    button.disabled = true;
    setTimeout(() => {
        button.innerHTML = `
            <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Add to Cart
        `;
        button.disabled = false;
    }, 2000);
});