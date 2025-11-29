import { db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 
import { addToCart, isItemInCart, removeFromCart } from './cart.js';

document.addEventListener("DOMContentLoaded", async () => {
    loadSiteSettings();
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');
    if(pid) loadProduct(pid);
});

async function loadProduct(id) {
    const docSnap = await getDoc(doc(db, "products", id));
    if (!docSnap.exists()) return;
    const p = docSnap.data();
    
    // Gallery
    let slides = '';
    const images = p.images || ['https://placehold.co/500'];
    images.forEach(url => {
        slides += `<div class="swiper-slide"><img src="${optimizeImage(url, 800)}" loading="lazy"></div>`;
    });

    const content = document.getElementById('product-detail-content');
    content.innerHTML = `
        <div class="product-gallery swiper">
            <div class="swiper-wrapper">${slides}</div>
            <div class="swiper-pagination"></div>
        </div>
        <div class="product-info">
            <h1>${p.name}</h1>
            <div class="product-price-box">₹${p.price} <small style="color:#666; font-size:1rem; text-decoration:line-through;">₹${p.mrp||''}</small></div>
            <div class="product-desc">${p.description || 'No description.'}</div>
            <div class="action-btns">
                <button class="btn-cart" id="btn-cart">${isItemInCart(id) ? 'Remove' : 'Add to Cart'}</button>
                <a href="#" class="btn-whatsapp" id="btn-wa">Buy on WhatsApp</a>
            </div>
        </div>
    `;
    new Swiper('.product-gallery', { pagination: { el: '.swiper-pagination' } });

    // Buttons
    document.getElementById('btn-cart').addEventListener('click', () => {
        if(isItemInCart(id)) { removeFromCart(id); document.getElementById('btn-cart').innerText = 'Add to Cart'; }
        else { addToCart(id, {name: p.name, price: p.price, image: images[0]}); document.getElementById('btn-cart').innerText = 'Remove'; }
    });

    document.getElementById('btn-wa').addEventListener('click', async (e) => {
        e.preventDefault();
        const settings = await getDoc(doc(db, "settings", "global"));
        const num = settings.data()?.whatsapp;
        if(num) {
            const msg = `Hi, I want to buy *${p.name}* (₹${p.price}). Link: ${window.location.href}`;
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
        } else alert("WhatsApp not configured.");
    });

    // Related
    if(p.categoryId) {
        const relSnap = await getDocs(query(collection(db, "products"), where("categoryId", "==", p.categoryId), limit(5)));
        const relGrid = document.getElementById('related-products-grid');
        relSnap.forEach(d => {
            if(d.id === id) return;
            const rp = d.data();
            const div = document.createElement('div');
            div.className = 'related-card';
            div.innerHTML = `
                <a href="product.html?id=${d.id}">
                    <img src="${optimizeImage(rp.images?.[0], 200)}" loading="lazy">
                    <div style="font-size:0.9rem; font-weight:600; color:#fff;">${rp.name}</div>
                    <div style="color:var(--primary-gold);">₹${rp.price}</div>
                </a>
            `;
            relGrid.appendChild(div);
        });
    }
}