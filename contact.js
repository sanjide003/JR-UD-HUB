// ഈ ഫയലിൽ contact.html പേജിന് മാത്രം വേണ്ട കോഡുകൾ

// പൊതുവായ ഫംഗ്ഷനുകളിൽ നിന്നും ആവശ്യമായവ ഇമ്പോർട്ട് ചെയ്യുന്നു
import { loadSiteSettings } from './common.js';

// --- പേജ് ലോഡ് ആവുമ്പോൾ ---
document.addEventListener("DOMContentLoaded", () => {
    // ഈ ഒരു ഫംഗ്ഷൻ മാത്രം വിളിച്ചാൽ മതി.
    // ഇത് ഹെഡർ, ഫൂട്ടർ, കോൺടാക്റ്റ് പേജിലെ വിവരങ്ങൾ എന്നിവ ലോഡ് ചെയ്യും.
    loadSiteSettings(); 
});