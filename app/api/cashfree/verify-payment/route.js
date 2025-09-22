import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('Received verify-payment request:', body);

    const { orderId, orderToken, userId } = body;

    if (!orderId || !orderToken || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify order status with Cashfree
    const verifyResponse = await fetch(
      `https://api${process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' ? '' : '-sandbox'}.cashfree.com/pg/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      }
    );

    const data = await verifyResponse.json();
    console.log('Cashfree verify response:', data);

    if (data.order_status === 'PAID') {
      // TODO: Update user's membership in your database
      // Example: await updateMembership(userId, { planId, expiryDate, ... });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        membership: {
          status: 'active',
          planName: data.order_amount ? `₹${data.order_amount} plan` : 'Membership Plan',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry example
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Payment not completed yet',
      status: data.order_status,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
