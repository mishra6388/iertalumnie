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
    console.log("📝 RAW request body:", JSON.stringify(body, null, 2));
    console.log("📝 Body type:", typeof body);
    console.log("📝 Body keys:", Object.keys(body));
    
    // Debug each field individually
    console.log("🔍 planId:", body.planId, "Type:", typeof body.planId);
    console.log("🔍 userId:", body.userId, "Type:", typeof body.userId);
    console.log("🔍 amount:", body.amount, "Type:", typeof body.amount);
    console.log("🔍 customerEmail:", body.customerEmail);
    console.log("🔍 customerPhone:", body.customerPhone);
    console.log("🔍 customerName:", body.customerName);

    const {
      planId,
      userId,
      amount,
      customerEmail,
      customerPhone,
      customerName,
      returnUrl,
    } = body;

    // More detailed logging after destructuring
    console.log("🎯 After destructuring:");
    console.log("   planId:", planId);
    console.log("   userId:", userId);
    console.log("   amount:", amount);
    
    // Check if amount exists in the body directly
    console.log("🔍 Direct body.amount:", body.amount);
    console.log("🔍 Direct body['amount']:", body['amount']);
    
    // Get plan and check price
    const plan = getMembershipPlan(planId);
    console.log("📋 Plan data:", plan);
    console.log("📋 Plan price:", plan?.price);

    // ✅ 1. Validate required fields
    if (!planId || !userId || !amount) {
      console.error("❌ Missing required fields:", { 
        planId: !!planId, 
        userId: !!userId, 
        amount: !!amount,
        actualValues: { planId, userId, amount }
      });
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields", 
          required: ["planId", "userId", "amount"],
          received: { planId, userId, amount },
          debug: {
            bodyKeys: Object.keys(body),
            bodyValues: body,
            destructured: { planId, userId, amount }
          }
        },
        { status: 400 }
      );
    }

    // ✅ 2. Validate plan exists
    if (!plan) {
      console.error("❌ Invalid plan:", planId);
      return NextResponse.json(
        { success: false, error: `Invalid plan: ${planId}` },
        { status: 400 }
      );
    }

    // ✅ 3. Validate amount matches plan
    if (amount !== plan.price) {
      console.error("❌ Amount mismatch:", { expected: plan.price, received: amount });
      return NextResponse.json(
        { success: false, error: `Amount mismatch. Expected: ${plan.price}, Received: ${amount}` },
        { status: 400 }
      );
    }

    // ✅ 4. Check if user exists
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error("❌ User not found:", userId);
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
    } catch (firebaseError) {
      console.error("❌ Firebase user check failed:", firebaseError);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    // ✅ 5. Generate unique order ID
    const orderId = `order_${userId}_${planId}_${Date.now()}`;
    console.log("🆔 Generated orderId:", orderId);

    // ✅ 6. Prepare safe customer data
    const safeCustomerEmail = customerEmail || "test@example.com";
    const safeCustomerPhone = customerPhone || "9999999999";
    const safeCustomerName = customerName || "Alumni Member";
    const safeReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`;

    console.log("👤 Customer data:", {
      email: safeCustomerEmail,
      phone: safeCustomerPhone,
      name: safeCustomerName,
      returnUrl: safeReturnUrl
    });

    // ✅ 7. Save order to Firebase BEFORE calling Cashfree
    const orderData = {
      orderId,
      userId,
      planId,
      planName: plan.name,
      amount,
      status: "created",
      customerEmail: safeCustomerEmail,
      customerPhone: safeCustomerPhone,
      customerName: safeCustomerName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const ordersRef = collection(db, "orders");
      await setDoc(doc(ordersRef, orderId), orderData);
      console.log("💾 Order saved to Firebase:", orderId);
    } catch (firebaseError) {
      console.error("❌ Failed to save order to Firebase:", firebaseError);
      return NextResponse.json(
        { success: false, error: "Failed to save order" },
        { status: 500 }
      );
    }

    // ✅ 8. Determine Cashfree environment
    const environment = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'production' 
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    console.log("🌍 Cashfree environment:", environment);
    console.log("🔗 Cashfree base URL:", baseUrl);

    // ✅ 9. Call Cashfree Create Order API
    const cashfreePayload = {
      order_id: orderId,
      order_amount: amount,
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

    console.log("📤 Cashfree request payload:", cashfreePayload);
    console.log("🔑 Using App ID:", process.env.NEXT_PUBLIC_CASHFREE_APP_ID);

    const cfResponse = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.NEXT_PUBLIC_CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cfData = await cfResponse.json();
    console.log("📥 Cashfree response status:", cfResponse.status);
    console.log("📥 Cashfree response data:", cfData);

    if (!cfResponse.ok) {
      console.error("❌ Cashfree API error:", cfData);
      
      // Update order status in Firebase
      try {
        await setDoc(doc(db, "orders", orderId), {
          ...orderData,
          status: "failed",
          error: cfData,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Failed to update order status:", e);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: "Cashfree order creation failed", 
          details: cfData,
          orderId 
        },
        { status: 502 }
      );
    }

    // ✅ 10. Update order with Cashfree data
    try {
      await setDoc(doc(db, "orders", orderId), {
        ...orderData,
        status: "pending",
        cashfreeOrderId: cfData.order_id,
        paymentSessionId: cfData.payment_session_id,
        cashfreeData: cfData,
        updatedAt: new Date().toISOString(),
      });
      console.log("✅ Order updated with Cashfree data");
    } catch (firebaseError) {
      console.error("❌ Failed to update order:", firebaseError);
    }

    // ✅ 11. Return success response
    const response = {
      success: true,
      orderId,
      order: cfData,
      message: "Order created successfully"
    };

    console.log("🎉 Order creation successful:", response);
    return NextResponse.json(response);

  } catch (error) {
    console.error("💥 Create order internal error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}