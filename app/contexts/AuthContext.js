'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your client Firebase config

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Fetch user profile from Firestore
        await fetchUserProfile(user.uid);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: userData.name
      });

      // Create user document in Firestore
      const userDocData = {
        uid: user.uid,
        email: email,
        name: userData.name || '',
        displayName: userData.name || '',
        phone: userData.phone || '',
        membershipStatus: 'pending',
        membershipPlan: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userDocData);
      setUserProfile(userDocData);

      return { success: true, user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  };

  // Get ID token for API authentication
  const getIdToken = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: new Date()
      });

      // Update Firebase Auth profile if name changed
      if (updates.name || updates.displayName) {
        await updateProfile(user, {
          displayName: updates.name || updates.displayName
        });
      }

      // Refresh profile data
      await fetchUserProfile(user.uid);

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user has active membership
  const hasActiveMembership = () => {
    return userProfile?.membershipStatus === 'active';
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    getIdToken,
    updateUserProfile,
    hasActiveMembership,
    // Derived properties for easy access
    isAuthenticated: !!user,
    membershipStatus: userProfile?.membershipStatus || 'pending',
    membershipPlan: userProfile?.membershipPlan || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}