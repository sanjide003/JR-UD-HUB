// ഇതാണ് 'index.js' ഫയൽ.
// ഹോം പേജിന് (index.html) മാത്രം വേണ്ടിയുള്ള കാര്യങ്ങൾ ഈ ഫയൽ ചെയ്യുന്നു.
// *** "Shop by Category" ഡിസൈൻ മാറ്റി ***

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs,
    doc,
    getDoc,
    query,
    where,
    limit,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { addToCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷൻ

setLogLevel('Debug');

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    // 1. പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ, മെനു, കാർട്ട്, ഫ്ലോട്ടിംഗ് ബട്ടണുകൾ)
    loadSiteSettings();
    
    // 2. ഈ പേജിന് മാത്രമുള്ള കാര്യങ്ങൾ
    loadHeroSlider();
    loadTopSellers();
    loadHomeCategories(); // <-- ഈ ഫംഗ്ഷൻ അപ്ഡേറ്റ് ചെയ്തു
    setupBoutiqueVideo(); 
});

/**
 * 1. ഹീറോ സെക്ഷനിലെ പശ്ചാത്തല സ്ലൈഡർ ലോഡ് ചെയ്യുന്നു
 */
async function loadHeroSlider() {
    const sliderWrapper = document.getElementById('hero-slider-wrapper');
    const heroSection = document.getElementById('hero-section-new');
    if (!sliderWrapper || !heroSection) return;

    try {
        const q = query(collection(db, "heroSlides"), orderBy("order"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No hero slides found.");
            sliderWrapper.innerHTML = `<div class="swiper-slide"><img src="https://placehold.co/600x800/000000/D4AF37?text=Al+Ambar" alt="Placeholder"></div>`;
        } else {
            sliderWrapper.innerHTML = ''; // Loading... നീക്കം ചെയ്യുന്നു
            querySnapshot.forEach((doc) => {
                const slide = doc.data();
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';

                if (slide.type === 'video') {
                    slideEl.innerHTML = `
                        <video src="${slide.url}" autoplay muted loop playsinline preload="metadata"></video>
                    `;
                } else if (slide.type === 'image') {
                    slideEl.innerHTML = `
                        <img src="${slide.url}" alt="Hero Background Image">
                    `;
                }
                sliderWrapper.appendChild(slideEl);
            });
        }

        // സ്ലൈഡർ ആരംഭിക്കുന്നു
        new Swiper('.hero-slider-new', {
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            autoplay: {
                delay: 4000, // 4 സെക്കൻഡ്
                disableOnInteraction: false
            },
            allowTouchMove: true, 
            speed: 1000,
        });

    } catch (error) {
        console.error("Error loading hero slider: ", error);
    }
}


/**
 * 2. "Top Sellers" കറൗസൽ ലോഡ് ചെയ്യുന്നു (പുതിയ ഡിസൈൻ)
 */
async function loadTopSellers() {
    const grid = document.getElementById("top-sellers-grid");
    if (!grid) return;

    try {
        const q = query(
            collection(db, "products"), 
            where("featured", "==", true), 
            limit(10)
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
            card.className = 'swiper-slide';

            let priceHTML = `₹${product.price || 0} /-`;
            
            const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/400x400/1e1e1e/D4AF37?text=No+Image';

            card.innerHTML = `
                <a href="product.html?id=${productId}">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="top-sellers-product-image"
                         onerror="this.src='https://placehold.co/400x400/1e1e1e/D4AF37?text=Error'">
                </a>
                <div class="top-sellers-product-info">
                    <div class="top-sellers-product-name">${product.name} ${product.size ? `(${product.size})` : ''}</div>
                    <div class="top-sellers-product-price">${priceHTML}</div>
                    <div class="top-sellers-buttons">
                        <button class="btn btn-secondary-new btn-add-to-cart"
                            data-id="${productId}"
                            data-name="${product.name}"
                            data-price="${product.price}"
                            data-mrp="${product.mrp}"
                            data-image="${imageUrl}">
                            ADD TO CART
                        </button>
                        <a href="product.html?id=${productId}" class="btn btn-primary-new">VIEW PRODUCT</a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // കറൗസൽ ആരംഭിക്കുന്നു
        new Swiper('.top-sellers-swiper-new', {
            slidesPerView: 1,
            spaceBetween: 20,
            pagination: { 
                el: '.swiper-pagination',
                clickable: true,
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
 * 3. ഹോം പേജിലെ കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു (***പുതിയ ചെറിയ ഡിസൈൻ***)
 */
async function loadHomeCategories() {
    const grid = document.getElementById("category-grid-home");
    if (!grid) return;

    try {
        // കാറ്റഗറികൾ 6 എണ്ണം ലോഡ് ചെയ്യുന്നു
        const catQuery = query(
            collection(db, "categories"),
            orderBy("name"),
            limit(6) // 3-ന് പകരം 6 എണ്ണം
        );
        const catSnapshot = await getDocs(catQuery);

        if (catSnapshot.empty) {
            grid.innerHTML = '<p>No categories to show.</p>';
            return;
        }

        grid.innerHTML = ''; // "Loading..." നീക്കം ചെയ്യുന്നു
        
        catSnapshot.forEach((doc) => {
            const category = doc.data();
            const catId = doc.id;
            const card = document.createElement('a');
            // *** പുതിയ CSS ക്ലാസ്സ് ***
            card.className = 'category-card-new'; 
            card.href = `categories.html?filter=${catId}`;
            
            // ഐക്കണുകൾക്ക് 'contain' ആണ് നല്ലത്
            const imageUrl = category.imageUrl || 'https://placehold.co/100x80/1e1e1e/D4AF37?text=Icon';
            
            // *** പുതിയ HTML ഘടന ***
            card.innerHTML = `
                <img src="${imageUrl}" 
                     alt="${category.name}"
                     onerror="this.src='https://placehold.co/100x80/1e1e1e/D4AF37?text=Error'">
                <div class="category-card-new-content">
                    <h3>${category.name}</h3>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading home categories: ", error);
        grid.innerHTML = '<p>Error loading categories.</p>';
    }
}

/**
 * 4. ബൊട്ടീക് വീഡിയോ മോഡൽ പ്രവർത്തിപ്പിക്കുന്നു
 */
let videoUrlFromSettings = null;

async function setupBoutiqueVideo() {
    const playButton = document.getElementById('boutique-play-button');
    const videoModal = document.getElementById('video-modal');
    const modalClose = document.getElementById('video-modal-close');
    const modalContent = document.getElementById('video-modal-content');
    
    if (!playButton || !videoModal || !modalClose || !modalContent) return;

    // 1. അഡ്മിനിൽ നിന്ന് വീഡിയോ URL എടുക്കുന്നു
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().videoUrl) {
            videoUrlFromSettings = docSnap.data().videoUrl;
        }
    } catch (error) {
        console.error("Error fetching videoUrl for modal: ", error);
    }

    // 2. പ്ലേ ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
    playButton.addEventListener('click', () => {
        if (!videoUrlFromSettings) {
            // alert()-ന് പകരം കൺസോളിൽ ലോഗ് ചെയ്യുന്നു
            console.warn("Video is not available at the moment.");
            return;
        }
        
        if (videoUrlFromSettings.includes("youtube.com") || videoUrlFromSettings.includes("youtu.be")) {
            const videoId = getYouTubeID(videoUrlFromSettings);
            modalContent.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen>
                </iframe>`;
        } else {
            modalContent.innerHTML = `
                <video controls autoplay loop playsinline>
                    <source src="${videoUrlFromSettings}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
        }
        
        videoModal.classList.add('open');
    });

    // 3. മോഡൽ ക്ലോസ് ബട്ടൺ
    modalClose.addEventListener('click', () => {
        videoModal.classList.remove('open');
        modalContent.innerHTML = ''; // വീഡിയോ നിർത്തുവാൻ
    });
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

        e.preventDefault(); 

        const id = button.dataset.id;
        const product = {
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image
        };

        addToCart(id, product);

        button.innerHTML = 'ADDED!';
        button.disabled = true;
        setTimeout(() => {
            button.innerHTML = 'ADD TO CART';
            button.disabled = false;
        }, 2000);
    });
}