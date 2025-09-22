// app/login/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Get redirect URL from query params or default to membership
  const redirectTo = searchParams.get('redirect') || '/membership';

  // Only redirect if user is authenticated, not loading, and hasn't redirected yet
  useEffect(() => {
    if (!loading && currentUser && !hasRedirected) {
      console.log('User is authenticated, redirecting to:', redirectTo);
      setHasRedirected(true);
      router.push(redirectTo);
    }
  }, [currentUser, loading, redirectTo, router, hasRedirected]);

  const handleLoginSuccess = (user) => {
    console.log('Login successful, redirecting to:', redirectTo);
    setHasRedirected(true);
    router.push(redirectTo);
  };

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting message if user is authenticated
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
        <LoginForm 
          onSuccess={handleLoginSuccess}
          redirectTo={redirectTo}
        />
        
        {/* Sign up link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href={`/signup${redirectTo !== '/membership' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Sign up here
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