// components/membership/CashfreePayment.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMembershipPlan } from '@/constants/membershipPlans';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * CashfreePayment Component - Production Ready
 * Props:
 * - planId: Selected membership plan ID
 * - onSuccess: Function called after successful payment
 * - onCancel: Function called when payment is cancelled
 */

export default function CashfreePayment({ planId, onSuccess, onCancel }) {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);

  const plan = getMembershipPlan(planId);

  // 🔥 Load Cashfree SDK dynamically
  useEffect(() => {
    const loadCashfreeSDK = () => {
      return new Promise((resolve, reject) => {
        // Check if SDK is already loaded
        if (window.Cashfree) {
          setSdkLoaded(true);
          resolve(window.Cashfree);
          return;
        }

        const script = document.createElement('script');
        script.src = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production'
          ? 'https://sdk.cashfree.com/js/v3/cashfree.js'
          : 'https://sdk.cashfree.com/js/v3/cashfree.js'; // Same URL for both

        script.onload = () => {
          if (window.Cashfree) {
            setSdkLoaded(true);
            resolve(window.Cashfree);
          } else {
            reject(new Error('Cashfree SDK not available'));
          }
        };

        script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
        document.head.appendChild(script);
      });
    };

    loadCashfreeSDK().catch(error => {
      console.error('Failed to load Cashfree SDK:', error);
      setError('Failed to load payment system. Please refresh and try again.');
    });
  }, []);

  // 🔥 Format currency properly
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // 🔥 Create order via your API
  const createOrder = async () => {
    try {
      const response = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: currentUser.uid,
          amount: plan.price,
          customerEmail: currentUser.email,
          customerPhone: userProfile?.phone || '9999999999',
          customerName: userProfile?.displayName || currentUser.displayName || 'Alumni Member',
          returnUrl: `${window.location.origin}/payment/callback`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.shouldRedirect === 'signup') {
          window.location.href = '/auth/signup';
          return null;
        }
        throw new Error(data.error || 'Failed to create order');
      }

      return data;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  };

  // 🔥 Initialize Cashfree payment
  const initializePayment = async (orderData) => {
    if (!window.Cashfree) {
      throw new Error('Cashfree SDK not loaded');
    }

    const cashfree = window.Cashfree({
      mode: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    });

    // Configure payment options
    const paymentOptions = {
      paymentSessionId: orderData.paymentSessionId,
      returnUrl: `${window.location.origin}/payment/callback?orderId=${orderData.orderId}`,
    };

    console.log('🚀 Initializing Cashfree payment:', {
      orderId: orderData.orderId,
      sessionId: orderData.paymentSessionId,
      amount: plan.price,
    });

    return new Promise((resolve, reject) => {
      cashfree.checkout(paymentOptions).then((result) => {
        console.log('✅ Payment completed:', result);
        resolve({
          ...result,
          orderId: orderData.orderId,
          planId,
          amount: plan.price,
        });
      }).catch((error) => {
        console.error('❌ Payment failed:', error);
        reject(error);
      });
    });
  };

  // 🔥 Handle payment process
  const handlePayment = async () => {
    if (!currentUser || !plan || !sdkLoaded) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting payment process for:', {
        planId,
        userId: currentUser.uid,
        amount: plan.price,
      });

      // Step 1: Create order
      const orderData = await createOrder();
      if (!orderData) return; // Handle redirect cases

      setCurrentOrder(orderData);
      console.log('✅ Order created:', orderData.orderId);

      // Step 2: Initialize payment
      const paymentResult = await initializePayment(orderData);
      console.log('✅ Payment result:', paymentResult);

      // Step 3: Handle success
      if (onSuccess) {
        onSuccess({
          orderId: orderData.orderId,
          paymentResult,
          plan,
          amount: plan.price,
        });
      }

    } catch (error) {
      console.error('❌ Payment process failed:', error);
      
      // User-friendly error messages
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('SDK')) {
        errorMessage = 'Payment system not ready. Please refresh the page.';
      } else if (error.message?.includes('order')) {
        errorMessage = 'Failed to create order. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Handle cancel
  const handleCancel = () => {
    if (loading) return; // Prevent cancel during processing
    
    if (onCancel) {
      onCancel();
    }
  };

  if (!plan) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600">Invalid membership plan selected.</p>
          <Button onClick={handleCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600">Please login to proceed with payment.</p>
          <Button onClick={() => window.location.href = '/auth/login'} className="mt-4">
            Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Complete Your Payment" className="max-w-md mx-auto">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Loading SDK */}
      {!sdkLoaded && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-3"></div>
            <span className="text-sm">Initializing payment system...</span>
          </div>
        </div>
      )}

      {/* Plan Details */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium text-gray-900">{plan.name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Duration:</span>
            <span className="text-gray-700">{plan.duration}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(plan.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Billing Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="text-gray-900">
              {userProfile?.displayName || currentUser.displayName || 'Alumni Member'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="text-gray-900">{currentUser.email}</span>
          </div>
        </div>
      </div>

      {/* Current Order Info */}
      {currentOrder && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="text-sm text-green-800">
            <strong>Order ID:</strong> {currentOrder.orderId}
          </div>
        </div>
      )}

      {/* Payment Buttons */}
      <div className="space-y-4">
        <Button
          onClick={handlePayment}
          loading={loading}
          disabled={!sdkLoaded || loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            `Pay ${formatCurrency(plan.price)} Securely`
          )}
        </Button>

        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
        >
          ← Back to Plans
        </button>
      </div>

      {/* Security Badge */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full">
          <span className="mr-1">🔒</span>
          Secured by Cashfree
        </div>
        <p className="text-xs text-gray-500 mt-2">
          256-bit SSL encrypted • PCI DSS compliant
        </p>
      </div>
    </Card>
  );
}