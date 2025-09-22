// app/components/auth/LoginForm.jsx
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import SocialAuthButtons from './SocialAuthButtons';

/**
 * LoginForm Component
 * Props:
 * - onSuccess: Function called after successful login
 * - redirectTo: URL to redirect after login (optional)
 */

export default function LoginForm({ onSuccess, redirectTo }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      console.log('Login successful:', userCredential.user);
      
      if (onSuccess) {
        onSuccess(userCredential.user);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Invalid password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        default:
          errorMessage = error.message || 'Login failed. Please try again.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = (result) => {
    console.log('Social login successful:', result);
    if (onSuccess) {
      onSuccess(result.user);
    }
  };

  const handleSocialError = (errorMessage) => {
    setErrors({ general: errorMessage });
  };

  return (
    <Card title="Welcome Back" subtitle="Sign in to your account" className="w-full max-w-md">
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
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="Enter your password"
          error={errors.password}
          required
        />

        <div className="pt-2">
          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            Sign In
          </Button>
        </div>

        {/* Forgot Password Link */}
        <div className="text-center">
          <a
            href="#"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Implement forgot password functionality
              alert('Forgot password functionality coming soon!');
            }}
          >
            Forgot your password?
          </a>
        </div>
      </form>
    </Card>
  );
}