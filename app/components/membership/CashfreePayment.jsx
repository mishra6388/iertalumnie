// components/membership/CashfreePayment.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMembershipPlan } from '@/constants/membershipPlans';
import { 
  createPaymentOrder, 
  verifyPayment, 
  initializeCashfreeCheckout, 
  loadCashfreeSDK, 
  generateOrderId,
  formatCurrency 
} from '@/services/cashfreeService';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * CashfreePayment Component
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

  const plan = getMembershipPlan(planId);

  // Load Cashfree SDK on component mount
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await loadCashfreeSDK();
        setSdkLoaded(true);
      } catch (error) {
        console.error('Failed to load Cashfree SDK:', error);
        setError('Failed to load payment system. Please refresh and try again.');
      }
    };

    initializeSDK();
  }, []);

  const handlePayment = async () => {
    if (!currentUser || !plan || !sdkLoaded) return;

    setLoading(true);
    setError(null);

    try {
      // Create payment order
      const orderId = generateOrderId(currentUser.uid, planId);
      
      const orderData = {
        orderId,
        amount: plan.price,
        currency: 'INR',
        customerId: currentUser.uid,
        customerName: userProfile?.displayName || currentUser.displayName || 'User',
        customerEmail: currentUser.email,
        customerPhone: userProfile?.profile?.phone || '9999999999', // Default phone for demo
        planId,
        planName: plan.name,
        membershipType: plan.durationType,
      };

      console.log('Creating payment order:', orderData);
      const paymentOrder = await createPaymentOrder(orderData);

      // Initialize Cashfree checkout
      const paymentResult = await initializeCashfreeCheckout(paymentOrder, {
        onError: (error) => {
          console.error('Payment error:', error);
          setError('Payment failed. Please try again.');
          setLoading(false);
        },
        onCancel: () => {
          console.log('Payment cancelled by user');
          setLoading(false);
          if (onCancel) {
            onCancel();
          }
        },
        onSuccess: async (paymentDetails) => {
          console.log('Payment successful:', paymentDetails);
          
          try {
            // Verify payment on server
            const verificationResult = await verifyPayment({
              orderId,
              paymentId: paymentDetails.paymentMessage || paymentDetails.transactionId,
              ...paymentDetails
            });

            console.log('Payment verified:', verificationResult);
            
            if (onSuccess) {
              onSuccess({
                ...verificationResult,
                plan,
                paymentDetails
              });
            }
          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            setError('Payment completed but verification failed. Please contact support.');
          }
          
          setLoading(false);
        }
      });

    } catch (error) {
      console.error('Payment initialization error:', error);
      setError(error.message || 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600">Invalid membership plan selected.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Payment Summary" className="max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {!sdkLoaded && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6 text-sm">
          Loading payment system...
        </div>
      )}

      {/* Plan details */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Plan:</span>
          <span className="text-gray-700">{plan.name}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Duration:</span>
          <span className="text-gray-700">{plan.duration}</span>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount:</span>
            <span className="text-blue-600">{formatCurrency(plan.price)}</span>
          </div>
        </div>
      </div>

      {/* Customer details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Billing Details</h4>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Name:</span> {userProfile?.displayName || currentUser?.displayName || 'User'}</p>
          <p><span className="font-medium">Email:</span> {currentUser?.email}</p>
        </div>
      </div>

      {/* Payment button */}
      <div className="space-y-4">
        <Button
          onClick={handlePayment}
          loading={loading}
          disabled={!sdkLoaded}
          className="w-full"
          size="lg"
        >
          {loading 
            ? 'Processing Payment...' 
            : `Pay ${formatCurrency(plan.price)}`
          }
        </Button>

        <div className="text-center">
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel and go back
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        <p>🔒 Secure payment powered by Cashfree</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </Card>
  );
}