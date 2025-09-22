// app/api/cashfree/create-order/route.js
import { NextResponse } from 'next/server';
import { getMembershipPlan } from '@/constants/membershipPlans';

/**
 * PRODUCTION: Cashfree Create Order API
 * POST /api/cashfree/create-order
 * Body: { planId, userId, userEmail, userName, userPhone? }
 */
export async function POST(req) {
  try {
    // Parse and validate request body
    const body = await req.json();
    console.log('Create Order Request - Fields received:', Object.keys(body));

    const { planId, userId, userEmail, userName, userPhone } = body;

    // Validate required fields
    const missingFields = [];
    if (!planId) missingFields.push('planId');
    if (!userId) missingFields.push('userId');  
    if (!userEmail) missingFields.push('userEmail');
    if (!userName) missingFields.push('userName');

    if (missingFields.length > 0) {
      console.warn('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missing: missingFields,
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }

    // Validate plan exists
    const plan = getMembershipPlan(planId);
    if (!plan) {
      console.warn('Invalid plan ID:', planId);
      return NextResponse.json(
        { error: 'Invalid membership plan selected' },
        { status: 400 }
      );
    }

    // Check environment variables
    const requiredEnvVars = {
      CASHFREE_BASE_URL: process.env.CASHFREE_BASE_URL,
      CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
      CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate unique order ID
    const orderId = `order_${userId}_${planId}_${Date.now()}`;
    
    // Prepare Cashfree order payload
    const orderPayload = {
      order_id: orderId,
      order_amount: plan.price,
      order_currency: 'INR',
      order_note: `${plan.name} - Alumni Membership`,
      customer_details: {
        customer_id: userId,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: userPhone || '9999999999', // Required by Cashfree
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?success=true&orderId=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
        payment_methods: 'cc,dc,nb,upi,app,paylater,cardless_emi,wallet',
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    console.log('Creating Cashfree order:', {
      orderId,
      amount: plan.price,
      customerEmail: userEmail.replace(/(.{3}).*(@.*)/, '$1***$2') // Masked email
    });

    // Call Cashfree Create Order API
    const cashfreeResponse = await fetch(`${process.env.CASHFREE_BASE_URL}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(orderPayload),
    });

    const cashfreeData = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error('Cashfree API Error:', {
        status: cashfreeResponse.status,
        statusText: cashfreeResponse.statusText,
        error: cashfreeData
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to create payment order',
          message: cashfreeData.message || 'Payment gateway error',
          details: process.env.NODE_ENV === 'development' ? cashfreeData : undefined
        },
        { status: 502 }
      );
    }

    console.log('Cashfree order created successfully:', {
      orderId,
      paymentSessionId: cashfreeData.payment_session_id ? 'present' : 'missing',
      orderToken: cashfreeData.order_token ? 'present' : 'missing'
    });

    // Return success response
    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeData.payment_session_id,
      orderToken: cashfreeData.order_token,
      amount: plan.price,
      planName: plan.name,
      // Add checkout URL for hosted flow
      checkoutUrl: `https://payments${
        process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? '' : '-test'
      }.cashfree.com/pg/web/checkout?order_token=${cashfreeData.order_token}`,
    });

  } catch (error) {
    console.error('Create order internal error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the payment order',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Handle method not allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}