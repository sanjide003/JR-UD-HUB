// ഇതാണ് 'index.js' ഫയൽ.
// ഹോം പേജിന് (index.html) മാത്രം വേണ്ടിയുള്ള കാര്യങ്ങൾ ഈ ഫയൽ ചെയ്യുന്നു.
// (ഹീറോ വീഡിയോ, ടോപ്പ് സെല്ലേഴ്സ്, കാറ്റഗറികൾ, താഴെയുള്ള വീഡിയോ)

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    orderBy, // പുതിയ ഉൽപ്പന്നങ്ങൾ കിട്ടാൻ
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ

setLogLevel('Debug');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    // 1. പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ, മെനു, കാർട്ട്) ലോഡ് ചെയ്യുന്നു
    loadSiteSettings();
    
    // 2. ഈ പേജിന് മാത്രമുള്ള കാര്യങ്ങൾ ലോഡ് ചെയ്യുന്നു
    loadHeroVideo();
    loadTopSellers();
    loadHomeCategories();
    loadExperienceVideo();
});

/**
 * 1. ഹീറോ സെക്ഷനിലെ പശ്ചാത്തല വീഡിയോ ലോഡ് ചെയ്യുന്നു
 */
async function loadHeroVideo() {
    const videoPlayer = document.getElementById('hero-video-player');
    if (!videoPlayer) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().heroVideoUrl) {
            videoPlayer.src = docSnap.data().heroVideoUrl;
            videoPlayer.load(); // വീഡിയോ ലോഡ് ചെയ്യാൻ നിർദ്ദേശിക്കുന്നു
        } else {
            console.log("Hero video URL not found.");
            videoPlayer.parentElement.style.display = 'none'; // വീഡിയോ ഇല്ലെങ്കിൽ സെക്ഷൻ മറയ്ക്കുന്നു
        }
    } catch (error) {
        console.error("Error loading hero video: ", error);
    }
}

/**
 * 2. "Top Sellers" കറൗസൽ ലോഡ് ചെയ്യുന്നു
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;

    try {
        // 'featured' എന്ന ഫീൽഡ് true ആയവ മാത്രം എടുക്കുന്നു
        const q = query(
            collection(db, "products"), 
            where("featured", "==", true), 
            limit(10) // പരമാവധി 10 എണ്ണം
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No featured products found.</p>';
            return;
        }

        grid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const card = document.createElement('div');
            card.className = 'swiper-slide'; // കറൗസലിന് വേണ്ടിയുള്ള ക്ലാസ്

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

            card.innerHTML = `
                <div class="product-card">
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
                                Add to Cart
                            </button>
                            <a href="product.html?id=${productId}" class="btn btn-primary">View</a>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // കറൗസൽ ആരംഭിക്കുന്നു
        new Swiper('.top-sellers-swiper', {
            slidesPerView: 1,
            spaceBetween: 20,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                640: { slidesPerView: 2 },
                900: { slidesPerView: 3 },
                1200: { slidesPerView: 4 },
            }
        });

    } catch (error) {
        console.error("Error loading top sellers: ", error);
        grid.innerHTML = '<p>Error loading products.</p>';
    }
}

/**
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു
 * (അവസാനം ചേർത്ത 3 ഉൽപ്പന്നങ്ങളുടെ കാറ്റഗറികൾ)
 */
async function loadHomeCategories() {
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;

    try {
        // 1. ആദ്യം, അവസാനം ചേർത്ത 3 ഉൽപ്പന്നങ്ങൾ എടുക്കുന്നു
        const productQuery = query(
            collection(db, "products"),
            orderBy("createdAt", "desc"), // പുതിയവ ആദ്യം
            limit(3)
        );
        const productSnapshot = await getDocs(productQuery);

        if (productSnapshot.empty) {
            grid.innerHTML = '<p>No recent categories to show.</p>';
            return;
        }

        // 2. ആ ഉൽപ്പന്നങ്ങളുടെ കാറ്റഗറി ID-കൾ ഒരു സെറ്റിൽ (Set) സൂക്ഷിക്കുന്നു (ഡ്യൂപ്ലിക്കേറ്റ് ഒഴിവാക്കാൻ)
        const categoryIds = new Set();
        productSnapshot.forEach(doc => {
            if (doc.data().categoryId) {
                categoryIds.add(doc.data().categoryId);
            }
        });

        if (categoryIds.size === 0) {
            grid.innerHTML = '<p>No categories found for recent products.</p>';
            return;
        }

        // 3. ആ കാറ്റഗറി ID-കൾ ഉപയോഗിച്ച് കാറ്റഗറി വിവരങ്ങൾ എടുക്കുന്നു
        grid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        for (const catId of categoryIds) {
            const catDoc = await getDoc(doc(db, "categories", catId));
            if (catDoc.exists()) {
                const category = catDoc.data();
                const card = document.createElement('a');
                card.className = 'category-card-home';
                card.href = `categories.html?filter=${catId}`;
                card.innerHTML = `
                    <img src="${category.imageUrl || 'https://placehold.co/400x400/1e1e1e/D4AF37?text=Category'}" 
                         alt="${category.name}"
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                    <div class="category-card-home-content">
                        <h3>${category.name}</h3>
                    </div>
                `;
                grid.appendChild(card);
            }
        }
    } catch (error) {
        console.error("Error loading home categories: ", error);
        grid.innerHTML = '<p>Error loading categories.</p>';
    }
}

/**
 * 4. താഴെയുള്ള 'Experience Video' ലോഡ് ചെയ്യുന്നു
 */
async function loadExperienceVideo() {
    const videoWrapper = document.getElementById('video-wrapper-container');
    if (!videoWrapper) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        
        let videoUrl = null;
        if (docSnap.exists() && docSnap.data().videoUrl) {
            videoUrl = docSnap.data().videoUrl;
        }

        if (!videoUrl) {
            videoWrapper.innerHTML = '<p class="loading-placeholder">Video not available.</p>';
            return;
        }

        // വീഡിയോ URL പരിശോധിച്ച് പ്ലെയർ ഉണ്ടാക്കുന്നു
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
            // YouTube വീഡിയോ
            const videoId = getYouTubeID(videoUrl);
            if(videoId) {
                videoWrapper.innerHTML = `
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen>
                    </iframe>`;
            } else {
                 videoWrapper.innerHTML = '<p class="loading-placeholder">Invalid YouTube URL.</p>';
            }
        } else if (videoUrl.endsWith(".mp4") || videoUrl.includes("firebasestorage")) {
            // നേരിട്ടുള്ള വീഡിയോ (.mp4)
            videoWrapper.innerHTML = `
                <video controls muted autoplay loop playsinline>
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
        } else {
            videoWrapper.innerHTML = '<p class="loading-placeholder">Invalid video format provided.</p>';
        }

    } catch (error) {
        console.error("Error loading experience video: ", error);
        videoWrapper.innerHTML = '<p class="loading-placeholder">Error loading video.</p>';
    }
}

/**
 * YouTube URL-ൽ നിന്ന് ID വേർതിരിച്ചെടുക്കുന്നു
 */
function getYouTubeID(url) {
    let ID = '';
    url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if (url[2] !== undefined) {
        ID = url[2].split(/[^0-9a-z_\-]/i);
        ID = ID[0];
    } else {
        ID = url.toString();
    }
    return ID;
}

/**
 * ഹോം പേജിലെ "Add to Cart" ബട്ടണുകൾ പ്രവർത്തിപ്പിക്കുന്നു
 */
const topSellersGrid = document.getElementById("top-sellers-grid");
if (topSellersGrid) {
    topSellersGrid.addEventListener('click', (e) => {
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
            button.innerHTML = 'Add to Cart';
            button.disabled = false;
        }, 2000);
    });
}