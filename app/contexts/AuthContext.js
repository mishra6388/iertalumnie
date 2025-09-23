// app/contexts/AuthContext.jsx - YOUR CODE WITH MINIMAL REQUIRED FIXES
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 🔥 ADD THIS: Required for payment API authentication
  const getIdToken = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      throw error;
    }
  };

  const fetchUserProfile = async (user) => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          name: user.displayName || '', // 🔥 ADD THIS: Required by payment system
          photoURL: user.photoURL || '',
          membershipStatus: 'pending', // 🔥 CHANGE THIS: From 'none' to 'pending'
          membershipPlan: null, // 🔥 ADD THIS: Required for payment tracking
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        name: user.displayName || '', // 🔥 ADD THIS
        photoURL: user.photoURL || '',
        membershipStatus: 'pending', // 🔥 CHANGE THIS
        membershipPlan: null, // 🔥 ADD THIS
        createdAt: new Date(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    // Your original properties
    currentUser,
    userProfile,
    logout,
    loading,
    refreshUserProfile: () => fetchUserProfile(currentUser),
    
    // 🔥 ADD THESE: Required for payment system
    user: currentUser, // usePayment hook expects 'user' not 'currentUser'
    getIdToken, // CRITICAL: For API authentication
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}