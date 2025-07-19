// js/auth.js

import { app } from './firebaseConfig.js';
import { getAuth, signInWithCredential, GoogleAuthProvider } from "firebase/auth";

const auth = getAuth(app);

// Function to handle Google Sign-In
export function handleSignIn() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
            if (chrome.runtime.lastError || !token) {
                console.error(chrome.runtime.lastError);
                return reject('Could not get auth token.');
            }

            try {
                const credential = GoogleAuthProvider.credential(null, token);
                const result = await signInWithCredential(auth, credential);
                const user = result.user;

                resolve(user);
            } catch (error) {
                console.error("Firebase sign-in error:", error);
                reject('Firebase sign-in failed.');
            }
        });
    });
}

// Function to handle Sign-Out
export function handleSignOut() {
    return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                // Revoke the token to force account chooser on next login
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    auth.signOut().then(resolve);
                });
            } else {
                // No token found, just sign out
                auth.signOut().then(resolve);
            }
        });
    });
}

// Function to check current user state
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
} 