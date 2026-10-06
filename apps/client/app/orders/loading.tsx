/** Shown while /orders loads: the page frame with skeleton rows, no text to translate. */
export default function Loading() {
  const bar = 'block animate-pulse rounded-lg bg-ar-subtle';
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
      <div className="flex items-center justify-between">
        <span className={`${bar} h-8 w-40`} />
        <span className={`${bar} h-10 w-28`} />
      </div>
      <span className={`${bar} h-11 w-80`} />
      <div className="flex flex-col gap-3 rounded-2xl border border-ar-line-soft bg-ar-surface p-4 shadow-ar">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={`${bar} h-11 w-full`} />
        ))}
      </div>
    </div>
  );
}
