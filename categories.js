// ഇതാണ് 'categories.js' ഫയൽ.
// കാറ്റഗറി പേജിന് (categories.html) മാത്രം വേണ്ടിയുള്ള കാര്യങ്ങൾ ഈ ഫയൽ ചെയ്യുന്നു.
// (ഉൽപ്പന്നങ്ങൾ ഫിൽട്ടർ ചെയ്ത് കാണിക്കുക, "Add to Cart" ബട്ടൺ പ്രവർത്തിപ്പിക്കുക)

import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ ഇമ്പോർട്ട് ചെയ്യുന്നു

setLogLevel('Debug');

const productGrid = document.getElementById("product-grid");

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (പുതിയ ഹെഡർ, ഫൂട്ടർ, മെനു)
    loadProducts();     // ഈ പേജിലെ ഉൽപ്പന്നങ്ങൾ
});

/**
 * കാറ്റഗറി അനുസരിച്ച് ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadProducts() {
    const pageTitle = document.getElementById("page-title");
    if (!productGrid || !pageTitle) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('filter');
        let productsQuery;
        
        if (categoryId) {
            // കാറ്റഗറിയുടെ പേര് എടുത്ത് തലക്കെട്ടിൽ വെക്കുന്നു
            const catDoc = await getDoc(doc(db, "categories", categoryId));
            if (catDoc.exists()) {
                pageTitle.textContent = catDoc.data().name;
            } else {
                pageTitle.textContent = "Category Not Found";
            }
            // ആ കാറ്റഗറിയിലുള്ള ഉൽപ്പന്നങ്ങൾ മാത്രം എടുക്കുന്നു
            productsQuery = query(
                collection(db, "products"),
                where("categoryId", "==", categoryId)
            );
        } else {
            // കാറ്റഗറി ഇല്ലെങ്കിൽ, എല്ലാ ഉൽപ്പന്നങ്ങളും എടുക്കുന്നു
            productsQuery = query(collection(db, "products"));
            pageTitle.textContent = "All Products";
        }

        const querySnapshot = await getDocs(productsQuery);
        
        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p class="loading-placeholder">No products found in this category.</p>';
            return;
        }

        productGrid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
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

            // പുതിയ ഡിസൈൻ അനുസരിച്ചുള്ള കാർഡ്
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
        });
    } catch (error) {
        console.error("Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products. Check console for details.</p>';
    }
}

// "Add to Cart" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
productGrid.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-add-to-cart');
    if (!button) return;

    e.preventDefault(); // ലിങ്ക് ആണെങ്കിൽ തടയുന്നു

    const id = button.dataset.id;
    const product = {
        name: button.dataset.name,
        price: parseFloat(button.dataset.price),
        mrp: parseFloat(button.dataset.mrp),
        image: button.dataset.image
    };

    // കാർട്ടിലേക്ക് ചേർക്കുന്നു
    addToCart(id, product);

    // ഉപഭോക്താവിനെ അറിയിക്കുന്നു
    button.innerHTML = 'Added!';
    button.disabled = true;
    setTimeout(() => {
        // SVG കോഡ് നീണ്ടതായതുകൊണ്ട് ഇവിടെ പൂർണ്ണമായി ചേർക്കുന്നില്ല, ടെക്സ്റ്റ് മാത്രം മാറ്റുന്നു.
        button.innerHTML = `Add to Cart`; 
        button.disabled = false;
    }, 2000);
});