// app/membership/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MembershipPlans from '@/components/membership/MembershipPlans';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/**
 * Membership Page - FIXED VERSION
 * - Shows membership plans for non-members
 * - Shows current membership status for members
 * - Handles payment success/failure redirects
 * - Fixed payment flow integration
 */
export default function MembershipPage() {
  const { currentUser, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for payment success/failure in URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const orderId = searchParams.get('orderId');
    const error = searchParams.get('error');

    if (success === 'true' && orderId) {
      handlePaymentSuccess(orderId);
    } else if (error) {
      setPaymentStatus({ type: 'error', message: 'Payment failed. Please try again.' });
    }
  }, [searchParams]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      console.log('No user found, redirecting to login from membership page');
      router.push('/login?redirect=/membership');
    }
  }, [currentUser, loading, router]);

  const handlePaymentSuccess = async (orderId) => {
    setIsProcessing(true);
    try {
      // Get order token from session storage (set during payment initiation)
      const orderToken = sessionStorage.getItem(`orderToken_${orderId}`);
      
      if (!orderToken) {
        throw new Error('Order token not found. Please try again.');
      }

      // Verify payment
      const response = await fetch('/api/cashfree/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          orderToken: orderToken,
          userId: currentUser.uid, // Add userId for membership update
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus({
          type: 'success',
          message: `Congratulations! Your membership payment has been confirmed.`,
          membership: data.membership,
        });
        
        // Refresh user data to get updated membership
        await refreshUserProfile();
        
        // Clean up session storage
        sessionStorage.removeItem(`orderToken_${orderId}`);
        
        // Clear URL params after delay
        setTimeout(() => {
          router.replace('/membership', { scroll: false });
        }, 3000);
      } else {
        setPaymentStatus({
          type: 'error',
          message: data.message || 'Payment verification failed.',
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setPaymentStatus({
        type: 'error',
        message: error.message || 'Failed to verify payment. Please contact support.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleTryAgain = () => {
    setPaymentStatus(null);
    router.replace('/membership', { scroll: false });
  };

  // FIXED: Handle plan selection and initiate payment
 // In your membership page, replace handlePlanSelection with this:
const handlePlanSelection = async (planId) => {
  console.log('Plan selection started:', { planId });
  console.log('Current user:', { uid: currentUser?.uid, email: currentUser?.email });
  console.log('User profile:', { displayName: userProfile?.displayName });

  if (!currentUser) {
    setPaymentStatus({
      type: 'error',
      message: 'Please log in to continue.',
    });
    return;
  }

  if (!userProfile) {
    setPaymentStatus({
      type: 'error',
      message: 'Loading user profile. Please wait and try again.',
    });
    return;
  }

  setIsProcessing(true);
  
  try {
    const requestData = {
      planId: planId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: userProfile.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      userPhone: userProfile.profile?.phone || '9999999999', // Always provide a phone number
    };

    console.log('Sending request data:', requestData);

    const response = await fetch('/api/cashfree/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      sessionStorage.setItem(`orderToken_${data.orderId}`, data.orderToken);
      
      const paymentUrl = data.checkoutUrl || `https://payments${
        process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? '' : '-test'
      }.cashfree.com/pg/web/checkout?order_token=${data.orderToken}`;
      
      console.log('Redirecting to:', paymentUrl);
      window.location.href = paymentUrl;
    } else {
      console.error('Create order failed:', data);
      setPaymentStatus({
        type: 'error',
        message: data.error || data.message || 'Failed to create payment order.',
      });
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    setPaymentStatus({
      type: 'error',
      message: 'Network error. Please check your connection and try again.',
    });
  } finally {
    setIsProcessing(false);
  }
};

  if (loading || isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isProcessing ? 'Processing your request...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Alumni Membership
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our alumni community and unlock exclusive benefits, networking opportunities, 
            and lifelong connections.
          </p>
        </div>

        {/* Payment Status Messages */}
        {paymentStatus && (
          <div className="mb-8">
            <Card className={`max-w-2xl mx-auto ${
              paymentStatus.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  paymentStatus.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {paymentStatus.type === 'success' ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  paymentStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {paymentStatus.type === 'success' ? 'Payment Successful!' : 'Payment Failed'}
                </h3>
                <p className={`mb-6 ${
                  paymentStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {paymentStatus.message}
                </p>
                <div className="space-x-4">
                  {paymentStatus.type === 'success' ? (
                    <Button onClick={handleGoToDashboard}>
                      Go to Dashboard
                    </Button>
                  ) : (
                    <Button onClick={handleTryAgain}>
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Current Membership Status */}
        {userProfile?.membership?.status && userProfile.membership.status !== 'none' && !paymentStatus && (
          <div className="mb-8">
            <Card className="max-w-2xl mx-auto bg-blue-50 border-blue-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-blue-800 mb-2">
                  Active Membership
                </h3>
                <p className="text-blue-700 mb-2">
                  You have an active <strong>{userProfile.membership.planName}</strong>
                </p>
                {userProfile.membership.expiryDate && (
                  <p className="text-sm text-blue-600 mb-4">
                    Expires: {new Date(userProfile.membership.expiryDate).toLocaleDateString()}
                  </p>
                )}
                <Button onClick={handleGoToDashboard}>
                  Access Dashboard
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Membership Plans (show if no active membership or payment failed) */}
        {(!userProfile?.membership?.status || userProfile.membership.status === 'none' || paymentStatus?.type === 'error') && (
          <MembershipPlans onPlanSelect={handlePlanSelection} />
        )}

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@alumni.com" className="text-blue-600 hover:underline">
              support@alumni.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}