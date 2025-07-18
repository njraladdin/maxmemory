// js/firestoreService.js

import { app } from './firebaseConfig.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Initialize Firestore
const db = getFirestore(app);

/**
 * Creates or updates a user record in Firestore
 * @param {Object} user - Firebase auth user object
 * @returns {Promise<void>}
 */
export async function saveUserToFirestore(user) {
    if (!user || !user.uid) {
        throw new Error('Invalid user object');
    }

    try {
        const userRef = doc(db, 'users', user.uid);
        
        // Check if user already exists
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Create new user record with default subscription status
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isPaid: false,
                subscriptionType: null,  // null, 'monthly', or 'yearly'
                subscriptionExpiry: null
            });
            console.log('New user created in Firestore:', user.uid);
        } else {
            // Update existing user's last login
            await updateDoc(userRef, {
                lastLogin: new Date().toISOString()
            });
            console.log('User login time updated in Firestore:', user.uid);
        }
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
        throw error;
    }
}

/**
 * Gets a user's data from Firestore
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export async function getUserData(userId) {
    if (!userId) {
        return null;
    }
    
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            console.log('No user document found for ID:', userId);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Updates a user's subscription status
 * @param {string} userId - The user's ID
 * @param {boolean} isPaid - Whether the user has a paid subscription
 * @param {string} subscriptionType - 'monthly' or 'yearly'
 * @param {Date} expiryDate - When the subscription expires
 * @returns {Promise<void>}
 */
export async function updateSubscriptionStatus(userId, isPaid, subscriptionType, expiryDate) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isPaid: !!isPaid,
            subscriptionType: subscriptionType || null,
            subscriptionExpiry: expiryDate ? expiryDate.toISOString() : null,
            updatedAt: new Date().toISOString()
        });
        console.log('Subscription status updated for user:', userId);
    } catch (error) {
        console.error('Error updating subscription status:', error);
        throw error;
    }
} 