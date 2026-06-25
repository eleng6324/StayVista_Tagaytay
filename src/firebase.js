import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOpQcBmxBaooJfjCfMtdC7XZinW-uR36w",
  authDomain: "lodging-system-a7d6b.firebaseapp.com",
  projectId: "lodging-system-a7d6b",
  storageBucket: "lodging-system-a7d6b.appspot.com",
  messagingSenderId: "645322010175",
  appId: "1:645322010175:web:23f48fbe2614308f4e128a",
  measurementId: "G-8KW7708L2R"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Note: retry configuration helpers are not available in this SDK build,
// so we avoid calling them to keep the app compilable.