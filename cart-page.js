// ഇതാണ് 'cart-page.js' ഫയൽ.
// *** "കാർട്ട് ക്ലിയർ ചെയ്യരുത്", "ഉൽപ്പന്നം ക്ലിക്ക് ചെയ്യാം", "പുതിയ Price Details" എന്നിവ നടപ്പിലാക്കി ***

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
// *** 'getCartItemCount', 'getCartTotalMRP' എന്നിവ ഇറക്കുമതി ചെയ്തു ***
import { getCartItems, updateQuantity, removeFromCart, getCartTotal, getCartItemCount, getCartTotalMRP, clearCart } from './cart.js';

// --- DOM Elements (പുതിയ ഡിസൈൻ) ---
const itemsContainer = document.getElementById('cart-items-container');
const summaryContainer = document.getElementById('cart-summary-container');
const cartErrorMessage = document.getElementById('cart-error-message');
// *** പുതിയ Price Details ഘടകങ്ങൾ ***
const priceLabelEl = document.getElementById('cart-price-label');
const mrpTotalEl = document.getElementById('cart-mrp-total');
const discountEl = document.getElementById('cart-discount');
const savingsMessageEl = document.getElementById('cart-savings-message');
const totalEl = document.getElementById('cart-total');
const fullCheckoutButton = document.getElementById('full-checkout-button');
const checkoutLoader = document.getElementById('checkout-loader');

let whatsappNumber = ''; // ഓർഡർ അയക്കാനുള്ള WhatsApp നമ്പർ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); 
    await loadWhatsappNumber(); 
    renderCartPage();   
});

/**
 * WhatsApp നമ്പർ ഫയർബേസിൽ നിന്ന് എടുക്കുന്നു
 */
async function loadWhatsappNumber() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        } else {
            console.log("WhatsApp number not found in settings.");
            showError("Order failed: WhatsApp number is not configured.");
        }
    } catch (error) {
        console.error("Error fetching WhatsApp number: ", error);
        showError("Order failed: Could not contact server.");
    }
}

/**
 * കാർട്ട് പേജ് നിർമ്മിക്കുന്നു (പുതിയ ഡിസൈൻ)
 */
function renderCartPage() {
    if (!itemsContainer || !summaryContainer) return;

    const cart = getCartItems();
    const cartKeys = Object.keys(cart);

    if (cartKeys.length === 0) {
        // കാർട്ട് ശൂന്യമാണെങ്കിൽ
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

    // കാർട്ട് ശൂന്യമല്ലെങ്കിൽ
    summaryContainer.style.display = 'block';
    itemsContainer.innerHTML = ''; 

    cartKeys.forEach(key => {
        const item = cart[key];
        // *** 'item.id' ലഭ്യമല്ലെങ്കിൽ 'key' ഉപയോഗിക്കുന്നു (പഴയ കാർട്ട് ഐറ്റങ്ങൾക്ക് വേണ്ടി) ***
        const itemId = item.id || key; 
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item-card';
        
        const sizeHTML = item.size ? `<span class="cart-item-size">Size: ${item.size}</span>` : '';
        // *** ഫോട്ടോയും പേരും ക്ലിക്ക് ചെയ്യാവുന്ന ലിങ്ക് ആക്കി ***
        const productLink = `product.html?id=${itemId}`;

        itemElement.innerHTML = `
            <div class="cart-item-main">
                <a href="${productLink}" class="cart-item-link">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
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

    // ആകെ തുക അപ്ഡേറ്റ് ചെയ്യുന്നു
    updateCartSummary();
}

/**
 * കാർട്ടിലെ ആകെ തുക കാണിക്കുന്നു (പുതിയ "Price Details" സഹിതം)
 */
function updateCartSummary() {
    const totalItems = getCartItemCount();
    const subtotal = getCartTotal(); // ആകെ വില (കുറഞ്ഞ വില)
    const totalMRP = getCartTotalMRP(); // ആകെ MRP
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


/**
 * കാർട്ടിലെ ബട്ടണുകൾ (എണ്ണം മാറ്റുക, നീക്കം ചെയ്യുക, സിംഗിൾ ഓർഡർ) പ്രവർത്തിപ്പിക്കുന്നു
 */
itemsContainer.addEventListener('click', (e) => {
    const target = e.target;

    // "Remove" ബട്ടൺ
    if (target.classList.contains('remove-btn')) {
        const id = target.dataset.id;
        removeFromCart(id);
        renderCartPage(); 
    }

    // "+" അല്ലെങ്കിൽ "-" ബട്ടൺ
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
    
    // "Buy this now" ബട്ടൺ (സിംഗിൾ ഓർഡർ)
    if (target.classList.contains('buy-now-btn')) {
        const id = target.dataset.id;
        handleSingleOrder(id);
    }
});

/**
 * "Place All Order" ബട്ടൺ (മുഴുവൻ ഓർഡർ) പ്രവർത്തിപ്പിക്കുന്നു
 */
if (fullCheckoutButton) {
    fullCheckoutButton.addEventListener('click', () => {
        handleFullOrder();
    });
}

/**
 * സിംഗിൾ ഓർഡർ കൈകാര്യം ചെയ്യുന്നു
 */
function handleSingleOrder(itemId) {
    if (!whatsappNumber) return showError("WhatsApp number not found.");
    
    const cart = getCartItems();
    const item = cart[itemId];
    
    if (item) {
        showLoader(true);
        // ആ ഒരു ഐറ്റത്തിന്റെ മാത്രം MRP, വില, ഡിസ്കൗണ്ട് എന്നിവ കണക്കാക്കുന്നു
        const itemMRP = ((item.mrp && item.mrp > item.price) ? item.mrp : item.price) * item.quantity;
        const itemTotal = item.price * item.quantity;
        const itemDiscount = itemMRP - itemTotal;

        const message = generateWhatsAppMessage([item], itemTotal, itemMRP, itemDiscount);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showLoader(false);
        // *** കാർട്ട് ക്ലിയർ ചെയ്യുന്നില്ല ***
    }
}

/**
 * മുഴുവൻ ഓർഡറും കൈകാര്യം ചെയ്യുന്നു
 */
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
    
    // *** കാർട്ട് ക്ലിയർ ചെയ്യുന്നില്ല ***
    // clearCart(); 
    
    window.open(whatsappUrl, '_blank');
    showLoader(false);
    
    // *** കാർട്ട് ക്ലിയർ ചെയ്യാത്തതുകൊണ്ട് പേജ് റീലോഡ് ചെയ്യേണ്ട ആവശ്യമില്ല ***
    // renderCartPage(); 
}

/**
 * നിങ്ങൾ ആവശ്യപ്പെട്ട പുതിയ WhatsApp മെസ്സേജ് ഉണ്ടാക്കുന്നു
 */
function generateWhatsAppMessage(items, totalAmount, totalMRP, discount) {
    let message = "🎉 *New Order from Al Ambar Website* 🎉\n\n";
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
    // *** പുതിയ വിലവിവരങ്ങൾ ചേർത്തു ***
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

/**
 * പിശകുകൾ കാണിക്കാൻ
 */
function showError(message) {
    if (cartErrorMessage) {
        cartErrorMessage.textContent = message;
        cartErrorMessage.style.display = 'block';
    }
}

/**
 * ലോഡർ കാണിക്കാനും മറയ്ക്കാനും
 */
function showLoader(show) {
    if (checkoutLoader) checkoutLoader.style.display = show ? 'block' : 'none';
    if (fullCheckoutButton) fullCheckoutButton.disabled = show;
}