// app/components/auth/SignupForm.jsx
'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import SocialAuthButtons from './SocialAuthButtons';

/**
 * SignupForm Component
 * Props:
 * - onSuccess: Function called after successful signup
 * - redirectTo: URL to redirect after signup (optional)
 */

export default function SignupForm({ onSuccess, redirectTo }) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: formData.displayName.trim()
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName.trim(),
        photoURL: user.photoURL || '',
        membershipStatus: 'none', // none, annual, lifetime
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Signup successful:', user);
      
      if (onSuccess) {
        onSuccess(user);
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Account creation failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please try logging in.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Account creation is currently disabled.';
          break;
        default:
          errorMessage = error.message || 'Account creation failed. Please try again.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = (result) => {
    console.log('Social signup successful:', result);
    if (onSuccess) {
      onSuccess(result.user);
    }
  };

  const handleSocialError = (errorMessage) => {
    setErrors({ general: errorMessage });
  };

  return (
    <Card title="Create Account" subtitle="Join the alumni community" className="w-full max-w-md">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {errors.general}
        </div>
      )}

      {/* Social Auth Buttons */}
      <div className="mb-6">
        <SocialAuthButtons 
          onSuccess={handleSocialSuccess}
          onError={handleSocialError}
          disabled={loading}
        />
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          name="displayName"
          value={formData.displayName}
          onChange={handleInputChange}
          placeholder="Enter your full name"
          error={errors.displayName}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email"
          error={errors.email}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Create a password (min. 6 characters)"
          error={errors.password}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your password"
          error={errors.confirmPassword}
          required
        />

        <div className="pt-2">
          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            Create Account
          </Button>
        </div>

        {/* Terms and Conditions */}
        <div className="text-center text-xs text-gray-600">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
        </div>
      </form>
    </Card>
  );
}