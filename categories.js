// ഇതാണ് 'categories.js' ഫയൽ.
// *** പുതിയ ലേഔട്ട് (സൈഡ്ബാർ, 2-കോളം ഗ്രിഡ്, ഇൻഫിനിറ്റ് സ്ക്രോൾ) അനുസരിച്ച് പൂർണ്ണമായും അപ്ഡേറ്റ് ചെയ്തു ***

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    startAfter,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ

setLogLevel('Debug');

// --- DOM Elements ---
const pageTitle = document.getElementById("page-title");
const productGrid = document.getElementById("category-product-grid");
const categoryNavDesktop = document.getElementById("category-nav-desktop");
const categoryNavMobile = document.getElementById("category-nav-mobile");
const loader = document.getElementById("infinite-scroll-loader");

// --- Pagination State ---
let lastVisible = null; // അവസാനമായി ലോഡ് ചെയ്ത ഡോക്യുമെന്റ്
let isLoading = false; // ഡാറ്റ ലോഡ് ചെയ്യുകയാണോ എന്ന് അറിയാൻ
let currentCategoryId = 'all'; // നിലവിൽ തിരഞ്ഞെടുത്ത കാറ്റഗറി
const productsPerPage = 12; // ഒരു സമയം 12 ഉൽപ്പന്നങ്ങൾ

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // 1. പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ)
    loadCategoryList(); // 2. കാറ്റഗറി ലിസ്റ്റ് (സൈഡ്ബാർ)
    
    // 3. URL-ൽ നിന്ന് കാറ്റഗറി ഉണ്ടോ എന്ന് നോക്കുന്നു
    const urlParams = new URLSearchParams(window.location.search);
    const categoryIdFromUrl = urlParams.get('filter');
    
    if (categoryIdFromUrl) {
        currentCategoryId = categoryIdFromUrl;
    }
    
    startLoadingProducts(currentCategoryId); // 4. ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
});

/**
 * 1. കാറ്റഗറി ലിസ്റ്റ് (സൈഡ്ബാറിലും മൊബൈൽ ബാറിലും) ലോഡ് ചെയ്യുന്നു
 */
async function loadCategoryList() {
    if (!categoryNavDesktop || !categoryNavMobile) return;

    try {
        const q = query(collection(db, "categories"));
        const catSnapshot = await getDocs(q);

        let navHtml = '';
        
        // "All Products" ലിങ്ക്
        navHtml += `
            <a href="#" class="category-nav-link" data-id="all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l-5.5 9h11L12 2zm0 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 8h12v-2H6v2z"/></svg>
                <span>All Products</span>
            </a>
        `;
        
        // മറ്റ് കാറ്റഗറികൾ
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            navHtml += `
                <a href="#" class="category-nav-link" data-id="${doc.id}">
                    <img src="${category.imageUrl || 'https://placehold.co/40x40/333/D4AF37?text=C'}" alt="${category.name}" class="category-nav-icon">
                    <span>${category.name}</span>
                </a>
            `;
        });

        // രണ്ട് മെനുവിലും HTML ചേർക്കുന്നു
        categoryNavDesktop.innerHTML = navHtml;
        categoryNavMobile.innerHTML = navHtml;

        // രണ്ട് മെനുവിലും ക്ലിക്ക് ഇവന്റുകൾ ചേർക്കുന്നു
        addNavClickListeners(categoryNavDesktop);
        addNavClickListeners(categoryNavMobile);
        
        // നിലവിലെ കാറ്റഗറി ഹൈലൈറ്റ് ചെയ്യുന്നു
        updateActiveCategoryUI(currentCategoryId);

    } catch (error) {
        console.error("Error loading categories: ", error);
        categoryNavDesktop.innerHTML = '<p class="loading-placeholder">Error loading categories.</p>';
    }
}

/**
 * 2. കാറ്റഗറി ലിങ്കുകൾക്ക് ക്ലിക്ക് ഇവന്റുകൾ ചേർക്കുന്നു
 */
function addNavClickListeners(navElement) {
    navElement.addEventListener('click', (e) => {
        const link = e.target.closest('.category-nav-link');
        if (!link) return;
        
        e.preventDefault();
        const categoryId = link.dataset.id;
        
        if (categoryId === currentCategoryId) return; // ഒരേ കാറ്റഗറി വീണ്ടും ക്ലിക്ക് ചെയ്താൽ ഒന്നും ചെയ്യേണ്ട

        currentCategoryId = categoryId;
        startLoadingProducts(categoryId);
    });
}

/**
 * 3. പുതിയ കാറ്റഗറി തിരഞ്ഞെടുക്കുമ്പോൾ ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യാൻ തുടങ്ങുന്നു
 */
async function startLoadingProducts(categoryId) {
    isLoading = true;
    productGrid.innerHTML = ''; // പഴയ ഉൽപ്പന്നങ്ങൾ നീക്കം ചെയ്യുന്നു
    lastVisible = null; // പേജിനേഷൻ റീസെറ്റ് ചെയ്യുന്നു
    window.scrollTo(0, 0); // പേജ് മുകളിലേക്ക് സ്ക്രോൾ ചെയ്യുന്നു
    
    // URL അപ്ഡേറ്റ് ചെയ്യുന്നു
    const url = new URL(window.location);
    if (categoryId === 'all') {
        url.searchParams.delete('filter');
    } else {
        url.searchParams.set('filter', categoryId);
    }
    window.history.pushState({}, '', url);

    // തലക്കെട്ട് മാറ്റുന്നു
    if (categoryId === 'all') {
        pageTitle.textContent = "All Products";
    } else {
        try {
            const catDoc = await getDoc(doc(db, "categories", categoryId));
            if (catDoc.exists()) {
                pageTitle.textContent = catDoc.data().name;
            }
        } catch (e) { console.error("Error fetching category name", e); }
    }
    
    // ആക്ടീവ് കാറ്റഗറി ഹൈലൈറ്റ് ചെയ്യുന്നു
    updateActiveCategoryUI(categoryId);
    
    // ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
    await loadProducts();
    isLoading = false;
}

/**
 * 4. ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു (ഇൻഫിനിറ്റ് സ്ക്രോൾ)
 */
async function loadProducts() {
    if (isLoading) return;
    isLoading = true;
    loader.style.display = 'flex';

    try {
        let q;
        const productsRef = collection(db, "products");
        
        // ഫയർബേസ് ക്വറി നിർമ്മിക്കുന്നു
        if (currentCategoryId === 'all') {
            q = query(productsRef, limit(productsPerPage));
        } else {
            // *** പ്രശ്നം പരിഹരിച്ചു: കാറ്റഗറി ഫിൽട്ടർ ചെയ്യുമ്പോൾ orderBy("name") നീക്കം ചെയ്തു ***
            q = query(productsRef, 
                where("categoryId", "==", currentCategoryId), 
                limit(productsPerPage)
            );
        }

        // അടുത്ത പേജ് ലോഡ് ചെയ്യാനായി
        if (lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const documentSnapshots = await getDocs(q);

        if (documentSnapshots.empty) {
            if (productGrid.innerHTML === '') {
                productGrid.innerHTML = '<p class="loading-placeholder-full">No products found in this category.</p>';
            }
            loader.style.display = 'none';
            return; // നിർത്തുന്നു
        }

        // അവസാനത്തെ ഡോക്യുമെന്റ് സേവ് ചെയ്യുന്നു
        lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // ഓരോ ഉൽപ്പന്നവും കാർഡായി കാണിക്കുന്നു
        documentSnapshots.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'category-product-card'; // പുതിയ സ്റ്റൈൽ

            const price = product.price || 0;
            const mrp = product.mrp || 0;
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            // നിങ്ങൾ ആവശ്യപ്പെട്ട പുതിയ കാർഡ് ഡിസൈൻ (ഐക്കണുകളോടെ)
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
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
                            <span>Add to Cart</span>
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-icon">
                            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5S10.62 14.5 12 14.5s2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"></path></svg>
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
        loader.style.display = 'none';
    }
}

/**
 * 5. ആക്ടീവ് കാറ്റഗറി ലിങ്ക് ഹൈലൈറ്റ് ചെയ്യുന്നു
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
            <svg class="icon-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01L18 4l-3.25 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.44l.25.13z"></path></svg>
            <span>Add to Cart</span>
        `;
        button.disabled = false;
    }, 2000);
});

/**
 * 7. ഇൻഫിനിറ്റ് സ്ക്രോൾ നിരീക്ഷകൻ (Observer)
 */
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && lastVisible) {
        loadProducts();
    }
}, {
    rootMargin: '200px' // പേജ് തീരുന്നതിന് 200px മുമ്പ് ലോഡ് ചെയ്യുന്നു
});

observer.observe(loader);