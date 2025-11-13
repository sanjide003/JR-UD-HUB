// ഈ ഫയലിൽ admin.html പേജിന് മാത്രം വേണ്ട എല്ലാ കോഡുകളും

// ഫയർബേസിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { db, auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDoc,
    getDocs,
    setDoc,
    doc,
    deleteDoc,
    onSnapshot, // തത്സമയം മാറ്റങ്ങൾ അറിയാൻ
    query,
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ലോഗുകൾ കാണാൻ
setLogLevel('Debug');

// --- DOM Elements ---
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

// Settings elements
const siteSettingsForm = document.getElementById("site-settings-form");
const settingsLoader = document.getElementById("settings-loader");

// Modal elements
const editModal = document.getElementById("edit-modal");
const modalCloseButton = document.getElementById("modal-close-button");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const modalLoader = document.getElementById("modal-loader");

// --- Helper Functions ---
function showStatus(element, message, isError = true) {
    if (!element) return;
    element.textContent = message;
    element.className = isError ? 'status-message error' : 'status-message success';
    setTimeout(() => clearStatus(element), 4000); // 4 സെക്കൻഡിന് ശേഷം മായ്ക്കുന്നു
}
function clearStatus(element) {
    if (!element) return;
    element.textContent = '';
    element.className = 'status-message';
}
function showLoader(loader) { if (loader) loader.style.display = 'block'; }
function hideLoader(loader) { if (loader) loader.style.display = 'none'; }

// --- 1. Authentication Logic ---
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearStatus(loginStatus);
        if(loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Login Error:", error);
            showStatus(loginStatus, `Login Failed: ${error.message}`);
            if(loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", () => { signOut(auth); });
}

// Auth State Change Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginSection) loginSection.style.display = "none";
        if (adminPanel) adminPanel.style.display = "block";
        // ലോഗിൻ ആയാൽ ഉടൻ ഡാറ്റ ലോഡ് ചെയ്യുന്നു
        loadCategories();
        loadProducts();
        loadSiteSettings();
    } else {
        if (loginSection) loginSection.style.display = "block";
        if (adminPanel) adminPanel.style.display = "none";
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    }
});

// --- 2. Tab Switching Logic ---
tabLinks.forEach(link => {
    link.addEventListener("click", () => {
        const tabId = link.getAttribute("data-tab");
        
        tabLinks.forEach(item => item.classList.remove("active"));
        tabContents.forEach(item => item.classList.remove("active"));
        
        link.classList.add("active");
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add("active");
        }
    });
});

// --- 3. Image Preview Logic ---
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    if (!input || !previewContainer) return;

    function updatePreview() {
        previewContainer.innerHTML = ''; // പഴയ പ്രിവ്യൂ മാറ്റുന്നു
        const urls = input.value.split('\n')
                             .map(url => url.trim())
                             .filter(url => url.length > 0);
        
        urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; }; // ലിങ്ക് തെറ്റാണെങ്കിൽ
            previewContainer.appendChild(img);
        });
    }
    
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
}
setupImagePreview('category-image-url', 'category-image-preview');
setupImagePreview('product-image-urls', 'product-image-preview');


// --- 4. Site Settings Logic ---
async function loadSiteSettings() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // null അല്ലെങ്കിൽ undefined അല്ലെങ്കിൽ ഒബ്ജക്റ്റിൽ ആ കീ ഇല്ലെങ്കിൽ '' (empty string) ഉപയോഗിക്കുന്നു
            document.getElementById("setting-logo-image-url").value = settings.logoImageUrl || '';
            document.getElementById("setting-hero-video-url").value = settings.heroVideoUrl || '';
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

if (siteSettingsForm) {
    siteSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showLoader(settingsLoader);
        try {
            const settings = {
                logoImageUrl: document.getElementById("setting-logo-image-url").value,
                heroVideoUrl: document.getElementById("setting-hero-video-url").value,
                videoUrl: document.getElementById("setting-video-url").value,
                phone: document.getElementById("setting-phone").value,
                email: document.getElementById("setting-email").value,
                address: document.getElementById("setting-address").value,
                whatsapp: document.getElementById("setting-whatsapp").value,
                facebookUrl: document.getElementById("setting-facebook-url").value,
                instagramUrl: document.getElementById("setting-instagram-url").value,
            };
            
            const docRef = doc(db, "settings", "global");
            await setDoc(docRef, settings, { merge: true }); // 'merge: true' ഉപയോഗിച്ച് അപ്‌ഡേറ്റ് ചെയ്യുന്നു
            
            showStatus(adminStatus, "Settings saved successfully!", false);
        } catch (error) {
            console.error("Error saving settings: ", error);
            showStatus(adminStatus, `Error: ${error.message}`);
        } finally {
            hideLoader(settingsLoader);
        }
    });
}

// --- 5. Category Logic (Full CRUD) ---

// തത്സമയം കാറ്റഗറികൾ ലോഡ് ചെയ്യുന്നു
function loadCategories() {
    const q = query(collection(db, "categories"));
    onSnapshot(q, (querySnapshot) => {
        if (categoriesListBody) categoriesListBody.innerHTML = '';
        if (productCategorySelect) productCategorySelect.innerHTML = '<option value="">Select a category...</option>';
        
        if (querySnapshot.empty) {
            if (categoriesListBody) categoriesListBody.innerHTML = '<tr><td colspan="3">No categories found.</td></tr>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const category = doc.data();
            const id = doc.id;
            
            // കാറ്റഗറി ലിസ്റ്റിൽ ചേർക്കുന്നു
            if (categoriesListBody) {
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
            }
            
            // പ്രോഡക്റ്റ് ഫോമിലെ ഡ്രോപ്പ്ഡൗണിൽ ചേർക്കുന്നു
            if (productCategorySelect) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = category.name;
                productCategorySelect.appendChild(option);
            }
        });
    }, (error) => {
        console.error("Error loading categories: ", error);
        showStatus(adminStatus, "Error loading categories.");
    });
}

// പുതിയ കാറ്റഗറി ചേർക്കുന്നു
if (addCategoryForm) {
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
            if (categoryImagePreview) categoryImagePreview.innerHTML = ''; // പ്രിവ്യൂ ക്ലിയർ ചെയ്യുന്നു

        } catch (error) {
            console.error("Error adding category: ", error);
            showStatus(adminStatus, `Error: ${error.message}`);
        } finally {
            hideLoader(categoryLoader);
        }
    });
}

// --- 6. Product Logic (Full CRUD) ---

// തത്സമയം ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു
function loadProducts() {
     const q = query(collection(db, "products"));
     onSnapshot(q, (querySnapshot) => {
        if (productsListBody) productsListBody.innerHTML = '';
        
        if (querySnapshot.empty) {
            if (productsListBody) productsListBody.innerHTML = '<tr><td colspan="5">No products found.</td></tr>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const id = doc.id;
            const imageUrl = product.images && product.images[0] ? product.images[0] : '';
            
            // വില ഫോർമാറ്റ് ചെയ്യുന്നു
            let priceDisplay = '';
            const price = product.price || 0;
            const mrp = product.mrp || 0;
            if(price > 0) {
                priceDisplay = `<strong>₹${price}</strong>`;
                if(mrp > price) {
                    priceDisplay += ` <del>₹${mrp}</del>`;
                }
            } else {
                priceDisplay = 'N/A';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${imageUrl}" alt="${product.name}"></td>
                <td>${product.name}</td>
                <td>${priceDisplay}</td>
                <td>${product.featured ? 'Yes' : 'No'}</td>
                <td>
                    <button class="btn btn-edit" data-id="${id}" data-type="product">Edit</button>
                    <button class="btn btn-delete" data-id="${id}" data-type="product">Delete</button>
                </td>
            `;
            if (productsListBody) productsListBody.appendChild(row);
        });
     }, (error) => {
        console.error("Error loading products: ", error);
        showStatus(adminStatus, "Error loading products.");
    });
}

// പുതിയ ഉൽപ്പന്നം ചേർക്കുന്നു
if (addProductForm) {
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
                price: Number(document.getElementById("product-price").value) || 0,
                mrp: Number(document.getElementById("product-mrp").value) || 0,
                description: document.getElementById("product-description").value,
                featured: document.getElementById("product-featured").checked,
                images: imageUrls,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "products"), product);
            showStatus(adminStatus, "Product added successfully!", false);
            addProductForm.reset();
            if (productImagePreview) productImagePreview.innerHTML = ''; // പ്രിവ്യൂ ക്ലിയർ ചെയ്യുന്നു

        } catch (error) {
            console.error("Error adding product: ", error);
            showStatus(adminStatus, `Error: ${error.message}`);
        } finally {
            hideLoader(productLoader);
        }
    });
}


// --- 7. Edit & Delete Logic (Modal) ---

// "Edit" അല്ലെങ്കിൽ "Delete" ബട്ടൺ ക്ലിക്ക് ചെയ്യുമ്പോൾ
document.body.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Delete ബട്ടൺ
    if (target.classList.contains('btn-delete')) {
        const id = target.dataset.id;
        const type = target.dataset.type;
        
        // ഒരു ലളിതമായ കസ്റ്റം കൺഫർമേഷൻ
        if (confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, type === 'product' ? 'products' : 'categories', id));
                showStatus(adminStatus, `${type} deleted successfully.`, false);
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

// എഡിറ്റ് മോഡൽ തുറക്കുന്നു
async function openEditModal(id, type) {
    if (!modalForm || !editModal || !modalLoader || !modalTitle) return;
    
    modalForm.innerHTML = ''; // പഴയ ഫോം മാറ്റുന്നു
    showLoader(modalLoader);
    editModal.style.display = 'flex';
    
    try {
        const docRef = doc(db, type === 'product' ? 'products' : 'categories', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("Item not found.");
        }
        
        const data = docSnap.data();
        modalTitle.textContent = `Edit ${type}`;
        
        // മോഡലിൽ ഏത് ഫോം കാണിക്കണം എന്ന് തീരുമാനിക്കുന്നു
        if (type === 'category') {
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="category">
                <div class="form-group">
                    <label for="modal-category-name">Category Name</label>
                    <input type="text" id="modal-category-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-category-image-url">Category Image URL</label>
                    <input type="text" class="image-url-input" id="modal-category-image-url" value="${data.imageUrl || ''}" required>
                    <div class="image-preview" id="modal-category-image-preview"></div>
                </div>
                <button type="submit" class="btn">Save Changes</button>
            `;
            setupImagePreview('modal-category-image-url', 'modal-category-image-preview');
            // പ്രിവ്യൂ ലോഡ് ചെയ്യാൻ
            document.getElementById('modal-category-image-url')?.dispatchEvent(new Event('input')); 
            
        } else if (type === 'product') {
            const imagesText = data.images ? data.images.join('\n') : '';
            modalForm.innerHTML = `
                <input type="hidden" id="modal-item-id" value="${id}">
                <input type="hidden" id="modal-item-type" value="product">
                
                <div class="form-grid">
                    <div class="form-group">
                        <label for="modal-product-name">Product Name</label>
                        <input type="text" id="modal-product-name" value="${data.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-product-category">Category</label>
                        <select id="modal-product-category" required>${productCategorySelect.innerHTML}</select>
                    </div>
                     <div class="form-group">
                        <label for="modal-product-mrp">MRP (₹)</label>
                        <input type="number" id="modal-product-mrp" value="${data.mrp || ''}" placeholder="e.g., 1000">
                    </div>
                    <div class="form-group">
                        <label for="modal-product-price">Retail Price (₹)</label>
                        <input type="number" id="modal-product-price" value="${data.price || ''}" placeholder="e.g., 800">
                    </div>
                    <div class="form-group">
                        <label for="modal-product-size">Size</label>
                        <input type="text" id="modal-product-size" value="${data.size || ''}">
                    </div>
                    <div class="form-group">
                        <input type="checkbox" id="modal-product-featured" style="width: auto; margin-right: 10px;" ${data.featured ? 'checked' : ''}>
                        <label for="modal-product-featured" style="display: inline;">Featured?</label>
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
            // സെലക്റ്റ് ശരിയാക്കുന്നു
            const modalCatSelect = document.getElementById('modal-product-category');
            if (modalCatSelect) modalCatSelect.value = data.categoryId; 
            
            setupImagePreview('modal-product-image-urls', 'modal-product-image-preview');
            // പ്രിവ്യൂ ലോഡ് ചെയ്യാൻ
            document.getElementById('modal-product-image-urls')?.dispatchEvent(new Event('input'));
        }
        
    } catch (error) {
        console.error("Error opening modal: ", error);
        showStatus(adminStatus, `Error: ${error.message}`);
        closeEditModal();
    } finally {
        hideLoader(modalLoader);
    }
}

// മോഡൽ അടയ്ക്കുന്നു
function closeEditModal() {
    if (editModal) editModal.style.display = 'none';
}
if (modalCloseButton) modalCloseButton.addEventListener('click', closeEditModal);

// എഡിറ്റ് ചെയ്ത ഡാറ്റ സേവ് ചെയ്യുന്നു
if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader(modalLoader);
        
        const id = document.getElementById('modal-item-id').value;
        const type = document.getElementById('modal-item-type').value;
        
        try {
            let dataToSave = {};
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
                    price: Number(document.getElementById('modal-product-price').value) || 0,
                    mrp: Number(document.getElementById('modal-product-mrp').value) || 0,
                    description: document.getElementById('modal-product-description').value,
                    featured: document.getElementById('modal-product-featured').checked,
                    images: imageUrls,
                };
            }
            
            const docRef = doc(db, type === 'product' ? 'products' : 'categories', id);
            await setDoc(docRef, dataToSave, { merge: true }); // 'merge: true' പഴയ ഡാറ്റ പോവാതെ അപ്‌ഡേറ്റ് ചെയ്യുന്നു
            
            showStatus(adminStatus, `${type} updated successfully!`, false);
            closeEditModal();
            
        } catch (error) {
            console.error("Error saving changes: ", error);
            showStatus(adminStatus, `Error: ${error.message}`);
        } finally {
            hideLoader(modalLoader);
        }
    });
}