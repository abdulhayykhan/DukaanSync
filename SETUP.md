# 🚀 DukaanSync Setup Guide

Welcome to the DukaanSync local development setup guide! This document will walk you through setting up the project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js 18+** (We recommend the latest LTS version)
- **npm** (Node Package Manager)
- **Git**
- A Google/Firebase account

---

## Step 1: Firebase Project Setup

DukaanSync relies heavily on Firebase for authentication and database services.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it something like `DukaanSync-Dev`.
3. Disable Google Analytics for the development environment (optional but recommended).
4. Click **Create project**.

### Enable Authentication
1. In the Firebase console, go to **Build** > **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password** and enable it. Save the changes.

### Create Cloud Firestore Database
1. Go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose **Native mode** and select a location close to you.
4. Start in **test mode** (or production mode, we will deploy security rules later).

### Get Firebase Config
1. Go to **Project Overview** > **Project settings** (the gear icon).
2. Scroll down to **Your apps** and click the **Web** (`</>`) icon.
3. Register the app with a nickname (e.g., `DukaanSync Web`).
4. You will be provided with a `firebaseConfig` object containing keys like `apiKey`, `authDomain`, `projectId`, etc. Keep this tab open.

---

## Step 2: Local Environment Configuration

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/abdulhayykhan/DukaanSync.git
   cd DukaanSync
   ```

2. Copy the example environment variables file:
   ```bash
   cp .env.example .env.local
   ```
   *(On Windows Command Prompt/PowerShell, you can manually copy `.env.example` and rename the copy to `.env.local`)*

3. Open `.env.local` in your code editor and fill in the values from your Firebase Config obtained in Step 1:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
   NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
   ```

---

## Step 3: Database Security Rules

DukaanSync uses strict Firestore Security Rules to enforce multi-tenant isolation. You need to deploy these rules to your Firebase project.

1. Install the Firebase CLI globally if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in the project directory (select your `DukaanSync-Dev` project):
   ```bash
   firebase use --add
   ```
   *(Select your project and alias it as `default`)*

4. Deploy the Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## Step 4: Running the Development Server

1. Install the project dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000). You should see the DukaanSync login/onboarding screen!

---

## Step 5: Production Build Testing

Before deploying to production (Vercel, Netlify, etc.), it's best practice to test the optimized build locally:

1. Create a production build:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

---

## Troubleshooting

- **Firestore Permission Denied Errors:** Ensure you have deployed the `firestore.rules` file successfully using the Firebase CLI.
- **Hydration Errors:** Next.js expects the server and client HTML to match. Avoid using browser extensions that modify HTML (like translators) during development.
- **Authentication Issues:** Double-check that Email/Password auth is enabled in your Firebase project and that your `.env.local` keys exactly match the Firebase console.
