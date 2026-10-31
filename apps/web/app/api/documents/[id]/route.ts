import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: doc } = await supabase.from('documents').select('storage_path').eq('id', params.id).single();
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data: signed, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 60 * 10);
  if (error || !signed) return NextResponse.json({ error: 'sign_failed' }, { status: 400 });
  return NextResponse.json({ url: signed.signedUrl, expiresIn: 600 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: doc } = await supabase.from('documents').select('storage_path').eq('id', params.id).single();
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await supabase.storage.from('documents').remove([doc.storage_path]);
  await supabase.from('documents').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
