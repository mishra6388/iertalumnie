export async function POST(req) {
  const body = await req.json();
  console.log('Cashfree Webhook:', body);

  // TODO: verify signature from headers if needed
  // TODO: update order status in your database

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
}
