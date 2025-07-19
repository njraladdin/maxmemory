// memoryUtils.js - Utility functions for memory processing

// Constants
const MEMORY_SEARCH_THRESHOLD = 0.4;
const TITLE_SIMILARITY_THRESHOLD = 0.1;
const TIME_DECAY_FACTOR = 0.05;
const LENGTH_NORMALIZATION_FACTOR = 0.3;
const MAX_MEMORIES_PER_MESSAGE = 30;

// Topic categories for relevance weighting
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

// Helper function to detect topic relevance
function getTopicRelevance(text, queryText) {
    // Add safety checks for undefined inputs
    if (!text || !queryText) return 1;  // Return neutral weight if either input is missing
    
    text = text.toLowerCase();
    queryText = queryText.toLowerCase();
    
    // Determine query topics
    const queryTopics = Object.entries(TOPIC_CATEGORIES).filter(([category, keywords]) => 
        keywords.some(keyword => queryText.includes(keyword))
    ).map(([category]) => category);
    
    // If no specific topics detected in query, return 1 (neutral weight)
    if (queryTopics.length === 0) return 1;
    
    // Check if memory matches query topics
    const memoryTopics = Object.entries(TOPIC_CATEGORIES).filter(([category, keywords]) => 
        keywords.some(keyword => text.includes(keyword))
    ).map(([category]) => category);
    
    // Calculate topic relevance score
    const topicMatch = queryTopics.some(topic => memoryTopics.includes(topic));
    return topicMatch ? 2.0 : 0.5; // Boost matching topics, penalize non-matching
}

// Cosine similarity function for comparing embeddings
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (normA * normB);
}

// Helper function to get relevance description and color
function getRelevanceInfo(score) {
    if (score >= 0.9) return { text: 'Very High Relevance', color: '#28a745' };
    if (score >= 0.7) return { text: 'High Relevance', color: '#17a2b8' };
    if (score >= 0.5) return { text: 'Moderate Relevance', color: '#ffc107' };
    return { text: 'Low Relevance', color: '#dc3545' };
}

// Helper function to format timestamp
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Process memories for relevance scoring
function processMemoriesForRelevance(memories, searchEmbedding, queryText) {
    const currentTime = Date.now();
    
    return memories
        .map(memory => {
            const similarityScore = cosineSimilarity(searchEmbedding, memory.embedding);
            const ageInDays = (currentTime - memory.timestamp) / (1000 * 60 * 60 * 24);
            const timeDecay = Math.exp(-TIME_DECAY_FACTOR * ageInDays);
            const lengthFactor = 1 / (1 + LENGTH_NORMALIZATION_FACTOR * Math.log(memory.text.length));
            const topicRelevance = getTopicRelevance(memory.text, queryText);
            
            // Adjusted relevance score with topic weighting
            const relevanceScore = similarityScore * timeDecay * lengthFactor * topicRelevance;

            return {
                ...memory,
                relevanceScore,
                similarityScore,
                timeDecay,
                lengthFactor,
                topicRelevance
            };
        })
        .filter(memory => memory.similarityScore >= TITLE_SIMILARITY_THRESHOLD)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, MAX_MEMORIES_PER_MESSAGE);
}

// Export functions and constants
export {
    MEMORY_SEARCH_THRESHOLD,
    TITLE_SIMILARITY_THRESHOLD,
    TIME_DECAY_FACTOR,
    LENGTH_NORMALIZATION_FACTOR,
    MAX_MEMORIES_PER_MESSAGE,
    TOPIC_CATEGORIES,
    getTopicRelevance,
    cosineSimilarity,
    getRelevanceInfo,
    formatDate,
    processMemoriesForRelevance
}; 