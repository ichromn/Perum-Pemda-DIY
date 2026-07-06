import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCRaQnnOXe3_JaQSSXkt0j3ONNhOmrULkw",
  authDomain: "omega-axe-jn50x.firebaseapp.com",
  projectId: "omega-axe-jn50x",
  storageBucket: "omega-axe-jn50x.firebasestorage.app",
  messagingSenderId: "144357890472",
  appId: "1:144357890472:web:885f53bc59dd898212259d"
};

const databaseId = "ai-studio-paguyubanperumpe-2312c060-49c3-4cd1-9318-0793a49f49e8";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, databaseId);
export default db;
