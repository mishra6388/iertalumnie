// app/api/cashfree/create-order/route.js
import { NextResponse } from 'next/server';
import { getMembershipPlan } from '@/constants/membershipPlans';

/**
 * Production-ready Cashfree Create Order API
 * POST /api/cashfree/create-order
 * Body: { planId, userId, userEmail, userName, userPhone? }
 */
export async function POST(req) {
  try {
    // ----- ADD THIS BLOCK AT THE VERY START -----
    const body = await req.json();
    console.log('Received create-order request:', body); // logs request body in Vercel logs
    const { planId, userId, userEmail, userName } = body;
    if (!planId || !userId || !userEmail || !userName) {
      console.warn('Missing required fields:', { planId, userId, userEmail, userName });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    // ----- END OF LOGGING BLOCK -----

    // Now continue with your existing code:
    const { userPhone } = body;

    const plan = getMembershipPlan(planId);
    if (!plan) {
      console.warn('Invalid plan selected:', planId);
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const orderId = `order_${userId}_${planId}_${Date.now()}`;
    const orderPayload = {
      order_id: orderId,
      order_amount: plan.price,
      order_currency: 'INR',
      order_note: `${plan.name} - Alumni Membership`,
      customer_details: {
        customer_id: userId,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: userPhone || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?success=true&orderId=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/verify-payment`,
        payment_methods: 'cc,dc,nb,upi,app,paylater,cardless_emi,wallet',
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };

    // Call Cashfree API
    const cfResponse = await fetch(`${process.env.CASHFREE_BASE_URL}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfResponse.json();
    if (!cfResponse.ok) {
      console.error('Cashfree API Error:', cfData);
      return NextResponse.json(
        { error: 'Failed to create payment order', details: cfData },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cfData.payment_session_id,
      orderToken: cfData.order_token,
      amount: plan.price,
      planName: plan.name,
    });
  } catch (error) {
    console.error('Create order internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
