// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZ7ktAntMff_4nayFGFZd4GEgwlrp1KOg",
    authDomain: "tracker-7237c.firebaseapp.com",
    projectId: "tracker-7237c",
    storageBucket: "tracker-7237c.firebasestorage.app",
    messagingSenderId: "527825889294",
    appId: "1:527825889294:web:c472188af9d70c9c29f45f",
    measurementId: "G-6ZP2Y7Y6SY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db, analytics }; 