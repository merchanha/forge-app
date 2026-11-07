"use client";

import { useActionState, useId, useRef, useState } from "react";

import {
  saveRoutineAction,
  type RoutineActionState,
} from "@/features/routines/actions";
import { FormatConfigFields } from "@/features/routines/components/format-config-fields";
import {
  MovementSheet,
  type LibraryExerciseOption,
  type MovementDraft,
} from "@/features/routines/components/movement-sheet";
import {
  defaultFormatConfig,
  formatConfigSummary,
  parseTagsInput,
  quantityStep,
  routineCategories,
  routineCategoryLabels,
  routineInputSchema,
  suggestedFormatsByCategory,
  workoutFormatHints,
  workoutFormatLabels,
  workoutFormats,
  type FormatConfigMap,
  type LoadUnit,
  type QuantityUnit,
  type RoutineCategory,
  type WorkoutFormat,
} from "@/features/routines/validation";
import { StartWorkoutButton } from "@/features/workout-sessions/components/start-workout-button";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextArea } from "@/shared/ui/text-area";
import { TextField } from "@/shared/ui/text-field";

const initialState: RoutineActionState = { error: null, success: false };

type DraftMovement = MovementDraft & {
  clientId: string;
  notes: string;
};

type DraftSection = {
  clientId: string;
  name: string;
  format: WorkoutFormat;
  formatConfig: FormatConfigMap[WorkoutFormat];
  exercises: DraftMovement[];
};

export type RoutineBuilderInitial = {
  id?: string;
  name: string;
  description: string;
  category: RoutineCategory;
  tags: string[];
  sections: Array<{
    name: string;
    format: WorkoutFormat;
    formatConfig: FormatConfigMap[WorkoutFormat];
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      demoUrl: string | null;
      quantity: number;
      quantityUnit: QuantityUnit;
      loadValue: number | null;
      loadUnit: LoadUnit | null;
      notes: string;
    }>;
  }>;
};

type RoutineBuilderProps = {
  exercises: LibraryExerciseOption[];
  preferredLoadUnit: LoadUnit;
  initial?: RoutineBuilderInitial;
};

/** Deterministic draft ids — avoids crypto.randomUUID during Cache Components prerender. */
let draftIdSeq = 0;

function createClientId(prefix = "draft"): string {
  draftIdSeq += 1;
  return `${prefix}-${draftIdSeq}`;
}

function createSection(
  format: WorkoutFormat,
  name = "New section",
): DraftSection {
  return {
    clientId: createClientId("section"),
    name,
    format,
    formatConfig: defaultFormatConfig(format),
    exercises: [],
  };
}

function toDraftSections(
  initial?: RoutineBuilderInitial,
): DraftSection[] {
  if (!initial || initial.sections.length === 0) {
    return [
      {
        clientId: "section-0",
        name: "Metcon",
        format: "amrap",
        formatConfig: defaultFormatConfig("amrap"),
        exercises: [],
      },
    ];
  }

  return initial.sections.map((section, sectionIndex) => ({
    clientId: `section-${sectionIndex}`,
    name: section.name,
    format: section.format,
    formatConfig: section.formatConfig,
    exercises: section.exercises.map((exercise, exerciseIndex) => ({
      clientId: `section-${sectionIndex}-ex-${exerciseIndex}`,
      ...exercise,
    })),
  }));
}

function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }
  const copy = items.slice();
  const removed = copy.splice(index, 1);
  const item = removed[0];
  if (item === undefined) {
    return items;
  }
  copy.splice(nextIndex, 0, item);
  return copy;
}

function prescriptionLabel(
  format: WorkoutFormat,
  formatConfig: FormatConfigMap[WorkoutFormat],
  movement: DraftMovement,
): string {
  if (format === "strength") {
    const config = formatConfig as FormatConfigMap["strength"];
    const load =
      movement.loadValue != null && movement.loadUnit
        ? ` @ ${movement.loadValue} ${movement.loadUnit}`
        : "";
    return `${config.sets} × ${movement.quantity}${load}`;
  }

  const load =
    movement.loadValue != null && movement.loadUnit
      ? ` @ ${movement.loadValue} ${movement.loadUnit}`
      : "";
  return `${movement.quantity} ${movement.quantityUnit}${load}`;
}

export function RoutineBuilder({
  exercises,
  preferredLoadUnit,
  initial,
}: RoutineBuilderProps) {
  const formId = useId();
  const payloadRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(saveRoutineAction, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<RoutineCategory>(
    initial?.category ?? "crossfit",
  );
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [boot] = useState(() => {
    const draftSections = toDraftSections(initial);
    return {
      sections: draftSections,
      openSectionId: draftSections[0]?.clientId ?? null,
    };
  });
  const [sections, setSections] = useState<DraftSection[]>(boot.sections);
  const [openSectionId, setOpenSectionId] = useState<string | null>(
    boot.openSectionId,
  );
  const [preview, setPreview] = useState(false);
  const [moreOptions, setMoreOptions] = useState(
    Boolean(initial?.description || (initial?.tags?.length ?? 0) > 0),
  );
  const [sheet, setSheet] = useState<"format" | "movement" | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const suggested = suggestedFormatsByCategory[category];
  const formatOrder = [
    ...suggested,
    ...workoutFormats.filter((format) => !suggested.includes(format)),
  ];

  function updateSection(
    clientId: string,
    updater: (section: DraftSection) => DraftSection,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.clientId === clientId ? updater(section) : section,
      ),
    );
  }

  function buildPayload() {
    return {
      id: initial?.id ?? null,
      name,
      description,
      category,
      tags: parseTagsInput(tagsText),
      sections: sections.map((section) => ({
        name: section.name,
        format: section.format,
        formatConfig: section.formatConfig,
        exercises: section.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          quantity: exercise.quantity,
          quantityUnit: exercise.quantityUnit,
          loadValue: exercise.loadValue,
          loadUnit: exercise.loadUnit,
          notes: exercise.notes,
        })),
      })),
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">
            {preview ? "Preview" : "Builder"}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            {preview ? "Preview" : "Routine"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 text-sm font-semibold"
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </header>

      {preview ? (
        <PreviewPanel
          name={name}
          category={category}
          sections={sections}
        />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <p className="text-muted text-sm font-semibold">Workout type</p>
            <div className="flex flex-wrap gap-2">
              {routineCategories.map((option) => {
                const on = category === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold"
                    style={{
                      background: on ? "#FF5A1F" : "#16161A",
                      color: on ? "#0C0C0E" : "#F4F2EE",
                      borderColor: on ? "#FF5A1F" : "#2A2A32",
                    }}
                  >
                    {routineCategoryLabels[option]}
                  </button>
                );
              })}
            </div>
            <p className="text-muted text-sm">
              Used to suggest formats and organize My Training.
            </p>
          </section>

          <TextField
            id={`${formId}-name`}
            name="display-name"
            label="Routine name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
          />

          <button
            type="button"
            onClick={() => setMoreOptions((value) => !value)}
            className="text-muted text-left text-sm font-semibold"
          >
            {moreOptions
              ? "− Fewer options"
              : "＋ Description and tags"}
          </button>

          {moreOptions ? (
            <div className="flex flex-col gap-4">
              <TextArea
                id={`${formId}-description`}
                name="display-description"
                label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
              />
              <TextField
                id={`${formId}-tags`}
                name="display-tags"
                label="Tags"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="engine, barbell"
              />
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">
                Sections · {sections.length}
              </h2>
            </div>

            <ul className="flex flex-col gap-3">
              {sections.map((section, index) => {
                const open = openSectionId === section.clientId;
                return (
                  <li
                    key={section.clientId}
                    className="border-border bg-surface rounded-lg border"
                    style={{ borderColor: open ? "#FF5A1F" : undefined }}
                  >
                    <div className="flex items-start gap-2 p-3">
                      <button
                        type="button"
                        className="flex min-h-12 flex-1 flex-col items-start justify-center gap-1 text-left"
                        onClick={() =>
                          setOpenSectionId(open ? null : section.clientId)
                        }
                      >
                        <span className="font-semibold">
                          {index + 1} · {section.name}
                        </span>
                        <span className="text-muted text-xs">
                          {workoutFormatLabels[section.format]} ·{" "}
                          {formatConfigSummary(
                            section.format,
                            section.formatConfig,
                          )}{" "}
                          · {section.exercises.length} moves
                        </span>
                      </button>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label="Move section up"
                          className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm font-semibold"
                          onClick={() =>
                            setSections((current) =>
                              moveItem(current, index, -1),
                            )
                          }
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label="Move section down"
                          className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm font-semibold"
                          onClick={() =>
                            setSections((current) =>
                              moveItem(current, index, 1),
                            )
                          }
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {open ? (
                      <div className="border-border flex flex-col gap-4 border-t p-3">
                        <TextField
                          id={`${formId}-section-${section.clientId}`}
                          name={`section-name-${section.clientId}`}
                          label="Section name"
                          value={section.name}
                          onChange={(event) =>
                            updateSection(section.clientId, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          maxLength={80}
                        />

                        <label className="flex flex-col gap-2">
                          <span className="text-muted text-sm font-semibold">
                            Format
                          </span>
                          <select
                            className="border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base"
                            value={section.format}
                            onChange={(event) => {
                              const format = event.target
                                .value as WorkoutFormat;
                              updateSection(section.clientId, (current) => ({
                                ...current,
                                format,
                                formatConfig: defaultFormatConfig(format),
                              }));
                            }}
                          >
                            {formatOrder.map((format) => (
                              <option key={format} value={format}>
                                {workoutFormatLabels[format]}
                                {suggested.includes(format) ? " · suggested" : ""}
                              </option>
                            ))}
                          </select>
                          <span className="text-muted text-xs">
                            {workoutFormatHints[section.format]}
                          </span>
                        </label>

                        <FormatConfigFields
                          format={section.format}
                          value={section.formatConfig}
                          onChange={(formatConfig) =>
                            updateSection(section.clientId, (current) => ({
                              ...current,
                              formatConfig,
                            }))
                          }
                        />

                        <ul className="flex flex-col gap-2">
                          {section.exercises.map((movement, moveIndex) => (
                            <li
                              key={movement.clientId}
                              className="border-border bg-raised flex flex-col gap-2 rounded-md border p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold">
                                    {movement.exerciseName}
                                  </p>
                                  <p className="text-muted text-xs">
                                    {prescriptionLabel(
                                      section.format,
                                      section.formatConfig,
                                      movement,
                                    )}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    aria-label="Move movement up"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) => ({
                                          ...current,
                                          exercises: moveItem(
                                            current.exercises,
                                            moveIndex,
                                            -1,
                                          ),
                                        }),
                                      )
                                    }
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Move movement down"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) => ({
                                          ...current,
                                          exercises: moveItem(
                                            current.exercises,
                                            moveIndex,
                                            1,
                                          ),
                                        }),
                                      )
                                    }
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Remove movement"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) => ({
                                          ...current,
                                          exercises: current.exercises.filter(
                                            (item) =>
                                              item.clientId !==
                                              movement.clientId,
                                          ),
                                        }),
                                      )
                                    }
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                  onClick={() => {
                                    const step =
                                      quantityStep[movement.quantityUnit];
                                    updateSection(
                                      section.clientId,
                                      (current) => ({
                                        ...current,
                                        exercises: current.exercises.map(
                                          (item) =>
                                            item.clientId === movement.clientId
                                              ? {
                                                  ...item,
                                                  quantity: Math.max(
                                                    step,
                                                    item.quantity - step,
                                                  ),
                                                }
                                              : item,
                                        ),
                                      }),
                                    );
                                  }}
                                >
                                  −
                                </button>
                                <span className="text-sm font-semibold">
                                  {movement.quantity} {movement.quantityUnit}
                                </span>
                                <button
                                  type="button"
                                  className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                  onClick={() => {
                                    const step =
                                      quantityStep[movement.quantityUnit];
                                    updateSection(
                                      section.clientId,
                                      (current) => ({
                                        ...current,
                                        exercises: current.exercises.map(
                                          (item) =>
                                            item.clientId === movement.clientId
                                              ? {
                                                  ...item,
                                                  quantity: item.quantity + step,
                                                }
                                              : item,
                                        ),
                                      }),
                                    );
                                  }}
                                >
                                  ＋
                                </button>

                                {movement.loadValue != null &&
                                movement.loadUnit ? (
                                  <>
                                    <button
                                      type="button"
                                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                      onClick={() =>
                                        updateSection(
                                          section.clientId,
                                          (current) => ({
                                            ...current,
                                            exercises: current.exercises.map(
                                              (item) =>
                                                item.clientId ===
                                                movement.clientId
                                                  ? {
                                                      ...item,
                                                      loadValue: Math.max(
                                                        0,
                                                        (item.loadValue ?? 0) -
                                                          2.5,
                                                      ),
                                                      loadUnit:
                                                        Math.max(
                                                          0,
                                                          (item.loadValue ??
                                                            0) - 2.5,
                                                        ) > 0
                                                          ? item.loadUnit
                                                          : null,
                                                    }
                                                  : item,
                                            ),
                                          }),
                                        )
                                      }
                                    >
                                      −
                                    </button>
                                    <span className="text-sm font-semibold">
                                      {movement.loadValue} {movement.loadUnit}
                                    </span>
                                    <button
                                      type="button"
                                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                      onClick={() =>
                                        updateSection(
                                          section.clientId,
                                          (current) => ({
                                            ...current,
                                            exercises: current.exercises.map(
                                              (item) =>
                                                item.clientId ===
                                                movement.clientId
                                                  ? {
                                                      ...item,
                                                      loadValue:
                                                        (item.loadValue ?? 0) +
                                                        2.5,
                                                      loadUnit:
                                                        item.loadUnit ??
                                                        preferredLoadUnit,
                                                    }
                                                  : item,
                                            ),
                                          }),
                                        )
                                      }
                                    >
                                      ＋
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="border-border text-muted inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-semibold"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) => ({
                                          ...current,
                                          exercises: current.exercises.map(
                                            (item) =>
                                              item.clientId ===
                                              movement.clientId
                                                ? {
                                                    ...item,
                                                    loadValue: 20,
                                                    loadUnit: preferredLoadUnit,
                                                  }
                                                : item,
                                          ),
                                        }),
                                      )
                                    }
                                  >
                                    ＋ Load
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
                          onClick={() => setSheet("movement")}
                        >
                          ＋ Add movement
                        </button>

                        <button
                          type="button"
                          className="text-muted text-sm font-semibold"
                          onClick={() => {
                            setSections((current) =>
                              current.filter(
                                (item) => item.clientId !== section.clientId,
                              ),
                            );
                            setOpenSectionId(null);
                          }}
                        >
                          Remove section
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
              onClick={() => setSheet("format")}
            >
              ＋ Add section
            </button>
          </section>
        </>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          const draft = buildPayload();
          const parsed = routineInputSchema.safeParse(draft);
          if (!parsed.success) {
            event.preventDefault();
            setClientError(
              parsed.error.issues[0]?.message ??
                "Fix the routine before saving.",
            );
            setPreview(false);
            return;
          }
          setClientError(null);
          if (payloadRef.current) {
            payloadRef.current.value = JSON.stringify(parsed.data);
          }
        }}
      >
        <input ref={payloadRef} type="hidden" name="payload" defaultValue="" />
        {(clientError || state.error) && (
          <p className="text-sm text-[#ff8f6b]" role="alert">
            {clientError ?? state.error}
          </p>
        )}
        <SubmitButton
          idleLabel="Save to My Training"
          pendingLabel="Saving…"
        />
      </form>

      {initial?.id ? (
        <StartWorkoutButton routineId={initial.id} label="Start workout" />
      ) : null}

      {sheet === "format" ? (
        <FormatSheet
          formats={formatOrder}
          suggested={suggested}
          onClose={() => setSheet(null)}
          onPick={(format) => {
            const next = createSection(format);
            setSections((current) => [...current, next]);
            setOpenSectionId(next.clientId);
            setSheet(null);
          }}
        />
      ) : null}

      <MovementSheet
        open={sheet === "movement"}
        exercises={exercises}
        preferredLoadUnit={preferredLoadUnit}
        onClose={() => setSheet(null)}
        onAdd={(movement) => {
          const targetId =
            openSectionId ?? sections[sections.length - 1]?.clientId;
          if (!targetId) {
            setSheet(null);
            return;
          }
          updateSection(targetId, (current) => ({
            ...current,
            exercises: [
              ...current.exercises,
              {
                clientId: createClientId(),
                notes: "",
                ...movement,
              },
            ],
          }));
          setOpenSectionId(targetId);
          setSheet(null);
        }}
      />
    </div>
  );
}

function FormatSheet({
  formats,
  suggested,
  onClose,
  onPick,
}: {
  formats: WorkoutFormat[];
  suggested: WorkoutFormat[];
  onClose: () => void;
  onPick: (format: WorkoutFormat) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close format sheet"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="format-sheet-title"
        className="border-border bg-surface relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="format-sheet-title"
            className="font-display text-2xl font-extrabold uppercase"
          >
            Section format
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-border inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-lg font-semibold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {formats.map((format) => (
            <li key={format}>
              <button
                type="button"
                onClick={() => onPick(format)}
                className="border-border bg-raised hover:border-accent flex min-h-14 w-full flex-col items-start justify-center gap-1 rounded-lg border px-4 py-3 text-left"
              >
                <span className="font-semibold">
                  {workoutFormatLabels[format]}
                  {suggested.includes(format) ? (
                    <span className="text-accent ml-2 text-xs font-semibold uppercase">
                      Suggested
                    </span>
                  ) : null}
                </span>
                <span className="text-muted text-xs">
                  {workoutFormatHints[format]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreviewPanel({
  name,
  category,
  sections,
}: {
  name: string;
  category: RoutineCategory;
  sections: DraftSection[];
}) {
  return (
    <section className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-display text-3xl font-extrabold uppercase">
          {name.trim() || "Untitled routine"}
        </h2>
        <p className="text-muted mt-1 text-sm">
          {routineCategoryLabels[category]} · {sections.length} sections
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {sections.map((section, index) => (
          <li key={section.clientId} className="flex flex-col gap-2">
            <p className="font-semibold">
              {index + 1}. {section.name}
            </p>
            <p className="text-muted text-sm">
              {workoutFormatLabels[section.format]} ·{" "}
              {formatConfigSummary(section.format, section.formatConfig)}
            </p>
            <ul className="flex flex-col gap-1">
              {section.exercises.map((movement) => (
                <li key={movement.clientId} className="text-sm">
                  {movement.exerciseName}
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {prescriptionLabel(
                      section.format,
                      section.formatConfig,
                      movement,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="text-muted text-sm">
        Saved to My Training as a reusable template.
      </p>
    </section>
  );
}
