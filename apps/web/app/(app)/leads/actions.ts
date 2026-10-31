"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { leadInputSchema } from "@/lib/validators";
import { pickAssignee } from "@/lib/assignment";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

// ---------- CREATE ----------
export async function createLeadAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = leadInputSchema.parse(input);
    const supabase = createSupabaseServer();

    const assignee = parsed.assigned_to ?? (await pickAssignee(user.companyId, parsed.project_id ?? null));

    const { data, error } = await supabase.from("leads").insert({
      company_id: user.companyId,
      name: parsed.name,
      phone: parsed.phone,
      alt_phone: parsed.alt_phone ?? null,
      email: parsed.email ?? null,
      locality: parsed.locality ?? null,
      city: parsed.city ?? null,
      source_id: parsed.source_id ?? null,
      campaign: parsed.campaign ?? null,
      project_id: parsed.project_id ?? null,
      property_type: parsed.property_type ?? null,
      budget_min: parsed.budget_min ?? null,
      budget_max: parsed.budget_max ?? null,
      purpose: parsed.purpose ?? null,
      possession_timeline: parsed.possession_timeline ?? null,
      preferred_location: parsed.preferred_location ?? null,
      loan_required: parsed.loan_required ?? null,
      occupation: parsed.occupation ?? null,
      status_id: parsed.status_id,
      assigned_to: assignee,
      assigned_at: assignee ? new Date().toISOString() : null,
      next_followup_at: parsed.next_followup_at ?? null,
      remarks: parsed.remarks ?? null,
      tags: parsed.tags,
      custom_fields: parsed.custom_fields,
      created_by: user.userId,
    }).select("id").single();

    if (error) {
      if (error.code === "23505") return { ok: false, error: "A lead with this phone already exists" };
      return { ok: false, error: error.message };
    }

    await supabase.from("activity_log").insert({
      company_id: user.companyId, actor_id: user.userId,
      entity: "lead", entity_id: data.id, action: "created",
    });
    revalidatePath("/leads");
    return { ok: true, id: data.id };
  } catch (e: any) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues.map((x: any) => x.message).join(", ") };
    return { ok: false, error: e.message ?? "Unknown error" };
  }
}

// ---------- UPDATE ----------
const updateSchema = z.object({
  id: z.string().uuid(),
  status_id: z.string().uuid().optional(),
  sub_status: z.string().optional(),
  lost_reason: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  next_followup_at: z.string().datetime().nullable().optional(),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  property_type: z.string().optional(),
  remarks: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  site_visit_date: z.string().datetime().nullable().optional(),
});

export async function updateLeadAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateSchema.parse(input);
    const supabase = createSupabaseServer();
    const { id, ...patch } = parsed;

    // If moving to 'lost', require lost_reason
    if (patch.status_id) {
      const { data: s } = await supabase.from("lead_statuses").select("key,category").eq("id", patch.status_id).single();
      if (s?.category === "lost" && !patch.lost_reason) {
        return { ok: false, error: "Lost reason is required" };
      }
    }

    const update: any = { ...patch, last_activity_at: new Date().toISOString() };
    if (patch.assigned_to !== undefined) update.assigned_at = patch.assigned_to ? new Date().toISOString() : null;

    const { error } = await supabase.from("leads").update(update).eq("id", id);
    if (error) return { ok: false, error: error.message };

    await supabase.from("activity_log").insert({
      company_id: user.companyId, actor_id: user.userId,
      entity: "lead", entity_id: id, action: "updated", meta: patch,
    });

    revalidatePath(`/leads/${id}`);
    revalidatePath("/leads");
    return { ok: true, id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ---------- NOTES ----------
export async function addNoteAction(input: { lead_id: string; body: string }): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!input.body.trim()) return { ok: false, error: "Note cannot be empty" };
    const supabase = createSupabaseServer();
    const { error } = await supabase.from("notes").insert({
      company_id: user.companyId, lead_id: input.lead_id,
      author_id: user.userId, body: input.body.trim(),
    });
    if (error) return { ok: false, error: error.message };
    await supabase.from("leads").update({ last_activity_at: new Date().toISOString() }).eq("id", input.lead_id);
    revalidatePath(`/leads/${input.lead_id}`);
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ---------- FOLLOW UP ----------
export async function scheduleFollowUpAction(input: {
  lead_id: string; due_at: string; channel?: "call"|"whatsapp"|"sms"|"visit"|"other"; note?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = createSupabaseServer();
    const { data: lead } = await supabase.from("leads").select("assigned_to").eq("id", input.lead_id).single();

    const { error } = await supabase.from("follow_ups").insert({
      company_id: user.companyId, lead_id: input.lead_id,
      assignee_id: lead?.assigned_to ?? user.userId,
      due_at: input.due_at,
      channel: input.channel ?? "call",
      note: input.note ?? null,
      created_by: user.userId,
    });
    if (error) return { ok: false, error: error.message };

    // Denormalize next follow-up on the lead (pick earliest open)
    const { data: upcoming } = await supabase
      .from("follow_ups").select("due_at")
      .eq("lead_id", input.lead_id).is("done_at", null)
      .order("due_at", { ascending: true }).limit(1);

    await supabase.from("leads").update({
      next_followup_at: upcoming?.[0]?.due_at ?? null,
      last_activity_at: new Date().toISOString(),
    }).eq("id", input.lead_id);

    revalidatePath(`/leads/${input.lead_id}`);
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ---------- BULK ASSIGN ----------
export async function bulkAssignAction(input: { lead_ids: string[]; assigned_to: string | null }): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!["company_admin","sales_head","team_leader"].includes(user.role)) {
      return { ok: false, error: "Not allowed" };
    }
    const supabase = createSupabaseServer();
    const { error } = await supabase.from("leads")
      .update({ assigned_to: input.assigned_to, assigned_at: input.assigned_to ? new Date().toISOString() : null })
      .in("id", input.lead_ids);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/leads");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ---------- IMPORT ----------
export async function importLeadsAction(input: {
  job_id: string;
  rows: Array<{
    name: string; phone: string;
    alt_phone?: string; email?: string; locality?: string; city?: string;
    budget_min?: number; budget_max?: number;
    property_type?: string; source_hint?: string; project_hint?: string; remarks?: string;
  }>;
  dedupe_mode: "skip" | "update";
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = createSupabaseServer();

    const [{ data: statuses }, { data: sources }, { data: projects }] = await Promise.all([
      supabase.from("lead_statuses").select("id,key").eq("company_id", user.companyId),
      supabase.from("lead_sources").select("id,key,label").eq("company_id", user.companyId),
      supabase.from("projects").select("id,name").eq("company_id", user.companyId),
    ]);
    const newStatus = statuses?.find((s) => s.key === "new")?.id;
    if (!newStatus) return { ok: false, error: "Default 'new' status missing" };

    // Pre-fetch existing phones
    const phones = input.rows.map((r) => r.phone);
    const { data: existing } = await supabase
      .from("leads").select("id,phone").eq("company_id", user.companyId).in("phone", phones);
    const existingMap = new Map((existing ?? []).map((l) => [l.phone, l.id]));

    let inserted = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i];
      try {
        const sourceId = r.source_hint
          ? sources?.find((s) => s.key === r.source_hint || s.label.toLowerCase() === r.source_hint!.toLowerCase())?.id
          : sources?.find((s) => s.key === "cold")?.id;

        const projectId = r.project_hint
          ? projects?.find((p) => p.name.toLowerCase() === r.project_hint!.toLowerCase())?.id
          : undefined;

        if (existingMap.has(r.phone)) {
          if (input.dedupe_mode === "update") {
            await supabase.from("leads").update({
              name: r.name,
              alt_phone: r.alt_phone ?? undefined,
              email: r.email ?? undefined,
              locality: r.locality ?? undefined,
              city: r.city ?? undefined,
              budget_min: r.budget_min ?? undefined,
              budget_max: r.budget_max ?? undefined,
              remarks: r.remarks ?? undefined,
              last_activity_at: new Date().toISOString(),
            }).eq("id", existingMap.get(r.phone)!);
            updated++;
          } else { skipped++; }
          continue;
        }

        const assignee = await pickAssignee(user.companyId, projectId ?? null);

        const { error } = await supabase.from("leads").insert({
          company_id: user.companyId,
          name: r.name, phone: r.phone,
          alt_phone: r.alt_phone ?? null, email: r.email ?? null,
          locality: r.locality ?? null, city: r.city ?? null,
          budget_min: r.budget_min ?? null, budget_max: r.budget_max ?? null,
          property_type: (r.property_type as any) ?? null,
          source_id: sourceId ?? null,
          project_id: projectId ?? null,
          status_id: newStatus,
          assigned_to: assignee,
          assigned_at: assignee ? new Date().toISOString() : null,
          remarks: r.remarks ?? null,
          created_by: user.userId,
        });
        if (error) throw new Error(error.message);
        inserted++;
      } catch (e: any) {
        errors.push({ row: i + 2, error: e.message });
      }
    }

    await supabase.from("import_jobs").update({
      status: "completed",
      inserted, updated, skipped,
      failed: errors.length, errors,
      finished_at: new Date().toISOString(),
    }).eq("id", input.job_id);

    revalidatePath("/leads");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function createImportJobAction(input: { file_name: string; total_rows: number; dedupe_mode: "skip"|"update" }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from("import_jobs").insert({
    company_id: user.companyId, created_by: user.userId,
    file_name: input.file_name, total_rows: input.total_rows,
    dedupe_mode: input.dedupe_mode, status: "running",
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}