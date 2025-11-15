// ============================================
// product.js - اپڈیٹ (متعلقہ مصنوعات کے لیے)
// ============================================

// اپنی موجودہ product.js میں یہ کوڈ آخر میں ڈالیں:

// === RELATED PRODUCTS CLICK HANDLER ===

if (relatedProductsGrid) {
    relatedProductsGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-add-to-cart');
        if (!button) return;

        e.preventDefault();
        const id = button.dataset.id;
        const product = {
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            mrp: parseFloat(button.dataset.mrp),
            image: button.dataset.image
        };

        addToCart(id, product);

        // Button feedback
        const originalHTML = button.innerHTML;
        button.textContent = '✓ Added!';
        button.disabled = true;
        button.style.backgroundColor = '#2ecc71';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.backgroundColor = '';
        }, 2000);
    });
}

// === KEYBOARD ACCESSIBILITY ===

// Thumbnail gallery کے لیے arrow keys
const thumbnailImages = document.querySelectorAll('.thumbnail-image');
if (thumbnailImages.length > 0) {
    thumbnailImages.forEach((img, index) => {
        img.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && index > 0) {
                thumbnailImages[index - 1].click();
                thumbnailImages[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < thumbnailImages.length - 1) {
                thumbnailImages[index + 1].click();
                thumbnailImages[index + 1].focus();
            }
        });
    });
}