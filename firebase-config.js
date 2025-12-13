// ഈ ഫയൽ(firebase-config.js)
// *** DATA SAVING & OFFLINE MODE ENABLED ***

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    enableIndexedDbPersistence, 
    setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

// *** Offline Persistence (Cache) Enable ചെയ്യുന്നു ***
// ഇത് ഡാറ്റ ഫോണിൽ സേവ് ചെയ്യും. പിന്നീട് വരുമ്പോൾ സെർവറിൽ നിന്ന് എടുക്കാതെ ഇവിടെ നിന്ന് എടുക്കും.
// ഇത് ഫയർബേസ് റീഡ്സ് (Reads) കുറയ്ക്കാൻ സഹായിക്കും.
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence not supported by browser');
    }
});

setLogLevel('Silent'); 

export { db, auth };