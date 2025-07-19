require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'maxmemory-67d43'
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Gumroad webhook handler
const handleGumroadWebhook = async (req, res) => {
  try {
    console.log('Received webhook request. Headers:', req.headers);
    console.log('Received webhook request. Body:', req.body);
    
    const data = req.body;
    
    // Verify this is a legitimate Gumroad request
    // In production, add more validation here
    
    console.log('Processing webhook data from Gumroad:', data);
    
    // Check if this is a sale event
    if (data.resource_name === 'sale') {
        console.log('Processing sale event');
      // Check the product ID/permalink to ensure it's your product
      const productPermalink = data.permalink;
      if (productPermalink !== 'maxmemory') {
        console.log('Not our product, ignoring webhook');
        return res.status(200).send('Not our product');
      }
      
      // Determine if this is a new sale or a refund
      const isPurchase = data.sale_timestamp && data.refunded === 'false';
      
      if (isPurchase) {
        // Calculate subscription expiry date based on purchase timestamp and subscription type
        let subscriptionExpiry = null;
        if (data.sale_timestamp) {
          const purchaseDate = new Date(data.sale_timestamp);
          if (data.recurrence === 'monthly') {
            // Add 1 month to purchase date
            subscriptionExpiry = new Date(purchaseDate);
            subscriptionExpiry.setMonth(purchaseDate.getMonth() + 1);
          } else if (data.recurrence === 'yearly') {
            // Add 1 year to purchase date
            subscriptionExpiry = new Date(purchaseDate);
            subscriptionExpiry.setFullYear(purchaseDate.getFullYear() + 1);
          }
        }
        
        // First, try to find the user by the UID passed in the URL parameters
        let userRef = null;
        
        // Get the user ID directly from the url_params object
        console.log('URL params received:', data.url_params);
        
        // Extract uid directly from the object
        const userId = data.url_params && data.url_params.uid;
        console.log('User ID extracted:', userId);
        
        if (userId) {
          console.log('Attempting to update user with ID:', userId);
          // If we have a user ID, use it directly
          userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.log(`No user found with ID ${userId}`);
            userRef = null;
          } else {
            console.log('Found user document:', userDoc.data());
          }
        }
        
        // If we couldn't find the user by ID, fall back to email
        if (!userRef) {
          const buyerEmail = data.email;
          const usersSnapshot = await db.collection('users')
            .where('email', '==', buyerEmail)
            .get();
          
          if (usersSnapshot.empty) {
            console.log(`No user found with email ${buyerEmail}`);
            return res.status(200).send('User not found');
          }
          
          // Update all matching users (should typically be just one)
          const batch = db.batch();
          usersSnapshot.forEach(doc => {
            batch.update(doc.ref, { 
              isPaid: true,
              purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
              purchaseId: data.sale_id,
              subscriptionId: data.subscription_id,
              subscriptionType: data.recurrence === 'monthly' ? 'monthly' : 'yearly',
              subscriptionExpiry: subscriptionExpiry
            });
          });
          
          await batch.commit();
          console.log(`Updated premium status for user with email ${buyerEmail}`);
        } else {
          // Update the user directly using their ID
          console.log(`Updating user document for ID ${userId} with isPaid=true`);
          try {
            // Try a direct set with merge instead of update
            await userRef.set({
              isPaid: true,
              purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
              purchaseId: data.sale_id,
              subscriptionId: data.subscription_id,
              subscriptionType: data.recurrence === 'monthly' ? 'monthly' : 'yearly',
              subscriptionExpiry: subscriptionExpiry
            }, { merge: true });
            console.log(`Successfully updated premium status for user with ID ${userId}`);
            
            // Verify the update
            const updatedDoc = await userRef.get();
            console.log('Updated user document:', updatedDoc.data());
          } catch (updateError) {
            console.error('Error updating user document:', updateError);
            throw updateError;
          }
        }
      } 
    }
    
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  } finally {
    console.log('Webhook processing completed');
  }
};

// Routes
app.post('/webhooks/gumroad', handleGumroadWebhook);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});

// Function to verify Firebase connection by counting users
const verifyFirebaseConnection = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Firebase connection successful. Found ${usersSnapshot.size} users in the database.`);
    
    // Log the first few users for verification (without sensitive data)
    if (usersSnapshot.size > 0) {
      console.log('Sample users:');
      usersSnapshot.docs.slice(0, 3).forEach(doc => {
        const userData = doc.data();
        console.log(`- User ID: ${doc.id}, Email: ${userData.email}, isPaid: ${userData.isPaid}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
};

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Verify Firebase connection
  await verifyFirebaseConnection();
});

module.exports = { handleGumroadWebhook }; 