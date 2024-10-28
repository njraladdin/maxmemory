//background.js 

// Configuration constants
const MEMORY_SEARCH_THRESHOLD = 0.3;  
const USER_MESSAGE_CHAR_LIMIT = 4000;
const EMBEDDING_BYTE_LIMIT = 1000;
const DB_NAME = 'MemoryVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const GEMINI_MODEL = 'gemini-1.5-pro';
const EMBEDDING_MODEL = 'text-embedding-004';
const TITLE_SIMILARITY_THRESHOLD = 0.1;  // Lowered from 0.3
const TIME_DECAY_FACTOR = 0.05;  // Lowered from 0.1
const LENGTH_NORMALIZATION_FACTOR = 0.3;  // Lowered from 0.5

// Add new constants for topic weighting
const TOPIC_CATEGORIES = {
    CODING: ['code', 'programming', 'developer', 'software', 'extension', 'browser', 'javascript', 'python', 'api', 'chatbot', 'ai', 'computer', 'tech', 'database', 'web', 'app', 'development', 'github', 'debugging', 'coding'],
    
    FITNESS: ['workout', 'exercise', 'fitness', 'gym', 'pain', 'muscle', 'training', 'leg', 'strength', 'cardio', 'running', 'sports', 'health', 'nutrition', 'diet', 'weight', 'physical', 'athletic'],
    
    CAREER: ['job', 'work', 'career', 'professional', 'business', 'company', 'interview', 'salary', 'promotion', 'office', 'workplace', 'colleague', 'manager', 'employment', 'startup', 'entrepreneur'],
    
    EDUCATION: ['study', 'learning', 'school', 'university', 'college', 'degree', 'course', 'education', 'student', 'teacher', 'academic', 'research', 'knowledge', 'exam', 'class', 'lecture'],
    
    RELATIONSHIPS: ['family', 'friend', 'partner', 'relationship', 'marriage', 'dating', 'social', 'communication', 'love', 'parent', 'child', 'sibling', 'spouse', 'romantic', 'connection'],
    
    HEALTH: ['medical', 'health', 'doctor', 'illness', 'condition', 'medication', 'therapy', 'mental', 'anxiety', 'depression', 'stress', 'sleep', 'wellness', 'diagnosis', 'treatment', 'healthcare'],
    
    FINANCE: ['money', 'finance', 'investment', 'budget', 'saving', 'expense', 'income', 'financial', 'bank', 'debt', 'credit', 'tax', 'salary', 'economy', 'stock', 'crypto'],
    
    HOBBIES: ['hobby', 'art', 'music', 'reading', 'writing', 'gaming', 'travel', 'photography', 'cooking', 'gardening', 'craft', 'creative', 'collection', 'entertainment', 'leisure'],
    
    LIFESTYLE: ['home', 'living', 'lifestyle', 'habit', 'routine', 'organization', 'productivity', 'goal', 'personal', 'time', 'planning', 'schedule', 'balance', 'life'],
    
    FOOD: ['food', 'cooking', 'diet', 'recipe', 'meal', 'restaurant', 'eating', 'cuisine', 'drink', 'nutrition', 'vegetarian', 'vegan', 'ingredient', 'taste'],
    
    TRAVEL: ['travel', 'vacation', 'trip', 'destination', 'country', 'city', 'flight', 'hotel', 'tourism', 'adventure', 'explore', 'journey', 'abroad', 'culture'],
    
    TECHNOLOGY: ['technology', 'device', 'gadget', 'phone', 'computer', 'internet', 'digital', 'online', 'hardware', 'software', 'mobile', 'electronic', 'smart', 'tech'],
    
    BELIEFS: ['belief', 'religion', 'spiritual', 'philosophy', 'value', 'principle', 'faith', 'moral', 'ethics', 'political', 'ideology', 'worldview', 'opinion'],
    
    EMOTIONS: ['emotion', 'feeling', 'mood', 'happiness', 'sadness', 'anger', 'fear', 'joy', 'anxiety', 'stress', 'emotional', 'mental', 'psychological'],
    
    SKILLS: ['skill', 'ability', 'talent', 'expertise', 'competence', 'experience', 'knowledge', 'capability', 'proficiency', 'mastery', 'learning', 'practice'],
    
    GOALS: ['goal', 'ambition', 'aspiration', 'dream', 'plan', 'objective', 'target', 'achievement', 'success', 'milestone', 'progress', 'future', 'vision'],
    
    CHALLENGES: ['challenge', 'problem', 'difficulty', 'obstacle', 'struggle', 'issue', 'conflict', 'crisis', 'trouble', 'concern', 'worry', 'setback'],
    
    LOCATION: ['location', 'place', 'address', 'city', 'country', 'region', 'area', 'neighborhood', 'residence', 'living', 'moving', 'relocation']
};

// Simplify topic relevance calculation
function getTopicRelevance(text, queryText) {
    // Add null checks and default values
    text = (text || '').toLowerCase();
    queryText = (queryText || '').toLowerCase();
    
    const getTopics = text => Object.entries(TOPIC_CATEGORIES)
        .filter(([_, keywords]) => keywords.some(kw => text.includes(kw)))
        .map(([category]) => category);
    
    const queryTopics = getTopics(queryText);
    if (!queryTopics.length) return 1;
    
    const memoryTopics = getTopics(text);
    return memoryTopics.some(topic => queryTopics.includes(topic)) ? 2.0 : 0.5;
}

// Function to get embedding from Google API
async function getEmbedding(text) {
    const result = await chrome.storage.local.get('google_api_key');
    const apiKey = result.google_api_key;
    
    if (!apiKey) {
        throw new Error('Google API key not found');
    }

    const limitedText = new TextDecoder('utf-8').decode(
        new TextEncoder().encode(text).slice(0, EMBEDDING_BYTE_LIMIT)
    );

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
                content: { parts: [{ text: limitedText }] }
            })
        }
    );

    const data = await response.json();
    if (!data.embedding?.values) throw new Error('Invalid embedding response');
    return data.embedding.values;
}

// Cosine similarity function for comparing embeddings
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (normA * normB);
}

// Initialize IndexedDB
const dbName = DB_NAME;
const dbVersion = DB_VERSION;
const storeName = STORE_NAME;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(storeName)) {
                e.target.result.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Save memory with its embedding
async function saveMemory(text, embedding) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const request = db.transaction([storeName], 'readwrite')
            .objectStore(storeName)
            .add({ text, embedding, timestamp: Date.now() });
            
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
    });
}

// Search memories without result limit
async function searchMemories(searchEmbedding, queryText, threshold = MEMORY_SEARCH_THRESHOLD) {
    const db = await initDB();
    const memories = await new Promise((resolve, reject) => {
        const request = db.transaction([storeName], 'readonly')
            .objectStore(storeName)
            .getAll();
            
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    console.log(`Retrieved ${memories.length} memories from IndexedDB`);
    const currentTime = Date.now();
    
    return memories
        .map(memory => {
            // Calculate all scoring factors
            const scores = {
                similarity: cosineSimilarity(searchEmbedding, memory.embedding),
                timeDecay: Math.exp(-TIME_DECAY_FACTOR * ((currentTime - memory.timestamp) / (1000 * 60 * 60 * 24))),
                lengthFactor: 1 / (1 + LENGTH_NORMALIZATION_FACTOR * Math.log(memory.text.length)),
                topicRelevance: getTopicRelevance(memory.text, queryText)
            };
            
            // Calculate final relevance score
            const relevanceScore = Object.values(scores).reduce((a, b) => a * b);
            
            return { ...memory, ...scores, relevanceScore };
        })
        .filter(memory => memory.similarity >= TITLE_SIMILARITY_THRESHOLD)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Get all memories
async function getAllMemories() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const request = db.transaction([storeName], 'readonly')
            .objectStore(storeName)
            .getAll();
            
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Helper function to format timestamp
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Helper function to get relevance description and color
function getRelevanceInfo(score) {
    if (score >= 0.9) return { text: 'Very High Relevance', color: '#28a745' };
    if (score >= 0.7) return { text: 'High Relevance', color: '#17a2b8' };
    if (score >= 0.5) return { text: 'Moderate Relevance', color: '#ffc107' };
    return { text: 'Low Relevance', color: '#dc3545' };
}

// Updated function to extract info using Gemini LLM and save as memories
async function extractInfoWithGemini(userMessage) {
    const result = await chrome.storage.local.get('google_api_key');
    const apiKey = result.google_api_key;
    
    if (!apiKey) {
        throw new Error('Google API key not found');
    }

    console.log('Extracting info from user message:', userMessage);
    
    // Extract previous memories section if it exists
    let previousRelevantMemories = '';
    const memoriesMatch = userMessage.match(/<relevant_past_memories>([\s\S]*?)<\/relevant_past_memories>/);
    if (memoriesMatch) {
        previousRelevantMemories = memoriesMatch[1];
        userMessage = userMessage.replace(/<relevant_past_memories>[\s\S]*?<\/relevant_past_memories>/, '').trim();
    } else {
        // Search for relevant memories if none were provided
        try {
            const searchEmbedding = await getEmbedding(userMessage);
            const relevantMemories = await searchMemories(searchEmbedding);
            if (relevantMemories.length > 0) {
                previousRelevantMemories = relevantMemories
                    .map(memory => memory.text)
                    .join('\n');
                userMessage = `<relevant_past_memories>${previousRelevantMemories}</relevant_past_memories>\n${userMessage}`;
            }
        } catch (error) {
            console.error('Error searching for relevant memories:', error);
        }
    }
    console.log('previousRelevantMemories')
    console.log(previousRelevantMemories)
    
    const limitedUserMessage = userMessage.slice(0, USER_MESSAGE_CHAR_LIMIT);
    
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
                                text: `Context: You are analyzing a user's message to extract only the significant and long-term relevant information about the user. Focus on creating permanent memories that would be valuable for understanding the user's core characteristics, important life details, and significant preferences.

Previous memories about this user:
${previousRelevantMemories}

From the following user message, extract only truly significant information worth remembering long-term that is NOT already captured in the previous memories: "${limitedUserMessage}"

Key Instructions:
- Extract information that provides lasting insight into the user
- Information should be valuable even months or years from now
- Combine related information into comprehensive single memories
- If the user explicitly asks to remember something, include it
- Consider if recurring patterns reveal important user characteristics
- DO NOT create memories that duplicate information already present in previous memories or are similar
- If new information adds detail to an existing memory, only include the new aspects
- When in doubt about similarity with existing memories, skip it to avoid redundancy

Focus ONLY on:
1. Personal details and characteristics
2. Life events and circumstances
3. Strong preferences and beliefs
4. Important conditions or traits
5. Goals and plans
6. Values and principles
7. Key relationships and roles

Example input: "I'm feeling tired today since I didn't sleep well"
✅ Good output:
["User experiences sleep difficulties"]

Example input: "I work as a software engineer in Seattle and I'm severely allergic to shellfish"
✅ Good output:
["User is a software engineer based in Seattle and has a severe shellfish allergy"]

Example input: "The weather is nice and I might go for a walk"
✅ Good output:
[] // No memories - casual, temporary information

Example input: "I'm planning to move to Canada next month for my new job as a teacher"
✅ Good output:
["User is relocating to Canada to work as a teacher"]

Respond with a JSON array containing 0-2 concise strings that capture only truly significant, long-term relevant information. Default to an empty array unless the information is genuinely important.`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
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

// Simplify message handlers to avoid duplicate code
const messageHandlers = {
    async SEARCH_MEMORIES({ query }) {
        const embedding = await getEmbedding(query);
        return { results: await searchMemories(embedding, query) };
    },
    
    async SAVE_MEMORY({ text }) {
        const embedding = await getEmbedding(text);
        await saveMemory(text, embedding);
        return { status: 'success' };
    },
    
    async GET_ALL_MEMORIES() {
        return { memories: await getAllMemories() };
    },
    
    async DELETE_MEMORY({ id }) {
        await deleteMemory(id);
        return { status: 'success' };
    }
};

// Simplify message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handler = messageHandlers[request.type];
    if (handler) {
        handler(request)
            .then(response => sendResponse({ status: 'success', ...response }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
});

// Simplify network request handling
function interceptNetworkRequests() {
    const urlHandlers = {
        'chatgpt.com/backend-api/conversation': payload => 
            payload.messages?.[payload.messages.length - 1]?.content?.parts?.join('\n'),
        'api.claude.ai/api/organizations': payload => payload.prompt
    };

    chrome.webRequest.onBeforeRequest.addListener(
        details => {
            if (details.method === 'POST' && details.requestBody?.raw) {
                try {
                    const payload = JSON.parse(decodeURIComponent(
                        String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))
                    ));

                    for (const [urlPart, handler] of Object.entries(urlHandlers)) {
                        if (details.url.includes(urlPart)) {
                            const userMessage = handler(payload);
                            if (userMessage) {
                                extractInfoWithGemini(userMessage)
                                    .then(info => console.log('Extracted info:', info))
                                    .catch(err => console.error('Processing error:', err));
                            }
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Payload parsing error:', error);
                }
            }
            return { cancel: false };
        },
        { urls: [
            "https://chatgpt.com/backend-api/conversation*",
            "https://api.claude.ai/api/organizations/*/chat_conversations/*/completion*"
        ]},
        ["requestBody"]
    );
}

// Call this function to start intercepting
interceptNetworkRequests();

// Add this new function to delete a memory
async function deleteMemory(id) {
    console.log('Deleting memory with id:', id);
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
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

