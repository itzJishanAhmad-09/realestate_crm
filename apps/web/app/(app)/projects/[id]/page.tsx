import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.builder ?? 'No builder assigned'}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{project.locality ?? '—'}</p>
            <p className="text-sm text-muted-foreground">{project.city ?? '—'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline">{project.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RERA</span>
              <span>{project.rera_number ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Possession</span>
              <span>{project.possession_date ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}