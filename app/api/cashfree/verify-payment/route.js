// app/api/cashfree/verify-payment/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // You'll need Firebase Admin
import { getMembershipPlan } from '@/constants/membershipPlans';

/**
 * FIXED: Verify Cashfree Payment & Update User Membership
 * POST /api/cashfree/verify-payment
 * Body: { orderId, orderToken, userId }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, orderToken, userId } = body;

    // Validate input
    if (!orderId || !orderToken) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId or orderToken' },
        { status: 400 }
      );
    }

    // Extract planId from orderId (format: order_userId_planId_timestamp)
    const orderParts = orderId.split('_');
    const planId = orderParts[2];
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = getMembershipPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid membership plan' },
        { status: 400 }
      );
    }

    // Call Cashfree verify payment API
    const verifyResponse = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('Cashfree verify API error:', verifyData);
      return NextResponse.json(
        { error: 'Payment verification failed', details: verifyData },
        { status: 502 }
      );
    }

    // Check if payment exists and is successful
    const payment = verifyData[0]; // Get the first payment
    
    if (!payment || payment.payment_status !== 'SUCCESS') {
      console.warn(`Payment not successful for order ${orderId}:`, payment?.payment_status);
      return NextResponse.json({
        success: false,
        orderId,
        status: payment?.payment_status || 'UNKNOWN',
        message: 'Payment not successful',
      });
    }

    // Payment is successful - Update user membership in Firebase
    if (userId) {
      try {
        const membershipData = {
          status: 'active',
          planId: planId,
          planName: plan.name,
          durationType: plan.durationType,
          startDate: new Date().toISOString(),
          expiryDate: calculateExpiryDate(plan.durationType),
          amount: plan.price,
          paymentId: payment.cf_payment_id,
          orderId: orderId,
          updatedAt: new Date().toISOString(),
        };

        // Update user's membership in Firestore
        await db.collection('users').doc(userId).update({
          membership: membershipData,
          updatedAt: new Date().toISOString(),
        });

        // Also create a separate membership record for tracking
        await db.collection('memberships').doc(`${userId}_${orderId}`).set({
          userId: userId,
          orderId: orderId,
          paymentId: payment.cf_payment_id,
          planId: planId,
          planName: plan.name,
          amount: plan.price,
          status: 'active',
          startDate: new Date().toISOString(),
          expiryDate: calculateExpiryDate(plan.durationType),
          paymentData: {
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            payment_time: payment.payment_time,
          },
          createdAt: new Date().toISOString(),
        });

        console.log(`Membership updated successfully for user ${userId}, order ${orderId}`);
        
        return NextResponse.json({
          success: true,
          orderId,
          paymentId: payment.cf_payment_id,
          amount: payment.payment_amount,
          status: payment.payment_status,
          message: 'Payment verified and membership activated successfully',
          membership: membershipData,
        });

      } catch (firestoreError) {
        console.error('Error updating membership in Firebase:', firestoreError);
        
        // Payment was successful but membership update failed
        // In production, you might want to queue this for retry
        return NextResponse.json({
          success: false,
          orderId,
          status: payment.payment_status,
          message: 'Payment successful but membership update failed. Please contact support.',
          error: 'MEMBERSHIP_UPDATE_FAILED',
        });
      }
    } else {
      // No userId provided, just return payment status
      console.log(`Payment successful for order ${orderId} but no userId provided`);
      return NextResponse.json({
        success: true,
        orderId,
        amount: payment.payment_amount,
        status: payment.payment_status,
        message: 'Payment verified successfully',
      });
    }

  } catch (error) {
    console.error('Verify payment internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate membership expiry date based on plan type
 */
function calculateExpiryDate(durationType) {
  const now = new Date();
  
  switch (durationType) {
    case 'annual':
      // Add 1 year
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    
    case 'lifetime':
      // Add 100 years (effectively lifetime)
      return new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()).toISOString();
    
    default:
      // Default to 1 year
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
  }
}