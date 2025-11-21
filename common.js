// ... (മുകളിലുള്ള Imports, optimizeImage, authentication, fetchSiteSettings, refreshSettingsBackground, buildHeader, buildSideNav, buildFooter, setupFooterAccordion, buildFloatingButtons തുടങ്ങിയ പഴയ ഫംഗ്ഷനുകൾ അതേപടി നിലനിർത്തുക) ...

// *** പുതിയത്: ബോട്ടം നാവിഗേഷൻ ബാർ നിർമ്മിക്കുന്നു ***
function buildBottomNav() {
    if (window.innerWidth > 768) return;

    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";

    // അക്കൗണ്ട് ടാബിൽ ക്ലിക്ക് ചെയ്യുമ്പോൾ മെനു തുറക്കണം ( ലിങ്ക് അല്ല, ബട്ടൺ ആണ്)
    const navHTML = `
    <nav class="bottom-nav">
        <a href="index.html" class="bottom-nav-item ${page === 'index.html' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Home</span>
        </a>
        <a href="explore.html" class="bottom-nav-item ${page === 'explore.html' ? 'active' : ''}">
            <svg class="icon-binoculars" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 10h4"/><path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/><path d="M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z"/><path d="M22 16h-4"/><path d="M4 7V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3"/><path d="M9 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z"/><path d="M2 16h4"/>
            </svg>
            <span>Explore</span>
        </a>
        <a href="categories.html" class="bottom-nav-item ${page === 'categories.html' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Catalog</span>
        </a>
        <button class="bottom-nav-item" id="bottom-nav-account-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Account</span>
        </button>
    </nav>

    <!-- User Menu Overlay -->
    <div class="user-menu-overlay" id="user-menu-overlay">
        <div class="user-menu-content">
            <div class="user-menu-header">
                <h3>My Account</h3>
                <button class="user-menu-close-btn" id="user-menu-close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <ul class="user-menu-list">
                <li>
                    <a href="#" class="user-menu-link" onclick="alert('Order history feature coming soon!'); return false;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        <span>Your Orders</span>
                    </a>
                </li>
                <li>
                    <a href="contact.html" class="user-menu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span>Contact Us</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="user-menu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>About Us</span>
                    </a>
                </li>
                <!-- അഡ്മിൻ ലിങ്ക് ഇവിടെ താഴെ ഒളിച്ചു വെക്കാം -->
                <li style="margin-top: 1rem; border-top: 1px solid #333; padding-top: 1rem;">
                    <a href="admin.html" class="user-menu-link" style="color: var(--text-muted); font-size: 0.9rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>Admin Login</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);
    setupBottomNavEvents();
}

function setupBottomNavEvents() {
    const accountBtn = document.getElementById('bottom-nav-account-btn');
    const overlay = document.getElementById('user-menu-overlay');
    const closeBtn = document.getElementById('user-menu-close-btn');

    if (accountBtn && overlay && closeBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.classList.add('open');
        });

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('open');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
        });
    }
}

// ... (setupNavEvents, updateCartIcon, loadSiteSettings - ഇവയെല്ലാം പഴയത് പോലെ തന്നെ) ...

// loadSiteSettings ഫംഗ്ഷനിൽ buildBottomNav() വിളിക്കുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക
export async function loadSiteSettings() {
    // ... (പഴയ കോഡ്) ...
        try { await buildFooter(); } catch (e) { console.error("Error building footer:", e); }
        try { await buildFloatingButtons(); } catch (e) { console.error("Error building floating buttons:", e); }
        
        // ബോട്ടം നാവിഗേഷൻ വിളിക്കുന്നു
        try { buildBottomNav(); } catch (e) { console.error("Error building bottom nav:", e); }
        
    // ... (ബാക്കി കോഡ്) ...
}