export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-4 flex items-center justify-between border-b pb-2">
        <span className="text-sm font-medium">Partner portal</span>
        <a href="/" className="text-xs text-muted-foreground underline">Exit</a>
      </header>
      {children}
    </div>
  );
}
