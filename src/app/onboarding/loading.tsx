export default function OnboardingLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-lg font-semibold opacity-50">
          <span aria-hidden>🧭</span>
          <span>Bússola</span>
        </div>
        <span className="text-xs text-zinc-500">Carregando…</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
        <p className="text-sm text-zinc-500">Preparando seu onboarding…</p>
      </div>
    </main>
  );
}
