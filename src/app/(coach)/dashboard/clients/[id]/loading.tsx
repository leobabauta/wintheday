// Without a loading boundary the App Router blocks the whole navigation on
// the server render, so tapping "Open" in the inbox felt like a dead button.
// This paints the page shell immediately instead.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-3.5 w-20 rounded bg-surface mb-3.5" />
        <div className="h-8 w-56 rounded bg-surface" />
        <div className="h-3 w-40 rounded bg-surface mt-2.5" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="border border-border rounded-[14px] bg-surface/40 h-[200px]" />
        ))}
        <div className="md:col-span-2 border border-border rounded-[14px] bg-surface/40 h-[320px]" />
      </div>
    </div>
  );
}
