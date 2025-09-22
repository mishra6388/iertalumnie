// services/cashfreeService.js

/**
 * Cashfree Payment Service
 * Handles payment order creation, verification, and processing
 */

// Create payment order
export const createPaymentOrder = async (orderData) => {
  try {
    const response = await fetch('/api/cashfree/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create payment order');
    }

    return result.data;
  } catch (error) {
    console.error('Create payment order error:', error);
    throw error;
  }
};

// Verify payment after completion
export const verifyPayment = async (paymentData) => {
  try {
    const response = await fetch('/api/cashfree/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Payment verification failed');
    }

    return result.data;
  } catch (error) {
    console.error('Verify payment error:', error);
    throw error;
  }
};

// Initialize Cashfree checkout
export const initializeCashfreeCheckout = (orderData, callbacks = {}) => {
  return new Promise((resolve, reject) => {
    // Check if Cashfree SDK is loaded
    if (typeof window.Cashfree === 'undefined') {
      reject(new Error('Cashfree SDK not loaded'));
      return;
    }

    const cashfree = window.Cashfree({
      mode: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'sandbox',
    });

    const checkoutOptions = {
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: '_modal', // or '_self' for redirect
    };

    cashfree.checkout(checkoutOptions).then((result) => {
      if (result.error) {
        console.error('Cashfree checkout error:', result.error);
        if (callbacks.onError) {
          callbacks.onError(result.error);
        }
        reject(result.error);
      } else if (result.paymentDetails) {
        console.log('Payment completed:', result.paymentDetails);
        if (callbacks.onSuccess) {
          callbacks.onSuccess(result.paymentDetails);
        }
        resolve(result.paymentDetails);
      } else {
        // Payment was cancelled or closed
        console.log('Payment cancelled or closed');
        if (callbacks.onCancel) {
          callbacks.onCancel();
        }
        reject(new Error('Payment cancelled'));
      }
    });
  });
};

// Load Cashfree SDK
export const loadCashfreeSDK = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window.Cashfree !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    
    script.onload = () => {
      if (typeof window.Cashfree !== 'undefined') {
        resolve();
      } else {
        reject(new Error('Failed to load Cashfree SDK'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Cashfree SDK'));
    };

    document.head.appendChild(script);
  });
};

// Generate order ID
export const generateOrderId = (userId, planId) => {
  const timestamp = Date.now();
  return `order_${userId.substring(0, 8)}_${planId}_${timestamp}`;
};

// Format currency for display
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};