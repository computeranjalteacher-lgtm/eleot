import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Input validation function for authentication data
 * @param {Object} data - Data to validate
 * @param {string} data.email - Email address (optional)
 * @param {string} data.password - Password (optional)
 * @param {string} data.displayName - Display name (optional)
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export const validateAuthInput = (data) => {
  const errors = [];
  
  // Email validation
  if (data.email !== undefined) {
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (data.email.trim().length === 0) {
      errors.push('Email cannot be empty');
    } else {
      // Email format validation (RFC 5322 simplified)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push('Invalid email format');
      }
    }
  }
  
  // Password validation
  if (data.password !== undefined) {
    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required and must be a string');
    } else if (data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    } else if (data.password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
  }
  
  // Display name validation
  if (data.displayName !== undefined) {
    if (data.displayName && typeof data.displayName !== 'string') {
      errors.push('Display name must be a string');
    } else if (data.displayName && data.displayName.trim().length < 2) {
      errors.push('Display name must be at least 2 characters long');
    } else if (data.displayName && data.displayName.trim().length > 50) {
      errors.push('Display name must not exceed 50 characters');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
};

