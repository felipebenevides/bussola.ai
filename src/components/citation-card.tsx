import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

export interface CitationCardProps {
  courseTitle: string;
  lessonTitle: string;
  startSeconds: number;
  similarity?: number;
  deepLink: string;
}

export function CitationCard({
  courseTitle,
  lessonTitle,
  startSeconds,
  similarity,
  deepLink,
}: CitationCardProps) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/40">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            📺 Aula CEFIS
          </p>
          <p className="mt-1 truncate text-sm font-medium" title={lessonTitle}>
            {lessonTitle}
          </p>
          <p className="truncate text-xs text-zinc-500" title={courseTitle}>
            {courseTitle}
            {typeof similarity === "number" ? ` · relevância ${Math.round(similarity * 100)}%` : ""}
          </p>
        </div>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          aria-label={`Abrir aula ${lessonTitle} a partir de ${formatDuration(startSeconds)}`}
        >
          <span>▶ Abrir aos {formatDuration(startSeconds)}</span>
        </a>
      </CardContent>
    </Card>
  );
}
