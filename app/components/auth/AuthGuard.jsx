// components/auth/AuthGuard.jsx - CLEAN VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireMembership = false,
  fallbackUrl = '/login'
}) {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run once loading is complete and we haven't checked yet
    if (loading || hasChecked) return;

    // Mark that we've performed the check
    setHasChecked(true);

    // Check authentication requirement
    if (requireAuth && !currentUser) {
      const currentPath = window.location.pathname;
      router.push(`${fallbackUrl}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Check membership requirement
    if (requireMembership && currentUser) {
      const hasActiveMembership = userProfile?.membership?.status && 
        userProfile.membership.status !== 'none' &&
        (userProfile.membership.status === 'lifetime' || 
         (userProfile.membership.expiryDate && new Date(userProfile.membership.expiryDate) > new Date()));

      if (!hasActiveMembership) {
        router.push('/membership');
        return;
      }
    }

    // All checks passed
    setShowContent(true);
  }, [loading, hasChecked, currentUser, userProfile, requireAuth, requireMembership, fallbackUrl, router]);

  // Show loading while checking auth
  if (loading || !hasChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user doesn't meet requirements
  if (!showContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-6">
            {!currentUser 
              ? "You need to be logged in to access this page."
              : "You need an active membership to access this content."
            }
          </p>
          <div className="space-y-3">
            {!currentUser ? (
              <>
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/signup')}
                  className="w-full"
                >
                  Create Account
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push('/membership')}
                className="w-full"
              >
                Get Membership
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}