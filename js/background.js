// background.js - Main service worker

import { initDB, saveMemory, getAllMemories, searchMemories, deleteMemory, editMemory } from './memoryStorage.js';
import { getEmbedding } from './embeddingService.js';
import { interceptNetworkRequests } from './networkInterceptor.js';
import { extractInfoWithGemini } from './memoryExtractor.js';
import { handleSignIn, handleSignOut, onAuthStateChanged } from './auth.js';
import { saveUserToFirestore, getUserData } from './firestoreService.js';

// Global variable to store current user
let currentUser = null;

// Initialize the extension when installed
chrome.runtime.onInstalled.addListener(() => {
    // Initialize the autoSubmitEnabled state if it doesn't exist
    chrome.storage.local.get(['autoSubmitEnabled'], (result) => {
        if (result.autoSubmitEnabled === undefined) {
            chrome.storage.local.set({ autoSubmitEnabled: false });
        }
    });
});

// Listen for auth state changes
onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        try {
            // Save user to Firestore
            await saveUserToFirestore(user);
            
            // Get additional user data from Firestore (like subscription status)
            const userData = await getUserData(user.uid);
            
            // Update currentUser with combined data
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                isPaid: userData?.isPaid || false,
                subscriptionType: userData?.subscriptionType || null
            };
            
            console.log('User signed in with data:', currentUser);
            
            // Broadcast auth state to any open popup or content scripts
            chrome.runtime.sendMessage({ 
                type: 'AUTH_STATE_CHANGED', 
                user: currentUser 
            }).catch(() => {
                // Ignore errors when no listeners
            });
        } catch (error) {
            console.error('Error processing user sign-in:', error);
            
            // Still update basic user info even if Firestore fails
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                isPaid: false,
                subscriptionType: null
            };
            
            // Broadcast auth state
            chrome.runtime.sendMessage({ 
                type: 'AUTH_STATE_CHANGED', 
                user: currentUser 
            }).catch(() => {
                // Ignore errors when no listeners
            });
        }
    } else {
        // User is signed out
        currentUser = null;
        console.log('User signed out');
        
        // Broadcast auth state to any open popup or content scripts
        chrome.runtime.sendMessage({ 
            type: 'AUTH_STATE_CHANGED', 
            user: null 
        }).catch(() => {
            // Ignore errors when no listeners
        });
    }
});

// Ensure content script is loaded before sending messages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && 
        (tab.url.includes('chatgpt.com') || tab.url.includes('claude.ai'))) {
        chrome.tabs.sendMessage(tabId, { type: 'TAB_READY' }, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Content script not ready:', chrome.runtime.lastError.message);
            } else {
                console.log('Content script is ready');
            }
        });
    }
});

// Start intercepting network requests
interceptNetworkRequests();

// Listen for messages from contentScript.js and popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    // Handle authentication requests
    if (request.type === 'SIGN_IN') {
        handleSignIn()
            .then(async user => {
                try {
                    // Save user to Firestore
                    await saveUserToFirestore(user);
                    
                    // Get additional user data from Firestore
                    const userData = await getUserData(user.uid);
                    
                    // Send response with combined data
                    sendResponse({ 
                        status: 'success', 
                        user: {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            isPaid: userData?.isPaid || false,
                            subscriptionType: userData?.subscriptionType || null
                        }
                    });
                } catch (error) {
                    console.error('Error processing user data after sign-in:', error);
                    
                    // Send basic user data if Firestore fails
                    sendResponse({ 
                        status: 'success', 
                        user: {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            isPaid: false,
                            subscriptionType: null
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Sign-in error:', error);
                sendResponse({ status: 'error', message: 'Failed to sign in.' });
            });
        return true;
    }

    if (request.type === 'SIGN_OUT') {
        handleSignOut()
            .then(() => {
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('Sign-out error:', error);
                sendResponse({ status: 'error', message: 'Failed to sign out.' });
            });
        return true;
    }

    if (request.type === 'GET_AUTH_STATE') {
        sendResponse({ status: 'success', user: currentUser });
        return true;
    }

    // Add new handler for subscription status
    if (request.type === 'GET_SUBSCRIPTION_STATUS') {
        if (!currentUser || !currentUser.uid) {
            sendResponse({ status: 'error', message: 'User not authenticated' });
            return true;
        }
        
        getUserData(currentUser.uid)
            .then(userData => {
                if (userData) {
                    sendResponse({ 
                        status: 'success', 
                        isPaid: userData.isPaid || false,
                        subscriptionType: userData.subscriptionType || null,
                        subscriptionExpiry: userData.subscriptionExpiry || null
                    });
                } else {
                    sendResponse({ 
                        status: 'success', 
                        isPaid: false,
                        subscriptionType: null,
                        subscriptionExpiry: null
                    });
                }
            })
            .catch(error => {
                console.error('Error getting subscription status:', error);
                sendResponse({ status: 'error', message: 'Failed to get subscription status' });
            });
        return true;
    }

    if (request.type === 'SEARCH_MEMORIES') {
        getEmbedding(request.query)
            .then(embedding => searchMemories(embedding, request.query))
            .then(results => {
                sendResponse({ status: 'success', results });
            })
            .catch(error => {
                console.error('Error searching memories:', error);
                sendResponse({ status: 'error', message: 'Failed to search memories.' });
            });
        return true;
    }

    if (request.type === 'SAVE_MEMORY') {
        getEmbedding(request.text)
            .then(embedding => saveMemory(request.text, embedding))
            .then(() => {
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('Error saving memory:', error);
                sendResponse({ status: 'error', message: 'Failed to save memory.' });
            });
        return true;
    }

    if (request.type === 'GET_ALL_MEMORIES') {
        getAllMemories()
            .then(memories => {
                console.log('GET_ALL_MEMORIES fetched memories:', memories);
                sendResponse({ status: 'success', memories });
            })
            .catch(error => {
                console.error('Error retrieving memories:', error);
                sendResponse({ status: 'error', message: 'Failed to retrieve memories.' });
            });
        return true;
    }

    if (request.type === 'LAST_ARTICLE_TEXT') {
        console.log('Received last article text in background script:', request.text);
        // You can process or store this text as needed
    }

    if (request.type === 'DELETE_MEMORY') {
        // Log the received ID for debugging
        console.log('Received DELETE_MEMORY request with id:', request.id, 'type:', typeof request.id);
        
        deleteMemory(request.id)
            .then(() => {
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('Error deleting memory:', error);
                sendResponse({ status: 'error', message: 'Failed to delete memory.' });
            });
        return true;
    }

    if (request.type === 'OPEN_POPUP') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });
    }

    if (request.type === 'EDIT_MEMORY') {
        // Log the received ID for debugging
        console.log('Received EDIT_MEMORY request with id:', request.id, 'type:', typeof request.id);
        
        getEmbedding(request.text)
            .then(embedding => editMemory(request.id, request.text, embedding))
            .then(() => {
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('Error editing memory:', error);
                sendResponse({ status: 'error', message: 'Failed to edit memory.' });
            });
        return true;
    }

    console.warn('Unhandled message type:', request.type);
    sendResponse({ status: 'error', message: 'Unhandled message type.' });
    return false;
});

