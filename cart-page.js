// ഇതാണ് 'cart-page.js' ഫയൽ.
// മാറ്റം: WhatsApp മെസ്സേജിലെ പേര് 'JR UD HUB' എന്നാക്കി.

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; // *** optimizeImage ***
import { getCartItems, updateQuantity, removeFromCart, getCartTotal, getCartItemCount, getCartTotalMRP, clearCart } from './cart.js';

const itemsContainer = document.getElementById('cart-items-container');
const summaryContainer = document.getElementById('cart-summary-container');
const cartErrorMessage = document.getElementById('cart-error-message');
const priceLabelEl = document.getElementById('cart-price-label');
const mrpTotalEl = document.getElementById('cart-mrp-total');
const discountEl = document.getElementById('cart-discount');
const savingsMessageEl = document.getElementById('cart-savings-message');
const totalEl = document.getElementById('cart-total');
const fullCheckoutButton = document.getElementById('full-checkout-button');
const checkoutLoader = document.getElementById('checkout-loader');

let whatsappNumber = ''; 

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadWhatsappNumber(); 
    renderCartPage();   
});

async function loadWhatsappNumber() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        } else {
            console.log("WhatsApp number not found.");
            showError("Order failed: WhatsApp number is not configured.");
        }
    } catch (error) {
        console.error("Error fetching WhatsApp number: ", error);
        showError("Order failed: Could not contact server.");
    }
}

function renderCartPage() {
    if (!itemsContainer || !summaryContainer) return;

    const cart = getCartItems();
    const cartKeys = Object.keys(cart);

    if (cartKeys.length === 0) {
        itemsContainer.innerHTML = `
            <div class="empty-cart-message">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <a href="categories.html" class="btn btn-primary-new">Continue Shopping</a>
            </div>
        `;
        summaryContainer.style.display = 'none'; 
        return;
    }

    summaryContainer.style.display = 'block';
    itemsContainer.innerHTML = ''; 

    cartKeys.forEach(key => {
        const item = cart[key];
        const itemId = item.id || key; 
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item-card';
        
        const sizeHTML = item.size ? `<span class="cart-item-size">Size: ${item.size}</span>` : '';
        const productLink = `product.html?id=${itemId}`;
        
        // *** കാർട്ട് ഇമേജ് വളരെ ചെറുത് മതി (150px) ***
        const rawImage = item.image || 'https://placehold.co/150x150/1e1e1e/D4AF37?text=No+Image';
        const optimizedImage = optimizeImage(rawImage, 150);

        itemElement.innerHTML = `
            <div class="cart-item-main">
                <a href="${productLink}" class="cart-item-link">
                    <img src="${optimizedImage}" alt="${item.name}" class="cart-item-image" loading="lazy">
                </a>
                <div class="cart-item-info">
                    <a href="${productLink}" class="cart-item-link">
                        <h3>${item.name}</h3>
                    </a>
                    <span class="cart-item-price">₹${item.price.toFixed(2)}</span>
                    ${sizeHTML}
                    <div class="quantity-control">
                        <button class="quantity-btn" data-id="${key}" data-change="-1">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" data-id="${key}" min="1" readonly>
                        <button class="quantity-btn" data-id="${key}" data-change="1">+</button>
                    </div>
                </div>
            </div>
            <div class="cart-item-actions">
                <button class="remove-btn" data-id="${key}">Remove</button>
                <button class="buy-now-btn" data-id="${key}">Buy this now</button>
            </div>
        `;
        itemsContainer.appendChild(itemElement);
    });

    updateCartSummary();
}

function updateCartSummary() {
    const totalItems = getCartItemCount();
    const subtotal = getCartTotal(); 
    const totalMRP = getCartTotalMRP(); 
    const discount = totalMRP - subtotal;
    
    if (priceLabelEl) priceLabelEl.textContent = `Price (${totalItems} items)`;
    if (mrpTotalEl) mrpTotalEl.textContent = `₹${totalMRP.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${subtotal.toFixed(2)}`;
    
    if (discount > 0) {
        if (discountEl) {
            discountEl.textContent = `- ₹${discount.toFixed(2)}`;
            discountEl.parentElement.style.display = 'flex';
        }
        if (savingsMessageEl) {
            savingsMessageEl.textContent = `You'll save ₹${discount.toFixed(2)} on this order!`;
            savingsMessageEl.style.display = 'block';
        }
    } else {
        if (discountEl) discountEl.parentElement.style.display = 'none';
        if (savingsMessageEl) savingsMessageEl.style.display = 'none';
    }
}

itemsContainer.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('remove-btn')) {
        const id = target.dataset.id;
        removeFromCart(id);
        renderCartPage(); 
    }
    if (target.classList.contains('quantity-btn')) {
        const id = target.dataset.id;
        const change = parseInt(target.dataset.change);
        const cart = getCartItems();
        if (cart[id]) { 
            const newQuantity = cart[id].quantity + change;
            updateQuantity(id, newQuantity);
            renderCartPage();
        }
    }
    if (target.classList.contains('buy-now-btn')) {
        const id = target.dataset.id;
        handleSingleOrder(id);
    }
});

if (fullCheckoutButton) {
    fullCheckoutButton.addEventListener('click', () => {
        handleFullOrder();
    });
}

function handleSingleOrder(itemId) {
    if (!whatsappNumber) return showError("WhatsApp number not found.");
    
    const cart = getCartItems();
    const item = cart[itemId];
    
    if (item) {
        showLoader(true);
        const itemMRP = ((item.mrp && item.mrp > item.price) ? item.mrp : item.price) * item.quantity;
        const itemTotal = item.price * item.quantity;
        const itemDiscount = itemMRP - itemTotal;

        const message = generateWhatsAppMessage([item], itemTotal, itemMRP, itemDiscount);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showLoader(false);
    }
}

function handleFullOrder() {
    if (!whatsappNumber) return showError("WhatsApp number not found.");
    
    const cart = getCartItems();
    const cartItems = Object.values(cart);
    
    if (cartItems.length === 0) {
        return showError("Your cart is empty.");
    }
    
    showLoader(true);
    const total = getCartTotal();
    const totalMRP = getCartTotalMRP();
    const discount = totalMRP - total;
    
    const message = generateWhatsAppMessage(cartItems, total, totalMRP, discount);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    showLoader(false);
}

function generateWhatsAppMessage(items, totalAmount, totalMRP, discount) {
    // *** മാറ്റം: പേര് മാറ്റി ***
    let message = "🎉 *New Order from JR UD HUB* 🎉\n\n";
    message += "Here are the items:\n";
    message += "----------------------------------\n";

    items.forEach(item => {
        const itemId = item.id || Object.keys(getCartItems()).find(key => getCartItems()[key] === item);
        const productLink = `${window.location.origin}/product.html?id=${itemId}`;
        
        message += `*${item.name}*\n`;
        if (item.size) {
            message += `  Size: ${item.size}\n`; 
        }
        message += `  Qty: ${item.quantity}\n`;
        message += `  Price: ₹${item.price.toFixed(2)}\n`;
        message += `  Subtotal: ₹${(item.price * item.quantity).toFixed(2)}\n`;
        message += `  Link: ${productLink}\n\n`; 
    });

    message += "----------------------------------\n";
    message += `Total Price: ₹${totalMRP.toFixed(2)}\n`;
    if (discount > 0) {
        message += `Discount: - ₹${discount.toFixed(2)}\n`;
        message += `*Total Amount: ₹${totalAmount.toFixed(2)}*\n\n`;
        message += `_You saved ₹${discount.toFixed(2)} on this order!_`;
    } else {
        message += `*Total Amount: ₹${totalAmount.toFixed(2)}*\n`;
    }
    
    message += "\n\nThank you!";
    return message;
}

function showError(message) {
    if (cartErrorMessage) {
        cartErrorMessage.textContent = message;
        cartErrorMessage.style.display = 'block';
    }
}

function showLoader(show) {
    if (checkoutLoader) checkoutLoader.style.display = show ? 'block' : 'none';
    if (fullCheckoutButton) fullCheckoutButton.disabled = show;
}
