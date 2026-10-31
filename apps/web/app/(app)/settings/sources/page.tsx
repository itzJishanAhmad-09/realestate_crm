import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function SourcesSettingsPage() {
  const supabase = createServerClient();
  const { data: sources } = await supabase.from('lead_sources').select('*').order('label');

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lead Sources</h1>
        <Button size="sm">+ Add Source</Button>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-2">
          {sources?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.type}</p>
              </div>
              {s.is_system && <span className="text-xs bg-secondary px-2 py-1 rounded">System</span>}
            </div>
          ))}
          {(!sources || sources.length === 0) && <p className="text-sm text-muted-foreground">No sources created yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
