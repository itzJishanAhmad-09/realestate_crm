import Papa from "papaparse";
import { normalizePhoneIN } from "@/lib/phone";

export type ColumnMapping = {
  name: string;
  phone: string;
  alt_phone: string;
  email: string;
  city: string;
  locality: string;
  budget_min: string;
  budget_max: string;
  property_type: string;
  source: string;
  project: string;
  remarks: string;
};

export type MappedRow = {
  row_index: number;
  name: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  city?: string;
  locality?: string;
  budget_min?: number;
  budget_max?: number;
  property_type?: string;
  source_hint?: string;
  project_hint?: string;
  remarks?: string;
  error?: string;
};

export async function parseCsvFile(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = (parsed.meta.fields ?? []).filter(Boolean);
  const rows = parsed.data.filter((r) =>
    Object.values(r).some((v) => v && String(v).trim() !== ""),
  );
  return { headers, rows };
}

export function mapRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): MappedRow[] {
  return rows.map((r, i) => {
    const rawPhone = mapping.phone ? r[mapping.phone] ?? "" : "";
    const phone = normalizePhoneIN(rawPhone);
    const row: MappedRow = {
      row_index: i,
      name: (mapping.name ? r[mapping.name] : "")?.trim() || "",
      phone: phone ?? rawPhone,
      alt_phone: mapping.alt_phone
        ? normalizePhoneIN(r[mapping.alt_phone] ?? "") ?? undefined
        : undefined,
      email: mapping.email ? (r[mapping.email]?.trim() || undefined) : undefined,
      city: mapping.city ? (r[mapping.city]?.trim() || undefined) : undefined,
      locality: mapping.locality ? (r[mapping.locality]?.trim() || undefined) : undefined,
      budget_min: mapping.budget_min ? toNum(r[mapping.budget_min]) : undefined,
      budget_max: mapping.budget_max ? toNum(r[mapping.budget_max]) : undefined,
      property_type: mapping.property_type
        ? mapPropertyType(r[mapping.property_type])
        : undefined,
      source_hint: mapping.source ? (r[mapping.source]?.trim() || undefined) : undefined,
      project_hint: mapping.project ? (r[mapping.project]?.trim() || undefined) : undefined,
      remarks: mapping.remarks ? (r[mapping.remarks]?.trim() || undefined) : undefined,
    };
    if (!row.name) row.error = "Missing name";
    else if (!phone) row.error = "Invalid phone";
    return row;
  });
}

function toNum(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapPropertyType(v?: string): string | undefined {
  if (!v) return undefined;
  const k = v.toLowerCase();
  if (k.includes("shop")) return "shop";
  if (k.includes("commercial")) return "commercial";
  if (k.includes("plot")) return "plot";
  if (k.includes("villa")) return "villa";
  if (k.includes("4")) return "4bhk";
  if (k.includes("3")) return "3bhk";
  if (k.includes("2")) return "2bhk";
  if (k.includes("1")) return "1bhk";
  return undefined;
}
