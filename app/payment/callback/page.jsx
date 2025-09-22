// app/payment/callback/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/**
 * Payment Callback Page
 * Handles Cashfree payment returns and verification
 */

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, failed, error
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderDetails, setOrderDetails] = useState(null);
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get parameters from URL
        const orderId = searchParams.get('orderId') || searchParams.get('order_id');
        const orderToken = searchParams.get('order_token');
        const paymentStatus = searchParams.get('payment_status');

        console.log('🔄 Payment callback received:', {
          orderId,
          orderToken,
          paymentStatus,
          allParams: Object.fromEntries(searchParams.entries())
        });

        if (!orderId) {
          setStatus('error');
          setMessage('Invalid payment response - Order ID missing');
          return;
        }

        // Quick status check from URL parameters
        if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
          setStatus('failed');
          setMessage(
            paymentStatus === 'CANCELLED' 
              ? 'Payment was cancelled' 
              : 'Payment failed'
          );
          return;
        }

        // Verify payment with backend
        const verifyResponse = await fetch('/api/cashfree/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            userId: currentUser?.uid,
            orderToken,
          }),
        });

        const verifyData = await verifyResponse.json();
        console.log('✅ Payment verification response:', verifyData);

        if (verifyData.success) {
          setStatus('success');
          setMessage(
            verifyData.alreadyProcessed 
              ? 'Payment already processed successfully!'
              : 'Payment successful! Your membership has been activated.'
          );
          setOrderDetails({
            orderId: verifyData.orderId,
            paymentId: verifyData.paymentId,
            plan: verifyData.plan
          });
          setMembership(verifyData.membership);

          // Auto-redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);

        } else {
          setStatus('failed');
          setMessage(verifyData.message || 'Payment verification failed');
          
          if (verifyData.status === 'PENDING') {
            setMessage('Payment is still processing. Please wait a few minutes and check your dashboard.');
            setTimeout(() => {
              verifyPayment(); // Retry verification
            }, 5000);
          }
        }

      } catch (error) {
        console.error('❌ Payment verification error:', error);
        setStatus('error');
        setMessage('Unable to verify payment. Please contact support if money was deducted.');
      }
    };

    if (currentUser) {
      verifyPayment();
    } else {
      setStatus('error');
      setMessage('Please login to verify payment');
    }
  }, [searchParams, currentUser, router]);

  // Render different states
  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600">{message}</p>
            <div className="mt-4 text-sm text-gray-500">
              Please don't close this page...
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful! 🎉
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>

            {orderDetails && (
              <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-green-800 mb-2">Order Details</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Order ID:</strong> {orderDetails.orderId}</p>
                  {orderDetails.paymentId && (
                    <p><strong>Payment ID:</strong> {orderDetails.paymentId}</p>
                  )}
                  {orderDetails.plan && (
                    <p><strong>Plan:</strong> {orderDetails.plan.name}</p>
                  )}
                </div>
              </div>
            )}

            {membership && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-blue-800 mb-2">Membership Details</h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>Plan:</strong> {membership.planName}</p>
                  <p><strong>Status:</strong> {membership.status}</p>
                  <p><strong>Valid Until:</strong> {new Date(membership.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              
              <div className="text-sm text-gray-500">
                Redirecting to dashboard in 3 seconds...
              </div>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-red-600 mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/membership')}
                className="w-full"
              >
                Try Again
              </Button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-yellow-600 mb-2">
              Verification Error
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                If money was deducted from your account, please contact our support team with your order details.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
              
              <button
                onClick={() => router.push('/contact')}
                className="w-full text-sm text-blue-600 hover:text-blue-800 py-2"
              >
                Contact Support
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}