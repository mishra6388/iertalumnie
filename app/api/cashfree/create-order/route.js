// app/api/cashfree/create-order/route.js
import { NextResponse } from 'next/server';
import { createCashfreeOrder, MEMBERSHIP_PLANS } from '@/lib/cashfree';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // You'll need this for server-side Firebase

export async function POST(request) {
  try {
    // Get request body
    const body = await request.json();
    const { planId, userToken } = body;

    // Validate required fields
    if (!planId || !userToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate plan exists
    if (!MEMBERSHIP_PLANS[planId.toUpperCase()]) {
      return NextResponse.json(
        { success: false, error: 'Invalid membership plan' },
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
    const userEmail = decodedToken.email;

    // Get user details from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    
    // Check if user already has active membership
    if (userData.membershipStatus === 'active') {
      return NextResponse.json(
        { success: false, error: 'User already has active membership' },
        { status: 400 }
      );
    }

    // Create Cashfree order
    const orderResult = await createCashfreeOrder({
      userId: userId,
      planId: planId,
      userEmail: userEmail,
      userName: userData.displayName || userData.name,
      userPhone: userData.phone
    });

    if (!orderResult.success) {
      return NextResponse.json(
        { success: false, error: orderResult.error },
        { status: 500 }
      );
    }

    // Store order details in Firestore
    const orderData = {
      orderId: orderResult.data.orderId,
      userId: userId,
      userEmail: userEmail,
      planId: planId,
      planDetails: orderResult.data.planDetails,
      amount: orderResult.data.orderAmount,
      currency: 'INR',
      status: 'CREATED',
      paymentSessionId: orderResult.data.paymentSessionId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await adminDb.collection('orders').doc(orderResult.data.orderId).set(orderData);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        orderId: orderResult.data.orderId,
        paymentSessionId: orderResult.data.paymentSessionId,
        amount: orderResult.data.orderAmount,
        planDetails: orderResult.data.planDetails
      }
    });

  } catch (error) {
    console.error('Create order API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
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