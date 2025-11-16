// ഇതാണ് 'cart-page.js' ഫയൽ.
// *** പുതിയ Flipkart ഡിസൈൻ, സിംഗിൾ/ഫുൾ ഓർഡർ, പുതിയ WhatsApp മെസ്സേജ് എന്നിവ ചേർത്തു ***

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { getCartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷനുകൾ

// --- DOM Elements (പുതിയ ഡിസൈൻ) ---
const itemsContainer = document.getElementById('cart-items-container');
const summaryContainer = document.getElementById('cart-summary-container');
const cartErrorMessage = document.getElementById('cart-error-message');
const subtotalEl = document.getElementById('cart-subtotal');
const totalEl = document.getElementById('cart-total');
const fullCheckoutButton = document.getElementById('full-checkout-button');
const checkoutLoader = document.getElementById('checkout-loader');

let whatsappNumber = ''; // ഓർഡർ അയക്കാനുള്ള WhatsApp നമ്പർ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ ലോഡ് ചെയ്യാൻ കാത്തിരിക്കുന്നു
    await loadWhatsappNumber(); // WhatsApp നമ്പർ ലോഡ് ചെയ്യുന്നു
    renderCartPage();   // കാർട്ട് പേജ് നിർമ്മിക്കുന്നു
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
        summaryContainer.style.display = 'none'; // ആകെ തുക കാണിക്കുന്ന ഭാഗം മറയ്ക്കുന്നു
        return;
    }

    // കാർട്ട് ശൂന്യമല്ലെങ്കിൽ
    summaryContainer.style.display = 'block';
    itemsContainer.innerHTML = ''; // പഴയ ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു

    // കാർട്ടിലെ ഓരോ ഉൽപ്പന്നവും പുതിയ കാർഡ് രൂപത്തിൽ കാണിക്കുന്നു
    cartKeys.forEach(key => {
        const item = cart[key];
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item-card';
        
        // 'size' ഉണ്ടെങ്കിൽ മാത്രം കാണിക്കുന്നു
        const sizeHTML = item.size ? `<span class="cart-item-size">Size: ${item.size}</span>` : '';

        itemElement.innerHTML = `
            <div class="cart-item-main">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
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
 * കാർട്ടിലെ ആകെ തുക കാണിക്കുന്നു
 */
function updateCartSummary() {
    const subtotal = getCartTotal();
    const total = subtotal; 

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
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
        renderCartPage(); // കാർട്ട് പേജ് വീണ്ടും വരയ്ക്കുന്നു
    }

    // "+" അല്ലെങ്കിൽ "-" ബട്ടൺ
    if (target.classList.contains('quantity-btn')) {
        const id = target.dataset.id;
        const change = parseInt(target.dataset.change);
        const cart = getCartItems();
        if (cart[id]) { // ഉൽപ്പന്നം ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു
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
        const message = generateWhatsAppMessage([item], item.price * item.quantity);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showLoader(false);
        // സിംഗിൾ ഓർഡറിൽ കാർട്ട് ക്ലിയർ ചെയ്യുന്നില്ല
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
    const message = generateWhatsAppMessage(cartItems, total);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    // WhatsApp-ലേക്ക് അയച്ച ശേഷം കാർട്ട് ക്ലിയർ ചെയ്യുന്നു
    clearCart();
    window.open(whatsappUrl, '_blank');
    showLoader(false);
    renderCartPage(); // കാർട്ട് പേജ് വീണ്ടും വരയ്ക്കുന്നു (ശൂന്യമായി കാണിക്കാൻ)
}

/**
 * നിങ്ങൾ ആവശ്യപ്പെട്ട പുതിയ WhatsApp മെസ്സേജ് ഉണ്ടാക്കുന്നു
 */
function generateWhatsAppMessage(items, totalAmount) {
    let message = "🎉 *New Order from Al Ambar Website* 🎉\n\n";
    message += "Here are the items:\n";
    message += "----------------------------------\n";

    items.forEach(item => {
        // 'item.id' ഉപയോഗിച്ച് ലിങ്ക് ഉണ്ടാക്കുന്നു
        const productLink = `${window.location.origin}/product.html?id=${item.id}`;
        
        message += `*${item.name}*\n`;
        if (item.size) {
            message += `  Size: ${item.size}\n`; // <-- സൈസ് ചേർത്തു
        }
        message += `  Qty: ${item.quantity}\n`;
        message += `  Price: ₹${item.price.toFixed(2)}\n`;
        message += `  Subtotal: ₹${(item.price * item.quantity).toFixed(2)}\n`;
        message += `  Link: ${productLink}\n\n`; // <-- ലിങ്ക് ചേർത്തു
    });

    message += "----------------------------------\n";
    message += `*Total Amount: ₹${totalAmount.toFixed(2)}*`;
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