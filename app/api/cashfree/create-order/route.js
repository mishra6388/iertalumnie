// app/api/cashfree/create-order/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMembershipPlan } from '@/constants/membershipPlans';

/**
 * Create Cashfree Payment Order API
 * POST /api/cashfree/create-order
 * 
 * Body: {
 *   planId: string,
 *   userId: string,
 *   userEmail: string,
 *   userName: string,
 *   userPhone: string
 * }
 */
export async function POST(request) {
  try {
    const { planId, userId, userEmail, userName, userPhone } = await request.json();
    
    // Validate required fields
    if (!planId || !userId || !userEmail || !userName) {
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

    // Generate unique order ID
    const orderId = `order_${userId}_${planId}_${Date.now()}`;

    // Prepare Cashfree order data
    const orderData = {
      order_id: orderId,
      order_amount: plan.price,
      order_currency: 'INR',
      order_note: `${plan.name} - Alumni Membership`,
      customer_details: {
        customer_id: userId,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: userPhone || '9999999999', // Default if phone not provided
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?success=true&orderId=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
        payment_methods: 'cc,dc,nb,upi,app,paylater,cardless_emi,wallet',
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    // Make request to Cashfree API
    const cashfreeResponse = await fetch(`${process.env.CASHFREE_BASE_URL}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(orderData),
    });

    const cashfreeData = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error('Cashfree API Error:', cashfreeData);
      return NextResponse.json(
        { error: 'Failed to create payment order' },
        { status: 500 }
      );
    }

    // Store order in database (you can implement this later)
    // await storeOrder(orderId, userId, planId, plan.price, 'created');

    return NextResponse.json({
      success: true,
      orderId: orderId,
      paymentSessionId: cashfreeData.payment_session_id,
      orderToken: cashfreeData.order_token,
      amount: plan.price,
      planName: plan.name,
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}