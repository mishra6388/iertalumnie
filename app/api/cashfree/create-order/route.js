import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('Received create-order request:', body);

    const { planId, userId, userEmail, userName, userPhone } = body;

    if (!planId || !userId || !userEmail || !userName || !userPhone) {
      console.warn('Missing required fields:', { planId, userId, userEmail, userName, userPhone });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create order payload for Cashfree
    const orderPayload = {
      order_id: `ALUMNI_${Date.now()}`, // unique order id
      order_amount: body.amount || 500, // fallback amount
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_name: userName,
        customer_phone: userPhone,
      },
      order_currency: 'INR',
    };

    // Call Cashfree API (server-side)
    const cashfreeResponse = await fetch(
      `https://api${process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? '' : '-sandbox'}.cashfree.com/pg/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
        body: JSON.stringify(orderPayload),
      }
    );

    const data = await cashfreeResponse.json();
    console.log('Cashfree create order response:', data);

    if (!data.order_id || !data.order_token) {
      return NextResponse.json({ error: 'Failed to create Cashfree order', details: data }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: data.order_id,
      orderToken: data.order_token,
      checkoutUrl: `https://payments${
        process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? '' : '-sandbox'
      }.cashfree.com/pg/web/checkout?order_token=${data.order_token}`,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
