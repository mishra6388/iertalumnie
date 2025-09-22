// app/signup/page.jsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect URL from query params or default to membership
  const redirectTo = searchParams.get('redirect') || '/membership';

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push(redirectTo);
    }
  }, [currentUser, router, redirectTo]);

  const handleSignupSuccess = (user) => {
    console.log('Signup successful, redirecting to:', redirectTo);
    router.push(redirectTo);
  };

  // Don't render if already logged in (prevents flash)
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <SignupForm 
          onSuccess={handleSignupSuccess}
          redirectTo={redirectTo}
        />
        
        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href={`/login${redirectTo !== '/membership' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        {/* Back to home */}
        <div className="text-center">
          <Link 
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}