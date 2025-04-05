// embeddingService.js - Module for generating embeddings

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_BYTE_LIMIT = 1000;

/**
 * Fetches an embedding for the given text from Google's API
 * @param {string} text - The text to generate an embedding for
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function getEmbedding(text) {
    console.log('Fetching embedding for text:', text);
    
    // Get the API key from storage
    const result = await chrome.storage.local.get('google_api_key');
    const apiKey = result.google_api_key;
    
    if (!apiKey) {
        throw new Error('Google API key not found in storage');
    }
    
    // Limit the text to avoid exceeding API limits
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    const slicedText = encodedText.slice(0, EMBEDDING_BYTE_LIMIT);
    const decoder = new TextDecoder('utf-8');
    const limitedText = decoder.decode(slicedText);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
                content: {
                    parts: [{
                        text: limitedText
                    }]
                }
            })
        }
    );

    const data = await response.json();
    console.log('Received embedding response:', data);

    if (data.error || !data.embedding || !data.embedding.values) {
        throw new Error(data.error?.message || 'Invalid response from embedding API.');
    }
    return data.embedding.values;
}

export {
    getEmbedding,
    EMBEDDING_MODEL,
    EMBEDDING_BYTE_LIMIT
}; 