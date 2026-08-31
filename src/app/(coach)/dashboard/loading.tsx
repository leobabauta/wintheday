// Covers the coach home, archive, and settings segments. Without a loading
// boundary the App Router blocks the whole navigation on the server render,
// which on a phone reads as a dead tap.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-16 rounded bg-surface mb-3" />
      <div className="h-8 w-64 rounded bg-surface mb-8" />
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="border border-border rounded-[14px] bg-surface/40 h-[110px]" />
        ))}
      </div>
    </div>
  );
}
