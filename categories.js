// ഇതാണ് 'categories.js' ഫയൽ.
// *** "ഇൻഫിനിറ്റ് സ്ക്രോൾ" (Infinite Scroll) നടപ്പിലാക്കി ***

import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter, // പുതിയതായി ലോഡ് ചെയ്യാൻ
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ ഇമ്പോർട്ട് ചെയ്യുന്നു

setLogLevel('Debug');

const productGrid = document.getElementById("product-grid");
const pageTitle = document.getElementById("page-title");
const loader = document.getElementById("infinite-scroll-loader");
const noMoreProductsMessage = document.getElementById("no-more-products");

const PRODUCTS_PER_PAGE = 12; // ഒരു സമയം 12 ഉൽപ്പന്നങ്ങൾ
let lastVisible = null; // അവസാനമായി ലോഡ് ചെയ്ത ഉൽപ്പന്നം
let isLoading = false; // ഇപ്പോൾ ലോഡ് ചെയ്തുകൊണ്ടിരിക്കുകയാണോ?
let noMoreProducts = false; // കൂടുതൽ ഉൽപ്പന്നങ്ങൾ ഇല്ലേ?
let baseQuery = null; // ഏത് കാറ്റഗറിയാണ് ലോഡ് ചെയ്യുന്നത്?

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (പുതിയ ഹെഡർ, ഫൂട്ടർ, മെനു)
    setupInfiniteScroll(); // സ്ക്രോൾ നിരീക്ഷിക്കാൻ
    loadCategoryInfo(); // ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യാൻ തുടങ്ങുന്നു
});

/**
 * 1. കാറ്റഗറി വിവരങ്ങൾ എടുക്കുകയും ആദ്യ ബാച്ച് ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുകയും ചെയ്യുന്നു
 */
async function loadCategoryInfo() {
    if (!productGrid || !pageTitle) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('filter');
        
        if (categoryId) {
            // കാറ്റഗറിയുടെ പേര് എടുത്ത് തലക്കെട്ടിൽ വെക്കുന്നു
            const catDoc = await getDoc(doc(db, "categories", categoryId));
            if (catDoc.exists()) {
                pageTitle.textContent = catDoc.data().name;
            } else {
                pageTitle.textContent = "Category Not Found";
            }
            // ആ കാറ്റഗറിയിലുള്ള ഉൽപ്പന്നങ്ങൾ മാത്രം എടുക്കുന്നു
            baseQuery = query(
                collection(db, "products"),
                where("categoryId", "==", categoryId),
                orderBy("name") // പേര് അനുസരിച്ച് അടുക്കുന്നു
            );
        } else {
            // കാറ്റഗറി ഇല്ലെങ്കിൽ, എല്ലാ ഉൽപ്പന്നങ്ങളും എടുക്കുന്നു
            pageTitle.textContent = "All Products";
            baseQuery = query(
                collection(db, "products"),
                orderBy("name") // പേര് അനുസരിച്ച് അടുക്കുന്നു
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
 * 2. അടുത്ത ബാച്ച് ഉൽപ്പന്നങ്ങൾ ഫയർബേസിൽ നിന്ന് എടുക്കുന്നു
 */
async function fetchMoreProducts() {
    // ലോഡ് ചെയ്യുകയാണെങ്കിലോ, എല്ലാ ഉൽപ്പന്നങ്ങളും തീർന്നാലോ, നിർത്തുന്നു
    if (isLoading || noMoreProducts || !baseQuery) return;

    isLoading = true;
    loader.classList.add('active'); // ലോഡിംഗ് സ്പിന്നർ കാണിക്കുന്നു

    try {
        let productsQuery = baseQuery;

        // അടുത്ത പേജ് ആണെങ്കിൽ, എവിടെ നിർത്തിയോ അവിടെ നിന്ന് തുടങ്ങുന്നു
        if (lastVisible) {
            productsQuery = query(baseQuery, startAfter(lastVisible), limit(PRODUCTS_PER_PAGE));
        } else {
            productsQuery = query(baseQuery, limit(PRODUCTS_PER_PAGE));
        }

        const querySnapshot = await getDocs(productsQuery);
        
        // "Loading..." എന്ന മെസ്സേജ് മാറ്റുന്നു
        const initialLoader = document.querySelector('.loading-placeholder-full');
        if (initialLoader) {
            initialLoader.remove();
        }

        if (querySnapshot.empty) {
            // ഉൽപ്പന്നങ്ങൾ തീർന്നു
            noMoreProducts = true;
            noMoreProductsMessage.style.display = 'block';
            
            // ആദ്യമേ ഉൽപ്പന്നങ്ങൾ ഇല്ലെങ്കിൽ
            if (!lastVisible) {
                 productGrid.innerHTML = '<p class="loading-placeholder">No products found in this category.</p>';
            }
        } else {
            // അവസാനത്തെ ഡോക്യുമെന്റ് ഏതെന്ന് സേവ് ചെയ്യുന്നു
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            
            // ഉൽപ്പന്നങ്ങൾ പേജിൽ കാണിക്കുന്നു
            querySnapshot.forEach((doc) => {
                renderProductCard(doc.data(), doc.id);
            });
        }
    } catch (error) {
        console.error("Error loading more products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products. Check console.</p>';
    } finally {
        isLoading = false;
        loader.classList.remove('active'); // ലോഡിംഗ് സ്പിന്നർ മറയ്ക്കുന്നു
    }
}

/**
 * 3. ഒരു ഉൽപ്പന്നത്തിന്റെ കാർഡ് HTML ആക്കി പേജിൽ ചേർക്കുന്നു
 */
function renderProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // വിലയും ഡിസ്കൗണ്ടും
    const price = product.price || 0;
    const mrp = product.mrp || 0;
    let priceHTML = `<span class="price-main">₹${price}</span>`;
    if (mrp > price) {
        const discount = Math.round(((mrp - price) / mrp) * 100);
        priceHTML += `<span class="price-mrp"><del>₹${mrp}</del></span>`;
        priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
    }

    const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

    // ഐക്കൺ ശരിയാക്കി
    card.innerHTML = `
        <a href="product.html?id=${productId}" class="product-card-image-link">
            <img src="${imageUrl}" 
                 alt="${product.name}" 
                 class="product-card-image"
                 onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
        </a>
        <div class="product-card-content">
            <h3 class="product-card-title">${product.name}</h3>
            <div class="price-container">
                ${priceHTML}
            </div>
            <div class="product-card-buttons">
                <button class="btn btn-secondary btn-add-to-cart"
                    data-id="${productId}"
                    data-name="${product.name}"
                    data-price="${price}"
                    data-mrp="${mrp}"
                    data-image="${imageUrl}">
                    <svg class="icon-cart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    Add to Cart
                </button>
                <a href="product.html?id=${productId}" class="btn btn-primary">View Product</a>
            </div>
        </div>
    `;
    productGrid.appendChild(card);
}

/**
 * 4. ഇൻഫിനിറ്റ് സ്ക്രോൾ നിരീക്ഷകൻ (Observer) സെറ്റ് ചെയ്യുന്നു
 */
function setupInfiniteScroll() {
    const options = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.5 // 50% കാണുമ്പോൾ
    };

    const observer = new IntersectionObserver((entries) => {
        // ലോഡർ സ്ക്രീനിൽ കാണുന്നുണ്ടെങ്കിൽ
        if (entries[0].isIntersecting) {
            fetchMoreProducts(); // അടുത്ത ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുക
        }
    }, options);

    // ലോഡറിനെ നിരീക്ഷിക്കാൻ തുടങ്ങുന്നു
    if (loader) {
        observer.observe(loader);
    }
}


/**
 * 5. "Add to Cart" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
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