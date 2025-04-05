// memoryExtractor.js - Module for extracting memories from user messages

import { getEmbedding } from './embeddingService.js';
import { saveMemory } from './memoryStorage.js';
import { searchMemories } from './memoryStorage.js';

// Configuration constants
const GEMINI_MODEL = 'gemini-2.0-flash';
const USER_MESSAGE_CHAR_LIMIT = 4000;

/**
 * Extracts meaningful information from user messages using Gemini LLM
 * @param {string} userMessage - The user message to extract information from
 * @returns {Promise<Array<string>>} - Array of extracted information
 */
async function extractInfoWithGemini(userMessage) {
    console.log('Extracting info from user message:', userMessage);
    
    // Get the API key from storage
    const result = await chrome.storage.local.get('google_api_key');
    const apiKey = result.google_api_key;
    
    if (!apiKey) {
        throw new Error('Google API key not found in storage');
    }
    
    // Extract previous memories section if it exists
    let previousRelevantMemories = '';
    const memoriesMatch = userMessage.match(/\[RELEVANT_PAST_MEMORIES_START\]([\s\S]*?)\[RELEVANT_PAST_MEMORIES_END\]/);
    if (memoriesMatch) {
        previousRelevantMemories = memoriesMatch[1];
        userMessage = userMessage.replace(/\[RELEVANT_PAST_MEMORIES_START\][\s\S]*?\[RELEVANT_PAST_MEMORIES_END\]/, '').trim();
    } else {
        // Search for relevant memories if none were provided
        try {
            const searchEmbedding = await getEmbedding(userMessage);
            const relevantMemories = await searchMemories(searchEmbedding, userMessage);
            if (relevantMemories.length > 0) {
                previousRelevantMemories = relevantMemories
                    .map(memory => memory.text)
                    .join('\n');
                userMessage = `[RELEVANT_PAST_MEMORIES_START]${previousRelevantMemories}[RELEVANT_PAST_MEMORIES_END]\n${userMessage}`;
            }
        } catch (error) {
            console.error('Error searching for relevant memories:', error);
        }
    }
    
    const limitedUserMessage = userMessage.slice(0, USER_MESSAGE_CHAR_LIMIT);
    console.log({limitedUserMessage});
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Context: You are analyzing a user's message to extract ONLY the most significant and permanent information about the user. Be selective - save information that would be valuable months or years from now for understanding the user's identity, beliefs, and major life circumstances.

Previous memories about this user:
${previousRelevantMemories}

From the following user message, extract ONLY significant information that is NOT already captured in previous memories: "${limitedUserMessage}"

STRICT Guidelines:
1. Be selective - only save truly meaningful information
2. Save information that is:
   - Permanent or long-term in nature
   - Core to understanding the user's identity
   - Major life circumstances or changes
   - Significant medical conditions or restrictions
   - Key professional or educational status
   - Important relationships or roles
   - Strong opinions or beliefs that reflect core values
   - Deeply held preferences that define the person
   - Recurring themes or patterns in thinking
   - Fundamental principles they express
   - Strong emotional connections to topics/ideas
   - Expertise or areas of deep knowledge

DO NOT save information that is:
- Temporary states or feelings
- Daily activities or routine events
- Casual or fleeting preferences
- Common experiences
- General knowledge or facts
- Similar to existing memories
- Surface-level opinions without strong conviction

Example input: "I absolutely hate the idea of working in big tech companies. I believe they're destroying privacy and human connection. I'd rather work at a small company where I can make real impact."
✅ Good output: ["User holds strong anti-big-tech values and prioritizes privacy and human connection in their work choices"]
❌ Bad output: ["User prefers small companies"]

Example input: "I'm passionate about sustainable living. I've been vegan for 10 years and actively campaign for environmental causes. Just bought some groceries today."
✅ Good output: ["User is deeply committed to environmentalism and has maintained a vegan lifestyle for 10 years"]
❌ Bad output: ["User bought groceries", "User is vegan"]

Example input: "Thinking about what to have for lunch. Maybe pizza."
✅ Good output: [] // Nothing significant enough to save
❌ Bad output: ["User likes pizza"]

generally, just keep stuff that'll be good / useful to remember in future chats.

Respond with a JSON array containing 0-2 concise memories or more depending on how much information is relevant. Default to an empty array unless the information reveals something truly significant about the user's identity, values, or life circumstances.`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    topK: 20,
                    topP: 0.8,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        }
    );

    const data = await response.json();
    console.log('Received Gemini response:', data);

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const extractedInfo = JSON.parse(data.candidates[0].content.parts[0].text);
        if (Array.isArray(extractedInfo)) {
            // Save each extracted piece of information as a separate memory
            for (const info of extractedInfo) {
                try {
                    const embedding = await getEmbedding(info);
                    await saveMemory(info, embedding);
                    console.log('Saved extracted info as memory:', info);
                } catch (error) {
                    console.error('Error saving extracted info as memory:', error);
                }
            }
            return extractedInfo;
        } else {
            console.error('Unexpected response format from Gemini API');
            return [];
        }
    } else {
        console.error('Invalid response from Gemini API');
        return [];
    }
}

export { extractInfoWithGemini }; 