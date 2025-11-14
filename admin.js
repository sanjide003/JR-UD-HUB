// ഇതാണ് 'admin.js' ഫയൽ.
// *** Vercel-ന് വേണ്ടി പാത്തുകൾ പരിശോധിച്ചു ***
// *** സബ്ടൈറ്റിൽ ലോഡ്/സേവ് ചേർത്തു ***

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
    serverTimestamp,
    orderBy,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth } from './firebase-config.js'; // നമ്മുടെ കോൺഫിഗ് ഫയൽ

// --- DOM Elements (പേജിലെ ഘടകങ്ങളെ എടുക്കുന്നു) ---
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");
const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

const tabLinks = document.querySelectorAll(".tab-link");
const tabContents = document.querySelectorAll(".tab-content");

// Category elements
const addCategoryForm = document.getElementById("add-category-form");
const categoryLoader = document.getElementById("category-loader");
const categoriesListBody = document.getElementById("categories-list-body");
const categoryImagePreview = document.getElementById("category-image-preview");

// Product elements
const addProductForm = document.getElementById("add-product-form");
const productCategorySelect = document.getElementById("product-category");
const productLoader = document.getElementById("product-loader");
const productsListBody = document.getElementById("products-list-body");
const productImagePreview = document.getElementById("product-image-preview");

// Hero Slide Elements
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlideLoader = document.getElementById("hero-slide-loader");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");

// Settings elements
const siteSettingsForm = document.getElementById("site-settings-form");
const settingsLoader = document.getElementById("settings-loader");

// Modal elements
const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const modalLoader = document.getElementById("modal-loader");

// --- Helper Functions (സഹായ ഫംഗ്ഷനുകൾ) ---
function showStatus(element, message, isError = true) {
    element.textContent = message;
    element.className = isError ? 'status-message error' : 'status-message success';
    setTimeout(() => clearStatus(element), 4000);
}
function clearStatus(element) {
    element.textContent = '';
    element.className = 'status-message';
}
function showLoader(loader) { loader.style.display = 'block'; }
function hideLoader(loader) { loader.style.display = 'none'; }

// --- 1. Authentication Logic (ലോഗിൻ) ---
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus(loginStatus);
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login Error:", error);
        showStatus(loginStatus, `Login Failed: ${error.message}`);
        loginButton.disabled = false;
        loginButton.textContent = "Login";
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
        loadProducts();
        loadHeroSlides(); 
        loadSiteSettings();
    } else {
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

// --- 2. Tab Switching Logic (ടാബ് മാറ്റുമ്പോൾ) ---
tabLinks.forEach(link => {
    link.addEventListener("click", () => {
        const tabId = link.getAttribute("data-tab");
        
        tabLinks.forEach(item => item.classList.remove("active"));
        tabContents.forEach(item => item.classList.remove("active"));
        
        link.classList.add("active");
        document.getElementById(tabId).classList.add("active");
    });
});

// --- 3. Image Preview Logic (ഇമേജ് പ്രിവ്യൂ) ---
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    function updatePreview() {
        previewContainer.innerHTML = '';
        const urls = input.value.split('\n')
                             .map(url => url.trim())
                             .filter(url => url.length > 0);
        
        urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; };
            previewContainer.appendChild(img);
        });
    }
    
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
}
setupImagePreview('category-image-url', 'category-image-preview');
setupImagePreview('product-image-urls', 'product-image-preview');


// --- 4. Site Settings Logic (സൈറ്റ് സെറ്റിംഗ്സ്) ---
// *** പാത്ത് 'settings/global' ശരിയാണ് ***
async function loadSiteSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            document.getElementById("setting-logo-image-url").value = settings.logoImageUrl || '';
            document.getElementById("setting-logo-text").value = settings.logoText || '';
            // *** സബ്ടൈറ്റിൽ ലോഡ് ചെയ്യുന്നു ***
            document.getElementById("setting-logo-subtitle").value = settings.logoSubtitle || '';
            document.getElementById("setting-video-url").value = settings.videoUrl || '';
            document.getElementById("setting-phone").value = settings.phone || '';
            document.getElementById("setting-email").value = settings.email || '';
            document.getElementById("setting-address").value = settings.address || '';
            document.getElementById("setting-whatsapp").value = settings.whatsapp || '';
            document.getElementById("setting-facebook-url").value = settings.facebookUrl || '';
            document.getElementById("setting-instagram-url").value = settings.instagramUrl || '';
        }
    } catch (error) {
        console.error("Error loading settings: ", error);
        showStatus(adminStatus, "Error loading site settings.");
    }
}
        
siteSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(settingsLoader);
    try {
        const settings = {
            logoImageUrl: document.getElementById("setting-logo-image-url").value,
            logoText: document.getElementById("setting-logo-text").value,
            // *** സബ്ടൈറ്റിൽ സേവ് ചെയ്യുന്നു ***
            logoSubtitle: document.getElementById("setting-logo-subtitle").value,
            videoUrl: document.getElementById("setting-video-url").value,
            phone: document.getElementById("setting-phone").value,
            email: document.getElementById("setting-email").value,
            address: document.getElementById("setting-address").value,
            whatsapp: document.getElementById("setting-whatsapp").value,
            facebookUrl: document.getElementById("setting-facebook-url").value,
            instagramUrl: document.getElementById("setting-instagram-url").value,
        };
        
        // *** പാത്ത് 'settings/global' ശരിയാണ് ***
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        
        showStatus(adminStatus, "Settings saved successfully!", false);
    } catch (error) {
        console.error("Error saving settings: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        hideLoader(settingsLoader);
    }
});

// --- 5. Category Logic (കാറ്റഗറി) ---
// *** പാത്ത് 'categories' ശരിയാണ് ***
function loadCategories() {
    const q = query(collection(db, "categories"), orderBy("name"));
    onSnapshot(q, (querySnapshot) => {
        categoriesListBody.innerHTML = '';
        productCategorySelect.innerHTML = '<option value="">Select a category...</option>';
        
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
            productCategorySelect.appendChild(option);
        });
    }, (error) => {
        console.error("Error loading categories: ", error);
        showStatus(adminStatus, "Error loading categories.");
    });
}
        
addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(categoryLoader);
    try {
        const name = document.getElementById("category-name").value;
        const imageUrl = document.getElementById("category-image-url").value;
        
        // *** പാത്ത് 'categories' ശരിയാണ് ***
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
        hideLoader(categoryLoader);
    }
});

// --- 6. Product Logic (ഉൽപ്പന്നം) ---
// *** പാത്ത് 'products' ശരിയാണ് ***
function loadProducts() {
     const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
     onSnapshot(q, (querySnapshot) => {
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

addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(productLoader);
    try {
        const imageUrlsText = document.getElementById("product-image-urls").value;
        const imageUrls = imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);

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

        // *** പാത്ത് 'products' ശരിയാണ് ***
        await addDoc(collection(db, "products"), product);
        showStatus(adminStatus, "Product added successfully!", false);
        addProductForm.reset();
        document.getElementById('product-image-preview').innerHTML = '';
    } catch (error) {
        console.error("Error adding product: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        hideLoader(productLoader);
    }
});

// --- 7. Hero Slide Logic ---
// *** പാത്ത് 'heroSlides' ശരിയാണ് ***
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
            
            let preview = '';
            if (slide.type === 'image') {
                preview = `<img src="${slide.url}" alt="Preview">`;
            } else {
                preview = `<video src="${slide.url}" muted width="50" height="50"></video>`;
            }

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
    showLoader(heroSlideLoader);
    try {
        const slide = {
            url: document.getElementById("hero-slide-url").value,
            type: document.getElementById("hero-slide-type").value,
            order: Number(document.getElementById("hero-slide-order").value) || 0,
            createdAt: serverTimestamp()
        };
        
        // *** പാത്ത് 'heroSlides' ശരിയാണ് ***
        await addDoc(collection(db, "heroSlides"), slide);
        
        showStatus(adminStatus, "Hero slide added successfully!", false);
        addHeroSlideForm.reset();
    } catch (error) {
        console.error("Error adding hero slide: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        hideLoader(heroSlideLoader);
    }
});

// --- 8. Edit & Delete Logic (എഡിറ്റ്, ഡിലീറ്റ്) ---
document.body.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Delete ബട്ടൺ
    if (target.classList.contains('btn-delete')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        
        if (confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
            try {
                let collectionName = '';
                if (type === 'product') collectionName = 'products';
                else if (type === 'category') collectionName = 'categories';
                else if (type === 'heroSlide') collectionName = 'heroSlides';
                
                // *** പാത്തുകൾ ശരിയാണ് ***
                if (collectionName) {
                    await deleteDoc(doc(db, collectionName, id));
                    showStatus(adminStatus, `${type} deleted successfully.`, false);
                }
            } catch (error) {
                console.error("Error deleting item: ", error);
                showStatus(adminStatus, `Error: ${error.message}`);
            }
        }
    }
    
    // Edit ബട്ടൺ
    if (target.classList.contains('btn-edit')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        openEditModal(id, type);
    }
});
        
async function openEditModal(id, type) {
    modalForm.innerHTML = '';
    showLoader(modalLoader);
    editModal.style.display = 'flex';
    
    try {
        // *** പാത്തുകൾ ശരിയാണ് ***
        const collectionName = type === 'product' ? 'products' : 'categories';
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("Item not found.");
        }
        
        const data = docSnap.data();
        modalTitle.textContent = `Edit ${type}`;
        
        if (type === 'category') {
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="category">
                <div class="form-group">
                    <label for="modal-category-name">Category Name</label>
                    <input type="text" id="modal-category-name" value="${data.name}" required>
                </div>
                <div class="form-group">
                    <label for="modal-category-image-url">Category Image URL</label>
                    <input type="text" class="image-url-input" id="modal-category-image-url" value="${data.imageUrl}" required>
                    <div class="image-preview" id="modal-category-image-preview"></div>
                </div>
                <button type="submit" class="btn">Save Changes</button>
            `;
            setupImagePreview('modal-category-image-url', 'modal-category-image-preview');
            document.getElementById('modal-category-image-url').dispatchEvent(new Event('input'));
            
        } 
        else if (type === 'product') {
            const imagesText = data.images ? data.images.join('\n') : '';
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="product">
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="modal-product-name">Product Name</label>
                        <input type="text" id="modal-product-name" value="${data.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-product-category">Category</label>
                        <select id="modal-product-category" required>${productCategorySelect.innerHTML}</select>
                    </div>
                     <div class="form-group">
                        <label for="modal-product-mrp">MRP (₹)</label>
                        <input type="number" id="modal-product-mrp" value="${data.mrp || ''}">
                    </div>
                    <div class="form-group">
                        <label for="modal-product-price">Retail Price (₹)</label>
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
                        <label for="modal-product-image-urls">Product Image URLs (One URL per line)</label>
                        <textarea class="image-url-input" id="modal-product-image-urls" rows="4" required>${imagesText}</textarea>
                        <div class="image-preview" id="modal-product-image-preview"></div>
                    </div>
                </div>
                <button type="submit" class="btn">Save Changes</button>
            `;
            document.getElementById('modal-product-category').value = data.categoryId;
            setupImagePreview('modal-product-image-urls', 'modal-product-image-preview');
            document.getElementById('modal-product-image-urls').dispatchEvent(new Event('input'));
        }
        
    } catch (error) {
        console.error("Error opening modal: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        closeEditModal();
    } finally {
        hideLoader(modalLoader);
    }
}
        
function closeEditModal() {
    editModal.style.display = 'none';
}
modalCloseButton.addEventListener('click', closeEditModal);
        
modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(modalLoader);
    
    const id = document.getElementById('modal-item-id').value;
    const type = document.getElementById('modal-item-type').value;
    
    try {
        let dataToSave = {};
        // *** പാത്തുകൾ ശരിയാണ് ***
        const collectionName = type === 'product' ? 'products' : 'categories';

        if (type === 'category') {
            dataToSave = {
                name: document.getElementById('modal-category-name').value,
                imageUrl: document.getElementById('modal-category-image-url').value,
            };
        } else if (type === 'product') {
            const imageUrlsText = document.getElementById("modal-product-image-urls").value;
            const imageUrls = imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);
            
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
        
        // *** പാത്തുകൾ ശരിയാണ് ***
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, dataToSave, { merge: true });
        
        showStatus(adminStatus, `${type} updated successfully!`, false);
        closeEditModal();
        
    } catch (error) {
        console.error("Error saving changes: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
    } finally {
        hideLoader(modalLoader);
    }
});