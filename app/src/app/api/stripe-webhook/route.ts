import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { paidPitchSessions } from "@/lib/paid-sessions";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as const,
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const pitchSessionId = session.metadata?.pitchSessionId;
    const sharkId = session.metadata?.sharkId;

    if (pitchSessionId && sharkId) {
      paidPitchSessions.set(pitchSessionId, {
        sharkId,
        paidAt: Date.now(),
        checkoutId: session.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
