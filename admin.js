// ഇതാണ് 'admin.js' ഫയൽ.
// *** എഡിറ്റ് ഫംഗ്ഷൻ ബഗ് പരിഹരിച്ചു (മോഡൽ സബ്മിറ്റ്) ***
// *** പുതിയ കൺഫർമേഷൻ പോപ്പ്-അപ്പ് ചേർത്തു ***

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
const addImageUrlBtn = document.getElementById("add-image-url-btn");
const productImageContainer = document.getElementById("product-image-list-container");

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

// *** പുതിയത്: കൺഫർമേഷൻ മോഡൽ Elements ***
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmBtnOk = document.getElementById("confirm-btn-ok");
const confirmBtnCancel = document.getElementById("confirm-btn-cancel");
const confirmCloseBtn = document.getElementById("confirm-close-btn");
let onConfirmOk = null; // OK ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ പ്രവർത്തിക്കേണ്ട ഫംഗ്ഷൻ

let currentProductsQuery = null;
let currentFeaturedQuery = null;

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
    if (btnText) {
        btnText.dataset.originalText = btnText.textContent; // പഴയ ടെക്സ്റ്റ് സേവ് ചെയ്യുന്നു
        btnText.textContent = text;
    }
    if (btnLoader) btnLoader.style.display = 'inline-block';
}

function enableButton(button, defaultText) {
    if (!button) return;
    button.disabled = false;
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    if (btnText) {
        // സേവ് ചെയ്ത ടെക്സ്റ്റ് ഉപയോഗിക്കുന്നു, അല്ലെങ്കിൽ defaultText
        btnText.textContent = defaultText || btnText.dataset.originalText || 'Submit';
    }
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

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = "none";
        adminPanel.style.display = "block";
        loadCategories();
        loadProducts("all"); 
        loadFeaturedProducts(); 
        loadHeroSlides(); 
        loadAllSettings();
        if (productImageContainer.children.length === 0) {
            addImageInput('product-image-list-container');
        }
    } else {
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

// --- 3. Image Preview Logic (പഴയത്) ---
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
            document.getElementById("setting-phone").value = settings.phone || '';
            document.getElementById("setting-email").value = settings.email || '';
            document.getElementById("setting-address").value = settings.address || '';
            document.getElementById("setting-whatsapp").value = settings.whatsapp || '';
            document.getElementById("setting-follow-whatsapp").value = settings.followWhatsapp || '';
            document.getElementById("setting-facebook-url").value = settings.facebookUrl || '';
            document.getElementById("setting-instagram-url").value = settings.instagramUrl || '';
            document.getElementById("setting-youtube-url").value = settings.youtubeUrl || '';
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
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, "General settings saved!", false);
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
function loadProducts(categoryId = "all") {
     let q;
     if (categoryId === "all") {
        q = query(collection(db, "products"), orderBy("createdAt", "desc"));
     } else {
        q = query(collection(db, "products"), where("categoryId", "==", categoryId));
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

productFilterCategory.addEventListener("change", (e) => {
    const categoryId = e.target.value;
    loadProducts(categoryId);
});

addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('add-product-button');
    disableButton(button, "Adding...");
    try {
        const imageUrls = getImageUrlsFromUploader('product-image-list-container');
        if (imageUrls.length === 0 || imageUrls[0] === '') {
            throw new Error("Please add at least one image URL.");
        }
        const product = {
            categoryId: productCategorySelect.value,
            name: document.getElementById("product-name").value,
            size: document.getElementById("product-size").value,
            mrp: Number(document.getElementById("product-mrp").value) || 0,
            price: Number(document.getElementById("product-price").value) || 0,
            description: document.getElementById("product-description").value,
            featured: document.getElementById("product-featured").checked,
            images: imageUrls,
            createdAt: serverTimestamp()
        };
        if (!product.categoryId || !product.name || !product.price) {
            throw new Error("Please fill in all required fields.");
        }
        await addDoc(collection(db, "products"), product);
        showStatus(adminStatus, "Product added successfully!", false);
        addProductForm.reset();
        productImageContainer.innerHTML = '';
        addImageInput('product-image-list-container');
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

// *** പുതിയത്: കൺഫർമേഷൻ മോഡൽ ലോജിക് ***
function showConfirmationModal(title, message, onOk, type = 'delete') {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    
    // OK ബട്ടൺ സ്റ്റൈൽ മാറ്റുന്നു
    if (type === 'edit') {
        confirmBtnOk.textContent = 'Edit';
        confirmBtnOk.classList.add('edit'); // നീല നിറം നൽകാൻ
    } else {
        confirmBtnOk.textContent = 'Delete';
        confirmBtnOk.classList.remove('edit'); // ചുവപ്പ് നിറം നൽകാൻ
    }
    
    confirmModal.style.display = 'flex';
    
    // പഴയ ലിസണറുകൾ നീക്കം ചെയ്യുന്നു
    const newOkBtn = confirmBtnOk.cloneNode(true);
    confirmBtnOk.parentNode.replaceChild(newOkBtn, confirmBtnOk);
    
    newOkBtn.addEventListener('click', () => {
        if (onOk) onOk();
        closeConfirmationModal();
    });
}
function closeConfirmationModal() {
    confirmModal.style.display = 'none';
}
confirmBtnCancel.addEventListener('click', closeConfirmationModal);
confirmCloseBtn.addEventListener('click', closeConfirmationModal);
// *** കൺഫർമേഷൻ മോഡൽ ലോജിക് കഴിഞ്ഞു ***


document.body.addEventListener('click', async (e) => {
    const target = e.target.closest('.btn-delete'); // ഡിലീറ്റ് ബട്ടൺ
    const editTarget = e.target.closest('.btn-edit'); // എഡിറ്റ് ബട്ടൺ

    // Delete ബട്ടൺ
    if (target) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        
        // *** പുതിയത്: കൺഫർമേഷൻ മോഡൽ കാണിക്കുന്നു ***
        showConfirmationModal(
            'Confirm Deletion',
            `Are you sure you want to delete this ${type}? This action cannot be undone.`,
            async () => { // OK ക്ലിക്ക് ചെയ്യുമ്പോൾ ഈ ഫംഗ്ഷൻ പ്രവർത്തിക്കും
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
                }
            },
            'delete' // ഡിലീറ്റ് ബട്ടൺ ചുവപ്പാക്കാൻ
        );
    }
    
    // Edit ബട്ടൺ
    if (editTarget) {
        const id = editTarget.dataset.id;
        const type = editTarget.dataset.type;
        
        // *** പുതിയത്: കൺഫർമേഷൻ മോഡൽ കാണിക്കുന്നു ***
        showConfirmationModal(
            'Confirm Edit',
            `Are you sure you want to edit this ${type}?`,
            () => { // OK ക്ലിക്ക് ചെയ്യുമ്പോൾ ഈ ഫംഗ്ഷൻ പ്രവർത്തിക്കും
                openEditModal(id, type); // എഡിറ്റ് മോഡൽ തുറക്കുന്നു
            },
            'edit' // എഡിറ്റ് ബട്ടൺ നീലയാക്കാൻ
        );
    }
});
        
async function openEditModal(id, type) {
    modalForm.innerHTML = '';
    
    // *** എഡിറ്റ് ബഗ് പരിഹാരം: ഡാറ്റ മോഡലിൽ അറ്റാച്ച് ചെയ്യുന്നു ***
    modalForm.dataset.itemId = id;
    modalForm.dataset.itemType = type;

    showLoader(document.getElementById('modal-loader'));
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
                        <div id="modal-image-list-container" class="image-url-list"></div>
                        <button type="button" id="add-modal-image-url-btn" class="btn btn-secondary">Add Image URL</button>
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
        }
        
    } catch (error) {
        console.error("Error opening modal: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        closeEditModal();
    } finally {
        hideLoader(document.getElementById('modal-loader'));
    }
}
        
function closeEditModal() {
    editModal.style.display = 'none';
    modalForm.innerHTML = ''; 
    modalForm.removeAttribute('data-item-id'); // ഡാറ്റ ക്ലീൻ ചെയ്യുന്നു
    modalForm.removeAttribute('data-item-type');
}
modalCloseButton.addEventListener('click', closeEditModal);
        
// *** എഡിറ്റ് ബഗ് പരിഹാരം: ഈ ലിസണർ ഇപ്പോൾ ശരിയായി പ്രവർത്തിക്കും ***
modalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById('modal-save-button');
    disableButton(button, "Saving...");
    
    const id = e.target.dataset.itemId; // ഡാറ്റാസെറ്റിൽ നിന്ന് എടുക്കുന്നു
    const type = e.target.dataset.itemType;
    
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
            dataToSave = {
                categoryId: document.getElementById('modal-product-category').value,
                name: document.getElementById('modal-product-name').value,
                size: document.getElementById('modal-product-size').value,
                mrp: Number(document.getElementById('modal-product-mrp').value) || 0,
                price: Number(document.getElementById('modal-product-price').value) || 0,
                description: document.getElementById('modal-product-description').value,
                featured: document.getElementById('modal-product-featured').checked,
                images: imageUrls,
            };
        }
        
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, dataToSave, { merge: true });
        
        showStatus(adminStatus, `${type} updated successfully!`, false);
        closeEditModal();
        
    } catch (error) {
        console.error("Error saving changes: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        // എറർ ഉണ്ടെങ്കിൽ ബട്ടൺ തിരികെ പ്രവർത്തനക്ഷമമാക്കുന്നു
        enableButton(button, "Save Changes");
    }
});


// --- 9. പുതിയത്: ഇമേജ് അപ്‌ലോഡ് സിസ്റ്റം ---
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

document.addEventListener('DOMContentLoaded', () => {
    setupImageUploader('product-image-list-container', 'add-image-url-btn');
});