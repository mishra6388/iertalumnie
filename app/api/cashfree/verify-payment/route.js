// app/api/cashfree/verify-payment/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getMembershipPlan } from "@/constants/membershipPlans";

// 🔥 CRITICAL FIX: Use correct Cashfree Base URL
const CASHFREE_BASE_URL = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'production' 
  ? 'https://api.cashfree.com/pg' 
  : 'https://sandbox.cashfree.com/pg';

/**
 * Verify Cashfree Payment & Update User Membership
 * POST /api/cashfree/verify-payment
 * Body: { orderId, userId?, paymentId? }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, userId, paymentId } = body;

    console.log("🔍 Starting payment verification:", { orderId, userId, paymentId });

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: orderId" },
        { status: 400 }
      );
    }

    // 🔥 CRITICAL FIX: Get order details from Firebase first
    let orderDoc;
    let orderData;
    
    try {
      orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        console.error("❌ Order not found in database:", orderId);
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }
      
      orderData = orderDoc.data();
      console.log("✅ Found order in database:", {
        orderId,
        status: orderData.status,
        amount: orderData.amount,
        userId: orderData.userId
      });
      
    } catch (firebaseError) {
      console.error("❌ Firebase error getting order:", firebaseError);
      return NextResponse.json(
        { success: false, error: "Database error retrieving order" },
        { status: 500 }
      );
    }

    // Use userId from order data if not provided in request
    const finalUserId = userId || orderData.userId;
    const finalPaymentId = paymentId || orderData.paymentId;

    // 🔥 CRITICAL FIX: Check if payment is already verified
    if (orderData.status === "completed" || orderData.status === "success") {
      console.log("✅ Payment already verified:", orderId);
      
      // Return existing membership data
      const userDoc = await getDoc(doc(db, "users", finalUserId));
      const userData = userDoc.data();
      
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        orderId,
        membership: userData?.membership || null,
        alreadyProcessed: true
      });
    }

    // 🔥 CRITICAL FIX: Verify with Cashfree using correct endpoint and order ID from database
    const cashfreeOrderId = orderData.cashfreeOrderId || orderId;
    
    console.log("🔍 Verifying with Cashfree:", {
      url: `${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}/payments`,
      cashfreeOrderId
    });

    const res = await fetch(
      `${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}/payments`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.NEXT_PUBLIC_CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
          "Accept": "application/json",
        },
      }
    );

    const payments = await res.json();

    if (!res.ok) {
      console.error("❌ Cashfree Verify Error:", {
        status: res.status,
        statusText: res.statusText,
        response: payments,
        orderId: cashfreeOrderId
      });
      
      // Update order status to verification failed
      await updateDoc(doc(db, "orders", orderId), {
        status: "verification_failed",
        verificationError: payments,
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json(
        { 
          success: false, 
          error: "Payment verification failed", 
          details: payments,
          orderId 
        },
        { status: 502 }
      );
    }

    console.log("✅ Cashfree verification response:", payments);

    // Handle empty payments array
    if (!payments || payments.length === 0) {
      console.log("⏳ No payments found yet for order:", cashfreeOrderId);
      return NextResponse.json({
        success: false,
        orderId,
        status: "PENDING",
        message: "Payment not found or still processing"
      });
    }

    const payment = payments[0]; // Get the latest payment
    console.log("💳 Payment details:", {
      paymentId: payment.cf_payment_id,
      status: payment.payment_status,
      amount: payment.payment_amount
    });

    if (!payment || payment.payment_status !== "SUCCESS") {
      console.log("❌ Payment not successful:", {
        status: payment?.payment_status,
        paymentId: payment?.cf_payment_id
      });

      // Update order with failed status
      await updateDoc(doc(db, "orders", orderId), {
        status: "failed",
        paymentStatus: payment?.payment_status || "UNKNOWN",
        cashfreePaymentData: payment,
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: false,
        orderId,
        status: payment?.payment_status || "UNKNOWN",
        message: "Payment not successful",
        paymentId: payment?.cf_payment_id || null
      });
    }

    // 🔥 CRITICAL FIX: Validate payment amount matches order amount
    const paidAmount = parseFloat(payment.payment_amount);
    const orderAmount = parseFloat(orderData.amount);
    
    if (Math.abs(paidAmount - orderAmount) > 0.01) {
      console.error("❌ Payment amount mismatch:", {
        paid: paidAmount,
        expected: orderAmount,
        orderId
      });
      
      await updateDoc(doc(db, "orders", orderId), {
        status: "amount_mismatch",
        error: "Payment amount does not match order amount",
        paidAmount,
        expectedAmount: orderAmount,
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: false,
        error: "Payment amount mismatch",
        orderId
      }, { status: 400 });
    }

    // 🔥 Extract planId and get plan details
    const planId = orderData.planId;
    const plan = getMembershipPlan(planId);

    if (!plan) {
      console.error("❌ Invalid plan ID:", planId);
      return NextResponse.json({
        success: false,
        error: "Invalid membership plan",
        orderId
      }, { status: 400 });
    }

    console.log("📋 Processing membership for plan:", {
      planId,
      planName: plan.name,
      userId: finalUserId
    });

    // 🔥 CRITICAL FIX: Update membership data with proper error handling
    if (finalUserId && plan) {
      try {
        const membershipData = {
          status: "active",
          planId,
          planName: plan.name,
          durationType: plan.durationType,
          startDate: new Date().toISOString(),
          expiryDate: calculateExpiryDate(plan.durationType),
          amount: paidAmount,
          paymentId: payment.cf_payment_id,
          orderId,
          activatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Update user document
        const userRef = doc(db, "users", finalUserId);
        await updateDoc(userRef, {
          membership: membershipData,
          membershipStatus: "active",
          updatedAt: serverTimestamp(),
        });

        // Create membership record
        const membershipRef = doc(db, "memberships", `${finalUserId}_${Date.now()}`);
        await setDoc(membershipRef, {
          ...membershipData,
          userId: finalUserId,
          createdAt: serverTimestamp(),
        });

        // Update order status to completed
        await updateDoc(doc(db, "orders", orderId), {
          status: "completed",
          paymentStatus: "SUCCESS",
          paymentId: payment.cf_payment_id,
          cashfreePaymentData: payment,
          membershipActivated: true,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        console.log("✅ Membership activated successfully:", {
          userId: finalUserId,
          planId,
          orderId,
          paymentId: payment.cf_payment_id
        });

        return NextResponse.json({
          success: true,
          message: "Payment verified and membership activated successfully!",
          membership: membershipData,
          orderId,
          paymentId: payment.cf_payment_id,
          plan: {
            id: plan.id,
            name: plan.name,
            duration: plan.duration
          }
        });

      } catch (membershipError) {
        console.error("❌ Error activating membership:", membershipError);
        
        // Update order with membership error
        await updateDoc(doc(db, "orders", orderId), {
          status: "membership_error",
          membershipError: membershipError.message,
          paymentVerified: true,
          updatedAt: serverTimestamp(),
        });

        return NextResponse.json({
          success: false,
          error: "Payment verified but membership activation failed",
          orderId,
          paymentId: payment.cf_payment_id,
          details: membershipError.message
        }, { status: 500 });
      }
    }

    // Fallback response if no userId provided
    console.log("⚠️ No userId provided, payment verified but membership not activated");
    
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      orderId,
      payment: {
        paymentId: payment.cf_payment_id,
        status: payment.payment_status,
        amount: payment.payment_amount
      },
      warning: "Membership not activated - userId required"
    });

  } catch (err) {
    console.error("❌ Verify Payment Internal Error:", err);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error", 
        details: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate membership expiry date based on duration type
 * @param {string} durationType - "annual" or "lifetime"
 * @returns {string} ISO date string
 */
function calculateExpiryDate(durationType) {
  const now = new Date();
  
  switch (durationType) {
    case "annual":
    case "yearly":
    case "1year":
      return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      
    case "lifetime":
    case "permanent":
      // Set to 50 years from now for lifetime (more reasonable than 100 years)
      return new Date(now.setFullYear(now.getFullYear() + 50)).toISOString();
      
    default:
      console.warn("Unknown duration type:", durationType, "- defaulting to 1 year");
      return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
  }
}