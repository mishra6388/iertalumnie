// app/services/socialAuthService.js
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, facebookProvider, db } from '@/lib/firebase';

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user document exists, create if not
    await createOrUpdateUserProfile(user);
    
    return { user, isNewUser: result._tokenResponse?.isNewUser || false };
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Handle specific errors
    let errorMessage = 'Google sign-in failed. Please try again.';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in cancelled. Please try again.';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup blocked. Please allow popups and try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign-in cancelled. Please try again.';
        break;
      case 'auth/account-exists-with-different-credential':
        errorMessage = 'An account already exists with this email using a different sign-in method.';
        break;
      default:
        errorMessage = error.message || 'Google sign-in failed. Please try again.';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Sign in with Facebook
 */
export const signInWithFacebook = async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;
    
    // Check if user document exists, create if not
    await createOrUpdateUserProfile(user);
    
    return { user, isNewUser: result._tokenResponse?.isNewUser || false };
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    
    // Handle specific errors
    let errorMessage = 'Facebook sign-in failed. Please try again.';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in cancelled. Please try again.';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup blocked. Please allow popups and try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign-in cancelled. Please try again.';
        break;
      case 'auth/account-exists-with-different-credential':
        errorMessage = 'An account already exists with this email using a different sign-in method.';
        break;
      default:
        errorMessage = error.message || 'Facebook sign-in failed. Please try again.';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Create or update user profile in Firestore
 */
const createOrUpdateUserProfile = async (user) => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        membershipStatus: 'none', // none, annual, lifetime
        createdAt: new Date(),
        updatedAt: new Date(),
        signInMethod: user.providerData[0]?.providerId || 'unknown',
      });
      console.log('New user profile created');
    } else {
      // Update existing user document
      await setDoc(userDocRef, {
        displayName: user.displayName || userDoc.data().displayName || '',
        photoURL: user.photoURL || userDoc.data().photoURL || '',
        updatedAt: new Date(),
        lastSignIn: new Date(),
      }, { merge: true });
      console.log('User profile updated');
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
};