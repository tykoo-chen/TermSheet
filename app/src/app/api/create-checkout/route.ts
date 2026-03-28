import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as const,
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    // Stripe not configured — return null url so frontend skips payment gate
    return NextResponse.json({ url: null });
  }

  try {
    const { sharkId, sharkName, sessionId } = await req.json();

    const origin = req.headers.get("origin") || "https://app-tykooeths-projects.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Pitch to ${sharkName}`,
              description: `One 10-minute AI pitch session. If accepted, prize USDC is sent on-chain automatically.`,
            },
            unit_amount: 100, // $1.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/sharks/${sharkId}?pitch_paid=1&session_id={CHECKOUT_SESSION_ID}&pitch_session=${sessionId}`,
      cancel_url: `${origin}/sharks/${sharkId}?pitch_cancelled=1`,
      metadata: {
        sharkId,
        pitchSessionId: sessionId,
      },
    });

    return NextResponse.json({ url: session.url, checkoutId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
