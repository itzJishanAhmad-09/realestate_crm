import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.from('automation_templates')
    .select('*').order('category').order('name');
  return NextResponse.json(data ?? []);
}
