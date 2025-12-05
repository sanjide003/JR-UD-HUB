// admin.js - Updated with Floating Toasts

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
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js';

// --- DOM Elements ---
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");

const logoutButtons = document.querySelectorAll(".logout-action-btn");
const toastContainer = document.getElementById("toast-container"); // New Container

// Nav Elements
const adminNavOpenBtn = document.getElementById("admin-nav-open-btn");
const adminNavCloseBtn = document.getElementById("admin-nav-close-btn");
const adminSideNav = document.getElementById("admin-side-nav");
const adminNavOverlay = document.getElementById("admin-nav-overlay");
const adminNavLinks = document.querySelector(".admin-nav-links");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

// Page & Forms
const pageContents = document.querySelectorAll(".page-content");
const navLinks = document.querySelectorAll(".nav-link");

const addCategoryForm = document.getElementById("add-category-form");
const categoriesListBody = document.getElementById("categories-list-body");
const addProductForm = document.getElementById("add-product-form");
const productsListBody = document.getElementById("products-list-body");
const featuredProductsListBody = document.getElementById("featured-products-list-body"); 
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");

// Modals
const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalForm = document.getElementById("modal-form");
const confirmModal = document.getElementById("confirm-modal");
const confirmBtnDelete = document.getElementById("confirm-btn-delete");
const confirmCloseButton = document.getElementById("confirm-close-button");
const confirmBtnCancel = document.getElementById("confirm-btn-cancel");

// State
let currentProductsQuery = null;
let currentFeaturedQuery = null;
let deleteInfo = { id: null, type: null }; 
let allProductsCache = []; 

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('admin-theme') || 'dark';
    if (savedTheme === 'light') document.body.classList.add('light-mode');
}
initTheme();

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('admin-theme', theme);
    });
}

// --- Helper Functions (Updated) ---

// New Floating Toast Notification
function showStatus(elementIgnored, message, isError = true) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.innerHTML = `
        <span>${isError ? '⚠️' : '✅'}</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function disableButton(button, text = "Wait...") {
    if (!button) return;
    button.disabled = true;
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    if (btnText) btnText.textContent = text;
    if (btnLoader) btnLoader.style.display = 'inline-block';
}

function enableButton(button, defaultText) {
    if (!button) return;
    button.disabled = false;
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    if (btnText) btnText.textContent = defaultText;
    if (btnLoader) btnLoader.style.display = 'none';
}

// --- Auth Logic ---
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    disableButton(loginButton, "Logging in..."); 
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showStatus(null, `Login Failed: ${error.message}`);
    } finally {
        enableButton(loginButton, "Login"); 
    }
});

logoutButtons.forEach(btn => {
    btn.addEventListener("click", () => signOut(auth));
});

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

function loadInitialData() {
    loadCategories();
    loadProducts("all"); 
    loadFeaturedProducts(); 
    loadHeroSlides(); 
    loadAllSettings();
    cacheAllProductsForSearch(); 
    setupImageUploader('product-image-list-container', 'add-image-url-btn');
    setupMoreLinksUploader('product-more-links-container', 'add-more-link-btn');
    
    const imgContainer = document.getElementById("product-image-list-container");
    if (imgContainer && imgContainer.children.length === 0) addImageInput('product-image-list-container');
    
    const linkContainer = document.getElementById("product-more-links-container");
    if (linkContainer && linkContainer.children.length === 0) addMoreLinkInput('product-more-links-container');
}

// --- Navigation Logic ---
function closeAdminNav() {
    adminSideNav.classList.remove("open");
    adminNavOverlay.classList.remove("open");
}
adminNavOpenBtn.addEventListener("click", () => {
    adminSideNav.classList.add("open");
    adminNavOverlay.classList.add("open");
});
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

// --- Settings Logic ---
async function loadAllSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
            
            setVal("setting-logo-image-url", settings.logoImageUrl);
            setVal("setting-logo-text", settings.logoText);
            setVal("setting-logo-subtitle", settings.logoSubtitle);
            setVal("setting-home-banner-url", settings.homeBannerUrl);
            setVal("setting-chatbot-number", settings.chatbotNumber);
            setVal("setting-dealer-number", settings.dealerChatNumber);
            setVal("setting-phone", settings.phone);
            setVal("setting-email", settings.email);
            setVal("setting-address", settings.address);
            setVal("setting-whatsapp", settings.whatsapp);
            setVal("setting-follow-whatsapp", settings.followWhatsapp);
            setVal("setting-facebook-url", settings.facebookUrl);
            setVal("setting-instagram-url", settings.instagramUrl);
            setVal("setting-youtube-url", settings.youtubeUrl);
            
            const titleElement = document.getElementById("admin-panel-title");
            if (titleElement && settings.logoText) titleElement.textContent = `${settings.logoText} - Admin`;
            
            document.getElementById("setting-logo-image-url").dispatchEvent(new Event('input'));
            document.getElementById("setting-home-banner-url").dispatchEvent(new Event('input'));
        }
    } catch (error) { console.error(error); }
}

async function saveSettings(formId, btnId, defaultBtnText, dataBuilder) {
    const form = document.getElementById(formId);
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById(btnId);
        disableButton(btn, "Saving...");
        try {
            const data = dataBuilder();
            await setDoc(doc(db, "settings", "global"), data, { merge: true });
            showStatus(null, "Settings saved successfully!", false);
            if (data.logoText) {
                const titleElement = document.getElementById("admin-panel-title");
                if (titleElement) titleElement.textContent = `${data.logoText} - Admin`;
            }
        } catch (error) {
            showStatus(null, `Error: ${error.message}`);
        } finally {
            enableButton(btn, defaultBtnText);
        }
    });
}

saveSettings("general-settings-form", "save-general-settings-button", "Save General Settings", () => ({
    logoImageUrl: document.getElementById("setting-logo-image-url").value,
    logoText: document.getElementById("setting-logo-text").value,
    logoSubtitle: document.getElementById("setting-logo-subtitle").value,
    homeBannerUrl: document.getElementById("setting-home-banner-url").value,
    chatbotNumber: document.getElementById("setting-chatbot-number").value,
    dealerChatNumber: document.getElementById("setting-dealer-number").value
}));

saveSettings("contact-settings-form", "save-contact-settings-button", "Save Contact Details", () => ({
    phone: document.getElementById("setting-phone").value,
    email: document.getElementById("setting-email").value,
    address: document.getElementById("setting-address").value,
    whatsapp: document.getElementById("setting-whatsapp").value,
}));

saveSettings("follow-settings-form", "save-follow-settings-button", "Save 'Follow Us' Links", () => ({
    followWhatsapp: document.getElementById("setting-follow-whatsapp").value,
    facebookUrl: document.getElementById("setting-facebook-url").value,
    instagramUrl: document.getElementById("setting-instagram-url").value,
    youtubeUrl: document.getElementById("setting-youtube-url").value,
}));

// --- Categories Logic ---
function loadCategories() {
    const q = query(collection(db, "categories"), orderBy("name"));
    const select = document.getElementById("product-category");
    const filter = document.getElementById("product-filter-category");
    
    onSnapshot(q, (snapshot) => {
        categoriesListBody.innerHTML = '';
        select.innerHTML = '<option value="">Select a category...</option>';
        filter.innerHTML = '<option value="all">All Categories</option>';
        
        if (snapshot.empty) {
            categoriesListBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No categories found.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const cat = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Image"><img src="${cat.imageUrl}" alt="${cat.name}"></td>
                <td data-label="Name">${cat.name}</td>
                <td data-label="Actions">
                    <button class="btn-edit" data-id="${doc.id}" data-type="category">Edit</button>
                    <button class="btn-delete" data-id="${doc.id}" data-type="category">Delete</button>
                </td>
            `;
            categoriesListBody.appendChild(row);

            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = cat.name;
            select.appendChild(opt.cloneNode(true));
            filter.appendChild(opt.cloneNode(true));
        });
    });
}

addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-category-button");
    disableButton(btn, "Adding...");
    try {
        await addDoc(collection(db, "categories"), {
            name: document.getElementById("category-name").value,
            imageUrl: document.getElementById("category-image-url").value,
            createdAt: serverTimestamp()
        });
        showStatus(null, "Category added successfully!", false);
        addCategoryForm.reset();
        document.getElementById('category-image-preview').innerHTML = '';
    } catch (err) { showStatus(null, err.message); }
    finally { enableButton(btn, "Add Category"); }
});

// --- Products Logic ---
function loadProducts(categoryId = "all") {
    let q;
    if (categoryId === "all") q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    else q = query(collection(db, "products"), where("categoryId", "==", categoryId));
    
    if (currentProductsQuery) currentProductsQuery(); 
    
    currentProductsQuery = onSnapshot(q, (snapshot) => {
        productsListBody.innerHTML = '';
        if (snapshot.empty) {
            productsListBody.innerHTML = '<tr><td colspan="4" style="text-align:center">No products found.</td></tr>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const p = doc.data();
            const img = p.images && p.images[0] ? p.images[0] : '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Image"><img src="${img}" alt="${p.name}"></td>
                <td data-label="Name">${p.name} ${p.featured ? '⭐' : ''}</td>
                <td data-label="Price">₹${p.price}</td>
                <td data-label="Actions">
                    <button class="btn-edit" data-id="${doc.id}" data-type="product">Edit</button>
                    <button class="btn-delete" data-id="${doc.id}" data-type="product">Delete</button>
                </td>
            `;
            productsListBody.appendChild(row);
        });
    });
}

document.getElementById("product-filter-category").addEventListener("change", (e) => loadProducts(e.target.value));

addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-product-button");
    disableButton(btn, "Adding...");
    
    try {
        const imageUrls = getImageUrlsFromUploader('product-image-list-container');
        if (!imageUrls.length) throw new Error("Add at least one image.");
        
        const product = {
            categoryId: document.getElementById("product-category").value,
            name: document.getElementById("product-name").value,
            specification: document.getElementById("product-specification").value,
            mrp: Number(document.getElementById("product-mrp").value) || 0,
            price: Number(document.getElementById("product-price").value) || 0,
            description: document.getElementById("product-description").value,
            featured: document.getElementById("product-featured").checked,
            images: imageUrls,
            moreLinks: getMoreLinksFromUploader('product-more-links-container'),
            createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, "products"), product);
        showStatus(null, "Product added successfully!", false);
        // Reset form but keep user on this tab
        addProductForm.reset();
        populateImageUploader('product-image-list-container', []);
        populateMoreLinksUploader('product-more-links-container', []);
        document.getElementById("product-image-list-container").innerHTML = '';
        addImageInput('product-image-list-container');
    } catch (err) { showStatus(null, err.message); }
    finally { enableButton(btn, "Add Product"); }
});

// --- Featured & Search ---
function cacheAllProductsForSearch() {
    const q = query(collection(db, "products"));
    onSnapshot(q, (snap) => {
        allProductsCache = [];
        snap.forEach(d => allProductsCache.push({ id: d.id, ...d.data() }));
    });
}

const featuredSearchInput = document.getElementById("featured-product-search");
const featuredSearchResults = document.getElementById("featured-search-results");

featuredSearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    featuredSearchResults.innerHTML = '';
    
    if (term.length < 2) {
        featuredSearchResults.style.display = 'none';
        return;
    }

    const filtered = allProductsCache.filter(p => !p.featured && p.name.toLowerCase().includes(term));
    
    if (filtered.length > 0) {
        featuredSearchResults.style.display = 'block';
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            const img = p.images?.[0] || '';
            div.innerHTML = `
                <img src="${img}" style="width:30px;height:30px;border-radius:4px;margin-right:10px">
                <span style="flex:1">${p.name} - ₹${p.price}</span>
                <button class="search-result-add-btn btn-secondary" style="padding:2px 8px;font-size:0.8rem">Add</button>
            `;
            div.querySelector('button').addEventListener('click', async () => {
                await updateDoc(doc(db, "products", p.id), { featured: true });
                featuredSearchInput.value = '';
                featuredSearchResults.style.display = 'none';
                showStatus(null, "Added to Featured List!", false);
            });
            featuredSearchResults.appendChild(div);
        });
    } else {
        featuredSearchResults.style.display = 'none';
    }
});

function loadFeaturedProducts() {
    const q = query(collection(db, "products"), where("featured", "==", true));
    if (currentFeaturedQuery) currentFeaturedQuery();
    
    currentFeaturedQuery = onSnapshot(q, (snap) => {
        featuredProductsListBody.innerHTML = '';
        if (snap.empty) {
            featuredProductsListBody.innerHTML = '<tr><td colspan="4" style="text-align:center">No featured products.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const p = d.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Image"><img src="${p.images?.[0]||''}" alt="${p.name}"></td>
                <td data-label="Name">${p.name}</td>
                <td data-label="Price">₹${p.price}</td>
                <td data-label="Actions">
                    <button class="btn-remove-featured" data-id="${d.id}">Remove</button>
                </td>
            `;
            row.querySelector('.btn-remove-featured').addEventListener('click', async () => {
                if(confirm("Remove from featured?")) {
                    await updateDoc(doc(db, "products", d.id), { featured: false });
                    showStatus(null, "Removed from Featured List", false);
                }
            });
            featuredProductsListBody.appendChild(row);
        });
    });
}

// --- Hero Slides ---
addHeroSlideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("add-hero-slide-button");
    disableButton(btn, "Adding...");
    try {
        await addDoc(collection(db, "heroSlides"), {
            url: document.getElementById("hero-slide-url").value,
            type: document.getElementById("hero-slide-type").value,
            order: Number(document.getElementById("hero-slide-order").value) || 1,
            createdAt: serverTimestamp()
        });
        showStatus(null, "Slide added successfully!", false);
        addHeroSlideForm.reset();
    } catch(err) { showStatus(null, err.message); }
    finally { enableButton(btn, "Add Slide"); }
});

function loadHeroSlides() {
    const q = query(collection(db, "heroSlides"), orderBy("order"));
    onSnapshot(q, (snap) => {
        heroSlidesListBody.innerHTML = '';
        if(snap.empty) { heroSlidesListBody.innerHTML = '<tr><td colspan="5">No slides.</td></tr>'; return; }
        snap.forEach(d => {
            const s = d.data();
            const prev = s.type === 'image' ? `<img src="${s.url}" width="50">` : 'Video';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Preview">${prev}</td>
                <td data-label="Type">${s.type}</td>
                <td data-label="Order">${s.order}</td>
                <td data-label="URL" style="word-break:break-all;font-size:0.8rem">${s.url}</td>
                <td data-label="Actions"><button class="btn-delete" data-id="${d.id}" data-type="heroSlide">Delete</button></td>
            `;
            heroSlidesListBody.appendChild(row);
        });
    });
}

// --- Uploader UI ---
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(previewId);
    if(!input || !box) return;
    const update = () => {
        const val = input.value.trim();
        box.innerHTML = val ? `<img src="${val}" style="width:100%;height:100%;object-fit:cover">` : '';
    };
    input.addEventListener('input', update);
}
setupImagePreview('category-image-url', 'category-image-preview');
setupImagePreview('setting-logo-image-url', 'logo-preview');
setupImagePreview('setting-home-banner-url', 'banner-preview');

function setupImageUploader(containerId, btnId) {
    const btn = document.getElementById(btnId);
    if(btn) btn.addEventListener('click', () => addImageInput(containerId));
    
    document.getElementById(containerId).addEventListener('click', (e) => {
        if(e.target.closest('.btn-remove-image')) e.target.closest('.image-url-item').remove();
    });
    
    document.getElementById(containerId).addEventListener('input', (e) => {
         if (e.target.tagName === 'INPUT') {
            const img = e.target.closest('.image-url-item').querySelector('img');
            if(img) img.src = e.target.value || '';
        }
    });
}

function addImageInput(containerId, url='') {
    const div = document.createElement('div');
    div.className = 'image-url-item';
    div.innerHTML = `
        <img src="${url}" class="image-preview-item" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='">
        <input type="text" value="${url}" placeholder="Image URL">
        <button type="button" class="btn-remove-image">&times;</button>
    `;
    document.getElementById(containerId).appendChild(div);
}

function getImageUrlsFromUploader(id) {
    const urls = [];
    document.getElementById(id).querySelectorAll('input').forEach(i => {
        if(i.value.trim()) urls.push(i.value.trim());
    });
    return urls;
}

function populateImageUploader(id, urls) {
    const c = document.getElementById(id);
    c.innerHTML = '';
    if(urls && urls.length) urls.forEach(u => addImageInput(id, u));
    else addImageInput(id);
}

function setupMoreLinksUploader(cId, btnId) {
    const btn = document.getElementById(btnId);
    if(btn) btn.addEventListener('click', () => addMoreLinkInput(cId));
    document.getElementById(cId).addEventListener('click', (e) => {
        if(e.target.closest('.btn-remove-link')) e.target.closest('.link-url-item').remove();
    });
}

function addMoreLinkInput(cId, data={title:'', url:''}) {
    const div = document.createElement('div');
    div.className = 'link-url-item';
    div.innerHTML = `
        <input type="text" class="link-title-input" value="${data.title}" placeholder="Title">
        <input type="text" class="link-url-input" value="${data.url}" placeholder="URL">
        <button type="button" class="btn-remove-link">&times;</button>
    `;
    document.getElementById(cId).appendChild(div);
}

function getMoreLinksFromUploader(cId) {
    const links = [];
    document.getElementById(cId).querySelectorAll('.link-url-item').forEach(d => {
        const t = d.querySelector('.link-title-input').value.trim();
        const u = d.querySelector('.link-url-input').value.trim();
        if(t && u) links.push({title:t, url:u});
    });
    return links;
}

function populateMoreLinksUploader(cId, links) {
    const c = document.getElementById(cId);
    c.innerHTML = '';
    if(links && links.length) links.forEach(l => addMoreLinkInput(cId, l));
    else addMoreLinkInput(cId);
}

// --- Deletion & Edit ---
document.body.addEventListener('click', (e) => {
    if(e.target.classList.contains('btn-delete')) {
        deleteInfo = { id: e.target.dataset.id, type: e.target.dataset.type };
        document.getElementById('confirm-message').textContent = `Delete this ${deleteInfo.type}?`;
        confirmModal.style.display = 'flex';
    }
    if(e.target.classList.contains('btn-edit')) {
        openEditModal(e.target.dataset.id, e.target.dataset.type);
    }
});

confirmCloseButton.addEventListener('click', () => confirmModal.style.display = 'none');
confirmBtnCancel.addEventListener('click', () => confirmModal.style.display = 'none');

confirmBtnDelete.addEventListener('click', async () => {
    if(!deleteInfo.id) return;
    disableButton(confirmBtnDelete, "Deleting...");
    try {
        const col = deleteInfo.type === 'product' ? 'products' : 
                   deleteInfo.type === 'category' ? 'categories' : 'heroSlides';
        await deleteDoc(doc(db, col, deleteInfo.id));
        showStatus(null, "Item deleted successfully!", false);
    } catch(err) { showStatus(null, err.message); }
    finally { 
        enableButton(confirmBtnDelete, "Confirm Delete");
        confirmModal.style.display = 'none';
    }
});

// Edit Modal
async function openEditModal(id, type) {
    editModal.style.display = 'flex';
    modalForm.innerHTML = '<p>Loading...</p>';
    
    try {
        const col = type === 'product' ? 'products' : 'categories';
        const d = await getDoc(doc(db, col, id));
        if(!d.exists()) throw new Error("Not found");
        const data = d.data();
        
        if(type === 'category') {
            modalForm.innerHTML = `
                <input type="hidden" id="edit-id" value="${id}"><input type="hidden" id="edit-type" value="category">
                <div class="form-group"><label>Name</label><input type="text" id="edit-cat-name" value="${data.name}"></div>
                <div class="form-group"><label>Image URL</label><input type="text" id="edit-cat-img" value="${data.imageUrl}"></div>
                <button type="submit" class="btn btn-save" id="save-edit-btn">Save Changes</button>
            `;
        } else {
             const cats = await getDocs(query(collection(db, "categories")));
             let catOptions = '';
             cats.forEach(c => catOptions += `<option value="${c.id}" ${c.id===data.categoryId?'selected':''}>${c.data().name}</option>`);

             modalForm.innerHTML = `
                <input type="hidden" id="edit-id" value="${id}"><input type="hidden" id="edit-type" value="product">
                <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${data.name}"></div>
                <div class="form-group"><label>Category</label><select id="edit-cat">${catOptions}</select></div>
                <div class="form-group"><label>Price</label><input type="number" id="edit-price" value="${data.price}"></div>
                <div class="form-group"><label>MRP</label><input type="number" id="edit-mrp" value="${data.mrp}"></div>
                <div class="form-group"><label>Specification</label><textarea id="edit-spec">${data.specification||''}</textarea></div>
                <div class="form-group"><label>Description</label><textarea id="edit-desc">${data.description||''}</textarea></div>
                <div class="form-group"><label>Images (URLs)</label><textarea id="edit-images">${data.images?.join(',')||''}</textarea></div>
                <button type="submit" class="btn btn-save" id="save-edit-btn">Save Changes</button>
             `;
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
                    updateData = {
                        name: document.getElementById('edit-cat-name').value,
                        imageUrl: document.getElementById('edit-cat-img').value
                    };
                } else {
                    const imgStr = document.getElementById('edit-images').value;
                    const imgs = imgStr.split(',').map(s=>s.trim()).filter(s=>s);
                    updateData = {
                        name: document.getElementById('edit-name').value,
                        categoryId: document.getElementById('edit-cat').value,
                        price: Number(document.getElementById('edit-price').value),
                        mrp: Number(document.getElementById('edit-mrp').value),
                        specification: document.getElementById('edit-spec').value,
                        description: document.getElementById('edit-desc').value,
                        images: imgs
                    };
                }
                
                await updateDoc(doc(db, col, eId), updateData);
                showStatus(null, "Updated successfully!", false);
                editModal.style.display = 'none';
            } catch(err) { console.error(err); alert("Error saving"); enableButton(btn, "Save Changes"); }
        });
        
    } catch(err) { console.error(err); editModal.style.display = 'none'; }
}

modalCloseButton.addEventListener('click', () => editModal.style.display = 'none');