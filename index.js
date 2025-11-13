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

// പേജ് ലോഡ് ആവുമ്പോൾ ഈ ഫംഗ്ഷനുകൾ പ്രവർത്തിക്കുന്നു
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();     // പൊതുവായ കാര്യങ്ങൾ (ലോഗോ, ഫൂട്ടർ)
    loadHomeVideo();        // ഹോം പേജിലെ വീഡിയോ
    loadFeaturedProducts(); // ഫീച്ചർ ചെയ്ത ഉൽപ്പന്നങ്ങൾ
});

/**
 * ഹോം പേജിലെ പ്രധാന വീഡിയോ ലോഡ് ചെയ്യുന്നു (Al Ambar Experience)
 */
async function loadHomeVideo() {
    const videoWrapper = document.getElementById("video-wrapper-container");
    if (!videoWrapper) return;

    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        let videoUrl = "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4"; // Default

        if (docSnap.exists()) {
            const settings = docSnap.data();
            if (settings.videoUrl) {
                videoUrl = settings.videoUrl;
            }
        }
        updateVideoPlayer(videoUrl, videoWrapper);

    } catch (error) {
        console.error("Error loading site video: ", error);
        videoWrapper.innerHTML = '<p class="loading-placeholder">Error loading video.</p>';
    }
}

/**
 * വീഡിയോ URL അനുസരിച്ച് പ്ലെയർ മാറ്റുന്നു
 */
function updateVideoPlayer(url, wrapper) {
    if (!url) {
        wrapper.innerHTML = '<p class="loading-placeholder">No video URL provided.</p>';
        return;
    }

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = getYouTubeID(url);
        if(videoId) {
            wrapper.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen>
                </iframe>`;
        } else {
             wrapper.innerHTML = '<p class="loading-placeholder">Invalid YouTube URL.</p>';
        }
    } else if (url.endsWith(".mp4") || url.includes("firebasestorage")) {
        wrapper.innerHTML = `
            <video controls muted autoplay loop playsinline>
                <source src="${url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
    } else {
        wrapper.innerHTML = '<p class="loading-placeholder">Invalid video format provided.</p>';
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
 * ഫീച്ചർ ചെയ്ത ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
 */
async function loadFeaturedProducts() {
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;

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
        console.error("Error loading featured products: ", error);
        productGrid.innerHTML = '<p class="loading-placeholder">Error loading products.</p>';
    }
}