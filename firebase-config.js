// ഈ ഫയൽ ഫയർബേസുമായി കണക്ട് ചെയ്യുന്നു.
// എല്ലാ JS ഫയലുകളും ഈ ഫയലിനെയാണ് ആശ്രയിക്കുന്നത്.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// നിങ്ങളുടെ ഫയർബേസ് കോൺഫിഗറേഷൻ വിവരങ്ങൾ
const firebaseConfig = {
    apiKey: "AIzaSyCePcVE_BTiFuYXAApNmbMKHdkhQ9Ay_F4",
    authDomain: "al-ambar-perfume-company.firebaseapp.com",
    projectId: "al-ambar-perfume-company",
    storageBucket: "al-ambar-perfume-company.firebasestorage.app",
    messagingSenderId: "992506041633",
    appId: "1:992506041633:web:f7277461a577248bb8da60",
    measurementId: "G-39XB0WLW6P"
};

// ഫയർബേസ് ആരംഭിക്കുന്നു
const app = initializeApp(firebaseConfig);

// ഫയർബേസ് സേവനങ്ങൾ എക്സ്പോർട്ട് ചെയ്യുന്നു
export const db = getFirestore(app); // ഡാറ്റാബേസ് (Firestore)
export const auth = getAuth(app);    // ലോഗിൻ (Authentication)

// ഡീബഗ്ഗിംഗ് ലോഗുകൾ കാണാൻ
setLogLevel('Debug');