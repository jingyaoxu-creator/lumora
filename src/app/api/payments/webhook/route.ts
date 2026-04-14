import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, WebhookEventType } from "@waffo/pancake-ts";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function productIdToPlan(productId: string): "pro" | "business" | null {
  const pid = productId?.trim();
  if (pid === process.env.WAFFO_PRODUCT_ID_BUSINESS?.trim()) return "business";
  if (pid === process.env.WAFFO_PRODUCT_ID_PRO?.trim()) return "pro";
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-waffo-signature");

  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: ReturnType<typeof verifyWebhook>;
  try {
    event = verifyWebhook(rawBody, signatureHeader, { environment: "test" });
  } catch (error) {
    console.error("[webhook] Signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  void handleEvent(event);
  return NextResponse.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEvent(event: any) {
  const supabase = getServiceClient();

  switch (event.type) {
    case WebhookEventType.OrderCompleted: {
      if (!supabase) break;
      const { buyerEmail, productId } = event.data ?? {};
      const plan = productIdToPlan(productId);
      if (!plan || !buyerEmail) break;

      const { data: authData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });
      const authUser = authData?.users?.find((u) => u.email === buyerEmail);
      if (authUser) {
        const limits: Record<string, number> = { pro: 999999, business: 999999 };
        await supabase
          .from("profiles")
          .update({
            plan,
            scans_limit: limits[plan],
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);
        console.log(`[webhook] Upgraded ${buyerEmail} to ${plan}`);
      }
      break;
    }

    case WebhookEventType.SubscriptionCanceled: {
      if (!supabase) break;
      const { buyerEmail } = event.data ?? {};
      if (!buyerEmail) break;
      const { data: authData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });
      const authUser = authData?.users?.find((u) => u.email === buyerEmail);
      if (authUser) {
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            scans_limit: 5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);
        console.log(`[webhook] Downgraded ${buyerEmail} to free`);
      }
      break;
    }

    default:
      console.log("[webhook] Event:", event.type);
  }
}
