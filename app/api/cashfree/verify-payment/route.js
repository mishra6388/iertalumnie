// app/api/cashfree/verify-payment/route.js
import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getMembershipPlan } from '@/constants/membershipPlans';

/**
 * Verify Cashfree Payment API
 * POST /api/cashfree/verify-payment
 * 
 * Body: {
 *   orderId: string,
 *   userId: string,
 *   planId: string
 * }
 */
export async function POST(request) {
  try {
    const { orderId, userId, planId } = await request.json();
    
    // Validate required fields
    if (!orderId || !userId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get membership plan details
    const plan = getMembershipPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Verify payment with Cashfree
    const verifyResponse = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}`, 
      {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
      }
    );

    const paymentData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('Cashfree verification error:', paymentData);
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 500 }
      );
    }

    // Check if payment was successful
    if (paymentData.order_status !== 'PAID') {
      return NextResponse.json({
        success: false,
        status: paymentData.order_status,
        message: 'Payment not completed'
      });
    }

    // Calculate membership expiry date
    let membershipExpiry = null;
    if (plan.durationType === 'annual') {
      membershipExpiry = new Date();
      membershipExpiry.setFullYear(membershipExpiry.getFullYear() + 1);
    }
    // Lifetime membership has no expiry (null)

    // Update user membership status in Firestore
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        membership: {
          status: plan.durationType, // 'annual' or 'lifetime'
          planId: planId,
          planName: plan.name,
          purchaseDate: serverTimestamp(),
          expiryDate: membershipExpiry,
          amount: plan.price,
          orderId: orderId,
          transactionId: paymentData.cf_payment_id || paymentData.payment_group_id,
        },
        updatedAt: serverTimestamp(),
      });

      // Store payment record (you can implement this later)
      // await storePaymentRecord(userId, orderId, paymentData, plan);

      return NextResponse.json({
        success: true,
        membership: {
          status: plan.durationType,
          planName: plan.name,
          expiryDate: membershipExpiry?.toISOString(),
        },
        transactionId: paymentData.cf_payment_id || paymentData.payment_group_id,
      });

    } catch (firestoreError) {
      console.error('Firestore update error:', firestoreError);
      return NextResponse.json(
        { error: 'Failed to update membership status' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET method to check payment status
 * GET /api/cashfree/verify-payment?orderId=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Check payment status with Cashfree
    const response = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}`, 
      {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: data.order_id,
      status: data.order_status,
      amount: data.order_amount,
      currency: data.order_currency,
      paymentMethod: data.payment_method,
      transactionId: data.cf_payment_id,
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}