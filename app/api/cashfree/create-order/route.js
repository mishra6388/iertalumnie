import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userId, planId } = await req.json();

    const orderId = `order_${userId}_${planId}_${Date.now()}`;
    const orderData = {
      order_id: orderId,
      order_amount: 1, // test amount
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: "test@example.com",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?success=true&orderId=${orderId}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
      },
    };

    const cfResp = await fetch(
      `${process.env.CASHFREE_BASE_URL}/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
        body: JSON.stringify(orderData),
      }
    );

    // DEBUG LOG
    const rawResponse = await cfResp.text();
    console.log("Cashfree API Status:", cfResp.status);
    console.log("Cashfree Raw Response:", rawResponse);

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      data = { message: rawResponse };
    }

    if (!cfResp.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Cashfree order creation failed" },
        { status: cfResp.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentUrl: data.payment_link,
    });
  } catch (err) {
    console.error("Create Order Error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
