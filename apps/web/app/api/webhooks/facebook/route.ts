import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertLeadFromIncoming } from "@/lib/assignment";
import { normalizePhoneIN } from "@/lib/phone";

export const runtime = "nodejs";

// Meta verification challenge
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !process.env.FB_APP_SECRET) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.FB_APP_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Multi-tenant mapping: each company registers a Facebook page with a unique
 * `company_slug` param in the webhook URL. e.g. /api/webhooks/facebook?c=acme
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const companySlug = req.nextUrl.searchParams.get("c");
  if (!companySlug) return NextResponse.json({ error: "Missing company" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: company } = await admin.from("companies").select("id").eq("slug", companySlug).single();
  if (!company) return NextResponse.json({ error: "Unknown company" }, { status: 404 });

  const body = JSON.parse(raw);
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const v = change.value; // { leadgen_id, form_id, page_id, created_time, field_data: [] }
      try {
        // Fetch lead detail from Graph API (requires page access token)
        const token = process.env.FB_PAGE_ACCESS_TOKEN;
        const resp = await fetch(
          `https://graph.facebook.com/v19.0/${v.leadgen_id}?access_token=${token}`,
          { cache: "no-store" }
        );
        if (!resp.ok) continue;
        const detail = await resp.json();
        const fields: Array<{ name: string; values: string[] }> = detail.field_data ?? [];
        const get = (n: string) => fields.find((f) => f.name === n)?.values?.[0]?.trim();

        const name = get("full_name") ?? get("name") ?? "Facebook Lead";
        const phone = normalizePhoneIN(get("phone_number") ?? get("phone"));
        if (!phone) continue;

        await upsertLeadFromIncoming({
          companyId: company.id,
          name,
          phone,
          email: get("email") ?? null,
          sourceKey: entry?.id ? "facebook" : "facebook",
          externalId: v.leadgen_id,
          rawPayload: detail,
          dedupe: "skip",
        });
      } catch (e) {
        console.error("[facebook-webhook] error", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}