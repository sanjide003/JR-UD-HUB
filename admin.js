// ഇതാണ് പുതിയ 'admin.js' ഫയൽ.
// *** മാറ്റം: അനോണിമസ് ലോഗിൻ ഉള്ളവർക്ക് അഡ്മിൻ പാനൽ കാണിക്കില്ല ***

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
const loginStatus = document.getElementById("login-status");
const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

const adminNavOpenBtn = document.getElementById("admin-nav-open-btn");
const adminNavCloseBtn = document.getElementById("admin-nav-close-btn");
const adminSideNav = document.getElementById("admin-side-nav");
const adminNavOverlay = document.getElementById("admin-nav-overlay");
const adminNavLinks = document.querySelector(".admin-nav-links");

const pageContents = document.querySelectorAll(".page-content");
const navLinks = document.querySelectorAll(".nav-link");

// Category elements
const addCategoryForm = document.getElementById("add-category-form");
const categoriesListBody = document.getElementById("categories-list-body");
const categoryImagePreview = document.getElementById("category-image-preview");

// Product elements
const addProductForm = document.getElementById("add-product-form");
const productCategorySelect = document.getElementById("product-category");
const productsListBody = document.getElementById("products-list-body");
const productFilterCategory = document.getElementById("product-filter-category");
const featuredProductsListBody = document.getElementById("featured-products-list-body"); 
const productImageContainer = document.getElementById("product-image-list-container");

// More Links ElementsElements
const productMoreLinksContainer = document.getElementById("product-more-links-container");

// Hero Slide Elements
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");

// Settings Form Elements
const generalSettingsForm = document.getElementById("general-settings-form");
const contactSettingsForm = document.getElementById("contact-settings-form");
const followSettingsForm = document.getElementById("follow-settings-form");

// Modal elements
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

// --- Helper Functions ---
function showStatus(element, message, isError = true) {
    element.textContent = message;
    element.className = isError ? 'status-message error' : 'status-message success';
    setTimeout(() => clearStatus(element), 4000);
}
function clearStatus(element) {
    element.textContent = '';
    element.className = 'status-message';
}
function disableButton(button, text = "Saving...") {
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


// --- 1. Authentication Logic ---
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus(loginStatus);
    disableButton(loginButton, "Logging in..."); 
    
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        // ഇമെയിൽ വഴി ലോഗിൻ ചെയ്യുന്നു. ഇത് നിലവിലുള്ള അനോണിമസ് യൂസറെ മാറ്റിക്കോളും.
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login Error:", error);
        showStatus(loginStatus, `Login Failed: ${error.message}`);
    } finally {
        enableButton(loginButton, "Login"); 
    }
});

logoutButton.addEventListener("click", () => {
    signOut(auth);
});

// *** പ്രധാന മാറ്റം ഇവിടെയാണ് ***
onAuthStateChanged(auth, (user) => {
    // user ഉണ്ട്, പക്ഷെ അത് അനോണിമസ് അല്ല എന്ന് ഉറപ്പാക്കുന്നു (!user.isAnonymous)
    if (user && !user.isAnonymous) {
        loginSection.style.display = "none";
        adminPanel.style.display = "block";
        
        loadCategories();
        loadProducts("all"); 
        loadFeaturedProducts(); 
        loadHeroSlides(); 
        loadAllSettings();
        
        setupImageUploader('product-image-list-container', 'add-image-url-btn');
        if (productImageContainer.children.length === 0) {
            addImageInput('product-image-list-container');
        }

        setupMoreLinksUploader('product-more-links-container', 'add-more-link-btn');
        if (productMoreLinksContainer.children.length === 0) {
            addMoreLinkInput('product-more-links-container');
        }

    } else {
        // ലോഗിൻ ചെയ്തിട്ടില്ല, അല്ലെങ്കിൽ അനോണിമസ് കസ്റ്റമർ ആണ്
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
    }
});


// --- 2. Admin Nav Logic ---
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

// --- 3. Image Preview Logic ---
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    function updatePreview() {
        previewContainer.innerHTML = '';
        const url = input.value.trim();
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; };
            previewContainer.appendChild(img);
        }
    }
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
}
setupImagePreview('category-image-url', 'category-image-preview');

// --- 4. Settings Logic ---
async function loadAllSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            document.getElementById("setting-logo-image-url").value = settings.logoImageUrl || '';
            document.getElementById("setting-logo-text").value = settings.logoText || '';
            document.getElementById("setting-logo-subtitle").value = settings.logoSubtitle || '';
            document.getElementById("setting-video-url").value = settings.videoUrl || '';
            document.getElementById("setting-home-banner-url").value = settings.homeBannerUrl || '';
            document.getElementById("setting-phone").value = settings.phone || '';
            document.getElementById("setting-email").value = settings.email || '';
            document.getElementById("setting-address").value = settings.address || '';
            document.getElementById("setting-whatsapp").value = settings.whatsapp || '';
            document.getElementById("setting-follow-whatsapp").value = settings.followWhatsapp || '';
            document.getElementById("setting-facebook-url").value = settings.facebookUrl || '';
            document.getElementById("setting-instagram-url").value = settings.instagramUrl || '';
            document.getElementById("setting-youtube-url").value = settings.youtubeUrl || '';

            const titleElement = document.getElementById("admin-panel-title");
            if (titleElement) {
                titleElement.textContent = `${settings.logoText || 'Admin'} - Panel`;
            }
        }
    } catch (error) {
        console.error("Error loading settings: ", error);
        showStatus(adminStatus, "Error loading site settings.");
    }
}
        
generalSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('save-general-settings-button');
    disableButton(button, "Saving...");
    try {
        const settings = {
            logoImageUrl: document.getElementById("setting-logo-image-url").value,
            logoText: document.getElementById("setting-logo-text").value,
            logoSubtitle: document.getElementById("setting-logo-subtitle").value,
            videoUrl: document.getElementById("setting-video-url").value,
            homeBannerUrl: document.getElementById("setting-home-banner-url").value,
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, "General settings saved!", false);
        const titleElement = document.getElementById("admin-panel-title");
        if (titleElement) {
            titleElement.textContent = `${settings.logoText || 'Admin'} - Panel`;
        }
    } catch (error) { showStatus(adminStatus, `Error: ${error.message}`); } 
    finally { enableButton(button, "Save General Settings"); }
});

contactSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('save-contact-settings-button');
    disableButton(button, "Saving...");
    try {
        const settings = {
            phone: document.getElementById("setting-phone").value,
            email: document.getElementById("setting-email").value,
            address: document.getElementById("setting-address").value,
            whatsapp: document.getElementById("setting-whatsapp").value,
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, "Contact details saved!", false);
    } catch (error) { showStatus(adminStatus, `Error: ${error.message}`); } 
    finally { enableButton(button, "Save Contact Details"); }
});

followSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('save-follow-settings-button');
    disableButton(button, "Saving...");
    try {
        const settings = {
            followWhatsapp: document.getElementById("setting-follow-whatsapp").value,
            facebookUrl: document.getElementById("setting-facebook-url").value,
            instagramUrl: document.getElementById("setting-instagram-url").value,
            youtubeUrl: document.getElementById("setting-youtube-url").value,
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, '"Follow Us" links saved!', false);
    } catch (error) { showStatus(adminStatus, `Error: ${error.message}`); } 
    finally { enableButton(button, 'Save "Follow Us" Links'); }
});


// --- 5. Category Logic ---
function loadCategories() {
    const q = query(collection(db, "categories"), orderBy("name"));
    
    productFilterCategory.innerHTML = '<option value="all">All Categories</option>';
    productCategorySelect.innerHTML = '<option value="">Select a category...</option>';

    onSnapshot(q, (querySnapshot) => {
        categoriesListBody.innerHTML = '';
        
        if (querySnapshot.empty) {
            categoriesListBody.innerHTML = '<tr><td colspan="3">No categories found.</td></tr>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const category = doc.data();
            const id = doc.id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${category.imageUrl || ''}" alt="${category.name}"></td>
                <td>${category.name}</td>
                <td>
                    <button class="btn btn-edit" data-id="${id}" data-type="category">Edit</button>
                    <button class="btn btn-delete" data-id="${id}" data-type="category">Delete</button>
                </td>
            `;
            categoriesListBody.appendChild(row);
            
            const option = document.createElement('option');
            option.value = id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option.cloneNode(true));
            productFilterCategory.appendChild(option.cloneNode(true));
        });
    }, (error) => {
        console.error("Error loading categories: ", error);
        showStatus(adminStatus, "Error loading categories.");
    });
}
        
addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('add-category-button');
    disableButton(button, "Adding...");
    try {
        const name = document.getElementById("category-name").value;
        const imageUrl = document.getElementById("category-image-url").value;
        
        await addDoc(collection(db, "categories"), {
            name: name,
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        });
        
        showStatus(adminStatus, "Category added successfully!", false);
        addCategoryForm.reset();
        document.getElementById('category-image-preview').innerHTML = '';
    } catch (error) {
        console.error("Error adding category: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        enableButton(button, "Add Category");
    }
});

// --- 6. Product Logic ---

// 6.1 Existing Products
function loadProducts(categoryId = "all") {
     let q;
     if (categoryId === "all") {
        q = query(collection(db, "products"), orderBy("createdAt", "desc"));
     } else {
        q = query(collection(db, "products"), 
            where("categoryId", "==", categoryId));
     }
     
     if (currentProductsQuery) currentProductsQuery(); 

     currentProductsQuery = onSnapshot(q, (querySnapshot) => {
        productsListBody.innerHTML = '';
        if (querySnapshot.empty) {
            productsListBody.innerHTML = '<tr><td colspan="4">No products found.</td></tr>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const id = doc.id;
            const imageUrl = product.images && product.images[0] ? product.images[0] : '';
            
            let priceDisplay = `₹${product.price || 0}`;
            if (product.mrp && product.mrp > product.price) {
                priceDisplay += ` <span class="price-mrp-admin">₹${product.mrp}</span>`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${imageUrl}" alt="${product.name}"></td>
                <td>${product.name} ${product.featured ? '⭐' : ''}</td>
                <td>${priceDisplay}</td>
                <td>
                    <button class="btn btn-edit" data-id="${id}" data-type="product">Edit</button>
                    <button class="btn btn-delete" data-id="${id}" data-type="product">Delete</button>
                </td>
            `;
            productsListBody.appendChild(row);
        });
     }, (error) => {
        console.error("Error loading products: ", error);
        showStatus(adminStatus, "Error loading products.");
    });
}

// 6.2 Featured Products
function loadFeaturedProducts() {
     const q = query(collection(db, "products"), where("featured", "==", true));
     
     if (currentFeaturedQuery) currentFeaturedQuery(); 

     currentFeaturedQuery = onSnapshot(q, (querySnapshot) => {
        featuredProductsListBody.innerHTML = '';
        if (querySnapshot.empty) {
            featuredProductsListBody.innerHTML = '<tr><td colspan="4">No featured products found.</td></tr>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const id = doc.id;
            const imageUrl = product.images && product.images[0] ? product.images[0] : '';
            
            let priceDisplay = `₹${product.price || 0}`;
            if (product.mrp && product.mrp > product.price) {
                priceDisplay += ` <span class="price-mrp-admin">₹${product.mrp}</span>`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${imageUrl}" alt="${product.name}"></td>
                <td>${product.name} ⭐</td>
                <td>${priceDisplay}</td>
                <td>
                    <button class="btn btn-edit" data-id="${id}" data-type="product">Edit</button>
                    <button class="btn btn-delete" data-id="${id}" data-type="product">Delete</button>
                </td>
            `;
            featuredProductsListBody.appendChild(row);
        });
     }, (error) => {
        console.error("Error loading featured products: ", error);
        featuredProductsListBody.innerHTML = '<tr><td colspan="4">Error loading featured products.</td></tr>';
    });
}


// 6.3 ഫിൽട്ടർ ഡ്രോപ്പ്ഡൗൺ പ്രവർത്തിപ്പിക്കുന്നു
productFilterCategory.addEventListener("change", (e) => {
    const categoryId = e.target.value;
    loadProducts(categoryId);
});

// 6.4 Add Product ഫോം
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('add-product-button');
    disableButton(button, "Adding...");
    
    try {
        const imageUrls = getImageUrlsFromUploader('product-image-list-container');
        if (imageUrls.length === 0 || imageUrls[0] === '') {
            throw new Error("Please add at least one image URL.");
        }

        const moreLinks = getMoreLinksFromUploader('product-more-links-container');

        const product = {
            categoryId: productCategorySelect.value,
            name: document.getElementById("product-name").value,
            size: document.getElementById("product-size").value,
            mrp: Number(document.getElementById("product-mrp").value) || 0,
            price: Number(document.getElementById("product-price").value) || 0,
            description: document.getElementById("product-description").value,
            featured: document.getElementById("product-featured").checked,
            images: imageUrls,
            moreLinks: moreLinks,
            createdAt: serverTimestamp()
        };
        
        if (!product.categoryId || !product.name || !product.price) {
            throw new Error("Please fill in all required fields.");
        }

        await addDoc(collection(db, "products"), product);
        showStatus(adminStatus, "Product added successfully!", false);
        addProductForm.reset();
        
        populateImageUploader('product-image-list-container', []);
        populateMoreLinksUploader('product-more-links-container', []);

    } catch (error) {
        console.error("Error adding product: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        enableButton(button, "Add Product");
    }
});

// --- 7. Hero Slide Logic ---
function loadHeroSlides() {
    const q = query(collection(db, "heroSlides"), orderBy("order"));
    onSnapshot(q, (querySnapshot) => {
        heroSlidesListBody.innerHTML = '';
        if (querySnapshot.empty) {
            heroSlidesListBody.innerHTML = '<tr><td colspan="5">No hero slides found.</td></tr>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const slide = doc.data();
            const id = doc.id;
            let preview = (slide.type === 'image') 
                ? `<img src="${slide.url}" alt="Preview">` 
                : `<video src="${slide.url}" muted width="50" height="50"></video>`;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${preview}</td>
                <td>${slide.type}</td>
                <td>${slide.order}</td>
                <td style="word-break: break-all;">${slide.url}</td>
                <td>
                    <button class="btn btn-delete" data-id="${id}" data-type="heroSlide">Delete</button>
                </td>
            `;
            heroSlidesListBody.appendChild(row);
        });
    }, (error) => {
        console.error("Error loading hero slides: ", error);
        showStatus(adminStatus, "Error loading hero slides.");
    });
}

addHeroSlideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('add-hero-slide-button');
    disableButton(button, "Adding...");
    try {
        const slide = {
            url: document.getElementById("hero-slide-url").value,
            type: document.getElementById("hero-slide-type").value,
            order: Number(document.getElementById("hero-slide-order").value) || 0,
            createdAt: serverTimestamp()
        };
        await addDoc(collection(db, "heroSlides"), slide);
        showStatus(adminStatus, "Hero slide added successfully!", false);
        addHeroSlideForm.reset();
    } catch (error) {
        console.error("Error adding hero slide: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        enableButton(button, "Add Slide");
    }
});


// --- 8. Edit & Delete Logic ---
document.body.addEventListener('click', async (e) => {
    const target = e.target;
    
    if (target.classList.contains('btn-delete')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        openConfirmModal(id, type);
    }
    
    if (target.classList.contains('btn-edit')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        openEditModal(id, type);
    }
});

function openConfirmModal(id, type) {
    deleteInfo = { id, type }; 
    confirmTitle.textContent = `Delete ${type}?`;
    confirmMessage.textContent = `Are you sure you want to delete this ${type}? This action cannot be undone.`;
    confirmModal.style.display = 'flex';
}
function closeConfirmModal() {
    confirmModal.style.display = 'none';
    deleteInfo = { id: null, type: null };
}
confirmCloseButton.addEventListener('click', closeConfirmModal);
confirmBtnCancel.addEventListener('click', closeConfirmModal);

confirmBtnDelete.addEventListener('click', async () => {
    const { id, type } = deleteInfo;
    if (!id || !type) return;

    disableButton(confirmBtnDelete, "Deleting...");
    try {
        let collectionName = '';
        if (type === 'product') collectionName = 'products';
        else if (type === 'category') collectionName = 'categories';
        else if (type === 'heroSlide') collectionName = 'heroSlides';
        
        if (collectionName) {
            await deleteDoc(doc(db, collectionName, id));
            showStatus(adminStatus, `${type} deleted successfully.`, false);
        }
    } catch (error) {
        console.error("Error deleting item: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        enableButton(confirmBtnDelete, "Confirm Delete");
        closeConfirmModal();
    }
});

async function openEditModal(id, type) {
    modalForm.innerHTML = '';
    editModal.style.display = 'flex';
    
    try {
        const collectionName = type === 'product' ? 'products' : 'categories';
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        
        const data = docSnap.data();
        modalTitle.textContent = `Edit ${type}`;
        
        if (type === 'category') {
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="category">
                <div class="form-group">
                    <label for="modal-category-name">Category Name <span class="required-star">*</span></label>
                    <input type="text" id="modal-category-name" value="${data.name}" required>
                </div>
                <div class="form-group">
                    <label for="modal-category-image-url">Category Image URL <span class="required-star">*</span></label>
                    <input type="text" class="image-url-input" id="modal-category-image-url" value="${data.imageUrl}" required>
                    <div class="image-preview" id="modal-category-image-preview"></div>
                </div>
                <button type="submit" class="btn" id="modal-save-button">
                    <span class="btn-text">Save Changes</span>
                    <span class="btn-loader loader-small" style="display: none;"></span>
                </button>
            `;
            setupImagePreview('modal-category-image-url', 'modal-category-image-preview');
            document.getElementById('modal-category-image-url').dispatchEvent(new Event('input'));
            
        } 
        else if (type === 'product') {
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="product">
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="modal-product-name">Product Name <span class="required-star">*</span></label>
                        <input type="text" id="modal-product-name" value="${data.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-product-category">Category <span class="required-star">*</span></label>
                        <select id="modal-product-category" required>${productCategorySelect.innerHTML}</select>
                    </div>
                     <div class="form-group">
                        <label for="modal-product-mrp">MRP (₹)</label>
                        <input type="number" id="modal-product-mrp" value="${data.mrp || ''}">
                    </div>
                    <div class="form-group">
                        <label for="modal-product-price">Retail Price (₹) <span class="required-star">*</span></label>
                        <input type="number" id="modal-product-price" value="${data.price || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-product-size">Size</label>
                        <input type="text" id="modal-product-size" value="${data.size || ''}">
                    </div>
                    <div class="form-group">
                        <input type="checkbox" id="modal-product-featured" style="width: auto; margin-right: 10px;" ${data.featured ? 'checked' : ''}>
                        <label for="modal-product-featured" style="display: inline;">Featured? (Top Seller)</label>
                    </div>
                    <div class="form-group full-width">
                        <label for="modal-product-description">Description</label>
                        <textarea id="modal-product-description" rows="4">${data.description || ''}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label>Product Image URLs <span class="required-star">*</span></label>
                        <div id="modal-image-list-container" class="image-url-list">
                        </div>
                        <button type="button" id="add-modal-image-url-btn" class="btn btn-secondary">Add Image URL</button>
                    </div>

                    <div class="form-group full-width">
                        <label>More Links</label>
                        <div id="modal-more-links-container" class="link-url-list"></div>
                        <button type="button" id="add-modal-more-link-btn" class="btn btn-secondary">Add Link</button>
                    </div>

                </div>
                <button type="submit" class="btn" id="modal-save-button">
                    <span class="btn-text">Save Changes</span>
                    <span class="btn-loader loader-small" style="display: none;"></span>
                </button>
            `;
            document.getElementById('modal-product-category').value = data.categoryId;
            
            setupImageUploader('modal-image-list-container', 'add-modal-image-url-btn');
            populateImageUploader('modal-image-list-container', data.images || []);

            setupMoreLinksUploader('modal-more-links-container', 'add-modal-more-link-btn');
            populateMoreLinksUploader('modal-more-links-container', data.moreLinks || []);
        }
        
    } catch (error) {
        console.error("Error opening modal: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        closeEditModal();
    }
}
        
function closeEditModal() {
    editModal.style.display = 'none';
    modalForm.innerHTML = ''; 
}
modalCloseButton.addEventListener('click', closeEditModal);

modalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('modal-save-button');
    disableButton(button, "Saving...");
    
    const id = document.getElementById('modal-item-id').value;
    const type = document.getElementById('modal-item-type').value;
    
    try {
        let dataToSave = {};
        const collectionName = type === 'product' ? 'products' : 'categories';

        if (type === 'category') {
            dataToSave = {
                name: document.getElementById('modal-category-name').value,
                imageUrl: document.getElementById('modal-category-image-url').value,
            };
        } else if (type === 'product') {
            const imageUrls = getImageUrlsFromUploader('modal-image-list-container');
            if (imageUrls.length === 0 || imageUrls[0] === '') {
                throw new Error("Please add at least one image URL.");
            }
            
            const moreLinks = getMoreLinksFromUploader('modal-more-links-container');
            
            dataToSave = {
                categoryId: document.getElementById('modal-product-category').value,
                name: document.getElementById('modal-product-name').value,
                size: document.getElementById('modal-product-size').value,
                mrp: Number(document.getElementById('modal-product-mrp').value) || 0,
                price: Number(document.getElementById('modal-product-price').value) || 0,
                description: document.getElementById('modal-product-description').value,
                featured: document.getElementById('modal-product-featured').checked,
                images: imageUrls,
                moreLinks: moreLinks,
            };
        }
        
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, dataToSave, { merge: true });
        
        showStatus(adminStatus, `${type} updated successfully!`, false);
        closeEditModal();
        
    } catch (error) {
        console.error("Error saving changes: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        enableButton(button, "Save Changes");
    }
});


// --- 9. ഇമേജ് അപ്‌ലോഡ് സിസ്റ്റം ---
function setupImageUploader(containerId, addBtnId) {
    const container = document.getElementById(containerId);
    const addBtn = document.getElementById(addBtnId);

    if (!container || !addBtn) return;

    addBtn.addEventListener('click', () => {
        addImageInput(containerId);
    });

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-image')) {
            e.target.closest('.image-url-item').remove();
        }
    });

    container.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            const url = e.target.value.trim();
            const previewImg = e.target.closest('.image-url-item').querySelector('.image-preview-item');
            if (previewImg) {
                previewImg.src = url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
            }
        }
    });
}

function addImageInput(containerId, url = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'image-url-item';
    
    item.innerHTML = `
        <img src="${url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="Preview" class="image-preview-item">
        <input type="text" value="${url}" placeholder="Paste image URL here" required>
        <button type="button" class="btn-remove-image">&times;</button>
    `;
    
    container.appendChild(item);
}

function getImageUrlsFromUploader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const urls = [];
    container.querySelectorAll('.image-url-item input').forEach(input => {
        const url = input.value.trim();
        if (url) {
            urls.push(url);
        }
    });
    return urls;
}

function populateImageUploader(containerId, urls) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 
    
    if (urls && urls.length > 0) {
        urls.forEach(url => {
            addImageInput(containerId, url);
        });
    } else {
        addImageInput(containerId);
    }
}

// --- 10. "More Links" അപ്‌ലോഡ് സിസ്റ്റം ---
function setupMoreLinksUploader(containerId, addBtnId) {
    const container = document.getElementById(containerId);
    const addBtn = document.getElementById(addBtnId);

    if (!container || !addBtn) return;

    addBtn.addEventListener('click', () => {
        addMoreLinkInput(containerId);
    });

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-link')) {
            e.target.closest('.link-url-item').remove();
        }
    });
}

function addMoreLinkInput(containerId, link = { title: '', url: '' }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'link-url-item';
    
    item.innerHTML = `
        <input type="text" class="link-title-input" value="${link.title}" placeholder="Link Title (e.g., YouTube Review)">
        <input type="text" class="link-url-input" value="${link.url}" placeholder="Link URL (https://...)">
        <button type="button" class="btn-remove-link">&times;</button>
    `;
    
    container.appendChild(item);
}

function getMoreLinksFromUploader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const links = [];
    container.querySelectorAll('.link-url-item').forEach(item => {
        const title = item.querySelector('.link-title-input').value.trim();
        const url = item.querySelector('.link-url-input').value.trim();
        if (title && url) { 
            links.push({ title: title, url: url });
        }
    });
    return links;
}

function populateMoreLinksUploader(containerId, links) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 
    
    if (links && links.length > 0) {
        links.forEach(link => {
            addMoreLinkInput(containerId, link);
        });
    } else {
        addMoreLinkInput(containerId);
    }
}