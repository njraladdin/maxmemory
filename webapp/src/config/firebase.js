// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyXu4xGSQ-8QAfqE4S9Kd05JHMelmHrXU",
  authDomain: "maxmemory-67d43.firebaseapp.com",
  projectId: "maxmemory-67d43",
  storageBucket: "maxmemory-67d43.firebasestorage.app",
  messagingSenderId: "58371433289",
  appId: "1:58371433289:web:454208014779abdd457098",
  measurementId: "G-R8J36NXN3S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, db, googleProvider }; 