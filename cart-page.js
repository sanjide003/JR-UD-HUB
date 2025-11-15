// ഇതാണ് 'cart-page.js' ഫയൽ.
// *** Vercel-ൽ പ്രവർത്തിക്കാനായി പാതകൾ ശരിയാക്കി ***

import { db } from './firebase-config.js'; // appId ഇമ്പോർട്ട് ചെയ്യേണ്ട ആവശ്യമില്ല
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { loadSiteSettings } from './common.js'; // ഹെഡർ, ഫൂട്ടർ ലോഡ് ചെയ്യാൻ
import { getCartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } from './cart.js'; // കാർട്ട് ഫംഗ്ഷനുകൾ

// പേജ് ലോഡ് ആവുമ്പോൾ
document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings(); // പൊതുവായ കാര്യങ്ങൾ (ഹെഡർ, ഫൂട്ടർ, മെനു)
    renderCartPage();   // കാർട്ട് പേജ് നിർമ്മിക്കുന്നു
});

const cartItemsList = document.getElementById('cart-items-list');
const cartSummary = document.getElementById('cart-summary');
const cartErrorMessage = document.getElementById('cart-error-message');
let whatsappNumber = ''; // ഓർഡർ അയക്കാനുള്ള WhatsApp നമ്പർ

/**
 * കാർട്ട് പേജ് നിർമ്മിക്കുന്നു
 */
async function renderCartPage() {
    if (!cartItemsList || !cartSummary) return;

    const cart = getCartItems();
    const cartKeys = Object.keys(cart);

    if (cartKeys.length === 0) {
        // കാർട്ട് ശൂന്യമാണെങ്കിൽ
        cartItemsList.innerHTML = `
            <div class="empty-cart-message">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <a href="categories.html" class="btn btn-primary-new">Continue Shopping</a>
            </div>
        `;
        cartSummary.style.display = 'none'; // ആകെ തുക കാണിക്കുന്ന ഭാഗം മറയ്ക്കുന്നു
        return;
    }

    cartSummary.style.display = 'block';
    cartItemsList.innerHTML = ''; // പഴയ ലിസ്റ്റ് ക്ലിയർ ചെയ്യുന്നു

    // കാർട്ടിലെ ഓരോ ഉൽപ്പന്നവും കാണിക്കുന്നു
    cartKeys.forEach(key => {
        const item = cart[key];
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <span class="cart-item-price">₹${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn" data-id="${key}" data-change="-1">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" data-id="${key}" min="1">
                    <button class="quantity-btn" data-id="${key}" data-change="1">+</button>
                </div>
                <button class="cart-remove-btn" data-id="${key}">Remove</button>
            </div>
        `;
        cartItemsList.appendChild(itemElement);
    });

    // ആകെ തുക അപ്ഡേറ്റ് ചെയ്യുന്നു
    updateCartSummary();
    
    // WhatsApp നമ്പർ എടുക്കുന്നു
    try {
        // *** ഇതാണ് ശരിയായ പാത്ത് ***
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().whatsapp) {
            whatsappNumber = docSnap.data().whatsapp;
        } else {
            console.log("WhatsApp number not found in settings.");
        }
    } catch (error) {
        console.error("Error fetching WhatsApp number: ", error);
    }
}

/**
 * കാർട്ടിലെ ആകെ തുക കാണിക്കുന്നു
 */
function updateCartSummary() {
    const subtotal = getCartTotal();
    const total = subtotal; // ഭാവിയിൽ ഡെലിവറി ചാർജ് ഇവിടെ ചേർക്കാം

    document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `₹${total.toFixed(2)}`;
}

/**
 * കാർട്ടിലെ ബട്ടണുകൾ (എണ്ണം മാറ്റുക, നീക്കം ചെയ്യുക) പ്രവർത്തിപ്പിക്കുന്നു
 */
cartItemsList.addEventListener('click', (e) => {
    const target = e.target;

    // "Remove" ബട്ടൺ
    if (target.classList.contains('cart-remove-btn')) {
        const id = target.dataset.id;
        removeFromCart(id);
        renderCartPage(); // കാർട്ട് പേജ് വീണ്ടും വരയ്ക്കുന്നു
    }

    // "+" അല്ലെങ്കിൽ "-" ബട്ടൺ
    if (target.classList.contains('quantity-btn')) {
        const id = target.dataset.id;
        const change = parseInt(target.dataset.change);
        const cart = getCartItems();
        const newQuantity = cart[id].quantity + change;
        updateQuantity(id, newQuantity);
        renderCartPage();
    }
});

// എണ്ണം നേരിട്ട് ടൈപ്പ് ചെയ്യുമ്പോൾ
cartItemsList.addEventListener('change', (e) => {
    if (e.target.classList.contains('quantity-input')) {
        const id = e.target.dataset.id;
        const newQuantity = parseInt(e.target.value);
        if (newQuantity > 0) {
            updateQuantity(id, newQuantity);
            renderCartPage();
        }
    }
});

/**
 * "Order on WhatsApp" ബട്ടൺ പ്രവർത്തിപ്പിക്കുന്നു
 */
const checkoutButton = document.getElementById('whatsapp-checkout-button');
if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
        cartErrorMessage.style.display = 'none';
        cartErrorMessage.textContent = '';
        
        if (!whatsappNumber) {
            cartErrorMessage.textContent = 'Could not send order. WhatsApp number is not configured.';
            cartErrorMessage.style.display = 'block';
            return;
        }

        const cart = getCartItems();
        const cartKeys = Object.keys(cart);

        if (cartKeys.length === 0) {
            cartErrorMessage.textContent = 'Your cart is empty.';
            cartErrorMessage.style.display = 'block';
            return;
        }

        // WhatsApp മെസ്സേജ് ഉണ്ടാക്കുന്നു
        let message = "🎉 *New Order from Al Ambar Website* 🎉\n\n";
        message += "Here are the items:\n";
        message += "----------------------------------\n";

        cartKeys.forEach(key => {
            const item = cart[key];
            message += `
*${item.name}*
  Qty: ${item.quantity}
  Price: ₹${item.price.toFixed(2)}
  Subtotal: ₹${(item.price * item.quantity).toFixed(2)}\n
`;
        });

        message += "----------------------------------\n";
        message += `*Total Amount: ₹${getCartTotal().toFixed(2)}*`;
        message += "\n\nThank you!";

        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        clearCart();
        window.open(whatsappUrl, '_blank');
        renderCartPage();
    });
}
