// popup.js 

// Add this at the top of the file
if (window.innerWidth <= 600) { // Popup mode detection
  document.body.classList.add('popup-mode');
}

// Remove direct import of auth.js
// import { handleSignIn, handleSignOut, onAuthStateChanged } from './auth.js';

// Add these variables at the top of the file
let currentPage = 1;
const itemsPerPage = 50;
let totalPages = 1;
let allMemoriesData = [];

// Function to save a memory by sending a message to background.js
async function saveMemory() {
    const input = document.getElementById('memory-input');
    const text = input.value.trim();

    if (!text) {
        alert('Please enter a memory to save.');
        return;
    }

    console.log('Sending SAVE_MEMORY request with text:', text);

    try {
        const response = await chrome.runtime.sendMessage({ 
            type: 'SAVE_MEMORY', 
            text
        });

        console.log('Received response for SAVE_MEMORY:', response);

        if (response && response.status === 'success') {
            input.value = '';
            alert('Memory saved successfully!');
        } else {
            throw new Error(response?.message || 'Unknown error.');
        }
    } catch (error) {
        console.error('Error saving memory:', error);
        alert('Error saving memory. Please try again.');
    }
}

// Function to load all memory groups
async function loadAllGroups() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_GROUPS' });
        
        if (response && response.status === 'success' && Array.isArray(response.groups)) {
            // Update group selectors
            const groupSelectors = document.querySelectorAll('.memory-group-select');
            
            groupSelectors.forEach(selector => {
                // Save current selection
                const currentValue = selector.value;
                
                // Clear all options except the create new group option
                while (selector.options.length > 0) {
                    selector.remove(0);
                }
                
                // Add Global group
                const globalOption = document.createElement('option');
                globalOption.value = 'Global';
                globalOption.textContent = 'Global (All memories)';
                selector.appendChild(globalOption);
                
                // Add all groups
                response.groups.forEach(group => {
                    if (group !== 'Global') {
                        const option = document.createElement('option');
                        option.value = group;
                        option.textContent = group;
                        selector.appendChild(option);
                    }
                });
                
                // Add create new group option
                const newOption = document.createElement('option');
                newOption.value = '__new__';
                newOption.textContent = '+ Create New Group...';
                selector.appendChild(newOption);
                
                // Restore selection or default to active group
                if (currentValue && response.groups.includes(currentValue)) {
                    selector.value = currentValue;
                } else {
                    selector.value = 'Global'; // Default to Global
                }
            });
            
            return response.groups;
        } else {
            console.warn('Unexpected response structure:', response);
            throw new Error(response?.message || 'Unknown error.');
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        return ['Global'];
    }
}

// Function to load and display all memories by sending a message to background.js
async function loadAllMemories() {
    console.log('Initiating GET_ALL_MEMORIES request');

    try {
        const response = await chrome.runtime.sendMessage({ 
            type: 'GET_ALL_MEMORIES'
        });

        console.log('Received response for GET_ALL_MEMORIES:', response);

        if (response && response.status === 'success' && Array.isArray(response.memories)) {
            const sortOrder = document.getElementById('sort-memories').value;
            allMemoriesData = response.memories.sort((a, b) => {
                return sortOrder === 'newest'
                    ? b.timestamp - a.timestamp
                    : a.timestamp - b.timestamp;
            });

            // Handle empty memories array
            if (allMemoriesData.length === 0) {
                totalPages = 1;
                currentPage = 1;
                document.getElementById('memory-count').textContent = 'No memories yet';
            } else {
                totalPages = Math.ceil(allMemoriesData.length / itemsPerPage);
                currentPage = Math.min(currentPage, totalPages);
                document.getElementById('memory-count').textContent = `Total Memories: ${allMemoriesData.length}`;
            }
            
            updatePaginationControls();
            displayMemoriesPage(currentPage);
        } else {
            console.warn('Unexpected response structure:', response);
            throw new Error(response?.message || 'Unknown error.');
        }
    } catch (error) {
        console.error('Error loading memories:', error);
        alert(`Error loading memories: ${error.message ?? 'Unknown error'}`);
    }
}

// Function to create a new group
async function createNewGroup() {
    const groupName = prompt('Enter a name for the new memory group:');
    
    if (!groupName || groupName.trim() === '') {
        return null;
    }
    
    if (groupName.toLowerCase() === 'global') {
        alert('Cannot create a group named "Global" as it is reserved.');
        return null;
    }
    
    // Add group and refresh
    await loadAllGroups();
    return groupName.trim();
}

// Function to handle group selector changes
function handleGroupSelectorChange(selector) {
    if (selector.value === '__new__') {
        createNewGroup().then(newGroup => {
            if (newGroup) {
                // Add the new group to all selectors
                loadAllGroups().then(() => {
                    // Set this selector to the new group
                    selector.value = newGroup;
                    
                    // If this is the filter dropdown, update active group and reload
                    if (selector.id === 'group-filter') {
                        // activeGroup = newGroup; // This variable is removed
                        loadAllMemories();
                    }
                });
            } else {
                // Revert to previous selection
                selector.value = 'Global'; // Default to Global
            }
        });
    } else if (selector.id === 'group-filter') {
        // Update active group and reload memories
        // activeGroup = selector.value; // This variable is removed
        currentPage = 1; // Reset to first page
        loadAllMemories();
    }
}

// Function to delete a memory
async function deleteMemory(id) {
    console.log('Attempting to delete memory with ID:', id);
    try {
        const response = await chrome.runtime.sendMessage({ 
            type: 'DELETE_MEMORY', 
            id: id 
        });
        
        console.log('Received delete response:', response);
        
        if (response.status === 'success') {
            // After successful deletion, reload memories and stay on current page if possible
            const currentPageBeforeDelete = currentPage;
            await loadAllMemories();
            if (currentPageBeforeDelete <= totalPages) {
                currentPage = currentPageBeforeDelete;
                displayMemoriesPage(currentPage);
                updatePaginationControls();
            }
        }
    } catch (error) {
        console.error('Error deleting memory:', error);
        alert('Error deleting memory. Please try again.');
    }
}

// Helper function to format timestamp
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

        // Load content for specific tabs
        if (button.dataset.tab === 'view') {
            loadAllMemories();
        }
    });
});

// Event Listeners
document.getElementById('sort-memories').addEventListener('change', loadAllMemories);

// Initial load of memories when the popup is opened
document.addEventListener('DOMContentLoaded', function() {
    // Auth elements
    const signinButton = document.getElementById('signin-button');
    const signoutButton = document.getElementById('signout-button');
    const userProfile = document.getElementById('user-profile');
    const userGreeting = document.getElementById('user-greeting');

    // Handle Sign-In
    signinButton.addEventListener('click', () => {
        // Use background script for authentication
        chrome.runtime.sendMessage({ type: 'SIGN_IN' })
            .then(response => {
                if (response.status !== 'success') {
                    throw new Error(response.message || 'Sign-in failed');
                }
            })
            .catch(error => {
                console.error(error);
                alert('Sign-in failed. Please try again.');
            });
    });

    // Handle Sign-Out
    signoutButton.addEventListener('click', () => {
        // Use background script for authentication
        chrome.runtime.sendMessage({ type: 'SIGN_OUT' })
            .catch(error => {
                console.error(error);
                alert('Sign-out failed. Please try again.');
            });
    });

    // Get initial auth state from background script
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' })
        .then(response => {
            if (response.status === 'success') {
                updateAuthUI(response.user);
            }
        })
        .catch(error => {
            console.error('Error getting auth state:', error);
        });

    // Listen for auth state changes from background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'AUTH_STATE_CHANGED') {
            updateAuthUI(message.user);
        }
    });

    // Function to update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            // User is signed in
            const username = user.displayName || user.email.split('@')[0];
            userGreeting.textContent = `Hi, ${username}`;
            userProfile.style.display = 'flex';
            signinButton.style.display = 'none';
        } else {
            // User is signed out
            userProfile.style.display = 'none';
            signinButton.style.display = 'block';
        }
    }

    const allMemoriesContainer = document.getElementById('all-memories');
    const memoryCountElement = document.getElementById('memory-count');
    const sortSelect = document.getElementById('sort-memories');
    
    // Add event listeners
    sortSelect.addEventListener('change', loadAllMemories);

    // Add API key related listeners
    document.getElementById('save-api-key').addEventListener('click', saveApiKey);
    checkApiKey();

    // Add memory modal functionality
    const addMemoryButton = document.getElementById('add-memory-button');
    const addMemorySection = document.getElementById('add-memory-section');
    const newMemoryInput = document.getElementById('new-memory-input');
    const cancelAddMemory = document.getElementById('cancel-add-memory');
    const confirmAddMemory = document.getElementById('confirm-add-memory');

    addMemoryButton.addEventListener('click', () => {
        addMemorySection.style.display = 'block';
        addMemoryButton.style.display = 'none';
        newMemoryInput.focus();
    });

    function hideAddMemorySection() {
        addMemorySection.style.display = 'none';
        addMemoryButton.style.display = 'block';
        newMemoryInput.value = '';
    }

    cancelAddMemory.addEventListener('click', hideAddMemorySection);

    confirmAddMemory.addEventListener('click', async () => {
        const text = newMemoryInput.value.trim();
        if (!text) return;

        confirmAddMemory.disabled = true;
        confirmAddMemory.innerHTML = `
            <svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
        `;

        try {
            const response = await chrome.runtime.sendMessage({ 
                type: 'SAVE_MEMORY', 
                text: text
            });

            if (response.status === 'success') {
                hideAddMemorySection();
                currentPage = 1; // Go to first page to see the new memory
                await loadAllMemories();
            } else {
                throw new Error(response.message || 'Failed to save memory');
            }
        } catch (error) {
            console.error('Error saving memory:', error);
            alert('Failed to save memory. Please try again.');
        } finally {
            confirmAddMemory.disabled = false;
            confirmAddMemory.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    });

    // Add Escape key support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addMemorySection.style.display === 'block') {
            hideAddMemorySection();
        }
    });

    // Add pagination button listeners
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayMemoriesPage(currentPage);
            updatePaginationControls();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayMemoriesPage(currentPage);
            updatePaginationControls();
        }
    });

    // Update sort memories event listener
    document.getElementById('sort-memories').addEventListener('change', () => {
        currentPage = 1; // Reset to first page when sorting
        loadAllMemories();
    });

    // Initial memory load
    loadAllMemories();
});

// Update the saveApiKey function
async function saveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim();
    const statusElement = document.getElementById('api-key-status');
    const saveButton = document.getElementById('save-api-key');
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyVerifiedIcon = document.getElementById('api-key-verified-icon');
    const apiKeyWarningIcon = document.getElementById('api-key-warning-icon');
    const apiKeyContent = document.getElementById('api-key-content');
    const apiKeyHeader = document.getElementById('api-key-header');
    
    // Reset states
    statusElement.textContent = '';
    saveButton.classList.remove('verified');
    saveButton.textContent = 'Save API Key';
    showApiKeyWarning(false);
    apiKeySection.classList.remove('verified');
    apiKeyVerifiedIcon.style.display = 'none';
    apiKeyWarningIcon.style.display = 'none';

    if (!apiKey) {
        showApiKeyWarning(true);
        apiKeyWarningIcon.style.display = 'inline-flex';
        
        // Keep accordion open when no key
        apiKeyContent.classList.remove('collapsed');
        apiKeySection.classList.add('expanded');
        rotateToggleIcon(true);
        apiKeyHeader.style.cursor = 'default';
        return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
        statusElement.textContent = 'Invalid API key format';
        statusElement.style.color = '#dc2626';
        apiKeyWarningIcon.style.display = 'inline-flex';
        
        // Keep accordion open when invalid key format
        apiKeyContent.classList.remove('collapsed');
        apiKeySection.classList.add('expanded');
        rotateToggleIcon(true);
        apiKeyHeader.style.cursor = 'default';
        return;
    }

    // Store the original button text and set a fixed width before changing text
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Verifying...';

    try {
        const isValid = await testApiKeyWithEmbedding(apiKey);
        
        if (isValid) {
            await chrome.storage.local.set({ 'google_api_key': apiKey });
            saveButton.classList.add('verified');
            saveButton.textContent = 'Verified';
            showApiKeyWarning(false);
            
            // Update accordion state with subtle styling
            apiKeySection.classList.add('verified');
            apiKeyVerifiedIcon.style.display = 'inline-flex';
            apiKeyWarningIcon.style.display = 'none';
            
            // Enable accordion toggling
            apiKeyHeader.style.cursor = 'pointer';
            
            // Collapse the content after a short delay
            setTimeout(() => {
                apiKeyContent.classList.add('collapsed');
                apiKeySection.classList.remove('expanded');
                rotateToggleIcon(false);
            }, 1000);
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        statusElement.textContent = 'Invalid API key. Please check and try again.';
        statusElement.style.color = '#dc2626';
        showApiKeyWarning(true);
        saveButton.textContent = originalText;
        apiKeyWarningIcon.style.display = 'inline-flex';
        
        // Keep accordion open when validation fails
        apiKeyContent.classList.remove('collapsed');
        apiKeySection.classList.add('expanded');
        rotateToggleIcon(true);
        apiKeyHeader.style.cursor = 'default';
        
        // Remove invalid API key from storage
        await chrome.storage.local.remove('google_api_key');
    } finally {
        saveButton.disabled = false;
    }
}

// Simplify the checkApiKey function
async function checkApiKey() {
    try {
        const result = await chrome.storage.local.get('google_api_key');
        const apiKey = result.google_api_key;
        const saveButton = document.getElementById('save-api-key');
        const apiKeySection = document.getElementById('api-key-section');
        const apiKeyVerifiedIcon = document.getElementById('api-key-verified-icon');
        const apiKeyWarningIcon = document.getElementById('api-key-warning-icon');
        const apiKeyContent = document.getElementById('api-key-content');
        const apiKeyHeader = document.getElementById('api-key-header');
        
        if (apiKey) {
            document.getElementById('api-key-input').value = apiKey;
            showApiKeyWarning(false);
            
            // Ensure button width is consistent by setting the class first
            saveButton.classList.add('verified');
            saveButton.textContent = 'Verified';
            
            // Set accordion to collapsed state when valid key exists
            apiKeySection.classList.add('verified');
            apiKeyVerifiedIcon.style.display = 'inline-flex';
            apiKeyWarningIcon.style.display = 'none';
            apiKeyContent.classList.add('collapsed');
            rotateToggleIcon(false);
            
            // Enable accordion toggling
            apiKeyHeader.style.cursor = 'pointer';
        } else {
            showApiKeyWarning(true);
            
            // Ensure button width is consistent
            saveButton.classList.remove('verified');
            saveButton.textContent = 'Save API Key';
            
            // Keep accordion expanded when no key exists and ensure it can't be closed
            apiKeySection.classList.remove('verified');
            apiKeyVerifiedIcon.style.display = 'none';
            apiKeyWarningIcon.style.display = 'inline-flex';
            apiKeyContent.classList.remove('collapsed');
            apiKeySection.classList.add('expanded');
            rotateToggleIcon(true);
            
            // Disable accordion toggling visual cue
            apiKeyHeader.style.cursor = 'default';
        }
    } catch (error) {
        console.error('Error checking API key:', error);
        showApiKeyWarning(true);
        document.getElementById('api-key-warning-icon').style.display = 'inline-flex';
        
        // Keep accordion expanded in case of error
        const apiKeyContent = document.getElementById('api-key-content');
        const apiKeySection = document.getElementById('api-key-section');
        const apiKeyHeader = document.getElementById('api-key-header');
        
        apiKeyContent.classList.remove('collapsed');
        apiKeySection.classList.add('expanded');
        rotateToggleIcon(true);
        apiKeyHeader.style.cursor = 'default';
    }
}

// Helper function to rotate the toggle icon
function rotateToggleIcon(expanded) {
    const toggleIcon = document.getElementById('api-key-toggle');
    if (expanded) {
        toggleIcon.style.transform = 'rotate(0deg)';
    } else {
        toggleIcon.style.transform = 'rotate(-90deg)';
    }
}

function showApiKeyWarning(show) {
    const warning = document.getElementById('api-key-warning');
    warning.style.display = show ? 'block' : 'none';
    warning.innerHTML = 'Please enter your API key to continue.';
}

// Add these validation functions
function isValidApiKeyFormat(apiKey) {
    // Check if it matches the format: Starts with 'AIzaSy' followed by 33 characters
    const apiKeyRegex = /^AIzaSy[a-zA-Z0-9_-]{33}$/;
    return apiKeyRegex.test(apiKey);
}

async function testApiKeyWithEmbedding(apiKey) {
    const EMBEDDING_MODEL = 'embedding-001';  // Make sure this matches your model
    const testText = 'test';  // Simple test text
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${EMBEDDING_MODEL}`,
                    content: { parts: [{ text: testText }] }
                })
            }
        );

        const data = await response.json();
        
        // Check if the response contains embedding values
        return data.embedding?.values ? true : false;
    } catch (error) {
        console.error('API test failed:', error);
        return false;
    }
}

// Keep the DOMContentLoaded event listener that adds the help text
document.addEventListener('DOMContentLoaded', function() {
    const apiKeySection = document.querySelector('.api-key-section');
    if (apiKeySection) {
        const helpText = document.createElement('div');
        helpText.className = 'api-key-help';
        // Always show the full instructions
        helpText.innerHTML = `
            <div style="margin-bottom: 16px;">
                <p style="font-size: 14px; color: #374151; margin-bottom: 8px;">
                    MaxMemory uses Google's Gemini API for creating and managing memories.
                </p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 8px;">
                    To get started:
                </p>
                <ol style="font-size: 14px; color: #374151; margin-left: 20px; margin-bottom: 12px;">
                    <li>Visit <a href="https://aistudio.google.com/app/prompts/new_chat" target="_blank" style="color: #4F46E5; text-decoration: underline;">Google AI Studio</a></li>
                    <li>Click on "Get API key"</li>
                    <li>Create API key</li>
                    <li>Paste it here</li>
                </ol>
            </div>
        `;
        
        // Insert help text at the beginning of the content area
        const apiKeyContent = document.getElementById('api-key-content');
        apiKeyContent.insertBefore(helpText, apiKeyContent.firstChild);
    }
});

// Add these new functions for edit functionality
async function saveEdit(id, textElement, editButton) {
    const newText = textElement.textContent.trim();
    
    if (!newText) {
        alert('Memory text cannot be empty.');
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({ 
            type: 'EDIT_MEMORY', 
            id: id,
            text: newText
        });
        
        if (response.status === 'success') {
            textElement.setAttribute('contenteditable', 'false');
            textElement.classList.remove('editing');
            editButton.disabled = false;
            editButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
        } else {
            throw new Error(response.message || 'Failed to save changes.');
        }
    } catch (error) {
        console.error('Error saving edit:', error);
        alert('Failed to save changes. Please try again.');
        editButton.disabled = false;
        editButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7"></path>
            </svg>
        `;
    }
}

// Update the displayMemoriesPage function to include edit/delete functionality
function displayMemoriesPage(page) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const memoriesToDisplay = allMemoriesData.slice(startIndex, endIndex);

    const container = document.getElementById('all-memories');
    
    // Check if there are no memories to display
    if (allMemoriesData.length === 0) {
        // Apple-style empty state
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3 class="empty-state-title">No Memories Yet</h3>
                <p class="empty-state-description">Your memories will appear here. Click the + button above to create your first memory.</p>
                <button id="empty-state-add-button" class="empty-state-button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Add Your First Memory
                </button>
            </div>
        `;
        
        // Add event listener to the empty state add button
        document.getElementById('empty-state-add-button').addEventListener('click', () => {
            const addMemoryButton = document.getElementById('add-memory-button');
            const addMemorySection = document.getElementById('add-memory-section');
            
            addMemorySection.style.display = 'block';
            addMemoryButton.style.display = 'none';
            document.getElementById('new-memory-input').focus();
        });
        
        return;
    }
    
    // Regular display of memories
    container.innerHTML = memoriesToDisplay.map(memory => `
        <div class="memory-card">
            <div class="memory-content">
                <div class="memory-text-container">
                    ${(Date.now() - memory.timestamp) < 30 * 60 * 1000 ? '<span class="new-tag">New</span>' : ''}
                    <span class="memory-text" contenteditable="false">${memory.text}</span>
                </div>
            </div>
            <div class="memory-footer">
                <div class="memory-date">${formatDate(memory.timestamp)}</div>
                <div class="memory-actions">
                    <button class="action-button edit-button" data-id="${memory.id}" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-button delete-button" data-id="${memory.id}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const textElement = button.closest('.memory-card').querySelector('.memory-text');
            if (textElement.getAttribute('contenteditable') === 'true') {
                saveEdit(button.dataset.id, textElement, button);
            } else {
                textElement.setAttribute('contenteditable', 'true');
                textElement.classList.add('editing');
                textElement.focus();
                button.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                `;
            }
        });
    });

    container.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            console.log('Delete button clicked for memory ID:', button.dataset.id);
            const memoryId = button.dataset.id;
            if (!memoryId) {
                console.error('No memory ID found in button data attribute');
                return;
            }
            deleteMemory(memoryId);
        });
    });
}

function updatePaginationControls() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const paginationControls = document.querySelector('.pagination-controls');

    // Hide pagination controls when there are no memories
    if (allMemoriesData.length === 0) {
        paginationControls.style.display = 'none';
        return;
    } else {
        paginationControls.style.display = 'flex';
    }

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}
