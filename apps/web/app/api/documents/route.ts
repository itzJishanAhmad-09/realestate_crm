import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const entityType = req.nextUrl.searchParams.get('entity_type');
  const entityId = req.nextUrl.searchParams.get('entity_id');
  if (!entityType || !entityId) return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  const { data } = await supabase.from('documents').select('*')
    .eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const entityType = form.get('entity_type') as string | null;
  const entityId = form.get('entity_id') as string | null;
  const docType = (form.get('doc_type') as string) || 'other';
  if (!file || !entityType || !entityId) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  const companyId = profile!.company_id;
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${companyId}/${entityType}/${entityId}/${uuid}-${safeName}`;

  const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data, error } = await supabase.from('documents').insert({
    company_id: companyId, entity_type: entityType, entity_id: entityId,
    doc_type: docType, file_name: file.name, storage_path: path,
    mime_type: file.type, size_bytes: file.size, uploaded_by: user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
