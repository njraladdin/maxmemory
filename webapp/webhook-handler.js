// This is a sample webhook handler for your Node.js backend
// You can integrate this with your existing Express app

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (you'll need to set up your service account)
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: "your-project-id",
//     clientEmail: "your-client-email",
//     privateKey: "your-private-key"
//   }),
//   databaseURL: "https://your-project-id.firebaseio.com"
// });

const db = admin.firestore();

// Express route for Gumroad webhook
const handleGumroadWebhook = async (req, res) => {
  try {
    const data = req.body;
    
    // Verify this is a legitimate Gumroad request
    // In production, add more validation here
    
    console.log('Received webhook from Gumroad:', data);
    
    // Check if this is a sale event
    if (data.resource_name === 'sale') {
      // Check the product ID/permalink to ensure it's your product
      const productPermalink = data.permalink;
      if (productPermalink !== 'maxmemory') {
        console.log('Not our product, ignoring webhook');
        return res.status(200).send('Not our product');
      }
      
      // Determine if this is a new sale or a refund
      const isPurchase = data.sale_timestamp && !data.refunded;
      const isRefund = data.refunded === true;
      
      if (isPurchase) {
        // First, try to find the user by the UID passed in the URL parameters
        let userRef = null;
        
        // Parse the custom fields or URL parameters to find the user ID
        const urlParams = new URLSearchParams(data.url_params || '');
        const userId = urlParams.get('uid');
        
        if (userId) {
          // If we have a user ID, use it directly
          userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.log(`No user found with ID ${userId}`);
            userRef = null;
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
              purchaseData: data
            });
          });
          
          await batch.commit();
          console.log(`Updated premium status for user with email ${buyerEmail}`);
        } else {
          // Update the user directly using their ID
          await userRef.update({
            isPaid: true,
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            purchaseId: data.sale_id,
            purchaseData: data
          });
          console.log(`Updated premium status for user with ID ${userId}`);
        }
      } 
      else if (isRefund) {
        // Handle refund - first try by user ID, then fall back to email
        const urlParams = new URLSearchParams(data.url_params || '');
        const userId = urlParams.get('uid');
        
        if (userId) {
          const userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            await userRef.update({
              isPaid: false,
              refundDate: admin.firestore.FieldValue.serverTimestamp(),
              refundData: data
            });
            console.log(`Removed premium status for user with ID ${userId} due to refund`);
            return res.status(200).send('Webhook processed successfully');
          }
        }
        
        // Fall back to email lookup
        const buyerEmail = data.email;
        const usersSnapshot = await db.collection('users')
          .where('email', '==', buyerEmail)
          .get();
        
        if (!usersSnapshot.empty) {
          const batch = db.batch();
          usersSnapshot.forEach(doc => {
            batch.update(doc.ref, { 
              isPaid: false,
              refundDate: admin.firestore.FieldValue.serverTimestamp(),
              refundData: data
            });
          });
          
          await batch.commit();
          console.log(`Removed premium status for user with email ${buyerEmail} due to refund`);
        } else {
          console.log(`No user found for refund with email ${buyerEmail}`);
        }
      }
    }
    
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
};

// Example of how to use this in an Express app:
// const app = express();
// app.use(bodyParser.json());
// app.post('/webhooks/gumroad', handleGumroadWebhook);
// app.listen(3000, () => console.log('Server running on port 3000'));

module.exports = { handleGumroadWebhook }; 