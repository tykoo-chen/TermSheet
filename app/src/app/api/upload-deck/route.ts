import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("deck") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const ALLOWED = [
      "application/pdf",
      "image/png", "image/jpeg", "image/jpg", "image/gif",
      "image/webp", "image/svg+xml",
    ];
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and image files (PNG, JPG, GIF, WebP) are accepted" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    // Vercel Blob storage
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`decks/${Date.now()}-${file.name}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url, name: file.name, size: file.size });
    }

    // Dev mode — no blob storage configured, just acknowledge
    return NextResponse.json({
      url: null,
      name: file.name,
      size: file.size,
      devMode: true,
      note: "Deck received (dev mode — not persisted). Set BLOB_READ_WRITE_TOKEN for production storage.",
    });
  } catch (err) {
    console.error("upload-deck error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
