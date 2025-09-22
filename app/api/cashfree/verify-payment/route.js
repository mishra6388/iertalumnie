import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { getMembershipPlan } from "@/constants/membershipPlans";

/**
 * Verify Cashfree Payment & Update User Membership
 * POST /api/cashfree/verify-payment
 * Body: { orderId, userId }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, userId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing required field: orderId" },
        { status: 400 }
      );
    }

    // Verify with Cashfree
    const res = await fetch(
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

    const payments = await res.json();

    if (!res.ok) {
      console.error("Cashfree Verify Error:", payments);
      return NextResponse.json(
        { error: "Payment verification failed", details: payments },
        { status: 502 }
      );
    }

    const payment = payments[0];

    if (!payment || payment.payment_status !== "SUCCESS") {
      return NextResponse.json({
        success: false,
        orderId,
        status: payment?.payment_status || "UNKNOWN",
        message: "Payment not successful",
      });
    }

    // Extract planId from orderId (e.g., order_userId_planId_timestamp)
    const orderParts = orderId.split("_");
    const planId = orderParts[2];
    const plan = getMembershipPlan(planId);

    if (userId && plan) {
      const membershipData = {
        status: "active",
        planId,
        planName: plan.name,
        durationType: plan.durationType,
        startDate: new Date().toISOString(),
        expiryDate: calculateExpiryDate(plan.durationType),
        amount: plan.price,
        paymentId: payment.cf_payment_id,
        orderId,
        updatedAt: new Date().toISOString(),
      };

      await db.collection("users").doc(userId).update({
        membership: membershipData,
        updatedAt: new Date().toISOString(),
      });

      await db.collection("memberships").doc(`${userId}_${orderId}`).set({
        ...membershipData,
        userId,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Payment verified & membership activated",
        membership: membershipData,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });
  } catch (err) {
    console.error("Verify Payment Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}

function calculateExpiryDate(durationType) {
  const now = new Date();
  switch (durationType) {
    case "annual":
      return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
    case "lifetime":
      return new Date(now.setFullYear(now.getFullYear() + 100)).toISOString();
    default:
      return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
  }
}
