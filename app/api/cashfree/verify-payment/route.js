// app/api/cashfree/verify-payment/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getMembershipPlan } from "@/constants/membershipPlans";

/**
 * Verify Cashfree Payment
 * POST /api/cashfree/verify-payment
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId" },
        { status: 400 }
      );
    }

    // ✅ 1. Check order in Firestore
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data();

    // ✅ 2. Fetch status from Cashfree API
    const environment =
      process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "production"
        ? "production"
        : "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const cfResponse = await fetch(
      `${baseUrl}/orders/${orderData.orderId}`,
      {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch from Cashfree",
          details: cfData,
        },
        { status: 502 }
      );
    }

    const paymentStatus = cfData.order_status;

    // ✅ 3. Update order in Firestore
    await updateDoc(orderRef, {
      status: paymentStatus,
      updatedAt: new Date().toISOString(),
    });

    // ✅ 4. If success → update user’s membership
    if (paymentStatus === "PAID") {
      const plan = getMembershipPlan(orderData.planId);

      if (plan) {
        const userRef = doc(db, "users", orderData.userId);

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + plan.durationMonths);

        await updateDoc(userRef, {
          membership: {
            planId: orderData.planId,
            planName: plan.name,
            activatedAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
            orderId: orderData.orderId,
          },
        });
      }
    }

    // ✅ 5. Respond to frontend
    return NextResponse.json({
      success: true,
      orderId,
      status: paymentStatus,
      cfData,
    });
  } catch (error) {
    console.error("💥 Verify payment error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
