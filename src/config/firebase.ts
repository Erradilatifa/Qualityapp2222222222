import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUtu4JI4DlJx0l1tZsi899YNyEOHk0R4A",
  authDomain: "quality-app-cc875.firebaseapp.com",
  projectId: "quality-app-cc875",
  storageBucket: "quality-app-cc875.appspot.com",
  messagingSenderId: "763450654093",
  appId: "1:763450654093:web:80388b7d79da7785bf91c4",
  measurementId: "G-NZPFQT24JZ"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app; 