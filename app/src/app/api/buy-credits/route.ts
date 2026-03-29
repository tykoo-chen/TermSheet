import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { generatePitchToken, pitchAccounts } from "@/lib/pitch-credits";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as const,
  });
}

// Credit bundle options (not exported from route — move to lib if needed)
const CREDIT_BUNDLES = [
  { id: "starter", label: "Starter Pack", credits: 5, cents: 399, description: "5 pitches · $0.80 each" },
  { id: "growth", label: "Growth Pack", credits: 15, cents: 999, description: "15 pitches · $0.67 each" },
  { id: "founder", label: "Founder Pack", credits: 40, cents: 1999, description: "40 pitches · $0.50 each" },
];

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    // Dev mode: no Stripe. Issue free tokens.
    const { bundleId, walletAddress } = await req.json();
    const bundle = CREDIT_BUNDLES.find((b) => b.id === bundleId) ?? CREDIT_BUNDLES[0];
    const token = generatePitchToken();
    pitchAccounts.set(token, {
      token,
      credits: bundle.credits,
      walletAddress,
      createdAt: Date.now(),
      usedCredits: 0,
      status: "active",
    });
    return NextResponse.json({ devMode: true, token, credits: bundle.credits });
  }

  try {
    const { bundleId, walletAddress } = await req.json();
    const bundle = CREDIT_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) {
      return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });
    }

    // Pre-generate the token so we can include it in the success URL
    const token = generatePitchToken();

    // Store as pending — webhook will activate it
    pitchAccounts.set(token, {
      token,
      credits: 0,
      walletAddress,
      createdAt: Date.now(),
      usedCredits: 0,
      status: "pending",
    });

    const origin = req.headers.get("origin") || "https://app-tykooeths-projects.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `TermSheet ${bundle.label}`,
              description: bundle.description,
            },
            unit_amount: bundle.cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/connect?pitch_token=${token}&credits=${bundle.credits}&bundle=${bundle.id}`,
      cancel_url: `${origin}/connect?bundle_cancelled=1`,
      metadata: {
        type: "credit_bundle",
        bundleId: bundle.id,
        credits: bundle.credits.toString(),
        pitchToken: token,
        walletAddress: walletAddress ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
