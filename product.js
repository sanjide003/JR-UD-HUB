// ഈ ഫയലിൽ product.html പേജിന് മാത്രം വേണ്ട കോഡുകൾ

// ഫയർബേസിൽ നിന്നും പൊതുവായ ഫംഗ്ഷനുകളിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { db } from './firebase-config.js';
import { loadSiteSettings } from './common.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM Elements (product.html-ന് മാത്രമുള്ളവ) ---
const productInfoContainer = document.getElementById("product-info-container");
const productGallery = document.getElementById("product-gallery");
const relatedProductGrid = document.getElementById("related-product-grid");
const whatsappOrderBtn = document.getElementById("whatsapp-order-btn");

/**
 * ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadProductDetails() {
    if (!productInfoContainer) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id'); // URL-ൽ നിന്ന് id=... എടുക്കുന്നു

        if (!productId) {
            productInfoContainer.innerHTML = '<p class.="loading-placeholder">Product ID not found.</p>';
            return;
        }

        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            
            // 1. പേജിന്റെ ടൈറ്റിൽ മാറ്റുന്നു
            document.title = `${product.name} - Al Ambar Perfumes`;
            
            // 2. ഫോട്ടോ ഗാലറി ഉണ്ടാക്കുന്നു
            setupGallery(product.images);
            
            // 3. വിലയും ഡിസ്കൗണ്ടും കണക്കാക്കുന്നു
            let priceHTML = '';
            const price = product.price || 0;
            const mrp = product.mrp || 0;

            if (price > 0) {
                priceHTML = `<span class="price-retail-large">₹${price}</span>`;
                if (mrp > price) {
                    const discount = Math.round(((mrp - price) / mrp) * 100);
                    priceHTML += `<del class="price-mrp-large">₹${mrp}</del>`;
                    priceHTML += `<span class="price-discount-large">${discount}% OFF</span>`;
                }
            } else {
                priceHTML = `<span class="price-retail-large">Price on request</span>`;
            }

            // 4. ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ കാണിക്കുന്നു
            productInfoContainer.innerHTML = `
                <h1>${product.name}</h1>
                ${product.size ? `<p class="product-size">(${product.size})</p>` : ''}
                
                <div class="price-container-large">
                    ${priceHTML}
                </div>
                
                <div class="product-description">
                    <h3>Description</h3>
                    <p>${product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.'}</p>
                </div>
            `;
            
            // 5. WhatsApp ഓർഡർ ബട്ടൺ ലിങ്ക് ശരിയാക്കുന്നു
            if(whatsappOrderBtn) {
                const message = `Hello, I am interested in this product:\n*${product.name}*\n(Product ID: ${productId})`;
                const whatsappLink = `https://wa.me/${whatsappOrderBtn.dataset.whatsappNum}?text=${encodeURIComponent(message)}`;
                whatsappOrderBtn.href = whatsappLink;
            }

            // 6. ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
            if (product.categoryId) {
                loadRelatedProducts(product.categoryId, productId);
            }

        } else {
            productInfoContainer.innerHTML = '<p class="loading-placeholder">Product not found.</p>';
        }

    } catch (error) {
        console.error("Error loading product details: ", error);
        productInfoContainer.innerHTML = '<p class="loading-placeholder">Error loading product.</p>';
    }
}

/**
 * ഫോട്ടോ ഗാലറി സെറ്റപ്പ് ചെയ്യുന്നു
 */
function setupGallery(images) {
    if (!productGallery || !images || images.length === 0) {
        if(productGallery) productGallery.innerHTML = `<img src="https://placehold.co/600x600/1e1e1e/D4AF37?text=No+Image" alt="No Image" class="gallery-main-image">`;
        return;
    }
    
    const mainImage = document.createElement('img');
    mainImage.src = images[0];
    mainImage.className = 'gallery-main-image';
    mainImage.id = 'main-product-image';
    
    const thumbnails = document.createElement('div');
    thumbnails.className = 'gallery-thumbnails';
    
    images.forEach((imgUrl, index) => {
        const thumb = document.createElement('img');
        thumb.src = imgUrl;
        thumb.className = 'gallery-thumb';
        if (index === 0) {
            thumb.classList.add('active');
        }
        
        thumb.addEventListener('click', () => {
            mainImage.src = imgUrl; // വലിയ ചിത്രം മാറ്റുന്നു
            // പഴയ ആക്ടീവ് തംബ്നീൽ മാറ്റുന്നു
            document.querySelector('.gallery-thumb.active').classList.remove('active');
            // പുതിയ തംബ്നീൽ ആക്ടീവ് ആക്കുന്നു
            thumb.classList.add('active');
        });
        
        thumbnails.appendChild(thumb);
    });
    
    productGallery.innerHTML = ''; // പഴയത് ക്ലിയർ ചെയ്യുന്നു
    productGallery.appendChild(mainImage);
    productGallery.appendChild(thumbnails);
}

/**
 * ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadRelatedProducts(categoryId, currentProductId) {
    if (!relatedProductGrid) return;
    
    try {
        const q = query(
            collection(db, "products"),
            where("categoryId", "==", categoryId),
            limit(5) // ഇപ്പോഴത്തെ ഉൽപ്പന്നം ഉൾപ്പെടെ 5 എണ്ണം എടുക്കുന്നു
        );
        
        const querySnapshot = await getDocs(q);
        
        relatedProductGrid.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((doc) => {
            if (count >= 4) return; // പരമാവധി 4 എണ്ണം മതി
            
            const product = doc.data();
            const productId = doc.id;
            
            // ഇപ്പോൾ കാണുന്ന ഉൽപ്പന്നം തന്നെ വീണ്ടും കാണിക്കാതിരിക്കാൻ
            if (productId !== currentProductId) {
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
                relatedProductGrid.appendChild(card);
                count++;
            }
        });

        if (count === 0) {
            // ബന്ധപ്പെട്ട ഉൽപ്പന്നങ്ങൾ ഒന്നും കിട്ടിയില്ലെങ്കിൽ സെക്ഷൻ മറയ്ക്കുന്നു
            const relatedSection = document.querySelector('.related-products-section');
            if (relatedSection) relatedSection.style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error loading related products: ", error);
    }
}

/**
 * WhatsApp ബട്ടണിലേക്ക് നമ്പർ ചേർക്കുന്നു
 */
async function setupWhatsAppButton() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && whatsappOrderBtn) {
            const settings = docSnap.data();
            if (settings.whatsapp) {
                // ഡാറ്റാ ആട്രിബ്യൂട്ടായി നമ്പർ സേവ് ചെയ്യുന്നു
                whatsappOrderBtn.dataset.whatsappNum = settings.whatsapp;
            }
        }
    } catch (error) {
        console.error("Error getting WhatsApp number: ", error);
    }
}

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings();  // പൊതുവായ ഹെഡറും ഫൂട്ടറും ലോഡ് ചെയ്യുന്നു
    await setupWhatsAppButton(); // WhatsApp നമ്പർ ബട്ടണിൽ ചേർക്കുന്നു
    loadProductDetails();      // അതിനുശേഷം ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു
});