import Link from 'next/link';
import { TemplatesGallery } from '@/components/automations/TemplatesGallery';

export default function AutomationTemplatesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Automation templates</h1>
        <Link href="/automations" className="text-xs text-muted-foreground underline">← Automations</Link>
      </div>
      <TemplatesGallery />
    </div>
  );
}
