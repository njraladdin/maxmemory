// popup.js 

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
            const memories = response.memories;
            const sortOrder = document.getElementById('sort-memories').value;

            memories.sort((a, b) => {
                return sortOrder === 'newest'
                    ? b.timestamp - a.timestamp
                    : a.timestamp - b.timestamp;
            });

            const container = document.getElementById('all-memories');
            document.getElementById('memory-count').textContent =
                `Total Memories: ${memories.length}`;

            container.innerHTML = memories.map(memory => `
                <div class="memory-card">
                    <div class="memory-text">${memory.text}</div>
                    <div class="memory-meta">
                        Added: ${formatDate(memory.timestamp)}
                    </div>
                </div>
            `).join('');
        } else {
            // Log the entire response for debugging
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
    
    function displayMemories(memories) {
        allMemoriesContainer.innerHTML = '';
        memoryCountElement.textContent = `${memories.length} memories stored`;
        
        memories.forEach(memory => {
            const memoryDiv = document.createElement('div');
            memoryDiv.className = 'memory-item';
            
            // Check if memory is less than 30 minutes old (30 * 60 * 1000 ms)
            const isNew = (Date.now() - memory.timestamp) < 30 * 60 * 1000;
            const newTag = isNew ? '<span class="new-tag">New</span>' : '';

            memoryDiv.innerHTML = `
                <div class="memory-card">
                    <div class="memory-content">
                        <div class="memory-text-container">
                            ${newTag}
                            <span class="memory-text">${memory.text}</span>
                        </div>
                    </div>
                    <div class="memory-footer">
                        <div class="memory-date">${formatDate(memory.timestamp)}</div>
                        <button class="delete-button" data-id="${memory.id}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
            
            const deleteButton = memoryDiv.querySelector('.delete-button');
            deleteButton.addEventListener('click', () => deleteMemory(memory.id));
            
            allMemoriesContainer.appendChild(memoryDiv);
        });
    }
    
    async function loadMemories() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_MEMORIES' });
            if (response.status === 'success' && response.memories) {
                let memories = response.memories;
                
                // Sort memories based on selected option
                const sortBy = sortSelect.value;
                if (sortBy === 'newest') {
                    memories.sort((a, b) => b.timestamp - a.timestamp);
                } else if (sortBy === 'oldest') {
                    memories.sort((a, b) => a.timestamp - b.timestamp);
                }
                
                displayMemories(memories);
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
                loadMemories(); // Reload the list after deletion
            }
        } catch (error) {
            console.error('Error deleting memory:', error);
        }
    }
    
    // Add event listeners
    sortSelect.addEventListener('change', loadMemories);
    
    // Initial load
    loadMemories();
});

// Add these functions at the beginning of popup.js
async function saveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim();
    const statusElement = document.getElementById('api-key-status');
    
    // Reset status
    statusElement.textContent = '';
    statusElement.style.color = '#10A37F';
    showApiKeyWarning(false);

    if (!apiKey) {
        showApiKeyWarning(true);
        return;
    }

    // First check the format
    if (!isValidApiKeyFormat(apiKey)) {
        statusElement.textContent = 'Invalid API key format';
        statusElement.style.color = '#dc2626';
        return;
    }

    // Show loading state
    const saveButton = document.getElementById('save-api-key');
    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Verifying...';
    statusElement.textContent = 'Verifying API key...';

    try {
        // Test the API key
        const isValid = await testApiKeyWithEmbedding(apiKey);
        
        if (isValid) {
            // Save the valid API key
            await chrome.storage.local.set({ 'google_api_key': apiKey });
            statusElement.textContent = 'API Key verified and saved!';
            statusElement.style.color = '#10A37F';
            showApiKeyWarning(false);
            
            // Clear status after 3 seconds
            setTimeout(() => {
                statusElement.textContent = '';
            }, 3000);
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        statusElement.textContent = 'Invalid API key. Please check and try again.';
        statusElement.style.color = '#dc2626';
        showApiKeyWarning(true);
    } finally {
        // Reset button state
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

async function checkApiKey() {
    try {
        const result = await chrome.storage.local.get('google_api_key');
        const apiKey = result.google_api_key;
        
        if (apiKey) {
            document.getElementById('api-key-input').value = apiKey;
            showApiKeyWarning(false);
        } else {
            showApiKeyWarning(true);
        }
    } catch (error) {
        console.error('Error checking API key:', error);
        showApiKeyWarning(true);
    }
}

function showApiKeyWarning(show) {
    const warning = document.getElementById('api-key-warning');
    const helpText = document.querySelector('.api-key-help');
    
    if (show) {
        // Show full instructions when API key is needed
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
                    <li>Sign in with your Google account</li>
                    <li>Get your free API key</li>
                    <li>Paste it here</li>
                </ol>
            </div>
        `;
    } else {
        // Show minimal text when API key is already set
        helpText.innerHTML = `
            <p style="font-size: 14px; color: #374151; margin-bottom: 8px;">
                Memory Vault uses Google's Gemini API for creating and managing memories.
            </p>
        `;
    }
    
    warning.style.display = show ? 'block' : 'none';
    warning.innerHTML = 'Please enter your API key to continue.';
}

// Add this to your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...

    // Add API key related listeners
    document.getElementById('save-api-key').addEventListener('click', saveApiKey);
    checkApiKey();
});

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

// Update the API key section HTML in popup.html
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...

    // Update API key section with always-visible explanation
    const apiKeySection = document.querySelector('.api-key-section');
    if (apiKeySection) {
        const helpText = document.createElement('div');
        helpText.className = 'api-key-help';
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
                    <li>Sign in with your Google account</li>
                    <li>Get your free API key</li>
                    <li>Paste it here</li>
                </ol>
            </div>
        `;
        
        // Insert help text before the API key input
        const apiKeyContainer = apiKeySection.querySelector('.api-key-container');
        apiKeySection.insertBefore(helpText, apiKeyContainer);
    }

    // ... rest of your DOMContentLoaded code ...
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
    }

    .memory-text {
        flex: 1;
    }
`;
document.head.appendChild(style);
