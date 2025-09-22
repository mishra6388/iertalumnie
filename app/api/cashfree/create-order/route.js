import { NextResponse } from "next/server";

/**
 * Create Cashfree Order
 * POST /api/cashfree/create-order
 * Body: { orderId, orderAmount, customerId, customerEmail, customerPhone, returnUrl }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, orderAmount, customerId, customerEmail, customerPhone, returnUrl } = body;

    if (!orderId || !orderAmount || !customerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const res = await fetch(`${process.env.CASHFREE_BASE_URL}/pg/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: returnUrl, // where user goes after payment
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Cashfree Create Order Error:", data);
      return NextResponse.json(
        { error: "Failed to create Cashfree order", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err) {
    console.error("Internal Error Create Order:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
