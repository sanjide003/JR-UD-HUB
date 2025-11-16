// ഇതാണ് 'admin.js' ഫയൽ.
// *** "Existing Products" ഫിൽട്ടർ എറർ പരിഹരിച്ചു ***

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
    where, // ഫിൽട്ടറിംഗിനായി where ചേർത്തു
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

// *** പുതിയത്: Admin Nav Elements ***
const adminNavOpenBtn = document.getElementById("admin-nav-open-btn");
const adminNavCloseBtn = document.getElementById("admin-nav-close-btn");
const adminSideNav = document.getElementById("admin-side-nav");
const adminNavOverlay = document.getElementById("admin-nav-overlay");
const adminNavLinks = document.querySelector(".admin-nav-links");

// *** പുതിയത്: Page Content Elements ***
const pageContents = document.querySelectorAll(".page-content");
const navLinks = document.querySelectorAll(".nav-link");

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
const productFilterCategory = document.getElementById("product-filter-category"); // *** പുതിയത്: ഫിൽട്ടർ ഡ്രോപ്പ്ഡൗൺ ***

// Hero Slide Elements
const addHeroSlideForm = document.getElementById("add-hero-slide-form");
const heroSlideLoader = document.getElementById("hero-slide-loader");
const heroSlidesListBody = document.getElementById("hero-slides-list-body");

// *** പുതിയത്: Settings Form Elements ***
const generalSettingsForm = document.getElementById("general-settings-form");
const generalSettingsLoader = document.getElementById("general-settings-loader");
const contactSettingsForm = document.getElementById("contact-settings-form");
const contactSettingsLoader = document.getElementById("contact-settings-loader");
const followSettingsForm = document.getElementById("follow-settings-form");
const followSettingsLoader = document.getElementById("follow-settings-loader");


// Modal elements
const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const modalLoader = document.getElementById("modal-loader");

let currentProductsQuery = null; // നിലവിലെ പ്രൊഡക്റ്റ് ക്വറി സേവ് ചെയ്യാൻ

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
function showLoader(loader) { if(loader) loader.style.display = 'block'; }
function hideLoader(loader) { if(loader) loader.style.display = 'none'; }

// --- 1. Authentication Logic ---
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
        loadProducts("all"); // തുടക്കത്തിൽ എല്ലാ പ്രൊഡക്ടുകളും ലോഡ് ചെയ്യുന്നു
        loadHeroSlides(); 
        loadAllSettings();
    } else {
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

// --- 2. പുതിയത്: Admin Nav Logic ---
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
        
        // എല്ലാ പേജുകളും മറയ്ക്കുന്നു
        pageContents.forEach(item => item.classList.remove("active"));
        // എല്ലാ ലിങ്കുകളും അൺ-ആക്ടീവ് ആക്കുന്നു
        navLinks.forEach(item => item.classList.remove("active"));
        
        // ക്ലിക്ക് ചെയ്ത പേജ് കാണിക്കുന്നു
        document.getElementById(pageId).classList.add("active");
        // ക്ലിക്ക് ചെയ്ത ലിങ്ക് ആക്ടീവ് ആക്കുന്നു
        e.target.classList.add("active");
        
        closeAdminNav(); // മെനു അടയ്ക്കുന്നു
    }
});

// --- 3. Image Preview Logic ---
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


// --- 4. Settings Logic (3 ഫോമുകൾക്കായി വിഭജിച്ചു) ---
async function loadAllSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // General
            document.getElementById("setting-logo-image-url").value = settings.logoImageUrl || '';
            document.getElementById("setting-logo-text").value = settings.logoText || '';
            document.getElementById("setting-logo-subtitle").value = settings.logoSubtitle || '';
            document.getElementById("setting-video-url").value = settings.videoUrl || '';
            // Contact
            document.getElementById("setting-phone").value = settings.phone || '';
            document.getElementById("setting-email").value = settings.email || '';
            document.getElementById("setting-address").value = settings.address || '';
            document.getElementById("setting-whatsapp").value = settings.whatsapp || ''; // Order WA
            // Follow Us
            document.getElementById("setting-follow-whatsapp").value = settings.followWhatsapp || ''; // Follow WA
            document.getElementById("setting-facebook-url").value = settings.facebookUrl || '';
            document.getElementById("setting-instagram-url").value = settings.instagramUrl || '';
            document.getElementById("setting-youtube-url").value = settings.youtubeUrl || '';
        }
    } catch (error) {
        console.error("Error loading settings: ", error);
        showStatus(adminStatus, "Error loading site settings.");
    }
}
        
// ഫോം 1: General Settings
generalSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(generalSettingsLoader);
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
    finally { hideLoader(generalSettingsLoader); }
});

// ഫോം 2: Contact Details
contactSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(contactSettingsLoader);
    try {
        const settings = {
            phone: document.getElementById("setting-phone").value,
            email: document.getElementById("setting-email").value,
            address: document.getElementById("setting-address").value,
            whatsapp: document.getElementById("setting-whatsapp").value, // Order WA
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, "Contact details saved!", false);
    } catch (error) { showStatus(adminStatus, `Error: ${error.message}`); } 
    finally { hideLoader(contactSettingsLoader); }
});

// ഫോം 3: Follow Us Links
followSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(followSettingsLoader);
    try {
        const settings = {
            followWhatsapp: document.getElementById("setting-follow-whatsapp").value, // Follow WA
            facebookUrl: document.getElementById("setting-facebook-url").value,
            instagramUrl: document.getElementById("setting-instagram-url").value,
            youtubeUrl: document.getElementById("setting-youtube-url").value,
        };
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, settings, { merge: true });
        showStatus(adminStatus, '"Follow Us" links saved!', false);
    } catch (error) { showStatus(adminStatus, `Error: ${error.message}`); } 
    finally { hideLoader(followSettingsLoader); }
});


// --- 5. Category Logic ---
function loadCategories() {
    const q = query(collection(db, "categories"), orderBy("name"));
    
    // ഫിൽട്ടർ ഡ്രോപ്പ്ഡൗൺ ക്ലിയർ ചെയ്യുന്നു
    productFilterCategory.innerHTML = '<option value="all">All Categories</option>';
    // ആഡ് പ്രൊഡക്റ്റ് ഡ്രോപ്പ്ഡൗൺ ക്ലിയർ ചെയ്യുന്നു
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
            
            // കാറ്റഗറി ലിസ്റ്റിൽ (പേജ് 4) ചേർക്കുന്നു
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
            
            // ആഡ് പ്രൊഡക്റ്റ് ഫോമിൽ (പേജ് 1) ചേർക്കുന്നു
            const option = document.createElement('option');
            option.value = id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option.cloneNode(true));
            
            // ഫിൽട്ടർ ഡ്രോപ്പ്ഡൗണിൽ (പേജ് 2) ചേർക്കുന്നു
            productFilterCategory.appendChild(option.cloneNode(true));
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

// --- 6. Product Logic (പുതിയ ഫിൽട്ടറിംഗ് സഹിതം) ---
function loadProducts(categoryId = "all") {
     let q;
     // *** ഫിൽട്ടർ എറർ പരിഹരിച്ചു ***
     if (categoryId === "all") {
        // "All Categories" ആണെങ്കിൽ മാത്രം തീയതി അനുസരിച്ച് ഓർഡർ ചെയ്യുന്നു
        q = query(collection(db, "products"), orderBy("createdAt", "desc"));
     } else {
        // ഒരു പ്രത്യേക കാറ്റഗറി ഫിൽട്ടർ ചെയ്യുമ്പോൾ, ഓർഡർ ചെയ്യുന്നില്ല (ഇൻഡെക്സ് എറർ ഒഴിവാക്കാൻ)
        q = query(collection(db, "products"), 
            where("categoryId", "==", categoryId));
     }
     
     // പഴയ onSnapshot നിർത്തുന്നു (ഒന്നിലധികം listener ഒഴിവാക്കാൻ)
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

// *** പുതിയത്: ഫിൽട്ടർ ഡ്രോപ്പ്ഡൗൺ പ്രവർത്തിപ്പിക്കുന്നു ***
productFilterCategory.addEventListener("change", (e) => {
    const categoryId = e.target.value;
    loadProducts(categoryId);
});

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


// --- 8. Edit & Delete Logic ---
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