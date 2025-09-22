// app/api/cashfree/verify-payment/route.js
import { NextResponse } from 'next/server';

/**
 * Verify Cashfree Payment
 * POST /api/cashfree/verify-payment
 * Body: { orderId, orderToken }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, orderToken } = body;

    // Validate input
    if (!orderId || !orderToken) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId or orderToken' },
        { status: 400 }
      );
    }

    // Call Cashfree verify payment API
    const verifyResponse = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}/payments/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
        body: JSON.stringify({ order_token: orderToken }),
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

    // Check payment status
    if (verifyData.payment_status === 'SUCCESS') {
      // TODO: Update order in your database as 'paid'
      console.log(`Payment successful for order ${orderId}`);
      return NextResponse.json({
        success: true,
        orderId,
        amount: verifyData.order_amount,
        status: verifyData.payment_status,
        message: 'Payment verified successfully',
      });
    } else {
      console.warn(`Payment not successful for order ${orderId}`, verifyData);
      return NextResponse.json({
        success: false,
        orderId,
        status: verifyData.payment_status,
        message: 'Payment not successful',
        details: verifyData,
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
