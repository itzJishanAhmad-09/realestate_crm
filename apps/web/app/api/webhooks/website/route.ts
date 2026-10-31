import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertLeadFromIncoming } from "@/lib/assignment";
import { phoneSchema } from "@/lib/validators";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1),
  phone: phoneSchema,
  email: z.string().email().optional(),
  message: z.string().optional(),
  project: z.string().optional(),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
});

/**
 * Authenticated by header `x-api-key`. Each company has its own key stored in
 * `companies.settings->>'website_api_key'`. For MVP we read from env per company.
 * Future: a `company_api_keys` table.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const companySlug = req.nextUrl.searchParams.get("c");
  if (!apiKey || !companySlug) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: company } = await admin
    .from("companies").select("id").eq("slug", companySlug).single();
  if (!company) return NextResponse.json({ error: "Unknown company" }, { status: 404 });

  const expected = process.env[`WEBSITE_API_KEY_${companySlug.toUpperCase()}`];
  if (!expected || expected !== apiKey) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const result = await upsertLeadFromIncoming({
    companyId: company.id,
    name: body.name,
    phone: body.phone,
    email: body.email ?? null,
    sourceKey: "website",
    rawPayload: body,
    dedupe: "skip",
  });

  return NextResponse.json({ ok: true, id: result.id, duplicate: result.duplicate });
}