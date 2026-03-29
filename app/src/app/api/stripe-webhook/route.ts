import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { paidPitchSessions } from "@/lib/paid-sessions";
import { pitchAccounts } from "@/lib/pitch-credits";

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
    const meta = session.metadata ?? {};

    if (meta.type === "credit_bundle") {
      // Activate pre-generated pitch token with credits
      const token = meta.pitchToken;
      const credits = parseInt(meta.credits ?? "0", 10);
      if (token && credits > 0) {
        const existing = pitchAccounts.get(token);
        if (existing) {
          existing.status = "active";
          existing.credits = credits;
          existing.stripeSessionId = session.id;
        } else {
          // Fallback: create fresh entry
          pitchAccounts.set(token, {
            token,
            credits,
            walletAddress: meta.walletAddress || undefined,
            createdAt: Date.now(),
            usedCredits: 0,
            stripeSessionId: session.id,
            status: "active",
          });
        }
      }
    } else {
      // Original per-pitch Stripe payment
      const pitchSessionId = meta.pitchSessionId;
      const sharkId = meta.sharkId;
      if (pitchSessionId && sharkId) {
        paidPitchSessions.set(pitchSessionId, {
          sharkId,
          paidAt: Date.now(),
          checkoutId: session.id,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
