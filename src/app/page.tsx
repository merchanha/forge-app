import { forgeColors, forgeTapTargetMinPx } from "@/shared/theme/tokens";

const swatches = [
  { name: "Accent", value: forgeColors.accent, className: "bg-accent" },
  { name: "Ground", value: forgeColors.ground, className: "bg-ground" },
  { name: "Surface", value: forgeColors.surface, className: "bg-surface" },
  { name: "Raised", value: forgeColors.raised, className: "bg-raised" },
  { name: "Text", value: forgeColors.text, className: "bg-ink" },
  { name: "Muted", value: forgeColors.muted, className: "bg-muted" },
  { name: "Work", value: forgeColors.work, className: "bg-work" },
  { name: "Rest", value: forgeColors.rest, className: "bg-rest" },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="bg-accent font-display text-ground flex size-10 items-center justify-center rounded-md text-2xl font-extrabold"
          >
            F
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            FORGE
          </h1>
        </div>
        <p className="text-muted">
          Build your training. Track your progress. Become stronger.
        </p>
        <p className="text-muted text-sm">
          Phase 0 foundation — design tokens and tooling only. Product features
          start in Phase 1.
        </p>
      </header>

      <section
        aria-labelledby="tokens-heading"
        className="border-border bg-surface rounded-lg border p-4"
      >
        <h2
          id="tokens-heading"
          className="font-display mb-4 text-2xl font-extrabold uppercase"
        >
          Visual tokens
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <li key={swatch.name} className="flex flex-col gap-2">
              <div
                className={`border-border h-14 rounded-md border ${swatch.className}`}
              />
              <div className="text-sm font-semibold">{swatch.name}</div>
              <div className="text-muted text-xs uppercase">{swatch.value}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="bg-accent text-ground rounded-md px-4 font-semibold"
          style={{ minHeight: forgeTapTargetMinPx }}
        >
          Start Workout
        </button>
        <span className="rounded-pill bg-work text-ground px-3 py-1 text-xs font-bold">
          WORK
        </span>
        <span className="rounded-pill bg-rest text-ground px-3 py-1 text-xs font-bold">
          REST
        </span>
        <span className="rounded-pill bg-done text-ground px-3 py-1 text-xs font-bold">
          DONE
        </span>
        <span className="font-display text-accent text-5xl font-extrabold">
          17:56
        </span>
      </section>
    </main>
  );
}
