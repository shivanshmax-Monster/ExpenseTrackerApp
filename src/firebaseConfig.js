import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdvhdpjUkG_-FyxiWFQD0MeLua9NwO5QI",
  authDomain: "smartnotesapp-a58db.firebaseapp.com",
  projectId: "smartnotesapp-a58db",
  storageBucket: "smartnotesapp-a58db.firebasestorage.app",
  messagingSenderId: "405873538085",
  appId: "1:405873538085:web:f13061f9077ecf7c8c7bcc",
  measurementId: "G-8ZM35YQ4VQ"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
