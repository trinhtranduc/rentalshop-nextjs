/** Shown while /customers loads: the page frame with skeleton rows and panel, no text to translate. */
export default function Loading() {
  const bar = 'block animate-pulse rounded-lg bg-ar-subtle';
  const card = 'rounded-2xl border border-ar-line-soft bg-ar-surface shadow-ar';
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
      <div className="flex items-center justify-between">
        <span className={`${bar} h-8 w-44`} />
        <span className={`${bar} h-10 w-32`} />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className={`${card} flex min-w-0 flex-[3_1_520px] flex-col gap-3 p-4`}>
          <span className={`${bar} h-9 w-full max-w-[420px]`} />
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={`${bar} h-11 w-full`} />
          ))}
        </div>
        <div className={`${card} hidden min-w-0 flex-[2_1_360px] flex-col gap-3 p-5 lg:flex`}>
          <div className="flex items-center gap-3">
            <span className={`${bar} h-12 w-12 rounded-full`} />
            <span className={`${bar} h-6 flex-1`} />
          </div>
          <span className={`${bar} h-16 w-full`} />
          <span className={`${bar} h-10 w-full`} />
          <span className={`${bar} h-10 w-full`} />
        </div>
      </div>
    </div>
  );
}
