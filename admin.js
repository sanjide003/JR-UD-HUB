import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDoc,
    getDocs,
    setDoc,
    doc,
    deleteDoc,
    updateDoc, 
    onSnapshot, 
    query,
    where, 
    serverTimestamp,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { optimizeImage } from './common.js'; 

const ICONS = {
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
};

// DOM Elements
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const toastContainer = document.getElementById("toast-container");

const logoutButtons = document.querySelectorAll(".logout-action-btn");
const adminNavOpenBtn = document.getElementById("admin-nav-open-btn");
const adminNavCloseBtn = document.getElementById("admin-nav-close-btn");
const adminSideNav = document.getElementById("admin-side-nav");
const adminNavOverlay = document.getElementById("admin-nav-overlay");
const adminNavLinks = document.querySelector(".admin-nav-links");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const pageContents = document.querySelectorAll(".page-content");
const navLinks = document.querySelectorAll(".nav-link");

// Product/Category Forms
const addCategoryForm = document.getElementById("add-category-form");
const categoriesListBody = document.getElementById("categories-list-body");
const addProductForm = document.getElementById("add-product-form");
const productsListBody = document.getElementById("products-list-body");
const featuredProductsListBody = document.getElementById("featured-products-list-body"); 
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");

// Top Deals (New)
const topDealsBannerForm = document.getElementById("top-deals-banner-form");
const topDealsListBody = document.getElementById("top-deals-list-body");
const topDealSearchInp = document.getElementById("top-deal-search-input");
const topDealSearchRes = document.getElementById("top-deal-search-results");

const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalForm = document.getElementById("modal-form");
const confirmModal = document.getElementById("confirm-modal");
const confirmBtnDelete = document.getElementById("confirm-btn-delete");
const confirmCloseButton = document.getElementById("confirm-close-button");
const confirmBtnCancel = document.getElementById("confirm-btn-cancel");

let currentProductsQuery = null;
let currentFeaturedQuery = null;
let currentTopDealsQuery = null;
let deleteInfo = { id: null, type: null }; 
let allProductsCache = []; 

// Helper Functions
function showStatus(ignored, message, isError = true) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.innerHTML = `<span>${isError?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function disableButton(btn, text = "Wait...") {
    if(!btn) return;
    btn.disabled = true;
    const txt = btn.querySelector('.btn-text');
    const load = btn.querySelector('.btn-loader');
    if(txt) txt.textContent = text;
    if(load) load.style.display = 'inline-block';
}
function enableButton(btn, text) {
    if(!btn) return;
    btn.disabled = false;
    const txt = btn.querySelector('.btn-text');
    const load = btn.querySelector('.btn-loader');
    if(txt) txt.textContent = text;
    if(load) load.style.display = 'none';
}

// Auth
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    disableButton(loginButton, "Logging in..."); 
    try {
        await signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value);
    } catch (error) { showStatus(null, "Login Failed", true); } 
    finally { enableButton(loginButton, "Login"); }
});

logoutButtons.forEach(btn => btn.addEventListener("click", () => signOut(auth)));
document.querySelector('.full-width-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
        loginSection.style.display = "none";
        adminPanel.style.display = "block";
        loadInitialData();
    } else {
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
    }
});

// Theme
if(localStorage.getItem('admin-theme') === 'light') document.body.classList.add('light-mode');
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('admin-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// Nav
function closeNav() { adminSideNav.classList.remove("open"); adminNavOverlay.classList.remove("open"); }
adminNavOpenBtn.addEventListener("click", () => { adminSideNav.classList.add("open"); adminNavOverlay.classList.add("open"); });
adminNavCloseBtn.addEventListener("click", closeNav);
adminNavOverlay.addEventListener("click", closeNav);
adminNavLinks.addEventListener("click", (e) => {
    if(e.target.classList.contains("nav-link")) {
        pageContents.forEach(p => p.classList.remove("active"));
        navLinks.forEach(n => n.classList.remove("active"));
        document.getElementById(e.target.dataset.page).classList.add("active");
        e.target.classList.add("active");
        closeNav();
    }
});

function loadInitialData() {
    loadCategories();
    loadProducts("all");
    loadFeaturedProducts();
    loadHeroSlides();
    loadAllSettings();
    loadTopDealsConfig(); 
    cacheAllProductsForSearch();
    setupImageUploader('product-image-list-container', 'add-image-url-btn');
    setupMoreLinksUploader('product-more-links-container', 'add-more-link-btn');
    if(!document.getElementById("product-image-list-container").children.length) addImageInput('product-image-list-container');
    setupSingleImageUploader('category-image-url');
    setupSingleImageUploader('setting-logo-image-url');
    setupSingleImageUploader('setting-home-banner-url');
    setupSingleImageUploader('top-deals-banner-input');
    setupHeroSlideSource();
}

// Settings
async function loadAllSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
            const s = snap.data();
            const set = (id, v) => { const el=document.getElementById(id); if(el) { if (el.classList.contains('single-image-uploader')) setSingleImageValue(id, v || ''); else el.value = v || ''; } };
            set("setting-logo-image-url", s.logoImageUrl);
            set("setting-logo-text", s.logoText);
            set("setting-logo-subtitle", s.logoSubtitle);
            set("setting-home-banner-url", s.homeBannerUrl);
            set("setting-chatbot-number", s.chatbotNumber);
            set("setting-dealer-number", s.dealerChatNumber);
            set("setting-phone", s.phone);
            set("setting-email", s.email);
            set("setting-address", s.address);
            set("setting-whatsapp", s.whatsapp);
            set("setting-follow-whatsapp", s.followWhatsapp);
            set("setting-facebook-url", s.facebookUrl);
            set("setting-instagram-url", s.instagramUrl);
            set("setting-youtube-url", s.youtubeUrl);
        }
        
        // *** LOAD ORDER SETTINGS ***
        const orderSnap = await getDoc(doc(db, "settings", "orderConfig"));
        if (orderSnap.exists()) {
            const o = orderSnap.data();
            document.getElementById("setting-cod-enabled").checked = o.codEnabled || false;
            document.getElementById("setting-cod-fee").value = o.codFee || '';
        }
    } catch (e) { console.error(e); }
}

function bindSave(formId, btnId, txt, getter) {
    document.getElementById(formId).addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById(btnId);
        disableButton(btn, "Saving...");
        try {
            await setDoc(doc(db, "settings", "global"), getter(), { merge: true });
            showStatus(null, "Saved Successfully!", false);
        } catch(err){ showStatus(null, err.message); }
        finally { enableButton(btn, txt); }
    });
}
bindSave("general-settings-form", "save-general-settings-button", "Save General Settings", () => ({
    logoImageUrl: getSingleImageValue('setting-logo-image-url'),
    logoText: document.getElementById("setting-logo-text").value,
    logoSubtitle: document.getElementById("setting-logo-subtitle").value,
    homeBannerUrl: getSingleImageValue('setting-home-banner-url'),
    chatbotNumber: document.getElementById("setting-chatbot-number").value,
    dealerChatNumber: document.getElementById("setting-dealer-number").value
}));
bindSave("contact-settings-form", "save-contact-settings-button", "Save Details", () => ({
    phone: document.getElementById("setting-phone").value,
    email: document.getElementById("setting-email").value,
    address: document.getElementById("setting-address").value,
    whatsapp: document.getElementById("setting-whatsapp").value,
}));
bindSave("follow-settings-form", "save-follow-settings-button", "Save Links", () => ({
    followWhatsapp: document.getElementById("setting-follow-whatsapp").value,
    facebookUrl: document.getElementById("setting-facebook-url").value,
    instagramUrl: document.getElementById("setting-instagram-url").value,
    youtubeUrl: document.getElementById("setting-youtube-url").value,
}));

// *** SAVE ORDER SETTINGS ***
document.getElementById("order-settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("save-order-settings-button");
    disableButton(btn, "Saving...");
    try {
        await setDoc(doc(db, "settings", "orderConfig"), {
            codEnabled: document.getElementById("setting-cod-enabled").checked,
            codFee: Number(document.getElementById("setting-cod-fee").value) || 0
        }, { merge: true });
        showStatus(null, "Order Settings Saved!", false);
    } catch(err){ showStatus(null, err.message); }
    finally { enableButton(btn, "Save Order Settings"); }
});

// ... [Existing Logic for Top Deals, Products, etc.] ...

// *** MANAGE HOME (TOP DEALS) ***
async function loadTopDealsConfig() {
    try {
        const snap = await getDoc(doc(db, "settings", "homeLayout"));
        if(snap.exists()) {
            const data = snap.data();
            // Banner
            setSingleImageValue('top-deals-banner-input', data.topDealsBanner || '');
            
            // Load End Time
            if (data.offerEndTime) {
                document.getElementById("top-deals-end-time").value = data.offerEndTime;
            }
        }
        
        // Load Products
        if(currentTopDealsQuery) currentTopDealsQuery();
        currentTopDealsQuery = onSnapshot(query(collection(db, "products"), where("isTopDeal", "==", true)), (snap) => {
            topDealsListBody.innerHTML = '';
            snap.forEach(d => {
                const p = d.data();
                const thumb = p.images?.[0] ? optimizeImage(p.images[0], 50) : '';
                const row = document.createElement('tr');
                row.innerHTML = `<td data-label="Image"><img src="${thumb}"></td><td data-label="Name">${p.name}</td><td data-label="Price">₹${p.price}</td><td data-label="Actions"><button class="btn btn-remove-featured" data-id="${d.id}" style="background-color:#ef4444;">${ICONS.x} Remove</button></td>`;
                row.querySelector('.btn-remove-featured').addEventListener('click', async () => {
                    if(confirm("Remove from Top Deals?")) { await updateDoc(doc(db, "products", d.id), { isTopDeal: false }); showStatus(null, "Removed", false); }
                });
                topDealsListBody.appendChild(row);
            });
        });
    } catch(e) { console.error(e); }
}

topDealsBannerForm.addEventListener("submit", async(e) => {
    e.preventDefault();
    const btn = document.getElementById("save-top-deals-banner-btn");
    disableButton(btn, "Saving...");
    try {
        await setDoc(doc(db, "settings", "homeLayout"), {
            topDealsBanner: getSingleImageValue('top-deals-banner-input'),
            offerEndTime: document.getElementById("top-deals-end-time").value
        }, { merge: true });
        showStatus(null, "Banner & Timer Saved", false);
    } catch(e){ showStatus(null, e.message); }
    finally { enableButton(btn, "Save Banner & Timer"); }
});

// Search to Add to Top Deals
topDealSearchInp.addEventListener('input', (e) => {
    const t = e.target.value.toLowerCase().trim();
    topDealSearchRes.innerHTML = '';
    if(t.length < 2) return;
    const res = allProductsCache.filter(p => !p.isTopDeal && p.name.toLowerCase().includes(t));
    if(res.length) {
        topDealSearchRes.style.display = 'block';
        res.forEach(p => {
            const d = document.createElement('div');
            d.className = 'search-result-item';
            const thumb = p.images?.[0] ? optimizeImage(p.images[0], 50) : '';
            d.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><img src="${thumb}" style="width:35px;height:35px;border-radius:4px;object-fit:cover;"><div style="display:flex;flex-direction:column;line-height:1.2;"><span style="font-size:0.9rem;font-weight:500;">${p.name}</span><span style="font-size:0.8rem;color:var(--text-secondary);">₹${p.price}</span></div></div><button class="btn-add-featured-action">Add</button>`;
            d.querySelector('.btn-add-featured-action').addEventListener('click', async (evt) => {
                 evt.stopPropagation();
                 await updateDoc(doc(db, "products", p.id), { isTopDeal: true });
                 topDealSearchInp.value = ''; topDealSearchRes.style.display = 'none'; showStatus(null, "Added to Top Deals", false);
            });
            topDealSearchRes.appendChild(d);
        });
    } else topDealSearchRes.style.display = 'none';
});

// Categories
function loadCategories() {
    onSnapshot(query(collection(db, "categories"), orderBy("name")), (snap) => {
        categoriesListBody.innerHTML = '';
        const sel = document.getElementById("product-category");
        const fil = document.getElementById("product-filter-category");
        sel.innerHTML = '<option value="">Select...</option>';
        fil.innerHTML = '<option value="all">All</option>';
        snap.forEach(d => {
            const c = d.data();
            const imgUrl = optimizeImage(c.imageUrl, 50, 60);
            categoriesListBody.innerHTML += `
                <tr>
                    <td data-label="Image"><img src="${imgUrl}" alt="${c.name}"></td>
                    <td data-label="Name">${c.name}</td>
                    <td data-label="Actions">
                        <button class="btn btn-edit" data-id="${d.id}" data-type="category">${ICONS.edit} Edit</button>
                        <button class="btn btn-delete" data-id="${d.id}" data-type="category">${ICONS.trash} Delete</button>
                    </td>
                </tr>`;
            const opt = `<option value="${d.id}">${c.name}</option>`;
            sel.innerHTML += opt; fil.innerHTML += opt;
        });
    });
}
addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-category-button");
    disableButton(btn, "Adding...");
    try {
        const imageUrl = getSingleImageValue('category-image-url');
        if (!imageUrl) throw new Error('Please select a category image.');
        await addDoc(collection(db, "categories"), { name: document.getElementById("category-name").value, imageUrl, createdAt: serverTimestamp() });
        showStatus(null, "Category Added", false);
        addCategoryForm.reset();
        clearSingleImageValue('category-image-url');
    } catch(e) { showStatus(null, e.message); } finally { enableButton(btn, "Add Category"); }
});

// Products
function loadProducts(catId = "all") {
    let q = (catId === "all") ? query(collection(db, "products"), orderBy("createdAt", "desc")) : query(collection(db, "products"), where("categoryId", "==", catId));
    if(currentProductsQuery) currentProductsQuery();
    currentProductsQuery = onSnapshot(q, (snap) => {
        productsListBody.innerHTML = '';
        if(snap.empty) productsListBody.innerHTML = '<tr><td colspan="4" style="text-align:center">No products.</td></tr>';
        snap.forEach(d => {
            const p = d.data();
            const thumb = p.images?.[0] ? optimizeImage(p.images[0], 50, 60) : '';
            productsListBody.innerHTML += `
                <tr>
                    <td data-label="Image"><img src="${thumb}"></td>
                    <td data-label="Name">${p.name} ${p.featured ? ICONS.star : ''}</td>
                    <td data-label="Price">₹${p.price}</td>
                    <td data-label="Actions">
                        <button class="btn btn-edit" data-id="${d.id}" data-type="product">${ICONS.edit} Edit</button>
                        <button class="btn btn-delete" data-id="${d.id}" data-type="product">${ICONS.trash} Delete</button>
                    </td>
                </tr>`;
        });
    });
}
document.getElementById("product-filter-category").addEventListener("change", (e) => loadProducts(e.target.value));

addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-product-button");
    disableButton(btn, "Adding...");
    try {
        const imgs = getImageUrlsFromUploader('product-image-list-container');
        if(!imgs.length) throw new Error("Add at least 1 image");
        await addDoc(collection(db, "products"), {
            categoryId: document.getElementById("product-category").value,
            name: document.getElementById("product-name").value,
            specification: document.getElementById("product-specification").value,
            mrp: Number(document.getElementById("product-mrp").value)||0,
            price: Number(document.getElementById("product-price").value)||0,
            description: document.getElementById("product-description").value,
            featured: document.getElementById("product-featured").checked,
            images: imgs,
            moreLinks: getMoreLinksFromUploader('product-more-links-container'),
            createdAt: serverTimestamp()
        });
        showStatus(null, "Product Added", false);
        addProductForm.reset();
        populateImageUploader('product-image-list-container', []);
        populateMoreLinksUploader('product-more-links-container', []);
        addImageInput('product-image-list-container');
    } catch(e) { showStatus(null, e.message); } finally { enableButton(btn, "Add Product"); }
});

// Featured (Trendy)
function cacheAllProductsForSearch() {
    onSnapshot(query(collection(db, "products")), (snap) => {
        allProductsCache = [];
        snap.forEach(d => allProductsCache.push({ id: d.id, ...d.data() }));
    });
}
const searchInp = document.getElementById("featured-product-search");
const searchRes = document.getElementById("featured-search-results");
searchInp.addEventListener('input', (e) => {
    const t = e.target.value.toLowerCase().trim();
    searchRes.innerHTML = '';
    if(t.length < 2) return;
    const res = allProductsCache.filter(p => !p.featured && p.name.toLowerCase().includes(t));
    if(res.length) {
        searchRes.style.display = 'block';
        res.forEach(p => {
            const d = document.createElement('div');
            d.className = 'search-result-item';
            const thumb = p.images?.[0] ? optimizeImage(p.images[0], 50) : '';
            d.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><img src="${thumb}" style="width:35px; height:35px; border-radius:4px; object-fit:cover;"><div style="display:flex; flex-direction:column; line-height:1.2;"><span style="font-size:0.9rem; font-weight:500;">${p.name}</span><span style="font-size:0.8rem; color:var(--text-secondary);">₹${p.price}</span></div></div><button class="btn-add-featured-action">Add</button>`;
            d.querySelector('.btn-add-featured-action').addEventListener('click', async (e) => {
                 e.stopPropagation();
                 await updateDoc(doc(db, "products", p.id), { featured: true });
                 searchInp.value = ''; searchRes.style.display = 'none'; showStatus(null, "Added to Trendy", false);
            });
            searchRes.appendChild(d);
        });
    } else searchRes.style.display = 'none';
});

function loadFeaturedProducts() {
    if(currentFeaturedQuery) currentFeaturedQuery();
    currentFeaturedQuery = onSnapshot(query(collection(db, "products"), where("featured", "==", true)), (snap) => {
        featuredProductsListBody.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            const thumb = p.images?.[0] ? optimizeImage(p.images[0], 50) : '';
            const row = document.createElement('tr');
            row.innerHTML = `<td data-label="Image"><img src="${thumb}"></td><td data-label="Name">${p.name}</td><td data-label="Price">₹${p.price}</td><td data-label="Actions"><button class="btn btn-remove-featured" data-id="${d.id}">${ICONS.x} Remove</button></td>`;
            row.querySelector('.btn-remove-featured').addEventListener('click', async () => {
                if(confirm("Remove?")) { await updateDoc(doc(db, "products", d.id), { featured: false }); showStatus(null, "Removed", false); }
            });
            featuredProductsListBody.appendChild(row);
        });
    });
}

// Hero
addHeroSlideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-hero-slide-button");
    disableButton(btn, "Adding...");
    try {
        const source = getHeroSlideSource();
        if (!source) throw new Error('Please select an image or enter a video URL.');
        await addDoc(collection(db, "heroSlides"), {
            url: source,
            type: document.getElementById("hero-slide-type").value,
            order: Number(document.getElementById("hero-slide-order").value)||1,
            createdAt: serverTimestamp()
        });
        showStatus(null, "Slide Added", false); 
        addHeroSlideForm.reset();
        resetHeroSlideSource();
    } catch(e) { showStatus(null, e.message); } finally { enableButton(btn, "Add Slide"); }
});
function loadHeroSlides() {
    onSnapshot(query(collection(db, "heroSlides"), orderBy("order")), (snap) => {
        heroSlidesListBody.innerHTML = '';
        snap.forEach(d => {
            const s = d.data();
            const preview = s.type === 'image' ? `<img src="${optimizeImage(s.url, 100)}">` : 'Video';
            heroSlidesListBody.innerHTML += `<tr><td data-label="Preview">${preview}</td><td data-label="Type">${s.type}</td><td data-label="Order">${s.order}</td><td data-label="URL">${s.url}</td><td data-label="Actions"><button class="btn btn-delete" data-id="${d.id}" data-type="heroSlide">${ICONS.trash} Delete</button></td></tr>`;
        });
    });
}

// Image upload helpers: images are stored as Base64 strings directly in Firestore.
const MAX_IMAGE_BYTES = 50 * 1024;

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read this image.'));
        reader.readAsDataURL(file);
    });
}

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to process this image. Please choose another file.'));
        image.src = source;
    });
}

async function compressImage(file) {
    if (file.size <= MAX_IMAGE_BYTES) return readFileAsDataUrl(file);
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    let scale = Math.min(1, 1600 / Math.max(image.width, image.height));

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', Math.max(0.35, 0.82 - attempt * 0.06)));
        if (blob && blob.size <= MAX_IMAGE_BYTES) return readFileAsDataUrl(blob);
        scale *= 0.72;
    }
    throw new Error('This image could not be compressed below 50 KB. Please choose a smaller image.');
}

function imageUploaderMarkup(required = false) {
    return `<label class="image-file-control"><span>Select image</span><input type="file" accept="image/*" capture="environment" ${required ? 'required' : ''}></label><div class="uploaded-image-preview" aria-live="polite"></div><span class="image-upload-status">No image selected</span>`;
}

function setupSingleImageUploader(id) {
    const container = document.getElementById(id);
    if (!container || container.dataset.ready) return;
    container.dataset.ready = 'true';
    container.innerHTML = imageUploaderMarkup(container.dataset.required === 'true');
    container.querySelector('input[type="file"]').addEventListener('change', async event => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            setUploaderBusy(container, true);
            const dataUrl = await compressImage(file);
            setUploaderValue(container, dataUrl, file.size > MAX_IMAGE_BYTES ? 'Compressed to under 50 KB' : `${Math.ceil(file.size / 1024)} KB`);
        } catch (error) {
            event.target.value = '';
            showStatus(null, error.message);
        } finally { setUploaderBusy(container, false); }
    });
}

function setUploaderBusy(container, busy) {
    container.classList.toggle('is-processing', busy);
    container.querySelector('.image-upload-status').textContent = busy ? 'Compressing image…' : (container.dataset.status || 'No image selected');
}
function setUploaderValue(container, value, status = 'Image ready') {
    container.dataset.imageValue = value || '';
    container.dataset.status = status;
    const preview = container.querySelector('.uploaded-image-preview');
    preview.innerHTML = value ? `<img src="${value}" alt="Selected image">` : '';
    container.querySelector('.image-upload-status').textContent = status;
}
function setSingleImageValue(id, value) { const container = document.getElementById(id); if (container) setUploaderValue(container, value, value ? 'Saved image' : 'No image selected'); }
function clearSingleImageValue(id) { setSingleImageValue(id, ''); const input = document.querySelector(`#${id} input[type="file"]`); if (input) input.value = ''; }
function getSingleImageValue(id) { return document.getElementById(id)?.dataset.imageValue || ''; }

function setupHeroSlideSource() {
    const type = document.getElementById('hero-slide-type');
    type.addEventListener('change', renderHeroSlideSource);
    renderHeroSlideSource();
}
function renderHeroSlideSource() {
    const isImage = document.getElementById('hero-slide-type').value === 'image';
    const source = document.getElementById('hero-slide-url');
    document.getElementById('hero-slide-source-label').textContent = isImage ? 'Hero Image' : 'Video URL';
    document.getElementById('hero-slide-image-hint').hidden = !isImage;
    source.innerHTML = isImage ? imageUploaderMarkup(true) : '<input type="url" id="hero-slide-video-url" placeholder="https://…" required>';
    if (isImage) {
        source.querySelector('input[type="file"]').addEventListener('change', async event => {
            const file = event.target.files[0]; if (!file) return;
            try { setUploaderBusy(source, true); setUploaderValue(source, await compressImage(file), file.size > MAX_IMAGE_BYTES ? 'Compressed to under 50 KB' : `${Math.ceil(file.size / 1024)} KB`); }
            catch (error) { event.target.value = ''; showStatus(null, error.message); }
            finally { setUploaderBusy(source, false); }
        });
    }
}
function getHeroSlideSource() { return document.getElementById('hero-slide-type').value === 'image' ? (document.getElementById('hero-slide-url').dataset.imageValue || '') : document.getElementById('hero-slide-video-url').value.trim(); }
function resetHeroSlideSource() { document.getElementById('hero-slide-type').value = 'video'; renderHeroSlideSource(); }

function setupImageUploader(cid, bid) {
    const btn = document.getElementById(bid);
    if(btn) btn.onclick = () => addImageInput(cid);
    const container = document.getElementById(cid);
    container.addEventListener('click', e => { if(e.target.closest('.btn-remove-image')) e.target.closest('.image-url-item').remove(); });
}
function addImageInput(cid, val='') {
    const item = document.createElement('div');
    item.className = 'image-url-item';
    item.innerHTML = `${imageUploaderMarkup(false)}<button type="button" class="btn-remove-image" aria-label="Remove image">${ICONS.x}</button>`;
    document.getElementById(cid).appendChild(item);
    if (val) setUploaderValue(item, val, 'Saved image');
    item.querySelector('input[type="file"]').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        try { setUploaderBusy(item, true); setUploaderValue(item, await compressImage(file), file.size > MAX_IMAGE_BYTES ? 'Compressed to under 50 KB' : `${Math.ceil(file.size / 1024)} KB`); }
        catch (error) { event.target.value = ''; showStatus(null, error.message); }
        finally { setUploaderBusy(item, false); }
    });
}
function getImageUrlsFromUploader(cid) { return Array.from(document.getElementById(cid).querySelectorAll('.image-url-item')).map(item => item.dataset.imageValue || '').filter(Boolean); }
function populateImageUploader(cid, urls) { const c=document.getElementById(cid); c.innerHTML=''; (urls&&urls.length?urls:['']).forEach(u=>addImageInput(cid, u)); }

function setupMoreLinksUploader(cid, bid) {
    const btn = document.getElementById(bid);
    if(btn) btn.onclick = () => addLinkInput(cid);
    document.getElementById(cid).addEventListener('click', e => { if(e.target.closest('.btn-remove-link')) e.target.closest('.link-url-item').remove(); });
}
function addLinkInput(cid, d={title:'',url:''}) {
    document.getElementById(cid).insertAdjacentHTML('beforeend', `<div class="link-url-item"><input type="text" class="link-title-input" value="${d.title}" placeholder="Title"><input type="text" class="link-url-input" value="${d.url}" placeholder="URL"><button type="button" class="btn-remove-link">${ICONS.x}</button></div>`);
}
function getMoreLinksFromUploader(cid) { 
    return Array.from(document.getElementById(cid).querySelectorAll('.link-url-item')).map(d => ({ title: d.querySelector('.link-title-input').value.trim(), url: d.querySelector('.link-url-input').value.trim() })).filter(l => l.title && l.url); 
}
function populateMoreLinksUploader(cid, links) { const c=document.getElementById(cid); c.innerHTML=''; (links&&links.length?links:[{title:'',url:''}]).forEach(l=>addLinkInput(cid, l)); }

// Deletion
document.body.addEventListener('click', e => {
    if(e.target.classList.contains('btn-delete')) {
        deleteInfo = { id: e.target.dataset.id, type: e.target.dataset.type };
        document.getElementById('confirm-message').textContent = `Delete this ${deleteInfo.type}?`;
        confirmModal.style.display = 'flex';
    }
    if(e.target.classList.contains('btn-edit')) openEditModal(e.target.dataset.id, e.target.dataset.type);
});
confirmBtnCancel.onclick = confirmCloseButton.onclick = () => confirmModal.style.display = 'none';
confirmBtnDelete.onclick = async () => {
    disableButton(confirmBtnDelete, "Deleting...");
    try {
        await deleteDoc(doc(db, deleteInfo.type==='product'?'products':deleteInfo.type==='category'?'categories':'heroSlides', deleteInfo.id));
        showStatus(null, "Deleted Successfully", false);
    } catch(e) { showStatus(null, e.message); } finally { enableButton(confirmBtnDelete, "Delete"); confirmModal.style.display='none'; }
};

// Edit Modal
async function openEditModal(id, type) {
    editModal.style.display = 'flex';
    modalForm.innerHTML = '<p style="text-align:center;padding:20px;">Loading...</p>';
    try {
        const col = type === 'product' ? 'products' : 'categories';
        const docSnap = await getDoc(doc(db, col, id));
        if(!docSnap.exists()) throw new Error("Item not found");
        const data = docSnap.data();

        if(type === 'category') {
            modalForm.innerHTML = `<input type="hidden" id="edit-id" value="${id}"><input type="hidden" id="edit-type" value="category"><div class="form-group"><label>Name</label><input type="text" id="edit-cat-name" value="${data.name}"></div><div class="form-group"><label>Category Image</label><p class="image-upload-hint">Recommended ratio: 1:1 (square). Images larger than 50 KB are compressed automatically.</p><div id="edit-cat-img" class="single-image-uploader" data-required="true"></div></div><button type="submit" class="btn btn-save" style="margin-top:20px;width:100%" id="save-edit-btn">Save Changes</button>`;
             setupSingleImageUploader('edit-cat-img');
             setSingleImageValue('edit-cat-img', data.imageUrl || '');
        } else {
             const catsSnap = await getDocs(query(collection(db, "categories")));
             let catOptions = '';
             catsSnap.forEach(c => catOptions += `<option value="${c.id}" ${c.id===data.categoryId?'selected':''}>${c.data().name}</option>`);
             modalForm.innerHTML = `<input type="hidden" id="edit-id" value="${id}"><input type="hidden" id="edit-type" value="product"><div class="form-grid"><div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${data.name}"></div><div class="form-group"><label>Category</label><select id="edit-cat">${catOptions}</select></div><div class="form-group"><label>Price</label><input type="number" id="edit-price" value="${data.price}"></div><div class="form-group"><label>MRP</label><input type="number" id="edit-mrp" value="${data.mrp}"></div><div class="form-group checkbox-group"><input type="checkbox" id="edit-featured" ${data.featured?'checked':''}><label>Featured</label></div><div class="form-group full-width"><label>Specification</label><textarea id="edit-spec" rows="3">${data.specification||''}</textarea></div><div class="form-group full-width"><label>Description</label><textarea id="edit-desc" rows="3">${data.description||''}</textarea></div><div class="form-group full-width"><label>Images</label><p class="image-upload-hint">Recommended ratio: 1:1 (square). Images larger than 50 KB are compressed automatically.</p><div id="edit-image-list" class="image-url-list"></div><button type="button" id="btn-add-edit-image" class="btn btn-secondary" style="margin-top:5px;">${ICONS.edit.replace('Edit', '')} Add Image</button></div><div class="form-group full-width"><label>More Links</label><div id="edit-link-list" class="link-url-list"></div><button type="button" id="btn-add-edit-link" class="btn btn-secondary" style="margin-top:5px;">Add Link</button></div></div><button type="submit" class="btn btn-save" style="margin-top:20px;width:100%" id="save-edit-btn">Save Changes</button>`;
             setupImageUploader('edit-image-list', 'btn-add-edit-image');
             populateImageUploader('edit-image-list', data.images);
             setupMoreLinksUploader('edit-link-list', 'btn-add-edit-link');
             populateMoreLinksUploader('edit-link-list', data.moreLinks);
        }
        document.getElementById('save-edit-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.target;
            disableButton(btn, "Saving...");
            try {
                const eId = document.getElementById('edit-id').value;
                const eType = document.getElementById('edit-type').value;
                let updateData = {};
                if(eType === 'category') {
                    const imageUrl = getSingleImageValue('edit-cat-img');
                    if (!imageUrl) throw new Error('Please select a category image.');
                    updateData = { name: document.getElementById('edit-cat-name').value, imageUrl };
                } else {
                    const imgs = getImageUrlsFromUploader('edit-image-list');
                    if(!imgs.length) throw new Error("At least 1 image required");
                    updateData = {
                        name: document.getElementById('edit-name').value, categoryId: document.getElementById('edit-cat').value,
                        price: Number(document.getElementById('edit-price').value), mrp: Number(document.getElementById('edit-mrp').value),
                        featured: document.getElementById('edit-featured').checked, specification: document.getElementById('edit-spec').value,
                        description: document.getElementById('edit-desc').value, images: imgs, moreLinks: getMoreLinksFromUploader('edit-link-list')
                    };
                }
                await updateDoc(doc(db, col, eId), updateData);
                showStatus(null, "Updated Successfully!", false);
                editModal.style.display = 'none';
            } catch(err) { showStatus(null, err.message); enableButton(btn, "Save Changes"); }
        });
    } catch(e) { console.error(e); editModal.style.display = 'none'; showStatus(null, e.message); }
}
modalCloseButton.onclick = () => editModal.style.display = 'none';