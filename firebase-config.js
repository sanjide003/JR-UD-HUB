import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// 'auth' കൂടി ഇമ്പോർട്ട് ചെയ്യുന്നു
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// നിങ്ങളുടെ ഫയർബേസ് കോൺഫിഗറേഷൻ
const firebaseConfig = {
    apiKey: "AIzaSyCePcVE_BTiFuYXAApNmbMKHdkhQ9Ay_F4",
    authDomain: "al-ambar-perfume-company.firebaseapp.com",
    projectId: "al-ambar-perfume-company",
    storageBucket: "al-ambar-perfume-company.firebasestorage.app",
    messagingSenderId: "992506041633",
    appId: "1:992506041633:web:f7277461a577248bb8da60",
    measurementId: "G-39XB0WLW6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// db, auth എന്നിവ ഇനിഷ്യലൈസ് ചെയ്യുന്നു
const auth = getAuth(app);
const db = getFirestore(app);

// **** 'db'-യോടൊപ്പം 'auth' കൂടി എക്സ്പോർട്ട് ചെയ്യുന്നു ****
export { db, auth };