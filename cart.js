// ഇതാണ് ഷോപ്പിംഗ് കാർട്ടിന്റെ "തലച്ചോർ" (cart.js).
// *** 'isItemInCart' എന്ന പുതിയ ഫംഗ്ഷൻ ചേർത്തു ***

// കാർട്ട് ഡാറ്റ 'localStorage'-ൽ നിന്ന് എടുക്കുന്നു
function getCart() {
    const cartData = localStorage.getItem('alAmbarCart');
    return cartData ? JSON.parse(cartData) : {};
}

// കാർട്ട് ഡാറ്റ 'localStorage'-ലേക്ക് സേവ് ചെയ്യുന്നു
function saveCart(cart) {
    localStorage.setItem('alAmbarCart', JSON.stringify(cart));
    // കാർട്ടിൽ മാറ്റം വരുമ്പോൾ, ഹെഡറിലെ ഐക്കൺ അപ്ഡേറ്റ് ചെയ്യാൻ ഒരു ഇവന്റ് അയക്കുന്നു
    window.dispatchEvent(new CustomEvent('cartUpdated'));
}

/**
 * *** പുതിയ ഫംഗ്ഷൻ ***
 * ഒരു പ്രൊഡക്റ്റ് കാർട്ടിൽ ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു
 * @param {string} productId - പരിശോധിക്കേണ്ട പ്രൊഡക്റ്റ് ID
 * @returns {boolean} - കാർട്ടിൽ ഉണ്ടെങ്കിൽ true, അല്ലെങ്കിൽ false
 */
export function isItemInCart(productId) {
    const cart = getCart();
    return cart.hasOwnProperty(productId);
}

// ഒരു ഉൽപ്പന്നം കാർട്ടിലേക്ക് ചേർക്കുന്നു
export function addToCart(productId, productDetails) {
    const cart = getCart();
    
    const key = productId; 

    if (cart[key]) {
        cart[key].quantity += 1;
    } else {
        cart[key] = {
            ...productDetails,
            quantity: 1
        };
    }
    
    saveCart(cart);
}

// കാർട്ടിലെ ഒരു ഉൽപ്പന്നത്തിന്റെ എണ്ണം മാറ്റുന്നു
export function updateQuantity(productId, newQuantity) {
    const cart = getCart();
    
    if (cart[productId]) {
        if (newQuantity <= 0) {
            delete cart[productId];
        } else {
            cart[productId].quantity = newQuantity;
        }
        saveCart(cart);
    }
}

// ഉൽപ്പന്നം കാർട്ടിൽ നിന്ന് പൂർണ്ണമായും നീക്കം ചെയ്യുന്നു
export function removeFromCart(productId) {
    const cart = getCart();
    
    if (cart[productId]) {
        delete cart[productId];
        saveCart(cart);
    }
}

// കാർട്ടിലെ ഉൽപ്പന്നങ്ങളുടെ ആകെ എണ്ണം കണക്കാക്കുന്നു (ഹെഡറിലെ ഐക്കണിന് വേണ്ടി)
export function getCartItemCount() {
    const cart = getCart();
    let totalCount = 0;
    for (const id in cart) {
        totalCount += cart[id].quantity;
    }
    return totalCount;
}

// കാർട്ടിലെ ആകെ തുക കണക്കാക്കുന്നു
export function getCartTotal() {
    const cart = getCart();
    let total = 0;
    for (const id in cart) {
        total += cart[id].price * cart[id].quantity;
    }
    return total;
}

// ആകെ MRP കണക്കാക്കുന്നു
export function getCartTotalMRP() {
    const cart = getCart();
    let totalMRP = 0;
    for (const id in cart) {
        const item = cart[id];
        const mrp = (item.mrp && item.mrp > item.price) ? item.mrp : item.price;
        totalMRP += mrp * item.quantity;
    }
    return totalMRP;
}


// കാർട്ട് പൂർണ്ണമായും ക്ലിയർ ചെയ്യുന്നു (ഓർഡർ ചെയ്ത ശേഷം)
export function clearCart() {
    saveCart({});
}

// നിലവിലെ കാർട്ട് വിവരങ്ങൾ നൽകുന്നു
export function getCartItems() {
    return getCart();
}