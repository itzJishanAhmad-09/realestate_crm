import type { SupabaseClient } from '@supabase/supabase-js';

export interface Range { from?: string; to?: string }

export async function reportFunnel(supabase: SupabaseClient, r: Range) {
  const { data, error } = await supabase.rpc('rpt_funnel', { p_from: r.from ?? null, p_to: r.to ?? null });
  if (error) throw error;
  return data;
}
export async function reportSources(supabase: SupabaseClient, r: Range) {
  const { data, error } = await supabase.rpc('rpt_sources', { p_from: r.from ?? null, p_to: r.to ?? null });
  if (error) throw error;
  return data as any[];
}
export async function reportAgents(supabase: SupabaseClient, r: Range) {
  const { data, error } = await supabase.rpc('rpt_agents', { p_from: r.from ?? null, p_to: r.to ?? null });
  if (error) throw error;
  return data as any[];
}
export async function reportProjects(supabase: SupabaseClient, r: Range) {
  const { data, error } = await supabase.rpc('rpt_projects', { p_from: r.from ?? null, p_to: r.to ?? null });
  if (error) throw error;
  return data as any[];
}
