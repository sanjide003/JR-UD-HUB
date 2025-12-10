// Filename: admin-settings.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, doc, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Basic UI Helper
const showToast = (msg, isErr=false) => {
    const t = document.createElement('div');
    t.innerText = msg;
    t.style.cssText = `position:fixed; top:20px; right:20px; padding:12px; background:${isErr?'#ef4444':'#00c853'}; color:#fff; border-radius:5px; z-index:9999;`;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
};

onAuthStateChanged(auth, user => {
    if(!user) window.location.href = "admin-products.html"; // Redirect if not logged in
    else loadAllSettings();
});

// Navigation Logic
document.querySelectorAll('.nav-link').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-link').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.page-content').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        document.getElementById('side-nav').classList.remove('open');
        document.getElementById('nav-overlay').classList.remove('open');
    }
});
document.getElementById('nav-open-btn').onclick = () => {
    document.getElementById('side-nav').classList.add('open');
    document.getElementById('nav-overlay').classList.add('open');
};
document.getElementById('nav-close-btn').onclick = document.getElementById('nav-overlay').onclick = () => {
    document.getElementById('side-nav').classList.remove('open');
    document.getElementById('nav-overlay').classList.remove('open');
};

// --- SETTINGS LOGIC ---

// 1. Global Settings Saver
async function saveSetting(docName, data) {
    try {
        await setDoc(doc(db, 'settings', docName), data, {merge:true});
        showToast('Saved Successfully');
    } catch(err) { showToast(err.message, true); }
}

document.getElementById('general-form').onsubmit = (e) => {
    e.preventDefault();
    saveSetting('global', {
        logoImageUrl: document.getElementById('s-logo').value,
        logoText: document.getElementById('s-logo-text').value,
        dealerChatNumber: document.getElementById('s-dealer').value
    });
};

document.getElementById('contact-form').onsubmit = (e) => {
    e.preventDefault();
    saveSetting('global', {
        phone: document.getElementById('c-phone').value,
        email: document.getElementById('c-email').value,
        address: document.getElementById('c-address').value
    });
};

document.getElementById('social-form').onsubmit = (e) => {
    e.preventDefault();
    saveSetting('global', {
        followWhatsapp: document.getElementById('f-wa').value,
        instagramUrl: document.getElementById('f-insta').value,
        facebookUrl: document.getElementById('f-fb').value,
        youtubeUrl: document.getElementById('f-yt').value
    });
};

// 2. Hero Manager
document.getElementById('hero-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, 'heroSlides'), {
            url: document.getElementById('h-url').value,
            type: document.getElementById('h-type').value,
            order: Number(document.getElementById('h-order').value),
            createdAt: serverTimestamp()
        });
        showToast('Slide Added');
        e.target.reset();
    } catch(err) { showToast(err.message, true); }
};

window.delHero = async (id) => { if(confirm('Delete Slide?')) await deleteDoc(doc(db, 'heroSlides', id)); };

// 3. Offer & Trendy Logic
document.getElementById('offer-banner-form').onsubmit = (e) => {
    e.preventDefault();
    saveSetting('homeLayout', { topDealsBanner: document.getElementById('offer-banner-url').value });
};

// Search Product for Offer
const searchInp = document.getElementById('offer-search');
const searchRes = document.getElementById('offer-search-results');
let allProds = [];

searchInp.oninput = () => {
    const val = searchInp.value.toLowerCase();
    searchRes.innerHTML = '';
    if(val.length < 2) { searchRes.style.display='none'; return; }
    
    const matches = allProds.filter(p => p.name.toLowerCase().includes(val));
    if(matches.length) {
        searchRes.style.display='block';
        matches.forEach(p => {
            const d = document.createElement('div');
            d.innerHTML = `<span style="color:#fff">${p.name}</span> <button type="button" style="float:right">Add</button>`;
            d.style.cssText = "padding:5px; border-bottom:1px solid #444; cursor:pointer;";
            d.onclick = async () => {
                await updateDoc(doc(db, 'products', p.id), { isTopDeal: true });
                showToast('Added to Offer');
                searchInp.value=''; searchRes.style.display='none';
            };
            searchRes.appendChild(d);
        });
    }
};

window.removeFromOffer = async (id) => await updateDoc(doc(db, 'products', id), { isTopDeal: false });
window.removeFromTrendy = async (id) => await updateDoc(doc(db, 'products', id), { featured: false });

// LOAD ALL DATA
async function loadAllSettings() {
    // Settings
    const setSnap = await getDoc(doc(db, 'settings', 'global'));
    if(setSnap.exists()) {
        const d = setSnap.data();
        const setVal = (id, k) => document.getElementById(id).value = d[k] || '';
        setVal('s-logo','logoImageUrl'); setVal('s-logo-text','logoText'); setVal('s-dealer','dealerChatNumber');
        setVal('c-phone','phone'); setVal('c-email','email'); setVal('c-address','address');
        setVal('f-wa','followWhatsapp'); setVal('f-insta','instagramUrl'); setVal('f-fb','facebookUrl'); setVal('f-yt','youtubeUrl');
    }

    // Home Banner
    const homeSnap = await getDoc(doc(db, 'settings', 'homeLayout'));
    if(homeSnap.exists()) document.getElementById('offer-banner-url').value = homeSnap.data().topDealsBanner || '';

    // Hero Slides
    onSnapshot(query(collection(db, 'heroSlides'), orderBy('order')), snap => {
        const list = document.getElementById('hero-list');
        list.innerHTML = '';
        snap.forEach(d => {
            list.innerHTML += `<tr>
                <td>${d.data().type==='image' ? `<img src="${d.data().url}">`:'Video'}</td>
                <td>${d.data().order}</td>
                <td><button class="btn btn-delete" onclick="window.delHero('${d.id}')">Del</button></td>
            </tr>`;
        });
    });

    // Products (For search & lists)
    onSnapshot(collection(db, 'products'), snap => {
        allProds = [];
        const offerList = document.getElementById('offer-list');
        const trendyList = document.getElementById('trendy-list');
        offerList.innerHTML = '';
        trendyList.innerHTML = '';

        snap.forEach(d => {
            const p = d.data();
            p.id = d.id;
            allProds.push(p);

            if(p.isTopDeal) {
                offerList.innerHTML += `<tr><td>${p.name}</td><td><button class="btn btn-delete" onclick="window.removeFromOffer('${d.id}')">Remove</button></td></tr>`;
            }
            if(p.featured) {
                trendyList.innerHTML += `<tr><td>${p.name}</td><td><button class="btn btn-delete" onclick="window.removeFromTrendy('${d.id}')">Remove</button></td></tr>`;
            }
        });
    });
}
