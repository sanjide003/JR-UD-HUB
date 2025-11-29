// ഇതാണ് 'cart-page.js' ഫയൽ.
// മാറ്റങ്ങൾ: പുതിയ HTML ഡിസൈനിലേക്ക് ലോജിക് മാറ്റി.

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings, optimizeImage } from './common.js'; 
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
        }
    } catch (error) {
        console.error("Error fetching WhatsApp number: ", error);
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
                <p>Add items to your cart to checkout.</p>
                <a href="categories.html" class="btn btn-primary-new">Start Shopping</a>
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
        
        const sizeHTML = item.size ? `<span class="cart-item-size">${item.size}</span>` : '';
        const productLink = `product.html?id=${itemId}`;
        
        const rawImage = item.image || 'https://placehold.co/150x150/1e1e1e/D4AF37?text=No+Image';
        const optimizedImage = optimizeImage(rawImage, 150);

        // *** പുതിയ കാർഡ് HTML ***
        itemElement.innerHTML = `
            <div class="cart-item-main">
                <a href="${productLink}" class="cart-item-image-link">
                    <img src="${optimizedImage}" alt="${item.name}" class="cart-item-image" loading="lazy">
                </a>
                <div class="cart-item-info">
                    <div>
                        <a href="${productLink}" class="cart-item-title">${item.name}</a>
                        <div class="cart-item-meta">
                            <span class="cart-item-price">₹${item.price.toFixed(2)}</span>
                            ${sizeHTML}
                        </div>
                    </div>
                    
                    <div class="quantity-control">
                        <button class="quantity-btn" data-id="${key}" data-change="-1">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" readonly>
                        <button class="quantity-btn" data-id="${key}" data-change="1">+</button>
                    </div>
                </div>
            </div>
            <div class="cart-item-actions">
                <button class="cart-action-btn btn-remove" data-id="${key}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Remove
                </button>
                <button class="cart-action-btn btn-buy-single" data-id="${key}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.42 20.64C8.83 21.37 10.38 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2ZM17.11 15.65C16.82 15.94 15.82 16.46 15.34 16.59C14.86 16.71 14.12 16.78 13.53 16.6C12.94 16.41 11.77 16.03 10.42 14.77C8.85 13.28 7.92 11.47 7.73 11.18C7.54 10.89 7.02 10.15 7.02 9.47C7.02 8.79 7.49 8.35 7.73 8.11C7.97 7.87 8.28 7.81 8.52 7.81C8.76 7.81 8.97 7.81 9.15 7.84C9.33 7.87 9.47 7.9 9.69 8.41C9.91 8.92 10.37 10.13 10.43 10.25C10.49 10.37 10.56 10.56 10.43 10.74C10.31 10.92 10.22 11.02 10.07 11.16C9.92 11.31 9.77 11.41 9.66 11.53C9.54 11.65 9.36 11.83 9.54 12.12C9.72 12.42 10.26 13.23 11.03 13.91C11.97 14.75 12.82 15.02 13.11 15.17C13.4 15.31 13.58 15.28 13.73 15.11C13.87 14.93 14.28 14.43 14.46 14.14C14.65 13.85 14.92 13.79 15.19 13.88C15.46 13.97 16.53 14.52 16.82 14.66C17.11 14.8 17.26 14.89 17.32 15.02C17.38 15.14 17.38 15.36 17.11 15.65Z"></path></svg>
                    Buy This Now
                </button>
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
            savingsMessageEl.textContent = `You will save ₹${discount.toFixed(2)} on this order!`;
            savingsMessageEl.style.display = 'block';
        }
    } else {
        if (discountEl) discountEl.parentElement.style.display = 'none';
        if (savingsMessageEl) savingsMessageEl.style.display = 'none';
    }
}

// Event Listeners for Cart Items
itemsContainer.addEventListener('click', (e) => {
    const target = e.target;
    
    // Remove Button
    if (target.closest('.btn-remove')) {
        const btn = target.closest('.btn-remove');
        const id = btn.dataset.id;
        removeFromCart(id);
        renderCartPage(); 
    }
    
    // Quantity Buttons
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
    
    // Single Buy Button
    if (target.closest('.btn-buy-single')) {
        const btn = target.closest('.btn-buy-single');
        const id = btn.dataset.id;
        handleSingleOrder(id);
    }
});

if (fullCheckoutButton) {
    fullCheckoutButton.addEventListener('click', () => {
        handleFullOrder();
    });
}

function handleSingleOrder(itemId) {
    if (!whatsappNumber) return showError("WhatsApp number not set by admin.");
    
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
    if (!whatsappNumber) return showError("WhatsApp number not set by admin.");
    
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

// WhatsApp Message Format (Malayalam)
function generateWhatsAppMessage(items, totalAmount, totalMRP, discount) {
    let message = "ഹായ് 👋\n";
    message += "ഞാൻ താഴെയുള്ള പ്രോഡക്റ്റ് ഓർഡർ ചെയ്യാൻ ആഗ്രഹിക്കുന്നു.\n";
    message += "____________________\n\n";

    items.forEach(item => {
        const itemId = item.id || Object.keys(getCartItems()).find(key => getCartItems()[key] === item);
        const productLink = `${window.location.origin}/product.html?id=${itemId}`;
        
        message += `🛍️ ${item.name}\n`;
        
        if (item.size) {
            message += `Size : ${item.size}\n`; 
        }
        
        message += `Qty : ${item.quantity}\n`;
        message += `Price : ₹${item.price.toFixed(2)}\n\n`;
        message += `🔗 Product link :  ${productLink}\n\n`; 
    });

    message += `💰 *Total : ₹${totalMRP.toFixed(2)}*\n`;
    
    if (discount > 0) {
        message += `🎁 Discount : ₹${discount.toFixed(2)}\n\n`;
    } else {
        message += `\n`;
    }

    message += `✅ \`Payable amount : ₹${totalAmount.toFixed(2)}\`\n`;
    message += "\n____________________\n\n";
    message += "ദയവായി എത്രയും പെട്ടെന്ന് പ്രോസസ് ചെയ്യുക.\n\n";
    
    if (discount > 0) {
        message += `\`You saved ₹${discount.toFixed(2)} on this order!\``;
    }

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