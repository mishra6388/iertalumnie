// app/api/cashfree/create-order/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { getMembershipPlan } from "@/constants/membershipPlans";

/**
 * Create Cashfree Payment Order
 * POST /api/cashfree/create-order
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      planId,
      userId,
      amount,
      customerEmail,
      customerPhone,
      customerName,
      returnUrl,
    } = body;

    // ✅ 1. Validate required fields
    if (!planId || !userId || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          received: { planId, userId, amount },
        },
        { status: 400 }
      );
    }

    // ✅ 2. Validate plan
    const plan = getMembershipPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: `Invalid plan: ${planId}` },
        { status: 400 }
      );
    }

    if (Number(amount) !== plan.price) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount mismatch. Expected: ${plan.price}, Received: ${amount}`,
        },
        { status: 400 }
      );
    }

    // ✅ 3. Ensure user exists
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ 4. Generate unique order ID
    const orderId = `order_${userId}_${planId}_${Date.now()}`;

    // ✅ 5. Safe defaults for customer info
    const safeCustomerEmail = customerEmail || "test@example.com";
    const safeCustomerPhone = customerPhone || "9999999999";
    const safeCustomerName = customerName || "Alumni Member";
    const safeReturnUrl =
      returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`;

    // ✅ 6. Save order in Firebase
    const orderData = {
      orderId,
      userId,
      planId,
      planName: plan.name,
      amount: Number(amount),
      status: "created",
      customerEmail: safeCustomerEmail,
      customerPhone: safeCustomerPhone,
      customerName: safeCustomerName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(collection(db, "orders"), orderId), orderData);

    // ✅ 7. Cashfree API call
    const environment =
      process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "production"
        ? "production"
        : "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const cfPayload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: safeCustomerEmail,
        customer_phone: safeCustomerPhone,
        customer_name: safeCustomerName,
      },
      order_meta: {
        return_url: safeReturnUrl,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
      },
    };

    const cfResponse = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID, // ✅ server-side key
        "x-client-secret": process.env.CASHFREE_SECRET_KEY, // ✅ server-side key
      },
      body: JSON.stringify(cfPayload),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      // Update order as failed
      await setDoc(doc(db, "orders", orderId), {
        ...orderData,
        status: "failed",
        error: cfData,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Cashfree order creation failed",
          details: cfData,
          orderId,
        },
        { status: 502 }
      );
    }

    // ✅ 8. Update order with Cashfree details
    await setDoc(doc(db, "orders", orderId), {
      ...orderData,
      status: "pending",
      cashfreeOrderId: cfData.order_id,
      paymentSessionId: cfData.payment_session_id,
      updatedAt: new Date().toISOString(),
    });

    // ✅ 9. Return response to frontend
    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cfData.payment_session_id,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("💥 Create order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
