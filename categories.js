// ഈ ഫയലിൽ categories.html പേജിന് മാത്രം വേണ്ട കോഡുകൾ

// ഫയർബേസിൽ നിന്നും പൊതുവായ ഫംഗ്ഷനുകളിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM Elements (categories.html-ന് മാത്രമുള്ളവ) ---
const productGrid = document.getElementById("product-grid");
const pageTitle = document.getElementById("page-title");

/**
 * ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു (കാറ്റഗറി അനുസരിച്ച്)
 */
async function loadProducts() {
    if (!productGrid) return; // എലമെന്റ് ഇല്ലെങ്കിൽ നിർത്തുന്നു

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('filter'); // URL-ൽ നിന്ന് filter=... എടുക്കുന്നു
        let productsQuery;

        if (categoryId) {
            // കാറ്റഗറി ID ഉണ്ടെങ്കിൽ, ആ കാറ്റഗറിയുടെ പേര് എടുക്കുന്നു
            try {
                const catDoc = await getDoc(doc(db, "categories", categoryId));
                if (catDoc.exists()) {
                    pageTitle.textContent = catDoc.data().name;
                } else {
                    pageTitle.textContent = "Category Not Found";
                }
            } catch (err) {
                pageTitle.textContent = "Products";
            }
            // ആ കാറ്റഗറിയിലെ ഉൽപ്പന്നങ്ങൾ മാത്രം എടുക്കാൻ ക്വറി ഉണ്ടാക്കുന്നു
            productsQuery = query(
                collection(db, "products"),
                where("categoryId", "==", categoryId)
            );
        } else {
            // കാറ്റഗറി ID ഇല്ലെങ്കിൽ, എല്ലാ ഉൽപ്പന്നങ്ങളും എടുക്കുന്നു
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
            const productId = doc.id; // ഡോക്യുമെന്റ് ID

            // വിലയും ഡിസ്കൗണ്ടും കണക്കാക്കുന്നു
            let priceHTML = '';
            const price = product.price || 0;
            const mrp = product.mrp || 0;

            if (price > 0) {
                priceHTML = `<span class="price-retail">₹${price}</span>`;
                if (mrp > price) {
                    const discount = Math.round(((mrp - price) / mrp) * 100);
                    priceHTML += `<del class="price-mrp">₹${mrp}</del>`;
                    priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
                }
            } else {
                priceHTML = `<span class="price-retail">Price on request</span>`;
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image'}" 
                     alt="${product.name}" 
                     class="product-card-image"
                     onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                <div class="product-card-content">
                    <h3>${product.name}</h3>
                    <div class="price-container">${priceHTML}</div>
                    <a href="product.html?id=${productId}" class="btn">View Details</a>
                </div>
            `;
            productGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products. Check console for details.</p>';
    }
}

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ ഹെഡറും ഫൂട്ടറും ലോഡ് ചെയ്യുന്നു
    loadProducts();     // ഈ പേജിന് മാത്രമായുള്ള ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
});