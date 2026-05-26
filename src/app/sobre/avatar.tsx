"use client";

import { useState } from "react";

export function Avatar({ src, initials }: { src: string; initials: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="relative mx-auto md:mx-0">
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-500/40 via-teal-500/30 to-sky-500/40 opacity-70 blur-xl" />
      <div className="relative h-44 w-44 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:h-56 sm:w-56">
        {!errored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Foto de Felipe Benevides"
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        )}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-700 to-sky-800 text-zinc-100">
            <span className="text-6xl font-bold tracking-tight">{initials}</span>
            <span className="mt-2 text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
              Foto · placeholder
            </span>
          </div>
        )}
        <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
      </div>
      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-700/60 bg-zinc-950 px-3 py-1 text-[10px] font-medium text-emerald-300 shadow-md md:left-auto md:right-2 md:translate-x-0">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        aberto a conversas
      </div>
    </div>
  );
}
