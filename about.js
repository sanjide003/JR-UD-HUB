import { loadSiteSettings } from './common.js';

document.addEventListener("DOMContentLoaded", async () => {
    // ഹെഡറും ഫൂട്ടറും ലോഡ് ചെയ്യാനും, ലോഡിംഗ് സ്ക്രീൻ മാറ്റാനും ഇത് വിളിക്കുന്നു
    await loadSiteSettings();
});