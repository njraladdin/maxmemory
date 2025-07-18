// memoryStorage.js - Module for MaxMemory storage operations

import { processMemoriesForRelevance, MEMORY_SEARCH_THRESHOLD } from './memoryUtils.js';

// Configuration constants
const DB_NAME = 'MemoryVaultDB';
const DB_VERSION = 2; // Use the highest version to avoid version errors
const STORE_NAME = 'memories';

// Initialize IndexedDB
async function initDB() {
    console.log('Initializing IndexedDB');
    return new Promise((resolve, reject) => {
        let openRequest;
        try {
            // Try opening with the correct version
            openRequest = indexedDB.open(DB_NAME, DB_VERSION);
            
            openRequest.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            openRequest.onsuccess = () => {
                console.log('IndexedDB initialized successfully');
                resolve(openRequest.result);
            };
            
            openRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
                
                // Create store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    console.log(`Object store "${STORE_NAME}" created`);
                }
            };
        } catch (error) {
            console.error('Exception during IndexedDB initialization:', error);
            reject(error);
        }
    });
}

// Save memory with its embedding
async function saveMemory(text, embedding) {
    console.log('Saving memory:', text);
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.add({
            text,
            embedding,
            timestamp: Date.now()
        });

        request.onsuccess = () => {
            console.log('Memory saved successfully');
            resolve();
        };
        request.onerror = () => {
            console.error('Error saving memory:', request.error);
            reject(request.error);
        };
    });
}

// Get all memories
async function getAllMemories() {
    console.log('Fetching memories from IndexedDB');
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            let memories = request.result;
            console.log(`Fetched ${memories.length} memories from IndexedDB`);
            
            // Debug: Log ID types for the first few memories
            if (memories.length > 0) {
                console.log('Sample memory IDs and their types:');
                memories.slice(0, 3).forEach(memory => {
                    console.log(`Memory ID: ${memory.id}, Type: ${typeof memory.id}`);
                });
            }
            
            resolve(memories);
        };
        request.onerror = () => {
            console.error('Error retrieving all memories:', request.error);
            reject(request.error);
        };
    });
}

// Search memories based on embedding
async function searchMemories(searchEmbedding, queryText, threshold = MEMORY_SEARCH_THRESHOLD) {
    console.log('Searching memories with threshold:', threshold);
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
            let memories = request.result;
            console.log(`Retrieved ${memories.length} memories from IndexedDB`);
            
            // Process memories for relevance scores using the utility function
            const processedResults = processMemoriesForRelevance(memories, searchEmbedding, queryText);
            
            console.log(`Found ${processedResults.length} relevant memories after filtering`);
            resolve(processedResults);
        };

        request.onerror = () => {
            console.error('Error fetching memories:', request.error);
            reject(request.error);
        };
    });
}

// Delete a memory by ID
async function deleteMemory(id) {
    console.log('Deleting memory with id:', id);
    // Convert id to number if it's a string and represents a number
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    console.log('Using numeric id:', numericId);
    
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(numericId);
        request.onsuccess = () => {
            console.log('Memory deleted successfully');
            resolve();
        };
        request.onerror = () => {
            console.error('Error deleting memory:', request.error);
            reject(request.error);
        };
    });
}

// Edit a memory
async function editMemory(id, newText, newEmbedding) {
    console.log('Editing memory with id:', id);
    // Convert id to number if it's a string and represents a number
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    console.log('Using numeric id:', numericId);
    
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(numericId);
        
        getRequest.onsuccess = () => {
            const memory = getRequest.result;
            if (!memory) {
                console.error('Memory not found with id:', numericId);
                reject(new Error('Memory not found'));
                return;
            }

            memory.text = newText;
            memory.embedding = newEmbedding;
            
            const updateRequest = store.put(memory);
            
            updateRequest.onsuccess = () => {
                console.log('Memory updated successfully');
                resolve();
            };
            
            updateRequest.onerror = () => {
                console.error('Error updating memory:', updateRequest.error);
                reject(updateRequest.error);
            };
        };
        
        getRequest.onerror = () => {
            console.error('Error getting memory:', getRequest.error);
            reject(getRequest.error);
        };
    });
}

// Export all functions
export {
    initDB,
    saveMemory,
    getAllMemories,
    searchMemories,
    deleteMemory,
    editMemory
}; 