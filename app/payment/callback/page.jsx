'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment } from '@/hooks/usePayment';

export default function PaymentCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { verifyPayment, loading } = usePayment();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const handlePaymentVerification = async () => {
      try {
        const orderId = searchParams.get('order_id');
        
        if (!orderId) {
          setStatus('failed');
          setMessage('Invalid payment reference. Please try again.');
          return;
        }

        if (!user) {
          setStatus('failed');
          setMessage('Please login to verify payment.');
          setTimeout(() => {
            router.push('/login?redirect=/payment/callback&order_id=' + orderId);
          }, 3000);
          return;
        }

        // Verify payment with backend
        const result = await verifyPayment(orderId);
        
        if (result.paymentSuccessful) {
          setStatus('success');
          setMessage('Payment successful! Your membership is now active.');
          setPaymentData(result);
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support if amount was deducted.');
          setPaymentData(result);
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(error.message || 'Failed to verify payment. Please try again.');
      }
    };

    // Only run verification when we have search params
    if (searchParams.get('order_id')) {
      handlePaymentVerification();
    }
  }, [searchParams, user, verifyPayment, router]);

  const handleRetryPayment = () => {
    router.push('/membership');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleContactSupport = () => {
    // You can implement your support contact method
    window.open('mailto:support@yourdomain.com?subject=Payment Issue&body=Order ID: ' + searchParams.get('order_id'));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        
        {/* Status Icon */}
        <div className="text-center mb-6">
          {status === 'verifying' && (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
          {status === 'verifying' && 'Verifying Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
        </h2>

        {/* Status Message */}
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>

        {/* Payment Details */}
        {paymentData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Payment Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-xs">{paymentData.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span>₹{paymentData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  paymentData.paymentSuccessful ? 'text-green-600' : 'text-red-600'
                }`}>
                  {paymentData.paymentStatus}
                </span>
              </div>
              {paymentData.paymentTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span>{new Date(paymentData.paymentTime).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'verifying' && loading && (
            <button disabled className="w-full bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed">
              Please wait...
            </button>
          )}
          
          {status === 'success' && (
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          )}
          
          {status === 'failed' && (
            <>
              <button
                onClick={handleRetryPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleContactSupport}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Contact Support
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Secure payment processing by Cashfree
          </p>
        </div>

      </div>
    </div>
  );
}