/**
 * Instant skeleton for /users (#528), in the shell tokens so it follows light / dark.
 */
export default function Loading() {
  const bar = 'block animate-pulse rounded-lg bg-ar-subtle';
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <span className={`${bar} h-8 w-40`} />
        <span className={`${bar} h-10 w-40`} />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-3 rounded-2xl border border-ar-line-soft bg-ar-surface p-4 shadow-ar">
          <span className={`${bar} h-9 w-full`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`${bar} h-11 w-full`} />
          ))}
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-2xl border border-ar-line-soft bg-ar-surface p-5 shadow-ar">
          <span className={`${bar} h-6 w-48`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`${bar} h-12 w-full`} />
          ))}
        </div>
      </div>
    </div>
  );
}
