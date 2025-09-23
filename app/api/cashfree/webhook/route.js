// app/api/cashfree/webhook/route.js
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { db } from '@/lib/firebase-admin';

// Verify webhook signature for security
function verifyWebhookSignature(rawBody, signature, secret) {
  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return signature === expectedSignature;
}

export async function POST(request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    
    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY
    );

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const webhookData = JSON.parse(rawBody);
    const { type, data } = webhookData;

    console.log('Webhook received:', { type, orderId: data?.order?.order_id });

    // Handle different webhook events
    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(data);
        break;
        
      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailure(data);
        break;
        
      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        await handlePaymentDropped(data);
        break;
        
      default:
        console.log('Unhandled webhook type:', type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(data) {
  try {
    const { order, payment } = data;
    const orderId = order.order_id;

    // Get order from database
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.error('Order not found for webhook:', orderId);
      return;
    }

    const orderData = orderDoc.data();
    
    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'PAID',
      paymentStatus: 'COMPLETED',
      webhookData: data,
      paymentMethod: payment.payment_method,
      paymentTime: new Date(payment.payment_time),
      updatedAt: new Date()
    });

    // Update user membership
    const membershipData = {
      membershipStatus: 'active',
      membershipPlan: orderData.planId,
      membershipStartDate: new Date(),
      membershipEndDate: orderData.planId === 'lifetime' 
        ? null 
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(),
      lastPaymentAmount: orderData.amount,
      updatedAt: new Date()
    };

    await db.collection('users').doc(orderData.userId).update(membershipData);

    // Create membership record
    const membershipRecord = {
      userId: orderData.userId,
      orderId: orderId,
      planId: orderData.planId,
      planName: orderData.planDetails.name,
      amount: orderData.amount,
      currency: orderData.currency,
      startDate: new Date(),
      endDate: membershipData.membershipEndDate,
      status: 'active',
      paymentMethod: payment.payment_method,
      paymentReference: payment.cf_payment_id,
      webhookProcessed: true,
      createdAt: new Date()
    };

    await db.collection('memberships').add(membershipRecord);

    console.log('Payment success processed for order:', orderId);

  } catch (error) {
    console.error('Payment success webhook error:', error);
  }
}

async function handlePaymentFailure(data) {
  try {
    const { order, payment } = data;
    const orderId = order.order_id;

    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'FAILED',
      paymentStatus: 'FAILED',
      webhookData: data,
      failureReason: payment.payment_message || 'Payment failed',
      updatedAt: new Date()
    });

    console.log('Payment failure processed for order:', orderId);

  } catch (error) {
    console.error('Payment failure webhook error:', error);
  }
}

async function handlePaymentDropped(data) {
  try {
    const { order } = data;
    const orderId = order.order_id;

    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'USER_DROPPED',
      paymentStatus: 'CANCELLED',
      webhookData: data,
      updatedAt: new Date()
    });

    console.log('Payment dropped processed for order:', orderId);

  } catch (error) {
    console.error('Payment dropped webhook error:', error);
  }
}