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
        textarea:not([placeholder]) {
            min-height: 100vh;
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
        const messageDiv = messageContainer.querySelector('.whitespace-pre-wrap, [data-testid="user-message"]');
        if (!messageDiv) return;

        const match = messageDiv.textContent.match(/\[RELEVANT_PAST_MEMORIES_START\]([\s\S]*?)\[RELEVANT_PAST_MEMORIES_END\]/);
        if (!match) return;

        const [fullMatch, memoriesContent] = match;
        const [before, after] = messageDiv.textContent.split(fullMatch);
        
        const truncatedContent = memoriesContent.length > 280 ? 
            `${memoriesContent.slice(0, 280)}... <span class="show-more-memories" style="color: #666; font-weight: 600; cursor: pointer; user-select: text; pointer-events: auto;">Show more</span>` : 
            memoriesContent;

        messageDiv.innerHTML = `${before.trim()}<div class="memory-section">${createMemoriesIcon().outerHTML} <span class="memories-content">${truncatedContent}</span></div>${after.trim()}`;

        messageDiv.querySelector('.show-more-memories')?.addEventListener('click', e => {
            e.stopPropagation();
            e.target.closest('.memories-content').innerHTML = memoriesContent;
        });
    };

    const syncMemoriesButtonState = () => {
        const getMemoriesButton = document.getElementById('get-memories-button');
        const checkbox = document.getElementById('auto-submit-memories');
        if (!getMemoriesButton || !checkbox) return;

        const submitButton = document.querySelector('button[data-testid="send-button"], button[aria-label="Send Message"]');
        getMemoriesButton.disabled = !submitButton || submitButton.disabled;
        
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

            // Get the current user input while preserving line breaks
            let userInput = '';
            if (inputBox.tagName === 'TEXTAREA') {
                userInput = inputBox.value;  // Remove trim() to preserve line breaks
            } else {
                // For contenteditable, preserve line breaks between paragraphs
                const paragraphs = inputBox.querySelectorAll('p');
                userInput = Array.from(paragraphs)
                    .map(p => p.textContent)  // Remove trim() to preserve spacing
                    .join('\n');
            }

            const response = await chrome.runtime.sendMessage({ 
                type: 'SEARCH_MEMORIES', 
                query: userInput.trim()  // Only trim for the search query
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

                // Insert memories while preserving original line breaks
                if (inputBox.tagName === 'TEXTAREA') {
                    inputBox.value = `[RELEVANT_PAST_MEMORIES_START] ${memoriesText} [RELEVANT_PAST_MEMORIES_END]\n\n${userInput}`;
                } else {
                    // For contenteditable, split by newlines and create paragraphs
                    const lines = userInput.split('\n');
                    const paragraphs = lines.map(line => `<p>${line}</p>`).join('');
                    inputBox.innerHTML = `<p>[RELEVANT_PAST_MEMORIES_START] ${memoriesText} [RELEVANT_PAST_MEMORIES_END]</p><br/>${paragraphs}`;
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

        // Create left side container for checkbox, label and settings button
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

        // Create settings button with notification dot container
        const settingsButtonContainer = document.createElement('div');
        settingsButtonContainer.style.position = 'relative';
        
        const settingsButton = document.createElement('button');
        settingsButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.3 8c0-.3 0-.6-.1-.8l1.5-1.3-1.4-2.4-1.9.5c-.4-.4-.9-.6-1.4-.8L9.7 1h-2.8l-.3 2.2c-.5.2-1 .5-1.4.8l-1.9-.5-1.4 2.4 1.5 1.3c0 .2-.1.5-.1.8s0 .6.1.8L1.9 10l1.4 2.4 1.9-.5c.4.4.9.6 1.4.8l.3 2.3h2.8l.3-2.2c.5-.2 1-.5 1.4-.8l1.9.5 1.4-2.4-1.5-1.3c0-.3.1-.6.1-.8z" fill="#666"/>
        </svg>`;
        settingsButton.style.cssText = `
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background-color 0.2s ease;
        `;

        // Create notification dot
        const notificationDot = document.createElement('div');
        notificationDot.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 6px;
            height: 6px;
            background-color: #dc2626;
            border-radius: 50%;
            display: none;
        `;

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = 'API key required';
        tooltip.style.cssText = `
            position: absolute;
            top: -30px;
            right: 0;
            background-color: #dc2626;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            display: none;
            pointer-events: none;
            z-index: 1000;
        `;

        // Check API key and show/hide notification dot
        chrome.storage.local.get('google_api_key', (result) => {
            if (!result.google_api_key) {
                notificationDot.style.display = 'block';
            }
        });

        // Add hover events for tooltip
        settingsButton.addEventListener('mouseover', () => {
            settingsButton.style.backgroundColor = '#f0f0f0';
            // Only show tooltip if there's no API key
            chrome.storage.local.get('google_api_key', (result) => {
                if (!result.google_api_key) {
                    tooltip.style.display = 'block';
                }
            });
        });

        settingsButton.addEventListener('mouseout', () => {
            settingsButton.style.backgroundColor = 'transparent';
            tooltip.style.display = 'none';
        });

        settingsButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        });

        // Assemble the settings button container
        settingsButtonContainer.appendChild(settingsButton);
        settingsButtonContainer.appendChild(notificationDot);
        settingsButtonContainer.appendChild(tooltip);

        // Create button
        const button = document.createElement('button');
        button.id = 'get-memories-button';
        button.className = 'get-memories-button';
        button.innerHTML = `${getMemoriesSVG('#40414f')}<span>Submit</span>`;
        // Initially hide the button
        button.style.display = 'none';

        // Load saved state when creating the checkbox
        chrome.storage.local.get('autoSubmitEnabled', (result) => {
            checkbox.checked = result.autoSubmitEnabled || false;
            
            // Update button visibility based on saved state with animation
            button.style.transition = 'visibility 0.3s, opacity 0.3s, transform 0.3s';
            if (checkbox.checked) {
                button.style.display = 'flex';
                // Set initial position below
                button.style.transform = 'translateY(20px)';
                button.style.visibility = 'visible';
                button.style.opacity = '0';
                
                // Force a reflow to ensure the initial state is rendered
                button.offsetHeight;
                
                // Animate to final position
                button.style.transform = 'translateY(0)';
                button.style.opacity = '1';
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
                // Set initial position below
                button.style.transform = 'translateY(20px)';
                button.style.visibility = 'visible';
                button.style.opacity = '0';
                
                // Force a reflow to ensure the initial state is rendered
                button.offsetHeight;
                
                // Animate to final position
                button.style.transform = 'translateY(0)';
                button.style.opacity = '1';
            } else {
                button.style.visibility = 'hidden';
                button.style.opacity = '0';
                button.style.transform = 'translateY(20px)';
                // Hide the button completely after animation
                setTimeout(() => {
                    button.style.display = 'none';
                }, 300);
            }
            
            // Simplified submit button visibility toggle without animation
            const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
            const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
            const submitButton = chatGPTSubmitButton || claudeSubmitButton;
            
            if (submitButton) {
                if (checkbox.checked) {
                    submitButton.style.visibility = 'hidden';
                    submitButton.style.opacity = '0';
                } else {
                    submitButton.style.visibility = 'visible';
                    submitButton.style.opacity = '1';
                }
            }
        });

        // Assemble the components
        switchLabel.appendChild(checkbox);
        switchLabel.appendChild(slider);
        leftContainer.appendChild(switchLabel);
        leftContainer.appendChild(label);
        leftContainer.appendChild(settingsButtonContainer);  // Use container instead of button
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


    const handleEnterKey = async (event) => {
        const checkbox = document.getElementById('auto-submit-memories');
        if (!checkbox?.checked || event.key !== 'Enter' || event.shiftKey) return true;

        const inputBox = getInputBox();
        const inputContent = getInputContent(inputBox);
        if (!inputContent || !inputBox) {
            event.preventDefault();
            return false;
        }

        event.preventDefault();
        event.stopPropagation();
        
        const memoriesButton = document.getElementById('get-memories-button');
        await getAndInsertMemories(memoriesButton);
        
        setTimeout(() => {
            const submitButton = document.querySelector('button[data-testid="send-button"], button[aria-label="Send Message"]');
            if (submitButton && !submitButton.disabled) {
                submitButton.click();
                memoriesButton.disabled = false;
                memoriesButton.classList.remove('loading');
            }
        }, 100);
        
        return false;
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
                        submitButton.style.visibility = 'hidden';
                        submitButton.style.opacity = '0';
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

const getInputContent = (inputBox) => {
    return inputBox.tagName === 'TEXTAREA' ? 
        inputBox.value.trim() : 
        Array.from(inputBox.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .join('\n');
};

const setInputContent = (inputBox, content) => {
    if (inputBox.tagName === 'TEXTAREA') {
        inputBox.value = content;
    } else {
        inputBox.innerHTML = `<p>${content}</p>`;
    }
    // Focus and move cursor to end
    inputBox.focus();
    const range = document.createRange();
    range.selectNodeContents(inputBox);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
};
