// ഇതാണ് ഷോപ്പിംഗ് കാർട്ടിന്റെ "തലച്ചോർ" (cart.js).
// *** 'id', 'size' എന്നിവ കൂടി സേവ് ചെയ്യുന്നു ***
// *** ആകെ MRP കണക്കാക്കാൻ പുതിയ ഫംഗ്ഷൻ ചേർത്തു ***

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

// ഒരു ഉൽപ്പന്നം കാർട്ടിലേക്ക് ചേർക്കുന്നു
export function addToCart(productId, productDetails) {
    const cart = getCart();
    
    // *** 'productId' ഉപയോഗിക്കുന്നത് ഉറപ്പാക്കുന്നു ***
    const key = productId; 

    if (cart[key]) {
        // ഉൽപ്പന്നം കാർട്ടിൽ ഉണ്ടെങ്കിൽ, എണ്ണം 1 കൂട്ടുന്നു
        cart[key].quantity += 1;
    } else {
        // ഇല്ലെങ്കിൽ, പുതിയ ഉൽപ്പന്നമായി ചേർക്കുന്നു
        // 'productDetails'-ൽ ഇപ്പോൾ 'id', 'size' എന്നിവയുണ്ട്
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
            // എണ്ണം 0 അല്ലെങ്കിൽ കുറവാണെങ്കിൽ, ഉൽപ്പന്നം കാർട്ടിൽ നിന്ന് നീക്കം ചെയ്യുന്നു
            delete cart[productId];
        } else {
            // അല്ലെങ്കിൽ, പുതിയ എണ്ണം അപ്ഡേറ്റ് ചെയ്യുന്നു
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

// *** പുതിയ ഫംഗ്ഷൻ: ആകെ MRP കണക്കാക്കുന്നു ***
export function getCartTotalMRP() {
    const cart = getCart();
    let totalMRP = 0;
    for (const id in cart) {
        const item = cart[id];
        // MRP ഉണ്ടെങ്കിൽ അത്, അല്ലെങ്കിൽ സാധാരണ വില
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