// Permissive stub with EXPLICIT table names.
// Row is Record<string, any> so field access is untyped (no `never` errors).
// Regenerate once Supabase runs:
//   npx supabase gen types typescript --local > apps\web\types\db.ts   (then strip BOM)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Tbl = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: any[];
};

export type Database = {
  public: {
    Tables: {
      companies:          Tbl;
      users:              Tbl;
      teams:              Tbl;
      activity_log:       Tbl;
      lead_statuses:      Tbl;
      lead_sources:       Tbl;
      projects:           Tbl;
      leads:              Tbl;
      lead_projects:      Tbl;
      notes:              Tbl;
      follow_ups:         Tbl;
      saved_views:        Tbl;
      dnc_numbers:        Tbl;
      import_jobs:        Tbl;
      alerts:             Tbl;
    };
    Views: {
      lead_counts_by_status: {
        Row: Record<string, any>;
        Relationships: any[];
      };
    };
    Functions: Record<string, { Args: any; Returns: any }>;
    Enums: {
      user_role: "super_admin" | "company_admin" | "sales_head" | "team_leader" | "telecaller" | "sales_exec";
      lead_purpose: "self_use" | "investment";
      possession_timeline: "immediate" | "under_construction" | "flexible";
      property_type: "1bhk" | "2bhk" | "3bhk" | "4bhk" | "villa" | "plot" | "commercial" | "shop" | "other";
    };
    CompositeTypes: Record<string, { Row: Record<string, any> }>;
  };
};