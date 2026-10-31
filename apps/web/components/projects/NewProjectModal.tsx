'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function NewProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [builder, setBuilder] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [status, setStatus] = useState('launched');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, builder, locality, city, reraNumber, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create project');
      
      toast.success('Project created!');
      setOpen(false);
      router.refresh();
      
      // Reset form
      setName(''); setBuilder(''); setLocality(''); setCity(''); setReraNumber(''); setStatus('launched');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Skyline Heights" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Builder</Label>
              <Input value={builder} onChange={(e) => setBuilder(e.target.value)} placeholder="e.g. DLF" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_launch">Pre-Launch</SelectItem>
                  <SelectItem value="launched">Launched</SelectItem>
                  <SelectItem value="under_construction">Under Construction</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Locality</Label>
              <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Sector 54" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Gurgaon" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>RERA Number</Label>
            <Input value={reraNumber} onChange={(e) => setReraNumber(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !name}>{busy ? 'Saving…' : 'Save Project'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
