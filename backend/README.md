# MaxMemory Webapp Backend

A Node.js Express backend for handling Gumroad webhooks and updating user payment status in Firebase.

## Features

- Express server with webhook endpoint for Gumroad
- Firebase Firestore integration for user data management
- Handles purchases and refunds
- Updates user payment status based on Gumroad events

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up Firebase:
   - Create a Firebase service account key from the Firebase console
   - Save it as `serviceAccountKey.json` in the root directory
   - Or set environment variables in a `.env` file:
     ```
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_CLIENT_EMAIL=your-client-email
     FIREBASE_PRIVATE_KEY=your-private-key
     ```

3. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

## Webhook Integration

Configure your Gumroad product to send webhooks to:
```
https://your-server-url.com/webhooks/gumroad
```

When creating purchase links in your application, append the user's ID as a URL parameter:
```
https://gumroad.com/l/maxmemory?uid=user123
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
FIREBASE_PROJECT_ID=maxmemory-67d43
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
PORT=3000
```

## API Endpoints

- `POST /webhooks/gumroad`: Gumroad webhook endpoint
- `GET /health`: Health check endpoint

## License

ISC 