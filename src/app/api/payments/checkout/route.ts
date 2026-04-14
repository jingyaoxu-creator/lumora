import { NextRequest, NextResponse } from "next/server";
import { WaffoPancake } from "@waffo/pancake-ts";

const client = new WaffoPancake({
  merchantId: process.env.WAFFO_MERCHANT_ID!.trim(),
  privateKey: process.env.WAFFO_PRIVATE_KEY!.trim(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const buyerEmail: string | undefined = body.buyerEmail;
    const plan: "pro" | "business" = body.plan === "business" ? "business" : "pro";

    const productId = (
      plan === "business"
        ? process.env.WAFFO_PRODUCT_ID_BUSINESS!
        : process.env.WAFFO_PRODUCT_ID_PRO!
    ).trim();

    const session = await client.checkout.createSession({
      productId,
      currency: "USD",
      ...(buyerEmail && { buyerEmail }),
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?plan=${plan}&t=${Date.now()}`,
    });

    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (error) {
    console.error("[payments/checkout] Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
