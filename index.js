// index.js - Updated: Zigzag Layout Logic

// ... (Previous imports and setup unchanged) ...

async function loadTopDiscounts() {
    const grid = document.getElementById("top-discount-grid");
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        let products = [];
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.isTopDeal === true || p.featured === true) return;
            if (p.mrp && p.price && p.mrp > p.price) {
                const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
                products.push({ id: doc.id, ...p, discount });
            }
        });
        products.sort((a, b) => b.discount - a.discount);
        const topDiscounts = products.slice(0, 20); 
        if (topDiscounts.length === 0) {
            document.querySelector('.orange-section').style.display = 'none';
            return;
        }
        let html = '';
        topDiscounts.forEach(p => { html += createNewStyleProductCard(p.id, p, p.discount); });
        grid.innerHTML = html;
        
        // *** CHANGE: Zigzag Layout (Single Row config in JS, Zigzag via CSS) ***
        new Swiper('.discount-swiper', {
            slidesPerView: 2.2, // Show 2.2 items (but effectively zigzagged)
            // Removed Grid rows config here, handled by CSS margins
            spaceBetween: 10,
            breakpoints: { 
                640: { slidesPerView: 3.2 }, 
                1024: { slidesPerView: 5.2 } 
            }
        });
    } catch(e) {}
}

// ... (Rest of the file unchanged) ...