const block = 'animate-pulse rounded-2xl border border-ar-line-soft bg-ar-surface';

export default function DashboardLoading() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
      <div className="h-12 w-60 animate-pulse rounded-lg bg-ar-subtle" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[116px]`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <div className={`${block} h-[320px] flex-[2_1_560px]`} />
        <div className={`${block} h-[320px] flex-[1_1_320px]`} />
      </div>
    </div>
  );
}
