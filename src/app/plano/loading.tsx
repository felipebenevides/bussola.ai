import { Card, CardContent } from "@/components/ui/card";

export default function PlanoLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-lg font-semibold opacity-50">
          <span aria-hidden>🧭</span>
          <span>Bússola · Plano</span>
        </div>
      </header>

      <section className="flex flex-1 flex-col gap-6 py-6">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-7 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="h-8 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
