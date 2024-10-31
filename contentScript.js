// contentScript.js

(function() {
    const styles = `
        .memory-section {
            display: flex;
            align-items: flex-start;
            font-size: 0.75em;
            line-height: 1.4;
            color: #888;
            background-color: transparent;
            padding: 4px 8px 4px 24px;
            margin: 4px 0;
            border-left: 2px solid #ddd;
            position: relative;
            user-select: none;
            pointer-events: none;
            opacity: 0.8;
        }
        .memory-section svg {
            flex-shrink: 0;
            margin-right: 8px;
            margin-top: 2px;
        }
        .get-memories-button {
            padding: 6px 10px;
            background-color: #ffffff;
            color: rgb(64, 65, 79);
            border: 1px solid rgb(217, 217, 227);
            border-radius: 0.75rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.15s ease;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .get-memories-button:hover:not(:disabled) {
            background-color: #f7f7f8;
        }
        .get-memories-button:disabled {
            background-color: rgba(255, 255, 255, 0.5) !important;
            color: rgba(64, 65, 79, 0.5) !important;
            cursor: not-allowed;
            border-color: rgba(217, 217, 227, 0.5);
            transition: all 0.2s ease;
        }
        .memories-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 8px;
            background-color: #f7f7f8;
            min-height: 40px;
        }



        /* Ensure consistent border color in both chat and input */
        .memory-section,
        [contenteditable="true"] p:first-of-type {
            border-left-color: #ddd;
        }
    
        .show-more-memories:hover {
            text-decoration: underline;
        }
        .memories-content {
            user-select: text;
            pointer-events: auto;
        }
    
        /* Switch styles */
        .switch-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .switch {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 20px;
        }
        
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 34px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background-color: #10a37f;
        }
        
        input:checked + .slider:before {
            transform: translateX(16px);
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const createMemoriesIcon = () => {
        const parser = new DOMParser();
        return parser.parseFromString(getMemoriesSVG('#ffffff'), 'image/svg+xml').documentElement;
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (`0${date.getMonth() + 1}`).slice(-2);
        const day = (`0${date.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
    };

    const getInputBox = () => {
        const inputBox = document.querySelector('#prompt-textarea, div[contenteditable="true"]');
        console.log('Looking for input box:', inputBox);
        return inputBox;
    };

    const styleMemoriesInChat = () => {
        // Handle ChatGPT messages
        document.querySelectorAll('article').forEach(handleMessageStyling);
        
        // Handle Claude messages
        document.querySelectorAll('div[data-test-render-count]').forEach(handleMessageStyling);
    };

    const handleMessageStyling = (messageContainer) => {
        const messageDiv = messageContainer.querySelector('.whitespace-pre-wrap') || 
                          messageContainer.querySelector('[data-testid="user-message"]');
        
        if (!messageDiv) return;

        const match = messageDiv.textContent.match(/\[RELEVANT_PAST_MEMORIES_START\]([\s\S]*?)\[RELEVANT_PAST_MEMORIES_END\]/);
        if (!match) return;

        const [fullMatch, memoriesContent] = match;
        const [before, after] = messageDiv.textContent.split(/\[RELEVANT_PAST_MEMORIES_START\][\s\S]*?\[RELEVANT_PAST_MEMORIES_END\]/);
        
        const MAX_CHARS = 280;
        const truncatedContent = memoriesContent.length > MAX_CHARS ? 
            `${memoriesContent.slice(0, MAX_CHARS)}... <span class="show-more-memories" style="color: #666; font-weight: 600; cursor: pointer; user-select: text; pointer-events: auto;">Show more</span>` : 
            memoriesContent;

        messageDiv.innerHTML = `${before.trim()}<div class="memory-section">${createMemoriesIcon().outerHTML} <span class="memories-content">${truncatedContent}</span></div>${after.trim()}`;

        // Add click handler for "Show more"
        const showMoreBtn = messageDiv.querySelector('.show-more-memories');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const memoriesContentEl = e.target.closest('.memories-content');
                memoriesContentEl.innerHTML = memoriesContent;
            });
        }
    };

    const syncMemoriesButtonState = () => {
        const getMemoriesButton = document.getElementById('get-memories-button');
        const checkbox = document.getElementById('auto-submit-memories');
        if (!getMemoriesButton || !checkbox) return;

        // Handle ChatGPT
        const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
        // Handle Claude
        const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
        const submitButton = chatGPTSubmitButton || claudeSubmitButton;

        // Disable memories button if submit button doesn't exist or is disabled
        if (!submitButton || submitButton.disabled) {
            getMemoriesButton.disabled = true;
        } else {
            getMemoriesButton.disabled = submitButton.disabled;
        }
        
        // Maintain hidden state if checkbox is checked
        if (checkbox.checked && submitButton) {
            submitButton.style.visibility = 'hidden';
            submitButton.style.opacity = '0';
        }
    };

    const createObserver = (callback, config) => new MutationObserver(callback).observe(document.body, config);

    const observeDOM = () => {
        // Observer for content changes
        createObserver(() => {
            addGetMemoriesButton();
            styleMemoriesInChat();
            syncMemoriesButtonState();
        }, { childList: true, subtree: true });

        // Observer for button state changes
        createObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.target.matches('button[data-testid="send-button"], button[aria-label="Send Message"]')) {
                    syncMemoriesButtonState();
                }
            }
        }, { 
            attributes: true, 
            attributeFilter: ['disabled'],
            subtree: true
        });
    };

    const getAndInsertMemories = async (button) => {
        try {
            // Start loading state
            button.disabled = true;
            button.classList.add('loading');

            const result = await chrome.storage.local.get('google_api_key');
            if (!result.google_api_key) {
                alert('Please set your Google API key in the extension popup first.');
                return;
            }

            const inputBox = getInputBox();
            if (!inputBox) {
                console.error('Input box not found.');
                return;
            }

            // Get the current user input
            let userInput = '';
            if (inputBox.tagName === 'TEXTAREA') {
                userInput = inputBox.value.trim();
            } else {
                const paragraphs = inputBox.querySelectorAll('p');
                userInput = paragraphs[paragraphs.length - 1]?.textContent.trim() || '';
            }

            const response = await chrome.runtime.sendMessage({ 
                type: 'SEARCH_MEMORIES', 
                query: userInput
            });
            
            if (response?.status === 'success' && response.results.length) {
                const limitedResults = response.results.slice(0, 10);
                const memoriesText = limitedResults
                    .map(memory => `[${formatDate(memory.timestamp)}] ${memory.text}`)
                    .join(' ');

                // Clear existing content first
                if (inputBox.tagName === 'TEXTAREA') {
                    inputBox.value = '';
                } else {
                    inputBox.innerHTML = '';
                }

                // Use the new tag format
                if (inputBox.tagName === 'TEXTAREA') {
                    inputBox.value = `[RELEVANT_PAST_MEMORIES_START] ${memoriesText} [RELEVANT_PAST_MEMORIES_END]\n\n${userInput}`;
                } else {
                    inputBox.innerHTML = `<p>[RELEVANT_PAST_MEMORIES_START] ${memoriesText} [RELEVANT_PAST_MEMORIES_END]</p><br/><p>${userInput}</p>`;
                }
                
                // Focus the input and move cursor to end
                inputBox.focus();
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(inputBox);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (error) {
            console.error('Error fetching memories:', error);
            alert('Error fetching memories. Please try again.');
            button.disabled = false;
            button.classList.remove('loading');
        }
    };

    const createMemoriesButton = () => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'space-between';
        container.style.width = '100%';

        // Create left side container for checkbox and label
        const leftContainer = document.createElement('div');
        leftContainer.style.display = 'flex';
        leftContainer.style.alignItems = 'center';
        leftContainer.style.gap = '8px';

        // Create switch container
        leftContainer.className = 'switch-container';

        // Create switch container
        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';

        // Move the checkbox into the switch
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'auto-submit-memories';
        checkbox.style.margin = '0';

        // Create the slider element
        const slider = document.createElement('span');
        slider.className = 'slider';

        // Update the label text
        const label = document.createElement('label');
        label.htmlFor = 'auto-submit-memories';
        label.textContent = 'Allow infinite memory';
        label.style.fontSize = '13px';
        label.style.margin = '0';
        label.style.cursor = 'pointer';

        // Create button
        const button = document.createElement('button');
        button.id = 'get-memories-button';
        button.className = 'get-memories-button';
        button.innerHTML = `${getMemoriesSVG('#40414f')}<span>Get Memories</span>`;
        // Initially hide the button
        button.style.display = 'none';

        // Load saved state when creating the checkbox
        chrome.storage.local.get('autoSubmitEnabled', (result) => {
            checkbox.checked = result.autoSubmitEnabled || false;
            
            // Update button visibility based on saved state with animation
            button.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
            if (checkbox.checked) {
                button.style.display = 'flex';
                button.style.visibility = 'visible';
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            } else {
                button.style.visibility = 'hidden';
                button.style.opacity = '0';
                button.style.transform = 'translateY(20px)';
                button.style.display = 'none';
            }
            
            // Update submit button visibility based on saved state
            const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
            const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
            const submitButton = chatGPTSubmitButton || claudeSubmitButton;
            
            if (submitButton && checkbox.checked) {
                submitButton.style.visibility = 'hidden';
                submitButton.style.opacity = '0';
                submitButton.style.transform = 'translateY(-20px)';
            }
        });

        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const shouldAutoSubmit = checkbox.checked;
            await getAndInsertMemories(button);

            if (shouldAutoSubmit) {
                setTimeout(() => {
                    const inputBox = getInputBox();
                    if (inputBox) {
                        inputBox.focus();
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        inputBox.dispatchEvent(enterEvent);
                    }
                }, 100);
            }
        });

        // Add checkbox change listener to handle both memories button and submit button visibility
        checkbox.addEventListener('change', () => {
            // Save state when checkbox changes
            chrome.storage.local.set({ autoSubmitEnabled: checkbox.checked });
            
            // Handle memories button visibility with animation
            button.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
            if (checkbox.checked) {
                button.style.display = 'flex';
                button.style.visibility = 'visible';
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            } else {
                button.style.visibility = 'hidden';
                button.style.opacity = '0';
                button.style.transform = 'translateY(20px)';
                // Hide the button completely after animation
                setTimeout(() => {
                    button.style.display = 'none';
                }, 300);
            }
            
            // Handle submit button visibility with animation
            const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
            const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
            const submitButton = chatGPTSubmitButton || claudeSubmitButton;
            
            if (submitButton) {
                if (checkbox.checked) {
                    submitButton.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
                    submitButton.style.visibility = 'hidden';
                    submitButton.style.opacity = '0';
                    submitButton.style.transform = 'translateY(-20px)';
                } else {
                    submitButton.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
                    submitButton.style.visibility = 'visible';
                    submitButton.style.opacity = '1';
                    submitButton.style.transform = 'translateY(0)';
                }
            }
        });

        // Assemble the components
        switchLabel.appendChild(checkbox);
        switchLabel.appendChild(slider);
        leftContainer.appendChild(switchLabel);
        leftContainer.appendChild(label);
        container.appendChild(leftContainer);
        container.appendChild(button);

        return container;
    };

    const addGetMemoriesButton = () => {
        // If button already exists, don't add it again
        if (document.getElementById('get-memories-button')) return;

        // Check if input box exists
        const inputBox = getInputBox();
        if (!inputBox) {
            // If input box isn't ready, try again in a short while
            setTimeout(addGetMemoriesButton, 500);
            return;
        }

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.marginBottom = '12px';
        container.appendChild(createMemoriesButton());

        const target = 
            document.querySelector('fieldset') ||
            document.querySelector('form.w-full .relative.flex.h-full');

        if (target) {
            target.parentNode.insertBefore(container, target);
            syncMemoriesButtonState();
        } else {
            // If target container isn't ready, try again
            setTimeout(addGetMemoriesButton, 500);
        }
    };

    // Add this function to get the last article's text content
    function getLastArticleText() {
        const articles = document.querySelectorAll('article');
        if (articles.length > 0) {
            const lastArticle = articles[articles.length - 1];
            return lastArticle.textContent.trim();
        }
        return null;
    }

    const handleEnterKey = async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            const checkbox = document.getElementById('auto-submit-memories');
            
            // Only prevent default and handle memories if checkbox is checked
            if (checkbox?.checked) {
                // Get input box and its content
                const inputBox = getInputBox();
                
                // Special handling for Claude's input
                let inputContent = '';
                if (inputBox) {
                    if (inputBox.tagName === 'TEXTAREA') {
                        inputContent = inputBox.value.trim();
                    } else {
                        // For Claude's contenteditable div
                        const paragraphs = inputBox.querySelectorAll('p');
                        // Check if there's only one paragraph and it has the placeholder class
                        if (paragraphs.length === 1 && 
                            (paragraphs[0].classList.contains('is-empty') || 
                             paragraphs[0].classList.contains('is-editor-empty'))) {
                            inputContent = '';
                        } else {
                            inputContent = inputBox.textContent.trim();
                        }
                    }
                }

                // If input is empty, prevent all default behavior and return
                if (!inputContent) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                }

                // Stop the event immediately
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                // Clear any _sentryCaptured flags they might have set
                delete event._sentryCaptured;
                
                // Remove any special properties their code might check
                Object.defineProperty(event, '_sentryCaptured', {
                    get: () => false,
                    set: () => {},
                    configurable: true
                });

                console.log('Enter key pressed - preventing default submission');
                
                // Focus and get memories using the same inputBox reference
                if (inputBox) {
                    inputBox.focus();
                    const memoriesButton = document.getElementById('get-memories-button');
                    await getAndInsertMemories(memoriesButton);
                    
                    setTimeout(() => {
                        const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
                        const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
                        const submitButton = chatGPTSubmitButton || claudeSubmitButton;
                        
                        if (submitButton && !submitButton.disabled) {
                            submitButton.click();
                            // Reset loading state after submission
                            memoriesButton.disabled = false;
                            memoriesButton.classList.remove('loading');
                        }
                    }, 100);
                }
                
                return false;
            }
            // If checkbox is not checked, let the default Enter behavior happen
            return true;
        }
    };

    const setupEnterKeyPrevention = () => {
        // Target the specific elements
        const proseMirrorEditor = document.querySelector('.ProseMirror');
        const fieldset = document.querySelector('fieldset.flex');
        const contentEditableDiv = document.querySelector('[contenteditable="true"]');

        if (!proseMirrorEditor && !fieldset && !contentEditableDiv) {
            console.log('Editor elements not found, retrying in 1 second...');
            setTimeout(setupEnterKeyPrevention, 1000);
            return;
        }

        // Add listeners to all potential elements and window
        [window, proseMirrorEditor, fieldset, contentEditableDiv].forEach(element => {
            if (element) {
                element.addEventListener('keydown', handleEnterKey, { capture: true });
                element.addEventListener('keypress', handleEnterKey, { capture: true });
            }
        });

        // Override their event handler setup
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if ((type === 'keypress' || type === 'keydown') && this.classList?.contains('ProseMirror')) {
                const wrappedListener = function(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        return handleEnterKey(event);
                    }
                    return listener.apply(this, arguments);
                };
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.apply(this, arguments);
        };

        // Prevent form submission if any
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    };

    const formatClaudeInput = () => {
        const inputBox = getInputBox();
        if (!inputBox) {
            console.log('Input box not found, retrying format in 1 second...');
            setTimeout(formatClaudeInput, 1000);
            return;
        }

        const content = inputBox.textContent || '';
        const memoriesMatch = content.match(/\[RELEVANT_PAST_MEMORIES_START\].*?\[RELEVANT_PAST_MEMORIES_END\]/s);
        
        if (memoriesMatch) {
            // Remove the memories section and any whitespace before the remaining text
            const userText = content.replace(/\[RELEVANT_PAST_MEMORIES_START\].*?\[RELEVANT_PAST_MEMORIES_END\]\s*/s, '').trim();
            
            if (inputBox.tagName === 'TEXTAREA') {
                inputBox.value = userText;
            } else {
                // For contenteditable divs (Claude)
                inputBox.innerHTML = `<p>${userText || ''}</p>`;
            }

            // Focus the input and move cursor to end
            inputBox.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputBox);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    // Add an observer specifically for the submit button
    const observeSubmitButton = () => {
        const callback = (mutations) => {
            const checkbox = document.getElementById('auto-submit-memories');
            if (!checkbox?.checked) return;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    const submitButton = document.querySelector('button[data-testid="send-button"]') || 
                                       document.querySelector('button[aria-label="Send Message"]');
                    if (submitButton) {
                        submitButton.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
                        submitButton.style.visibility = 'hidden';
                        submitButton.style.opacity = '0';
                        submitButton.style.transform = 'translateY(-20px)';
                    }
                }
            });
        };

        const observer = new MutationObserver(callback);
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    };

    const init = () => {
        // Wait for input box before initializing
        const inputBox = getInputBox();
        if (!inputBox) {
            console.log('Input box not found, retrying initialization...');
            setTimeout(init, 500);
            return;
        }

        addGetMemoriesButton();
        styleMemoriesInChat();
        observeDOM();
        setupEnterKeyPrevention();
        formatClaudeInput();

        // Add message listener for initiated ChatGPT requests
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'CHATGPT_REQUEST_INITIATED') {
                console.log('ChatGPT request initiated');
                console.log('Request payload received in content script:', request.payload);
                if (request.payload && request.payload.messages && request.payload.messages.length > 0) {
                    console.log('User message:', request.payload.messages[request.payload.messages.length - 1].content.parts.join('\n'));
                }
                sendResponse({received: true});
            } else if (request.type === 'TAB_READY') {
                console.log('Tab is ready');
                sendResponse({ready: true});
            }
            return true;
        });

        observeSubmitButton();
    };

    // Ensure the content script is initialized as soon as possible
    init();
    document.addEventListener('DOMContentLoaded', init);
})();
