// contentScript.js

(function() {
    const getMemoriesSVG = (color = '#40414f') => `
      <svg fill="${color}" height="16px" width="16px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 612.001 612.001" xml:space="preserve" stroke="${color}">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M542.346,235.523c-6.647-76.801-52.108-147.626-115.793-190.052c-34.9-23.249-75.336-37.519-116.84-42.917 C195.319-12.325,74.841,37.92,31.685,150.284c-37.099,96.597-0.52,192.495,65.913,265.632 c23.974,26.393,27.298,76.017,27.298,109.446v67.792c0,10.408,8.438,18.846,18.846,18.846h245.301 c9.929,0,18.135-7.704,18.806-17.61c0.903-13.335,2.386-25.062,2.386-25.062c5.129-21.996,23.884-39.634,63.768-33.231 c41.844,6.713,68.237-5.756,70.584-33.617c0.774-9.191,1.273-87.695,1.273-87.695c1.999-1.142,15.117-3.75,34.236-8.097 c14.867-3.38,20.103-21.838,9.263-32.561c-43.469-43.001-49.299-63.047-50.378-67.362 C533.598,285.327,544.296,258.049,542.346,235.523z M461.327,209.858c-6.039,7.651-12.918,9.146-16.556,9.346 c-1.198,0.066-2.033,1.206-1.706,2.36c1.868,6.582,3.768,24.711-28.687,31.77c-30.438,6.615-48.844,30.29-60.863,42.313 c-9.233,9.225-21.723,13.495-34.183,16.299c-12.729,2.864-25.341,5.37-35.384,14.415c-10.577,9.527-25.495,61.985-28.027,71.104 c-0.222,0.801-0.951,1.352-1.783,1.352h-15.621c-0.877,0-1.636-0.614-1.817-1.473l-7.569-35.803 c-0.318-1.504-73.698,4.534-79.347-28.22c-0.198-1.149-1.359-1.862-2.456-1.466c-7.056,2.546-29.692,8.81-41.91-10.122 c-8.663-13.423-6.362-25.955-5.155-30.282c0.25-0.896-0.2-1.828-1.055-2.196c-6.225-2.677-28.719-15.289-25.669-56.784 c2.461-33.448,25.085-48.273,21.922-53.417c-9.124-14.837-1.193-39.431,17.5-44.921c0.753-0.221,1.288-0.888,1.359-1.67 l0.789-8.719c2.596-30.743,42.991-50.226,70.455-37.445c1.059,0.493,2.318-0.032,2.67-1.145 c3.438-10.898,10.377-13.898,12.226-14.938c8.515-4.791,19.572-4.199,28.374-0.586c0.712,0.292,1.523,0.114,2.048-0.448 c2.501-2.679,12.756-11.182,29.739-11.182c17.42,0,26.275,8.465,29.371,10.835c0.569,0.435,1.334,0.513,1.972,0.188 c3.919-2.004,18.228-8.411,32.554-3.476c10.818,3.732,16.959,13.578,18.893,17.161c0.413,0.766,1.281,1.157,2.128,0.957 c5.137-1.217,22.902-4.629,37.827,2.111c15.772,7.13,20.693,17.433,21.948,20.887c0.255,0.703,0.914,1.174,1.662,1.204 c3.42,0.136,12.858,0.964,18.691,5.866c10.3,8.66,9.294,15.488,8.108,18.41c-0.361,0.89,0.038,1.91,0.901,2.333 c4.704,2.307,17.892,9.927,26.073,26.112C472.011,182.884,467.505,202.031,461.327,209.858z"></path> </g> </g></svg>
    `;

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
        /* Claude-specific styles */
        [data-test-render-count] .memory-section {
            background-color: #F3F4F6;
            color: #374151;
            border-left-color: #9CA3AF;
            margin: 8px 0;
            border-radius: 8px;
            font-size: 0.875em;
            line-height: 1.5;
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
            background-color: #D7D7D7 !important;
            color: #A0A0A0 !important;
            cursor: not-allowed;
            opacity: 0.6;
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

    const getInputBox = () => (
        document.querySelector('#prompt-textarea, div[contenteditable="true"]')
    );

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
        
        messageDiv.innerHTML = `${before.trim()}<div class="memory-section">${createMemoriesIcon().outerHTML} ${memoriesContent}</div>
${after.trim()}`;
    };

    const syncMemoriesButtonState = () => {
        const getMemoriesButton = document.getElementById('get-memories-button');
        if (!getMemoriesButton) return;

        // Handle ChatGPT
        const chatGPTSubmitButton = document.querySelector('button[data-testid="send-button"]');
        if (chatGPTSubmitButton) {
            getMemoriesButton.disabled = chatGPTSubmitButton.disabled;
            return;
        }

        // Handle Claude
        const claudeSubmitButton = document.querySelector('button[aria-label="Send Message"]');
        if (claudeSubmitButton) {
            getMemoriesButton.disabled = claudeSubmitButton.disabled;
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

        // Observer for button state
        const submitButton = document.querySelector('button[data-testid="send-button"]');
        if (submitButton) {
            createObserver(syncMemoriesButtonState, { 
                attributes: true, 
                attributeFilter: ['disabled'] 
            });
        }
    };

    const getAndInsertMemories = async (button) => {
        try {
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

            button.disabled = true;
            button.classList.add('loading');

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
        } finally {
            button.disabled = false;
            button.classList.remove('loading');
        }
    };

    const addGetMemoriesButton = () => {
        if (document.getElementById('get-memories-button')) return;

        const button = createMemoriesButton();
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.marginBottom = '12px';
        container.appendChild(button);

        const target = 
            document.querySelector('fieldset') ||
            document.querySelector('form.w-full .relative.flex.h-full');

        if (target) {
            target.parentNode.insertBefore(container, target);
            syncMemoriesButtonState();
        }
    };

    const createMemoriesButton = () => {
        const button = document.createElement('button');
        button.id = 'get-memories-button';
        button.className = 'get-memories-button';
        button.innerHTML = `${getMemoriesSVG('#40414f')}<span>Get Memories</span>`;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            getAndInsertMemories(button);
        });

        return button;
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

    const observeInputBox = () => {
        const inputBox = getInputBox();
        if (!inputBox) {
            console.log('Input box not found, retrying in 1 second...');
            setTimeout(observeInputBox, 1000);
            return;
        }

        // Create a style element for dynamic styles
        let dynamicStyle = document.createElement('style');
        dynamicStyle.id = 'memories-dynamic-style';
        document.head.appendChild(dynamicStyle);

        // Observer for input box changes
        const observer = new MutationObserver(() => {
            const hasMemories = inputBox.textContent.includes('[RELEVANT_PAST_MEMORIES_START]');
            
            // Update styles based on content
            dynamicStyle.textContent = hasMemories ? `
                [contenteditable="true"] p:first-of-type {
                    position: relative;
                    font-size: 0.75em;
                    line-height: 1.4;
                    color: #888;
                    background-color: transparent;
                    padding: 4px 8px 4px 24px;
                    margin: 4px 0;
                    border-left: 2px solid #ddd;
                    user-select: none;
                    pointer-events: none;
                    opacity: 0.8;
                }
                // ... rest of styles ...
            ` : '';
        });

        observer.observe(inputBox, {
            childList: true,
            characterData: true,
            subtree: true
        });
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

    const init = () => {
        addGetMemoriesButton();
        styleMemoriesInChat();
        observeDOM();
        observeInputBox();
        formatClaudeInput();

        // Add message listener for initiated ChatGPT requests
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'CHATGPT_REQUEST_INITIATED') {
                console.log('ChatGPT request initiated');
                console.log('Request payload received in content script:', request.payload);
                if (request.payload && request.payload.messages && request.payload.messages.length > 0) {
                    console.log('User message:', request.payload.messages[request.payload.messages.length - 1].content.parts.join('\n'));
                }
                // Send a response to acknowledge receipt of the message
                sendResponse({received: true});
            } else if (request.type === 'TAB_READY') {
                console.log('Tab is ready');
                sendResponse({ready: true});
            }
            // Return true to indicate that we will send a response asynchronously
            return true;
        });
    };

    // Ensure the content script is initialized as soon as possible
    init();
    document.addEventListener('DOMContentLoaded', init);
})();
