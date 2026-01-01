import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Save observation to Firestore
 */
export const saveObservation = async (userId, observationData) => {
  try {
    const docRef = await addDoc(collection(db, 'observations'), {
      userId,
      ...observationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving observation:', error);
    throw error;
  }
};

/**
 * Get all observations for a user
 */
export const getUserObservations = async (userId) => {
  try {
    const q = query(
      collection(db, 'observations'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching observations:', error);
    throw error;
  }
};

/**
 * Get a single observation by ID
 */
export const getObservation = async (observationId) => {
  try {
    const docRef = doc(db, 'observations', observationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching observation:', error);
    throw error;
  }
};



