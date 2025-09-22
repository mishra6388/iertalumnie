'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMembershipPlan } from '@/constants/membershipPlans';

export default function CashfreePayment({ planId, onSuccess, onError }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false);
  
  const plan = getMembershipPlan(planId);

  // Load Cashfree SDK
  useEffect(() => {
    const loadCashfreeSDK = () => {
      if (window.Cashfree) {
        setCashfreeLoaded(true);
        return;
      }

      const script = document.createElement('script');
      const environment = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'sandbox';
      
      script.src = environment === 'production' 
        ? 'https://sdk.cashfree.com/js/v3/cashfree.js'
        : 'https://sdk.cashfree.com/js/v3/cashfree.sandbox.js';
        
      script.onload = () => setCashfreeLoaded(true);
      script.onerror = () => setError('Failed to load payment gateway');
      
      document.head.appendChild(script);
    };

    loadCashfreeSDK();
  }, []);

  const handlePayment = async () => {
    if (!user) {
      setError('Please login to continue');
      return;
    }

    if (!plan) {
      setError('Invalid membership plan selected');
      return;
    }

    if (!cashfreeLoaded) {
      setError('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting payment for:', {
        planId,
        userId: user.uid,
        amount: plan.price,
        userEmail: user.email,
        userName: user.displayName
      });

      // 1. Create order with proper data structure
      const orderResponse = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId,
          userId: user.uid,
          amount: plan.price,
          customerEmail: user.email || 'test@example.com',
          customerPhone: user.phoneNumber || '9999999999',
          customerName: user.displayName || 'Alumni Member',
          returnUrl: `${window.location.origin}/payment/callback`
        }),
      });

      const orderData = await orderResponse.json();
      console.log('📦 Order creation response:', orderData);

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // 2. Initialize Cashfree payment
      const cashfree = window.Cashfree({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'sandbox'
      });

      const checkoutOptions = {
        paymentSessionId: orderData.order.payment_session_id,
        returnUrl: `${window.location.origin}/payment/callback?orderId=${orderData.orderId}`,
      };

      console.log('💳 Opening Cashfree checkout with options:', checkoutOptions);

      // 3. Open payment dialog
      const result = await cashfree.checkout(checkoutOptions);
      console.log('✅ Payment completed:', result);

      if (result.error) {
        throw new Error(result.error.message || 'Payment failed');
      }

      // 4. Handle successful payment
      if (result.redirect) {
        // User will be redirected to callback page
        console.log('🔄 Redirecting to callback page...');
      } else if (result.paymentDetails) {
        // Payment completed in modal
        await handlePaymentSuccess(orderData.orderId);
      }

    } catch (err) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (orderId) => {
    try {
      // Verify payment on server
      const verifyResponse = await fetch('/api/cashfree/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          userId: user.uid,
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log('✅ Payment verification:', verifyData);

      if (verifyData.success) {
        onSuccess?.(verifyData);
      } else {
        throw new Error(verifyData.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('❌ Verification error:', err);
      setError('Payment verification failed');
      onError?.(err);
    }
  };

  if (!plan) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Invalid plan selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Plan Details */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {plan.name}
        </h3>
        <div className="text-3xl font-bold text-blue-600 mb-2">
          ₹{plan.price.toLocaleString()}
          <span className="text-sm text-gray-500 ml-2">
            / {plan.durationType === 'annual' ? '1 year' : 'lifetime'}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-gray-700">What's included:</h4>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={loading || !cashfreeLoaded || !user}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
          loading || !cashfreeLoaded || !user
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
            Processing...
          </div>
        ) : !cashfreeLoaded ? (
          'Loading Payment Gateway...'
        ) : !user ? (
          'Please Login First'
        ) : (
          `Pay ₹${plan.price.toLocaleString()} Now`
        )}
      </button>

      {/* Trust Indicators */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-9a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          SSL Secured
        </div>
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          PCI Compliant
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug:</strong> Plan: {planId}, User: {user?.uid}, Amount: {plan.price}
        </div>
      )}
    </div>
  );
}