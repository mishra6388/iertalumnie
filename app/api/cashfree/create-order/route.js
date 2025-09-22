// app/api/cashfree/create-order/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderAmount,
      customerId,
      customerEmail,
      customerPhone,
      returnUrl,
    } = body;

    // ✅ Fill defaults if missing
    if (!orderId || !orderAmount || !customerId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: orderId, orderAmount, customerId" },
        { status: 400 }
      );
    }

    const safeCustomerEmail = customerEmail || "test@example.com";
    const safeCustomerPhone = customerPhone || "9999999999"; // fallback for Cashfree
    const safeReturnUrl =
      returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment-return`;

    // 🔑 Call Cashfree API
    const cfRes = await fetch(
      `${process.env.CASHFREE_BASE_URL}/pg/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: orderAmount,
          order_currency: "INR",
          customer_details: {
            customer_id: customerId,
            customer_email: safeCustomerEmail,
            customer_phone: safeCustomerPhone,
          },
          order_meta: {
            return_url: safeReturnUrl,
          },
        }),
      }
    );

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      console.error("Cashfree API error:", cfData);
      return NextResponse.json(
        { success: false, error: "Failed to create Cashfree order", details: cfData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: cfData,
    });
  } catch (err) {
    console.error("Create order internal error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
