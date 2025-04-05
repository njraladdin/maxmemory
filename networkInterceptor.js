// networkInterceptor.js - Module for intercepting ChatGPT and Claude requests

import { extractInfoWithGemini } from './memoryExtractor.js';

/**
 * Sets up network request interception for ChatGPT and Claude
 */
function interceptNetworkRequests() {
    chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
            // Handle ChatGPT requests
            if (details.url.includes('chatgpt.com/backend-api/conversation') && details.method === 'POST') {
                handleChatGPTRequest(details);
            }
            
            // Handle Claude requests
            if (details.url.includes('api.claude.ai/api/organizations') && 
                details.url.includes('/completion') && 
                details.method === 'POST') {
                handleClaudeRequest(details);
            }
            
            return { cancel: false };
        },
        { 
            urls: [
                "https://chatgpt.com/backend-api/conversation*",
                "https://api.claude.ai/api/organizations/*/chat_conversations/*/completion*"
            ] 
        },
        ["requestBody"]
    );
}

/**
 * Handles ChatGPT API requests
 * @param {Object} details - Request details from webRequest API
 */
function handleChatGPTRequest(details) {
    // First check if infinite memory is enabled
    chrome.storage.local.get('autoSubmitEnabled', (result) => {
        if (!result.autoSubmitEnabled) {
            console.log('Infinite memory disabled - skipping memory storage');
            return;
        }
        
        if (details.requestBody && details.requestBody.raw) {
            const rawData = details.requestBody.raw[0].bytes;
            const decodedString = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(rawData)));
            try {
                const payload = JSON.parse(decodedString);
                
                if (payload.messages && payload.messages.length > 0) {
                    const userMessage = payload.messages[payload.messages.length - 1].content.parts.join('\n');
                    console.log('Full user message from ChatGPT:', userMessage);

                    extractInfoWithGemini(userMessage)
                        .then(extractedInfoArray => {
                            console.log('Extracted and saved info from ChatGPT message:', extractedInfoArray);
                        })
                        .catch(error => console.error('Error processing ChatGPT message:', error));
                }
            } catch (error) {
                console.error('Error parsing ChatGPT request payload:', error);
            }
        }
    });
}

/**
 * Handles Claude API requests
 * @param {Object} details - Request details from webRequest API
 */
function handleClaudeRequest(details) {
    chrome.storage.local.get('autoSubmitEnabled', (result) => {
        if (!result.autoSubmitEnabled) {
            console.log('Infinite memory disabled - skipping memory storage');
            return;
        }
        
        if (details.requestBody && details.requestBody.raw) {
            const rawData = details.requestBody.raw[0].bytes;
            const decodedString = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(rawData)));
            try {
                const payload = JSON.parse(decodedString);
                
                if (payload.prompt) {
                    const userMessage = payload.prompt;
                    console.log('Full user message from Claude:', userMessage);

                    extractInfoWithGemini(userMessage)
                        .then(extractedInfoArray => {
                            console.log('Extracted and saved info from Claude message:', extractedInfoArray);
                        })
                        .catch(error => console.error('Error processing Claude message:', error));
                }
            } catch (error) {
                console.error('Error parsing Claude request payload:', error);
            }
        }
    });
}

export { interceptNetworkRequests }; 