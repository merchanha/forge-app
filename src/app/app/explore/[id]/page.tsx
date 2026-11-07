import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyExploreButton } from "@/features/explore/components/copy-explore-button";
import { getExploreTemplate } from "@/features/explore/queries";
import {
  formatConfigSummary,
  routineCategoryLabels,
  workoutFormatLabels,
} from "@/features/routines/validation";

type ExploreDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatQuantity(quantity: number, unit: string): string {
  if (unit === "m" && quantity >= 1000 && quantity % 1000 === 0) {
    return `${quantity / 1000} km`;
  }
  return `${quantity} ${unit}`;
}

async function ExploreDetailContent({
  params,
}: {
  params: ExploreDetailPageProps["params"];
}) {
  const { id } = await params;

  let template: Awaited<ReturnType<typeof getExploreTemplate>> = null;
  try {
    template = await getExploreTemplate(id);
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load this template.
      </p>
    );
  }

  if (!template) {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/app/explore"
          className="text-muted hover:text-ink text-sm font-semibold"
        >
          ← Explore
        </Link>
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">
            {routineCategoryLabels[template.category]}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            {template.name}
          </h1>
          {template.description ? (
            <p className="text-muted">{template.description}</p>
          ) : null}
          {template.tags.length > 0 ? (
            <p className="text-muted text-xs font-semibold uppercase">
              {template.tags.join(" · ")}
            </p>
          ) : null}
        </div>
        <CopyExploreButton templateId={template.id} />
        <p className="text-muted text-sm">
          Saving creates a private copy in My Training. The catalog template
          stays unchanged.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-extrabold tracking-wide uppercase">
          Prescription
        </h2>
        <ol className="flex flex-col gap-4">
          {template.sections.map((section, index) => (
            <li
              key={section.id}
              className="border-border bg-surface flex flex-col gap-3 rounded-lg border px-4 py-4"
            >
              <div className="flex flex-col gap-1">
                <p className="text-muted text-xs font-semibold uppercase">
                  Section {index + 1}
                </p>
                <p className="font-display text-xl font-extrabold tracking-wide uppercase">
                  {section.name}
                </p>
                <p className="text-sm font-semibold">
                  {workoutFormatLabels[section.format]} ·{" "}
                  {formatConfigSummary(section.format, section.formatConfig)}
                </p>
              </div>
              {section.movements.length === 0 ? (
                <p className="text-muted text-sm">No movements listed.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {section.movements.map((movement) => (
                    <li
                      key={movement.id}
                      className="border-border flex flex-col gap-1 border-t pt-2 first:border-t-0 first:pt-0"
                    >
                      <p className="font-semibold">{movement.exerciseName}</p>
                      <p className="text-muted text-sm">
                        {formatQuantity(
                          movement.quantity,
                          movement.quantityUnit,
                        )}
                        {movement.loadValue != null && movement.loadUnit
                          ? ` · ${movement.loadValue} ${movement.loadUnit}`
                          : ""}
                        {movement.notes ? ` · ${movement.notes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function ExploreDetailFallback() {
  return (
    <main className="flex flex-col gap-4">
      <p className="text-muted">Loading template…</p>
    </main>
  );
}

export default function ExploreDetailPage({ params }: ExploreDetailPageProps) {
  return (
    <Suspense fallback={<ExploreDetailFallback />}>
      <ExploreDetailContent params={params} />
    </Suspense>
  );
}
