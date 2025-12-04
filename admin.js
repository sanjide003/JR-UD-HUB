// admin.js - Updated with Correct Button Colors
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, getDocs, setDoc, doc, deleteDoc, updateDoc, onSnapshot, query, where, serverTimestamp, orderBy, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';

// --- Login & Navigation Logic ---
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");
const logoutButtons = document.querySelectorAll(".logout-action-btn");
const adminNavOpenBtn = document.getElementById("admin-nav-open-btn");
const adminNavCloseBtn = document.getElementById("admin-nav-close-btn");
const adminSideNav = document.getElementById("admin-side-nav");
const adminNavOverlay = document.getElementById("admin-nav-overlay");
const adminNavLinks = document.querySelector(".admin-nav-links");
const pageContents = document.querySelectorAll(".page-content");
const navLinks = document.querySelectorAll(".nav-link");

// --- Forms & Inputs ---
const addCategoryForm = document.getElementById("add-category-form");
const categoriesListBody = document.getElementById("categories-list-body");
const productCategorySelect = document.getElementById("product-category");
const productsListBody = document.getElementById("products-list-body");
const productFilterCategory = document.getElementById("product-filter-category");
const addProductForm = document.getElementById("add-product-form");
const productImageContainer = document.getElementById("product-image-list-container");
const productMoreLinksContainer = document.getElementById("product-more-links-container");
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");
const featuredSearchInput = document.getElementById("featured-product-search");
const featuredSearchResults = document.getElementById("featured-search-results");
const featuredProductsListBody = document.getElementById("featured-products-list-body");
const generalSettingsForm = document.getElementById("general-settings-form");
const contactSettingsForm = document.getElementById("contact-settings-form");
const followSettingsForm = document.getElementById("follow-settings-form");

// --- Modals ---
const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const confirmModal = document.getElementById("confirm-modal");
const confirmCloseButton = document.getElementById("confirm-close-button");
const confirmBtnCancel = document.getElementById("confirm-btn-cancel");
const confirmBtnDelete = document.getElementById("confirm-btn-delete");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");

let currentProductsQuery = null;
let currentFeaturedQuery = null;
let deleteInfo = { id: null, type: null }; 
let allProductsCache = []; 

function showStatus(element, message, isError = true) {
    if(!element) return;
    element.textContent = message;
    element.className = isError ? 'status-message error' : 'status-message success';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 4000);
}

function disableButton(button, text) {
    if (!button) return;
    button.disabled = true;
    button.textContent = text;
}
function enableButton(button, text) {
    if (!button) return;
    button.disabled = false;
    button.textContent = text;
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    disableButton(loginButton, "Logging in..."); 
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showStatus(loginStatus, `Login Failed: ${error.message}`);
    } finally {
        enableButton(loginButton, "Login"); 
    }
});

logoutButtons.forEach(btn => btn.addEventListener("click", () => signOut(auth)));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = "none";
        adminPanel.style.display = "block";
        loadCategories();
        loadProducts("all"); 
        loadFeaturedProducts(); 
        loadHeroSlides(); 
        loadAllSettings();
        cacheAllProductsForSearch(); 
        
        setupImageUploader('product-image-list-container', 'add-image-url-btn');
        if (productImageContainer.children.length === 0) addImageInput('product-image-list-container');
        
        setupMoreLinksUploader('product-more-links-container', 'add-more-link-btn');
        if (productMoreLinksContainer.children.length === 0) addMoreLinkInput('product-more-links-container');
    } else {
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
    }
});

function closeAdminNav() { adminSideNav.classList.remove("open"); adminNavOverlay.classList.remove("open"); }
adminNavOpenBtn.addEventListener("click", () => { adminSideNav.classList.add("open"); adminNavOverlay.classList.add("open"); });
adminNavCloseBtn.addEventListener("click", closeAdminNav);
adminNavOverlay.addEventListener("click", closeAdminNav);
adminNavLinks.addEventListener("click", (e) => {
    if (e.target.classList.contains("nav-link")) {
        const pageId = e.target.getAttribute("data-page");
        pageContents.forEach(item => item.classList.remove("active"));
        navLinks.forEach(item => item.classList.remove("active"));
        document.getElementById(pageId).classList.add("active");
        e.target.classList.add("active");
        closeAdminNav(); 
    }
});

// --- Dynamic Inputs (Image & Links) ---
function setupImageUploader(containerId, addBtnId) {
    const container = document.getElementById(containerId);
    const addBtn = document.getElementById(addBtnId);
    if (!container || !addBtn) return;
    
    // Remove existing to avoid dupes
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    
    newBtn.addEventListener('click', () => addImageInput(containerId));
    container.onclick = (e) => { if (e.target.closest('.btn-remove-image')) e.target.closest('.image-url-item').remove(); };
    container.oninput = (e) => {
        if (e.target.tagName === 'INPUT') {
            const url = e.target.value.trim();
            const img = e.target.closest('.image-url-item').querySelector('.image-preview-item');
            if(img) img.src = url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        }
    };
}

function addImageInput(containerId, url = '') {
    const container = document.getElementById(containerId);
    const item = document.createElement('div');
    item.className = 'image-url-item';
    item.innerHTML = `<img src="${url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="image-preview-item"><input type="text" value="${url}" placeholder="Image URL"><button type="button" class="btn-remove-icon btn-remove-image">&times;</button>`;
    container.appendChild(item);
}

function getImageUrlsFromUploader(containerId) {
    const container = document.getElementById(containerId);
    const urls = [];
    container.querySelectorAll('input').forEach(inp => { if(inp.value.trim()) urls.push(inp.value.trim()); });
    return urls;
}

function populateImageUploader(containerId, urls) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if(urls && urls.length > 0) urls.forEach(u => addImageInput(containerId, u)); else addImageInput(containerId);
}

function setupMoreLinksUploader(containerId, addBtnId) {
    const container = document.getElementById(containerId);
    const addBtn = document.getElementById(addBtnId);
    if (!container || !addBtn) return;
    
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    
    newBtn.addEventListener('click', () => addMoreLinkInput(containerId));
    container.onclick = (e) => { if (e.target.closest('.btn-remove-link')) e.target.closest('.link-url-item').remove(); };
}

function addMoreLinkInput(containerId, link = {title:'', url:''}) {
    const container = document.getElementById(containerId);
    const item = document.createElement('div');
    item.className = 'link-url-item';
    item.innerHTML = `<input type="text" class="link-title-input" value="${link.title}" placeholder="Title"><input type="text" class="link-url-input" value="${link.url}" placeholder="URL"><button type="button" class="btn-remove-icon btn-remove-link">&times;</button>`;
    container.appendChild(item);
}

function getMoreLinksFromUploader(containerId) {
    const container = document.getElementById(containerId);
    const links = [];
    container.querySelectorAll('.link-url-item').forEach(item => {
        const t = item.querySelector('.link-title-input').value.trim();
        const u = item.querySelector('.link-url-input').value.trim();
        if(t && u) links.push({title:t, url:u});
    });
    return links;
}

function populateMoreLinksUploader(containerId, links) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if(links && links.length > 0) links.forEach(l => addMoreLinkInput(containerId, l)); else addMoreLinkInput(containerId);
}

// --- Loading Data (Tables) ---
function loadCategories() {
    onSnapshot(query(collection(db, "categories"), orderBy("name")), (snap) => {
        categoriesListBody.innerHTML = '';
        if(snap.empty) { categoriesListBody.innerHTML = '<tr><td colspan="3">No categories</td></tr>'; return; }
        productCategorySelect.innerHTML = '<option value="">Select...</option>';
        productFilterCategory.innerHTML = '<option value="all">All Categories</option>';
        snap.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('tr');
            // Edit -> Blue, Delete -> Red
            row.innerHTML = `<td><img src="${d.imageUrl}"></td><td>${d.name}</td><td><button class="btn-edit" data-id="${doc.id}" data-type="category">Edit</button><button class="btn-delete" data-id="${doc.id}" data-type="category">Delete</button></td>`;
            categoriesListBody.appendChild(row);
            
            const opt = document.createElement('option'); opt.value=doc.id; opt.text=d.name;
            productCategorySelect.appendChild(opt.cloneNode(true));
            productFilterCategory.appendChild(opt.cloneNode(true));
        });
    });
}

function loadProducts(catId="all") {
    let q = catId==="all" ? query(collection(db, "products"), orderBy("createdAt", "desc")) : query(collection(db, "products"), where("categoryId", "==", catId));
    if(currentProductsQuery) currentProductsQuery();
    currentProductsQuery = onSnapshot(q, (snap) => {
        productsListBody.innerHTML = '';
        if(snap.empty) { productsListBody.innerHTML = '<tr><td colspan="4">No products</td></tr>'; return; }
        snap.forEach(doc => {
            const d = doc.data();
            const img = d.images?.[0] || '';
            const row = document.createElement('tr');
            row.innerHTML = `<td><img src="${img}"></td><td>${d.name} ${d.featured?'⭐':''}</td><td>₹${d.price}</td><td><button class="btn-edit" data-id="${doc.id}" data-type="product">Edit</button><button class="btn-delete" data-id="${doc.id}" data-type="product">Delete</button></td>`;
            productsListBody.appendChild(row);
        });
    });
}

function loadHeroSlides() {
    onSnapshot(query(collection(db, "heroSlides"), orderBy("order")), (snap) => {
        heroSlidesListBody.innerHTML = '';
        if(snap.empty) { heroSlidesListBody.innerHTML = '<tr><td colspan="4">No slides</td></tr>'; return; }
        snap.forEach(doc => {
            const d = doc.data();
            const content = d.type==='image' ? `<img src="${d.url}" style="width:80px;">` : 'Video';
            const row = document.createElement('tr');
            row.innerHTML = `<td>${content}</td><td>${d.type}</td><td>${d.order}</td><td><button class="btn-delete" data-id="${doc.id}" data-type="heroSlide">Delete</button></td>`;
            heroSlidesListBody.appendChild(row);
        });
    });
}

// --- CRUD Operations ---
addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    disableButton(document.getElementById('add-category-button'), "Adding...");
    try {
        await addDoc(collection(db, "categories"), { name: document.getElementById("category-name").value, imageUrl: document.getElementById("category-image-url").value, createdAt: serverTimestamp() });
        showStatus(document.getElementById('admin-status'), "Category Added", false);
        addCategoryForm.reset();
    } catch(e) { showStatus(document.getElementById('admin-status'), e.message); }
    finally { enableButton(document.getElementById('add-category-button'), "Add Category"); }
});

addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    disableButton(document.getElementById('add-product-button'), "Adding...");
    try {
        const imgs = getImageUrlsFromUploader('product-image-list-container');
        if(!imgs.length) throw new Error("Image required");
        await addDoc(collection(db, "products"), {
            categoryId: productCategorySelect.value,
            name: document.getElementById("product-name").value,
            price: Number(document.getElementById("product-price").value),
            mrp: Number(document.getElementById("product-mrp").value)||0,
            featured: document.getElementById("product-featured").checked,
            specification: document.getElementById("product-specification").value,
            description: document.getElementById("product-description").value,
            images: imgs,
            moreLinks: getMoreLinksFromUploader('product-more-links-container'),
            createdAt: serverTimestamp()
        });
        showStatus(document.getElementById('admin-status'), "Product Added", false);
        addProductForm.reset();
        populateImageUploader('product-image-list-container', []);
        populateMoreLinksUploader('product-more-links-container', []);
    } catch(e) { showStatus(document.getElementById('admin-status'), e.message); }
    finally { enableButton(document.getElementById('add-product-button'), "Save Product"); }
});

addHeroSlideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "heroSlides"), {
            url: document.getElementById("hero-slide-url").value,
            type: document.getElementById("hero-slide-type").value,
            order: Number(document.getElementById("hero-slide-order").value),
            createdAt: serverTimestamp()
        });
        addHeroSlideForm.reset();
    } catch(e){ console.error(e); }
});

// --- Settings ---
async function loadAllSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if(snap.exists()) {
            const s = snap.data();
            // Populate fields...
            document.getElementById("setting-logo-image-url").value = s.logoImageUrl || '';
            document.getElementById("setting-logo-text").value = s.logoText || '';
            document.getElementById("setting-logo-subtitle").value = s.logoSubtitle || '';
            document.getElementById("setting-home-banner-url").value = s.homeBannerUrl || '';
            document.getElementById("setting-chatbot-number").value = s.chatbotNumber || '';
            document.getElementById("setting-dealer-number").value = s.dealerChatNumber || '';
            document.getElementById("setting-phone").value = s.phone || '';
            document.getElementById("setting-email").value = s.email || '';
            document.getElementById("setting-address").value = s.address || '';
            document.getElementById("setting-whatsapp").value = s.whatsapp || '';
            document.getElementById("setting-follow-whatsapp").value = s.followWhatsapp || '';
            document.getElementById("setting-facebook-url").value = s.facebookUrl || '';
            document.getElementById("setting-instagram-url").value = s.instagramUrl || '';
            document.getElementById("setting-youtube-url").value = s.youtubeUrl || '';
        }
    } catch(e) {}
}

const settingsForms = [generalSettingsForm, contactSettingsForm, followSettingsForm];
settingsForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        disableButton(btn, "Saving...");
        try {
            await setDoc(doc(db, "settings", "global"), {
                // Collect all values safely
                logoImageUrl: document.getElementById("setting-logo-image-url").value,
                logoText: document.getElementById("setting-logo-text").value,
                logoSubtitle: document.getElementById("setting-logo-subtitle").value,
                homeBannerUrl: document.getElementById("setting-home-banner-url").value,
                chatbotNumber: document.getElementById("setting-chatbot-number").value,
                dealerChatNumber: document.getElementById("setting-dealer-number").value,
                phone: document.getElementById("setting-phone").value,
                email: document.getElementById("setting-email").value,
                address: document.getElementById("setting-address").value,
                whatsapp: document.getElementById("setting-whatsapp").value,
                followWhatsapp: document.getElementById("setting-follow-whatsapp").value,
                facebookUrl: document.getElementById("setting-facebook-url").value,
                instagramUrl: document.getElementById("setting-instagram-url").value,
                youtubeUrl: document.getElementById("setting-youtube-url").value,
            }, { merge: true });
            showStatus(document.getElementById('admin-status'), "Settings Saved", false);
        } catch(e) { showStatus(document.getElementById('admin-status'), e.message); }
        finally { enableButton(btn, "Save"); }
    });
});

// --- Edit/Delete Modals ---
document.body.addEventListener('click', (e) => {
    if(e.target.classList.contains('btn-delete')) openConfirmModal(e.target.dataset.id, e.target.dataset.type);
    if(e.target.classList.contains('btn-edit')) openEditModal(e.target.dataset.id, e.target.dataset.type);
});

function openConfirmModal(id, type) {
    deleteInfo = { id, type };
    confirmModal.style.display = 'flex';
}
confirmCloseButton.onclick = confirmBtnCancel.onclick = () => confirmModal.style.display = 'none';
confirmBtnDelete.onclick = async () => {
    try {
        let col = deleteInfo.type==='product'?'products':(deleteInfo.type==='category'?'categories':'heroSlides');
        await deleteDoc(doc(db, col, deleteInfo.id));
        confirmModal.style.display = 'none';
        showStatus(document.getElementById('admin-status'), "Deleted", false);
    } catch(e) { console.error(e); }
};

// Edit Modal Logic (Simplified for brevity, similar to Add logic)
async function openEditModal(id, type) {
    // ... (Existing logic to fetch doc and populate modalForm)
    // Ensure save button inside modal uses .btn-save class
}