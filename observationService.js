import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const saveObservation = async (userId, observationData) => {
  try {
    const docRef = await addDoc(collection(db, 'observations'), {
      ...observationData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving observation:', error);
    throw error;
  }
};

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

export const getObservationById = async (observationId) => {
  try {
    const docRef = doc(db, 'observations', observationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching observation:', error);
    throw error;
  }
};

