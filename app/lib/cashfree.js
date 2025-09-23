// lib/cashfree.js
import { Cashfree, CFEnvironment } from "cashfree-pg";

// Initialize Cashfree with production config
const cashfree = new Cashfree(
  CFEnvironment.PRODUCTION, // Use PRODUCTION for live environment
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

// Membership plans configuration
export const MEMBERSHIP_PLANS = {
  YEARLY: {
    id: 'yearly',
    name: '1 Year Membership',
    amount: 500,
    currency: 'INR',
    duration: '1 year',
    description: 'Access to alumni network for 1 year'
  },
  LIFETIME: {
    id: 'lifetime', 
    name: 'Lifetime Membership',
    amount: 2000,
    currency: 'INR',
    duration: 'lifetime',
    description: 'Permanent access to alumni network'
  }
};

// Create order function
export async function createCashfreeOrder({ 
  userId, 
  planId, 
  userEmail, 
  userName, 
  userPhone 
}) {
  try {
    const plan = MEMBERSHIP_PLANS[planId.toUpperCase()];
    
    if (!plan) {
      throw new Error('Invalid membership plan');
    }

    // Generate unique order ID
    const orderId = `ORDER_${userId}_${Date.now()}`;
    
    const orderRequest = {
      order_id: orderId,
      order_amount: plan.amount.toString(),
      order_currency: plan.currency,
      customer_details: {
        customer_id: userId,
        customer_name: userName || 'Alumni Member',
        customer_email: userEmail,
        customer_phone: userPhone || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_DOMAIN}/payment/callback?order_id=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_DOMAIN}/api/cashfree/webhook`,
        payment_methods: 'cc,dc,nb,upi,paylater,emi,cardlessemi'
      },
      order_note: `${plan.name} - Alumni Website`,
      order_tags: {
        plan_id: planId,
        user_id: userId,
        plan_type: plan.duration
      }
    };

    const response = await cashfree.PGCreateOrder(orderRequest);
    
    return {
      success: true,
      data: {
        orderId: orderId,
        paymentSessionId: response.data.payment_session_id,
        orderAmount: plan.amount,
        planDetails: plan
      }
    };
    
  } catch (error) {
    console.error('Cashfree order creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment order'
    };
  }
}

// Verify payment function  
export async function verifyCashfreePayment(orderId) {
  try {
    const response = await cashfree.PGFetchOrder(orderId);
    
    return {
      success: true,
      data: {
        orderId: response.data.order_id,
        orderStatus: response.data.order_status,
        paymentStatus: response.data.payment_link_id ? 'COMPLETED' : 'PENDING',
        orderAmount: response.data.order_amount,
        orderCurrency: response.data.order_currency,
        customerDetails: response.data.customer_details,
        orderTags: response.data.order_tags,
        paymentTime: response.data.created_at
      }
    };
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment'
    };
  }
}

// Helper function to check if payment is successful
export function isPaymentSuccessful(orderStatus) {
  return orderStatus === 'PAID';
}

export default cashfree;