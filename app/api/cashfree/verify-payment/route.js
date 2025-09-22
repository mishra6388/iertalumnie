// app/api/cashfree/verify-payment/route.js
import { NextResponse } from "next/server";
import admin from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMembershipPlan } from "@/constants/membershipPlans";

/**
 * Initialize Firebase Admin safely with Base64 service account
 */
let db;
if (!admin.getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = getFirestore();
} else {
  db = getFirestore(admin.getApps()[0]);
}

/**
 * POST /api/cashfree/verify-payment
 * Body: { orderId, orderToken, userId }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, orderToken, userId } = body;

    if (!orderId || !orderToken) {
      return NextResponse.json(
        { error: "Missing required fields: orderId or orderToken" },
        { status: 400 }
      );
    }

    const orderParts = orderId.split("_");
    const planId = orderParts[2];

    if (!planId) {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    const plan = getMembershipPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid membership plan" },
        { status: 400 }
      );
    }

    // Call Cashfree verify API
    const verifyResponse = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error("Cashfree verify API error:", verifyData);
      return NextResponse.json(
        { error: "Payment verification failed", details: verifyData },
        { status: 502 }
      );
    }

    const payment = verifyData[0]; // take the first payment

    if (!payment || payment.payment_status !== "SUCCESS") {
      return NextResponse.json({
        success: false,
        orderId,
        status: payment?.payment_status || "UNKNOWN",
        message: "Payment not successful",
      });
    }

    // Payment successful — update Firestore
    if (userId) {
      try {
        const now = new Date();
        const membershipData = {
          status: "active",
          planId,
          planName: plan.name,
          durationType: plan.durationType,
          startDate: now.toISOString(),
          expiryDate: calculateExpiryDate(plan.durationType, now),
          amount: plan.price,
          paymentId: payment.cf_payment_id,
          orderId,
          updatedAt: now.toISOString(),
        };

        // Update user
        await db.collection("users").doc(userId).update({
          membership: membershipData,
          updatedAt: now.toISOString(),
        });

        // Add membership record
        await db.collection("memberships").doc(`${userId}_${orderId}`).set({
          userId,
          orderId,
          paymentId: payment.cf_payment_id,
          planId,
          planName: plan.name,
          amount: plan.price,
          status: "active",
          startDate: now.toISOString(),
          expiryDate: calculateExpiryDate(plan.durationType, now),
          paymentData: {
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            payment_time: payment.payment_time,
          },
          createdAt: now.toISOString(),
        });

        return NextResponse.json({
          success: true,
          orderId,
          paymentId: payment.cf_payment_id,
          amount: payment.payment_amount,
          status: payment.payment_status,
          message: "Payment verified and membership activated successfully",
          membership: membershipData,
        });
      } catch (firestoreError) {
        console.error("Firestore update error:", firestoreError);
        return NextResponse.json({
          success: false,
          orderId,
          status: payment.payment_status,
          message:
            "Payment successful but membership update failed. Contact support.",
          error: "MEMBERSHIP_UPDATE_FAILED",
        });
      }
    }

    // No userId provided, return payment info
    return NextResponse.json({
      success: true,
      orderId,
      amount: payment.payment_amount,
      status: payment.payment_status,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate membership expiry date
 */
function calculateExpiryDate(durationType, fromDate = new Date()) {
  const now = new Date(fromDate);

  switch (durationType) {
    case "annual":
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    case "lifetime":
      return new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()).toISOString();
    default:
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
  }
}
