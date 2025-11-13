// **** ഫയർബേസ് ഫംഗ്ഷനുകൾ ഇമ്പോർട്ട് ചെയ്യുന്നു (ഇതായിരുന്നു വിട്ടുപോയത്) ****
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
import { loadSiteSettings } from './common.js';

setLogLevel('Debug');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (ലോഗോ, ഫൂട്ടർ)
    loadProducts();     // ഈ പേജിലെ ഉൽപ്പന്നങ്ങൾ
});

/**
 * കാറ്റഗറി അനുസരിച്ച് ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadProducts() {
    const productGrid = document.getElementById("product-grid");
    const pageTitle = document.getElementById("page-title");
    if (!productGrid || !pageTitle) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('filter');
        let productsQuery;
        
        if (categoryId) {
            try {
                // കാറ്റഗറിയുടെ പേര് എടുത്ത് തലക്കെട്ടിൽ വെക്കുന്നു
                const catDoc = await getDoc(doc(db, "categories", categoryId));
                if (catDoc.exists()) {
                    pageTitle.textContent = catDoc.data().name;
                } else {
                    pageTitle.textContent = "Category Not Found";
                }
            } catch (err) {
                pageTitle.textContent = "Products";
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

            // വിലയും ഡിസ്കൗണ്ടും കണക്കാക്കുന്നു
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            let priceHTML = `<span class="price-main">₹${price}</span>`;
            
            if (mrp > price) {
                const discount = Math.round(((mrp - price) / mrp) * 100);
                priceHTML += `<span class="price-mrp"><del>₹${mrp}</del></span>`;
                priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
            }

            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image'}" 
                         alt="${product.name}" 
                         class="product-card-image"
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="product-card-content">
                    <h3 class="product-card-title">${product.name}</h3>
                    <div class="price-container">
                        ${priceHTML}
                    </div>
                    <a href="product.html?id=${productId}" class="btn btn-card">View Details</a>
                </div>
            `;
            productGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products. Check console for details.</p>';
    }
}