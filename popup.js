// popup.js 

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
        const response = await chrome.runtime.sendMessage({ type: 'SAVE_MEMORY', text });

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

// Function to load and display all memories by sending a message to background.js
async function loadAllMemories() {
    console.log('Initiating GET_ALL_MEMORIES request');

    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_MEMORIES' });

        console.log('Received response for GET_ALL_MEMORIES:', response);

        if (response && response.status === 'success' && Array.isArray(response.memories)) {
            const sortOrder = document.getElementById('sort-memories').value;
            allMemoriesData = response.memories.sort((a, b) => {
                return sortOrder === 'newest'
                    ? b.timestamp - a.timestamp
                    : a.timestamp - b.timestamp;
            });

            totalPages = Math.ceil(allMemoriesData.length / itemsPerPage);
            currentPage = Math.min(currentPage, totalPages);
            
            updatePaginationControls();
            displayMemoriesPage(currentPage);
            
            document.getElementById('memory-count').textContent =
                `Total Memories: ${allMemoriesData.length}`;
        } else {
            console.warn('Unexpected response structure:', response);
            throw new Error(response?.message || 'Unknown error.');
        }
    } catch (error) {
        console.error('Error loading memories:', error);
        alert(`Error loading memories: ${error.message ?? 'Unknown error'}`);
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
    const allMemoriesContainer = document.getElementById('all-memories');
    const memoryCountElement = document.getElementById('memory-count');
    const sortSelect = document.getElementById('sort-memories');
    
    async function loadMemories() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_MEMORIES' });
            if (response.status === 'success' && response.memories) {
                // Sort memories based on selected option
                const sortBy = document.getElementById('sort-memories').value;
                allMemoriesData = response.memories;
                
                if (sortBy === 'newest') {
                    allMemoriesData.sort((a, b) => b.timestamp - a.timestamp);
                } else if (sortBy === 'oldest') {
                    allMemoriesData.sort((a, b) => a.timestamp - b.timestamp);
                }
                
                totalPages = Math.ceil(allMemoriesData.length / itemsPerPage);
                currentPage = Math.min(currentPage, totalPages);
                
                updatePaginationControls();
                displayMemoriesPage(currentPage);
                
                document.getElementById('memory-count').textContent =
                    `Total Memories: ${allMemoriesData.length}`;
            }
        } catch (error) {
            console.error('Error loading memories:', error);
        }
    }
    
    async function deleteMemory(id) {
        try {
            const response = await chrome.runtime.sendMessage({ 
                type: 'DELETE_MEMORY', 
                id: id 
            });
            
            if (response.status === 'success') {
                // After successful deletion, reload memories and stay on current page if possible
                const currentPageBeforeDelete = currentPage;
                await loadMemories();
                if (currentPageBeforeDelete <= totalPages) {
                    currentPage = currentPageBeforeDelete;
                    displayMemoriesPage(currentPage);
                    updatePaginationControls();
                }
            }
        } catch (error) {
            console.error('Error deleting memory:', error);
        }
    }
    
    // Add event listeners
    sortSelect.addEventListener('change', loadMemories);
    
    // Initial load
    loadMemories();

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
                await loadMemories();
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
});

// Update the saveApiKey function
async function saveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim();
    const statusElement = document.getElementById('api-key-status');
    const saveButton = document.getElementById('save-api-key');
    
    // Reset states
    statusElement.textContent = '';
    saveButton.classList.remove('verified');
    saveButton.textContent = 'Save API Key';
    showApiKeyWarning(false);

    if (!apiKey) {
        showApiKeyWarning(true);
        return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
        statusElement.textContent = 'Invalid API key format';
        statusElement.style.color = '#dc2626';
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Verifying...';

    try {
        const isValid = await testApiKeyWithEmbedding(apiKey);
        
        if (isValid) {
            await chrome.storage.local.set({ 'google_api_key': apiKey });
            saveButton.classList.add('verified');
            saveButton.textContent = 'Verified';
            showApiKeyWarning(false);
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        statusElement.textContent = 'Invalid API key. Please check and try again.';
        statusElement.style.color = '#dc2626';
        showApiKeyWarning(true);
        saveButton.textContent = 'Save API Key';
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
        
        if (apiKey) {
            document.getElementById('api-key-input').value = apiKey;
            showApiKeyWarning(false);
            saveButton.classList.add('verified');
            saveButton.textContent = 'Verified';
        } else {
            showApiKeyWarning(true);
            saveButton.classList.remove('verified');
            saveButton.textContent = 'Save API Key';
        }
    } catch (error) {
        console.error('Error checking API key:', error);
        showApiKeyWarning(true);
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
                    Memory Vault uses Google's Gemini API for creating and managing memories.
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
        
        // Insert help text before the API key input
        const apiKeyContainer = apiKeySection.querySelector('.api-key-container');
        apiKeySection.insertBefore(helpText, apiKeyContainer);
    }
});

// Add this CSS to your stylesheet
const style = document.createElement('style');
style.textContent = `
    .new-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 6px;
        background-color: #007AFF;
        color: white;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.02em;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 2px 4px rgba(0, 122, 255, 0.1);
        margin-right: 8px;
        vertical-align: middle;
    }

    .memory-text-container {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
    }

    .memory-text {
        flex: 1;
        width: 100%;
        min-width: 0;
    }

    /* Keep the edit button styles */
    .edit-button {
        background: #f3f4f6;
        color: #1f2937;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-right: 8px;
    }

    .edit-button:hover {
        background: #e5e7eb;
    }

    /* Update the editing styles */
    .memory-text.editing {
        display: block;
        padding: 8px;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        min-height: 60px;
        width: 100%;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        margin: 0;
    }

    .memory-card {
        margin-bottom: 12px;
        padding: 16px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        transition: all 0.2s ease;
    }

    .memory-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .memory-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #f3f4f6;
    }

    .memory-date {
        font-size: 12px;
        color: #6b7280;
    }

    .memory-actions {
        display: flex;
        gap: 4px;
    }

    .action-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .action-button:hover {
        background: #f3f4f6;
        color: #1f2937;
    }

    .edit-button.active {
        background: #f3f4f6;
        color: #4F46E5;
    }

    .delete-button:hover {
        background: #FEE2E2;
        color: #DC2626;
    }

    .memory-text.editing {
        display: block;
        padding: 8px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        min-height: 60px;
        width: 100%;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        margin: 0;
        outline: none;
        transition: all 0.2s ease;
    }

    .memory-text.editing:focus {
        background: white;
        border-color: #4F46E5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }

    .spinner {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .action-button:disabled {
        opacity: 0.7;
        cursor: wait;
    }

    .pagination-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 24px;
        padding: 16px 0;
    }

    .pagination-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid #e5e5e5;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .pagination-button:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .pagination-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    #page-info {
        font-size: 13px;
        color: #6b7280;
    }
`;
document.head.appendChild(style);

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
        button.addEventListener('click', () => deleteMemory(button.dataset.id));
    });
}

function updatePaginationControls() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}
