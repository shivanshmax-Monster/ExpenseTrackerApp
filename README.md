# ExpenseTrackerApp 💸

A beautiful, high-performance, and feature-rich Expense Tracking application built with **React Native**, **Expo**, and **Firebase**. 

### 📱 [Download ExpenseTracker.apk Here](https://github.com/shivanshmax-Monster/ExpenseTrackerApp/raw/master/ExpenseTracker.apk)
*(Tap the link above from your Android device to install the app directly!)*

ExpenseTrackerApp helps you monitor your spending, track income, view visual analytics, set monthly budgets, and export all your financial data seamlessly.

---

## 🌟 Features

* **Secure Authentication:** Sign in with email and password using Firebase Authentication.
* **Real-time Database:** All transactions (Income and Expenses) are synced in real-time to Firebase Firestore.
* **Smart Dashboard:** Instantly view your Total Balance, Total Income, and Total Expenses with category filtering.
* **Visual Analytics:** View beautiful charts breaking down your monthly expenses by category (powered by react-native-chart-kit).
* **Budget Limits & Alerts:** Set a custom Monthly Budget. The app displays a dynamic progress bar and issues an immediate alert if you exceed your limit!
* **Data Export:** Export your transactions locally to a PDF or CSV file directly from your dashboard!
* **Modern UI:** Built with dark mode in mind, featuring smooth gradients, glassmorphism chips, and React Native Reanimated interactions.

---

## 🛠️ Technology Stack

* **React Native & Expo Router:** For native compilation and file-based routing.
* **Firebase:** For robust backend authentication and cloud Firestore database.
* **react-native-chart-kit:** For rendering beautiful data analytics.
* **expo-print & expo-sharing:** For generating and sharing PDF and CSV reports.

---

## 📥 Installation Instructions

### Option 1: Run from Source Code (Development)

To run this project locally on your own machine for development or testing:

**1. Prerequisites**
- Node.js (v18+)
- Android Studio (for emulator) or Expo Go (on your physical device)

**2. Install Dependencies**
```bash
git clone <your-repo-url>
cd ExpenseTrackerApp
npm install
```

**3. Firebase Setup**
Create a new Firebase project and add your web configuration to `src/firebaseConfig.ts`:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**4. Start the App**
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone, or press `a` to open it in an Android Emulator.

---

## 👨‍💻 Developed By
**Shivansh** - Built as a comprehensive internship project demonstrating full-stack mobile capabilities.
