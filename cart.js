// cart.js - Pure Logic
function getCart() {
    return JSON.parse(localStorage.getItem('jrUdHubCart')) || {};
}

function saveCart(cart) {
    localStorage.setItem('jrUdHubCart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
}

export function isItemInCart(id) {
    return getCart().hasOwnProperty(id);
}

export function addToCart(id, details) {
    const cart = getCart();
    if (cart[id]) cart[id].quantity += 1;
    else cart[id] = { ...details, quantity: 1 };
    saveCart(cart);
}

export function updateQuantity(id, qty) {
    const cart = getCart();
    if (cart[id]) {
        if (qty <= 0) delete cart[id];
        else cart[id].quantity = qty;
        saveCart(cart);
    }
}

export function removeFromCart(id) {
    const cart = getCart();
    delete cart[id];
    saveCart(cart);
}

export function getCartItemCount() {
    const cart = getCart();
    return Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
}

export function getCartTotal() {
    const cart = getCart();
    return Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0);
}

export function getCartTotalMRP() {
    const cart = getCart();
    return Object.values(cart).reduce((acc, item) => {
        const mrp = (item.mrp && item.mrp > item.price) ? item.mrp : item.price;
        return acc + (mrp * item.quantity);
    }, 0);
}

export function getCartItems() { return getCart(); }
export function clearCart() { saveCart({}); }