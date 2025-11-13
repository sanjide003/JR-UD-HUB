// ഈ ഫയലിൽ index.html പേജിന് മാത്രം വേണ്ട കോഡുകൾ

// ഫയർബേസിൽ നിന്നും പൊതുവായ ഫംഗ്ഷനുകളിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { db } from './firebase-config.js';
import { loadSiteSettings, getYouTubeID } from './common.js';
import { 
    collection, 
    getDocs,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM Elements (index.html-ന് മാത്രമുള്ളവ) ---
const productGrid = document.getElementById("product-grid");
// const categoryGrid = document.getElementById("category-grid"); // ഈ സെക്ഷൻ നമ്മൾ നീക്കം ചെയ്തു

/**
 * ഫീച്ചർ ചെയ്ത ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadFeaturedProducts() {
    if (!productGrid) return; // എലമെന്റ് ഇല്ലെങ്കിൽ നിർത്തിവയ്ക്കുന്നു
    
    try {
        const q = query(
            collection(db, "products"),
            where("featured", "==", true),
            limit(4)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p class="loading-placeholder">No featured products found.</p>';
            return;
        }

        productGrid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id; // ഡോക്യുമെന്റ് ID എടുക്കുന്നു

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
        console.error("Error loading featured products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products.</p>';
    }
}

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();     // ഹെഡർ/ഫൂട്ടർ/വീഡിയോ ലോഡ് ചെയ്യുന്നു
    // loadCategories();    // ഈ ഫംഗ്ഷൻ ഇപ്പോൾ ആവശ്യമില്ല, കാരണം സെക്ഷൻ നീക്കം ചെയ്തു
    loadFeaturedProducts(); // ഫീച്ചർ ചെയ്ത ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
});