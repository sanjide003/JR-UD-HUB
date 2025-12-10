// Filename: admin-products.js

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// UI Helpers
const showToast = (msg, isErr = false) => {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed; top:20px; right:20px; padding:12px 20px; background:${isErr?'#ef4444':'#00c853'}; color:white; border-radius:5px; z-index:9999; box-shadow:0 4px 10px rgba(0,0,0,0.3);`;
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

// Auth Logic
onAuthStateChanged(auth, user => {
    if(user) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        loadData();
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('admin-panel').classList.add('hidden');
    }
});

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
    } catch(err) { showToast(err.message, true); }
};
document.getElementById('logout-btn').onclick = () => signOut(auth);

// Tabs Logic
document.querySelectorAll('.nav-link').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        // Close nav on mobile
        document.getElementById('side-nav').classList.remove('open');
        document.getElementById('nav-overlay').classList.remove('open');
    };
});
document.getElementById('nav-open-btn').onclick = () => {
    document.getElementById('side-nav').classList.add('open');
    document.getElementById('nav-overlay').classList.add('open');
};
document.getElementById('nav-close-btn').onclick = document.getElementById('nav-overlay').onclick = () => {
    document.getElementById('side-nav').classList.remove('open');
    document.getElementById('nav-overlay').classList.remove('open');
};

// --- DATA LOGIC ---

// 1. Image Inputs Generator
const imgContainer = document.getElementById('p-images-container');
const addImgInput = (val='') => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; gap:10px; margin-bottom:5px;";
    div.innerHTML = `<input type="text" value="${val}" placeholder="Image URL"><button type="button" class="btn btn-delete" style="padding:0 10px;">X</button>`;
    div.querySelector('button').onclick = () => div.remove();
    imgContainer.appendChild(div);
};
document.getElementById('btn-add-img').onclick = () => addImgInput();

// 2. Categories
async function loadCategories() {
    const q = query(collection(db, 'categories'), orderBy('name'));
    onSnapshot(q, snap => {
        const select = document.getElementById('p-category');
        const filter = document.getElementById('filter-category');
        const list = document.getElementById('categories-list');
        
        select.innerHTML = '<option value="">Select...</option>';
        filter.innerHTML = '<option value="all">All</option>';
        list.innerHTML = '';

        snap.forEach(docSnap => {
            const d = docSnap.data();
            // Populate Selects
            const opt = `<option value="${docSnap.id}">${d.name}</option>`;
            select.innerHTML += opt;
            filter.innerHTML += opt;
            // Populate Table
            list.innerHTML += `<tr>
                <td><img src="${d.imageUrl}" alt="img"></td>
                <td>${d.name}</td>
                <td><button class="btn btn-delete" onclick="window.delCat('${docSnap.id}')">Del</button></td>
            </tr>`;
        });
    });
}

document.getElementById('add-category-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, 'categories'), {
            name: document.getElementById('c-name').value,
            imageUrl: document.getElementById('c-image').value,
            createdAt: serverTimestamp()
        });
        showToast('Category Added');
        e.target.reset();
    } catch(err) { showToast(err.message, true); }
};

window.delCat = async (id) => {
    if(confirm('Delete Category?')) await deleteDoc(doc(db, 'categories', id));
};

// 3. Products
function loadProducts() {
    onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), snap => {
        const list = document.getElementById('products-list');
        list.innerHTML = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            list.innerHTML += `<tr>
                <td><img src="${d.images?.[0] || ''}" alt="img"></td>
                <td>${d.name}</td>
                <td>₹${d.price}</td>
                <td><button class="btn btn-delete" onclick="window.delProd('${docSnap.id}')">Del</button></td>
            </tr>`;
        });
    });
}

document.getElementById('add-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const imgs = Array.from(imgContainer.querySelectorAll('input')).map(i => i.value).filter(v => v);
    if(imgs.length === 0) return showToast('Add at least 1 image', true);

    try {
        await addDoc(collection(db, 'products'), {
            name: document.getElementById('p-name').value,
            categoryId: document.getElementById('p-category').value,
            mrp: Number(document.getElementById('p-mrp').value) || 0,
            price: Number(document.getElementById('p-price').value),
            featured: document.getElementById('p-featured').checked,
            description: document.getElementById('p-desc').value,
            specification: document.getElementById('p-spec').value,
            images: imgs,
            createdAt: serverTimestamp()
        });
        showToast('Product Added');
        e.target.reset();
        imgContainer.innerHTML = '';
        addImgInput();
    } catch(err) { showToast(err.message, true); }
};

window.delProd = async (id) => {
    if(confirm('Delete Product?')) await deleteDoc(doc(db, 'products', id));
};

function loadData() {
    loadCategories();
    loadProducts();
    addImgInput(); // Init one image input
}