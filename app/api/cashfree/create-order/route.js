// app/api/cashfree/create-order/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

/**
 * POST /api/cashfree/create-order
 * Body: { userId, planId }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, planId } = body;

    if (!userId || !planId) {
      return NextResponse.json(
        { error: "Missing required fields: userId or planId" },
        { status: 400 }
      );
    }

    // Generate a unique order ID (format: order_userId_planId_timestamp)
    const timestamp = Date.now();
    const orderId = `order_${userId}_${planId}_${timestamp}`;

    // Get plan details from your constants
    const { getMembershipPlan } = await import("@/constants/membershipPlans");
    const plan = getMembershipPlan(planId);

    if (!plan) {
      return NextResponse.json({ error: "Invalid membership plan" }, { status: 400 });
    }

    // Create order in Firestore as "pending"
    await db.collection("orders").doc(orderId).set({
      orderId,
      userId,
      planId,
      planName: plan.name,
      amount: plan.price,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Call Cashfree create order API
    const createOrderResponse = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: plan.price,
          order_currency: "INR",
          customer_details: {
            customer_id: userId,
          },
        }),
      }
    );

    const orderData = await createOrderResponse.json();

    if (!createOrderResponse.ok) {
      console.error("Cashfree create order error:", orderData);
      return NextResponse.json(
        { error: "Failed to create Cashfree order", details: orderData },
        { status: 502 }
      );
    }

    // Optionally update Firestore with Cashfree response
    await db.collection("orders").doc(orderId).update({
      cashfreeOrderResponse: orderData,
    });

    return NextResponse.json({
      success: true,
      orderId,
      planId,
      amount: plan.price,
      cashfreeOrder: orderData,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Create order internal error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
