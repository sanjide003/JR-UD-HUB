// **** ഫയർബേസ് ഫംഗ്ഷനുകൾ ഇമ്പോർട്ട് ചെയ്യുന്നു (ഇതായിരുന്നു വിട്ടുപോയത്) ****
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';

setLogLevel('Debug');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (ലോഗോ, ഫൂട്ടർ)
    loadProductDetails(); // ഈ പേജിലെ ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ
});

/**
 * URL-ൽ നിന്ന് ID എടുത്ത് ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    // DOM Elements
    const pageTitle = document.getElementById("page-title");
    const productName = document.getElementById("product-name");
    const productSize = document.getElementById("product-size");
    const productDescription = document.getElementById("product-description");
    const mainImage = document.getElementById("product-main-image");
    const thumbGallery = document.getElementById("product-thumb-gallery");
    const priceContainer = document.getElementById("price-container-main");
    const whatsappOrderBtn = document.getElementById("whatsapp-order-btn");
    
    if (!productId) {
        if (pageTitle) pageTitle.textContent = "Product Not Found";
        if (productName) productName.textContent = "Product ID missing in URL.";
        return;
    }

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const product = docSnap.data();

            // പേജിന്റെ ടൈറ്റിലും തലക്കെട്ടും മാറ്റുന്നു
            document.title = `${product.name} - Al Ambar Perfumes`;
            if (pageTitle) pageTitle.textContent = product.name;
            if (productName) productName.textContent = product.name;
            
            // സൈസ് കാണിക്കുന്നു
            if (productSize && product.size) {
                productSize.textContent = `Size: ${product.size}`;
            }

            // വിവരണം
            if (productDescription) {
                // \n (new line) മാറ്റി <br> ആക്കുന്നു
                productDescription.innerHTML = product.description
                    .replace(/\n/g, '<br>');
            }

            // വിലയും ഡിസ്കൗണ്ടും
            if (priceContainer) {
                const price = product.price || 0;
                const mrp = product.mrp || 0;
                let priceHTML = `<span class="price-main large">₹${price}</span>`;
                
                if (mrp > price) {
                    const discount = Math.round(((mrp - price) / mrp) * 100);
                    priceHTML += `<span class="price-mrp large"><del>₹${mrp}</del></span>`;
                    priceHTML += `<span class="price-discount large">${discount}% OFF</span>`;
                }
                priceContainer.innerHTML = priceHTML;
            }

            // ഫോട്ടോ ഗാലറി
            if (mainImage && thumbGallery) {
                // ഗാലറി ക്ലിയർ ചെയ്യുന്നു
                thumbGallery.innerHTML = '';
                
                if (product.images && product.images.length > 0) {
                    // പ്രധാന ഇമേജ് സെറ്റ് ചെയ്യുന്നു
                    mainImage.src = product.images[0];
                    
                    // തമ്പ് ഗാലറി ഉണ്ടാക്കുന്നു
                    product.images.forEach(imageUrl => {
                        const thumb = document.createElement('img');
                        thumb.src = imageUrl;
                        thumb.alt = "Thumbnail";
                        thumb.className = "gallery-thumb";
                        // തമ്പിൽ ക്ലിക്ക് ചെയ്യുമ്പോൾ പ്രധാന ഇമേജ് മാറുന്നു
                        thumb.addEventListener('click', () => {
                            mainImage.src = imageUrl;
                        });
                        thumbGallery.appendChild(thumb);
                    });
                } else {
                    // ഇമേജ് ഇല്ലെങ്കിൽ
                    mainImage.src = 'https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image';
                }
            }

            // WhatsApp ഓർഡർ ബട്ടൺ
            if (whatsappOrderBtn) {
                const message = `Hello, I'm interested in this product: ${product.name} (ID: ${productId}).`;
                whatsappOrderBtn.href = `https://wa.me/?text=${encodeURIComponent(message)}`; // ഫോൺ നമ്പർ അഡ്മിൻ പാനലിൽ നിന്ന് എടുക്കും
                
                // ഫോൺ നമ്പർ കൂടി ചേർക്കുന്നു (common.js-ൽ നിന്ന്)
                const globalSettings = await getDoc(doc(db, "settings", "global"));
                if (globalSettings.exists() && globalSettings.data().whatsapp) {
                    const whatsappNumber = globalSettings.data().whatsapp;
                    whatsappOrderBtn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                }
            }

            // ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
            loadRelatedProducts(product.categoryId, productId);

        } else {
            console.log("No such product!");
            if (pageTitle) pageTitle.textContent = "Product Not Found";
            if (productName) productName.textContent = "The product you are looking for does not exist.";
        }
    } catch (error) {
        console.error("Error loading product details: ", error);
        if (productName) productName.textContent = "Error loading product data.";
    }
}

/**
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadRelatedProducts(categoryId, currentProductId) {
    const relatedGrid = document.getElementById("related-products-grid");
    if (!relatedGrid) return;

    try {
        const q = query(
            collection(db, "products"),
            where("categoryId", "==", categoryId)
        );
        
        const querySnapshot = await getDocs(q);
        
        let products = [];
        querySnapshot.forEach(doc => {
            // നിലവിൽ നോക്കുന്ന ഉൽപ്പന്നം ഒഴികെ മറ്റുള്ളവ
            if (doc.id !== currentProductId) {
                products.push({ id: doc.id, ...doc.data() });
            }
        });

        // ക്രമരഹിതമായി 4 എണ്ണം കാണിക്കുന്നു
        const relatedProducts = products.sort(() => 0.5 - Math.random()).slice(0, 4);

        if (relatedProducts.length === 0) {
            document.getElementById("related-products-section").style.display = 'none';
            return;
        }

        relatedGrid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        relatedProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const price = product.price || 0;
            const mrp = product.mrp || 0;
            let priceHTML = `<span class="price-main">₹${price}</span>`;
            
            if (mrp > price) {
                const discount = Math.round(((mrp - price) / mrp) * 100);
                priceHTML += `<span class="price-mrp"><del>₹${mrp}</del></span>`;
                priceHTML += `<span class="price-discount">${discount}% OFF</span>`;
            }

            card.innerHTML = `
                <a href="product.html?id=${product.id}">
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
                    <a href="product.html?id=${product.id}" class="btn btn-card">View Details</a>
                </div>
            `;
            relatedGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading related products: ", error);
        document.getElementById("related-products-section").style.display = 'none';
    }
}