export function PrintWriteIn({ label, className }: { label: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      <div className="border-b-2 border-zinc-900 h-9" />
    </div>
  );
}
