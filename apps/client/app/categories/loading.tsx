import { Skeleton, cardClass } from '../orders/list/parts';

/** Route loading UI for Danh mục (#543): the page frame in shell tokens, no text. */
export default function Loading() {
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <section className={`${cardClass} flex flex-col gap-3 px-4 py-4`}>
        <Skeleton className="h-9 w-full md:w-[320px]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </section>
    </div>
  );
}
