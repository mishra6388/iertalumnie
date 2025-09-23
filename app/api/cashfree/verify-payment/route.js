// app/api/cashfree/verify-payment/route.js
import { NextResponse } from 'next/server';
import { verifyCashfreePayment, isPaymentSuccessful } from '@/lib/cashfree';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, userToken } = body;

    // Validate required fields
    if (!orderId || !userToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(userToken);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Get order from Firestore
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    // Verify order belongs to user
    if (orderData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to order' },
        { status: 403 }
      );
    }

    // Verify payment with Cashfree
    const verificationResult = await verifyCashfreePayment(orderId);

    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: verificationResult.error },
        { status: 500 }
      );
    }

    const paymentData = verificationResult.data;
    const paymentSuccessful = isPaymentSuccessful(paymentData.orderStatus);

    // Update order status in Firestore
    const updateData = {
      status: paymentData.orderStatus,
      paymentStatus: paymentData.paymentStatus,
      paymentTime: paymentData.paymentTime,
      updatedAt: new Date(),
      verificationData: paymentData
    };

    await adminDb.collection('orders').doc(orderId).update(updateData);

    // If payment successful, update user membership
    if (paymentSuccessful) {
      const membershipData = {
        membershipStatus: 'active',
        membershipPlan: orderData.planId,
        membershipStartDate: new Date(),
        membershipEndDate: orderData.planId === 'lifetime' 
          ? null 
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        lastPaymentDate: new Date(),
        lastPaymentAmount: orderData.amount,
        updatedAt: new Date()
      };

      // Update user document
      await adminDb.collection('users').doc(userId).update(membershipData);

      // Create membership record
      const membershipRecord = {
        userId: userId,
        orderId: orderId,
        planId: orderData.planId,
        planName: orderData.planDetails.name,
        amount: orderData.amount,
        currency: orderData.currency,
        startDate: new Date(),
        endDate: membershipData.membershipEndDate,
        status: 'active',
        paymentMethod: 'cashfree',
        createdAt: new Date()
      };

      await adminDb.collection('memberships').add(membershipRecord);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderId,
        paymentStatus: paymentData.orderStatus,
        paymentSuccessful: paymentSuccessful,
        amount: paymentData.orderAmount,
        currency: paymentData.orderCurrency,
        paymentTime: paymentData.paymentTime
      }
    });

  } catch (error) {
    console.error('Verify payment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}