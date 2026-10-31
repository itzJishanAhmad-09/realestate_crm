import { createServerClient } from '@/lib/supabase/server';

export default async function TemplatesPage() {
  const supabase = createServerClient();
  const [{ data: wa }, { data: sms }] = await Promise.all([
    supabase.from('wa_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('sms_templates').select('*').order('created_at', { ascending: false }),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-lg font-semibold">Templates</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium">WhatsApp ({wa?.length ?? 0})</h2>
        <div className="space-y-2">
          {(wa ?? []).map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.display_name}</p>
                  <p className="text-xs text-muted-foreground">{t.name} · {t.language_code} · {t.category}</p>
                </div>
                <span className="text-xs uppercase">{t.status}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
          {(wa ?? []).length === 0 && <p className="text-sm text-muted-foreground">No WhatsApp templates yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">SMS ({sms?.length ?? 0})</h2>
        <div className="space-y-2">
          {(sms ?? []).map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.display_name}</p>
                  <p className="text-xs text-muted-foreground">{t.name} · {t.dlt_template_id ?? 'no DLT'}</p>
                </div>
                <span className="text-xs uppercase">{t.status}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
          {(sms ?? []).length === 0 && <p className="text-sm text-muted-foreground">No SMS templates yet.</p>}
        </div>
      </section>
    </div>
  );
}
