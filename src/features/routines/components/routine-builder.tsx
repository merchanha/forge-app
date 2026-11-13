"use client";

import { useActionState, useId, useState, useTransition } from "react";

import { ensureOwnedExerciseAction } from "@/features/exercises/actions";
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
  defaultMoreOptions,
  moreOptionLabels,
  starterSectionsForCategory,
} from "@/features/routines/lib/run-segments";
import {
  defaultFormatConfig,
  defaultRoutineNames,
  formatConfigSummary,
  formatOrderForCategory,
  formatPaceLabel,
  formatQuantityLabel,
  parseTagsInput,
  quantityStep,
  routineCategories,
  routineCategoryLabels,
  routineInputSchema,
  suggestedFormatsByCategory,
  workoutFormatHints,
  workoutFormatLabels,
  type FormatConfigMap,
  type HrZone,
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
};

type DraftSection = {
  clientId: string;
  name: string;
  format: WorkoutFormat;
  formatConfig: FormatConfigMap[WorkoutFormat];
  exercises: DraftMovement[];
};

type CategoryDraft = {
  name: string;
  description: string;
  tagsText: string;
  objective: string;
  equipment: string;
  scaling: string;
  effortRpe: number | null;
  sections: DraftSection[];
  openSectionId: string | null;
};

export type RoutineBuilderInitial = {
  id?: string;
  name: string;
  description: string;
  category: RoutineCategory;
  tags: string[];
  objective?: string;
  equipment?: string;
  scaling?: string;
  effortRpe?: number | null;
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
      targetPaceSecondsPerKm?: number | null;
      hrZone?: HrZone | null;
      segmentRepeats?: number | null;
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

function toDraftSections(initial?: RoutineBuilderInitial): DraftSection[] {
  if (!initial || initial.sections.length === 0) {
    if (initial?.category === "custom") {
      return [];
    }
    if (initial?.category === "running") {
      return [];
    }
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
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      demoUrl: exercise.demoUrl,
      quantity: exercise.quantity,
      quantityUnit: exercise.quantityUnit,
      loadValue: exercise.loadValue,
      loadUnit: exercise.loadUnit,
      targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm ?? null,
      hrZone: exercise.hrZone ?? null,
      segmentRepeats: exercise.segmentRepeats ?? null,
      notes: exercise.notes,
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
  runningMode: boolean,
): string {
  if (runningMode || movement.targetPaceSecondsPerKm != null || movement.hrZone) {
    const repeats =
      movement.segmentRepeats != null ? `${movement.segmentRepeats} × ` : "";
    const pace =
      movement.targetPaceSecondsPerKm != null
        ? ` · ${formatPaceLabel(movement.targetPaceSecondsPerKm)}`
        : "";
    const zone = movement.hrZone ? ` · ${movement.hrZone}` : "";
    return `${repeats}${formatQuantityLabel(movement.quantity, movement.quantityUnit)}${pace}${zone}`;
  }

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
  return `${formatQuantityLabel(movement.quantity, movement.quantityUnit)}${load}`;
}

function patchMovement(
  section: DraftSection,
  clientId: string,
  patch: Partial<DraftMovement>,
): DraftSection {
  return {
    ...section,
    exercises: section.exercises.map((item) =>
      item.clientId === clientId ? { ...item, ...patch } : item,
    ),
  };
}

async function resolveStarterSections(
  category: RoutineCategory,
  library: LibraryExerciseOption[],
): Promise<{
  sections: DraftSection[];
  ensured: LibraryExerciseOption[];
}> {
  const starters = starterSectionsForCategory(category);
  const ensured: LibraryExerciseOption[] = [];
  const cache = new Map(
    library.map((exercise) => [exercise.name.toLowerCase(), exercise]),
  );

  async function resolveName(name: string): Promise<LibraryExerciseOption> {
    const hit = cache.get(name.toLowerCase());
    if (hit) return hit;
    const created = await ensureOwnedExerciseAction({
      name,
      description: "",
      movementCategory: "monostructural",
      equipment: "None",
    });
    if (!created.ok) {
      throw new Error(created.error);
    }
    const option = {
      id: created.id,
      name: created.name,
      equipment: "None",
      demoUrl: created.demoUrl,
    };
    cache.set(name.toLowerCase(), option);
    ensured.push(option);
    return option;
  }

  const sections: DraftSection[] = [];
  for (const starter of starters) {
    const exercises: DraftMovement[] = [];
    for (const movement of starter.movements) {
      const exercise = await resolveName(movement.name);
      exercises.push({
        clientId: createClientId("ex"),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        demoUrl: exercise.demoUrl,
        quantity: movement.quantity,
        quantityUnit: movement.quantityUnit,
        loadValue: movement.loadValue,
        loadUnit: null,
        targetPaceSecondsPerKm: movement.targetPaceSecondsPerKm,
        hrZone: movement.hrZone,
        segmentRepeats: movement.segmentRepeats,
        notes: movement.notes,
      });
    }
    sections.push({
      clientId: createClientId("section"),
      name: starter.name,
      format: starter.format,
      formatConfig: starter.formatConfig as FormatConfigMap[WorkoutFormat],
      exercises,
    });
  }

  return { sections, ensured };
}

export function RoutineBuilder({
  exercises: initialExercises,
  preferredLoadUnit,
  initial,
}: RoutineBuilderProps) {
  const formId = useId();
  const [state, formAction] = useActionState(saveRoutineAction, initialState);
  const isEditing = Boolean(initial?.id);
  const [switching, startSwitch] = useTransition();
  const [library, setLibrary] =
    useState<LibraryExerciseOption[]>(initialExercises);

  const defaults = defaultMoreOptions(initial?.category ?? "crossfit");
  const [name, setName] = useState(
    initial?.name ?? defaultRoutineNames[initial?.category ?? "crossfit"],
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<RoutineCategory>(
    initial?.category ?? "crossfit",
  );
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [objective, setObjective] = useState(
    initial?.objective ?? defaults.objective,
  );
  const [equipment, setEquipment] = useState(
    initial?.equipment ?? defaults.equipment,
  );
  const [scaling, setScaling] = useState(initial?.scaling ?? defaults.scaling);
  const [effortRpe, setEffortRpe] = useState<number | null>(
    initial?.effortRpe ?? defaults.effortRpe,
  );
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
  const [draftStore, setDraftStore] = useState<
    Partial<Record<RoutineCategory, CategoryDraft>>
  >({});
  const [preview, setPreview] = useState(false);
  const [moreOptions, setMoreOptions] = useState(true);
  const [sheet, setSheet] = useState<"format" | "movement" | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const runningMode = category === "running";
  const suggested = suggestedFormatsByCategory[category];
  const formatOrder = formatOrderForCategory(category);
  const optionLabels = moreOptionLabels(category);

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

  function currentDraft(): CategoryDraft {
    return {
      name,
      description,
      tagsText,
      objective,
      equipment,
      scaling,
      effortRpe,
      sections,
      openSectionId,
    };
  }

  function applyDraft(draft: CategoryDraft) {
    setName(draft.name);
    setDescription(draft.description);
    setTagsText(draft.tagsText);
    setObjective(draft.objective);
    setEquipment(draft.equipment);
    setScaling(draft.scaling);
    setEffortRpe(draft.effortRpe);
    setSections(draft.sections);
    setOpenSectionId(draft.openSectionId);
  }

  function switchCategory(next: RoutineCategory) {
    if (next === category || switching) return;
    const snapshot = currentDraft();
    startSwitch(async () => {
      const nextStore = { ...draftStore, [category]: snapshot };
      setDraftStore(nextStore);
      const cached = nextStore[next];
      if (cached) {
        setCategory(next);
        applyDraft(cached);
        setClientError(null);
        return;
      }

      const more = defaultMoreOptions(next);
      try {
        const resolved = await resolveStarterSections(next, library);
        if (resolved.ensured.length > 0) {
          setLibrary((current) => {
            const ids = new Set(current.map((item) => item.id));
            return [
              ...current,
              ...resolved.ensured.filter((item) => !ids.has(item.id)),
            ];
          });
        }
        setCategory(next);
        setName(
          Object.values(defaultRoutineNames).includes(snapshot.name.trim())
            ? defaultRoutineNames[next]
            : snapshot.name,
        );
        setDescription("");
        setTagsText("");
        setObjective(more.objective);
        setEquipment(more.equipment);
        setScaling(more.scaling);
        setEffortRpe(more.effortRpe);
        setSections(resolved.sections);
        setOpenSectionId(resolved.sections[0]?.clientId ?? null);
        setClientError(null);
      } catch (error) {
        setClientError(
          error instanceof Error
            ? error.message
            : "Could not switch workout type.",
        );
      }
    });
  }

  function buildPayload() {
    return {
      id: initial?.id ?? null,
      name,
      description,
      category,
      tags: parseTagsInput(tagsText),
      objective,
      equipment,
      scaling,
      effortRpe,
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
          targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm,
          hrZone: exercise.hrZone,
          segmentRepeats: exercise.segmentRepeats,
          notes: exercise.notes,
        })),
      })),
    };
  }

  const editor = (
    <>
      <section className="flex flex-col gap-3">
        <p className="text-muted text-sm font-semibold">Workout type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {routineCategories.map((option) => {
            const on = category === option;
            return (
              <button
                key={option}
                type="button"
                disabled={switching}
                onClick={() => switchCategory(option)}
                className={`inline-flex min-h-[52px] items-center justify-center rounded-2xl border px-3 text-sm font-bold ${
                  on
                    ? "border-accent bg-accent text-ground"
                    : "border-border bg-surface text-ink"
                }`}
              >
                {routineCategoryLabels[option]}
              </button>
            );
          })}
        </div>
        <p className="text-muted text-sm">
          {switching
            ? "Switching type…"
            : "Switching types keeps your edits for each type in this session."}
        </p>
      </section>

      <TextField
        id={`${formId}-name`}
        name="display-name"
        label="Routine name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <button
        type="button"
        className="text-muted text-left text-sm font-semibold"
        onClick={() => setMoreOptions((value) => !value)}
        aria-expanded={moreOptions}
      >
        {moreOptions ? "− Fewer options" : "＋ More options"}
      </button>

      {moreOptions ? (
        <section className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <TextField
            id={`${formId}-objective`}
            label={optionLabels.objective}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
          <TextField
            id={`${formId}-equipment`}
            label={optionLabels.equipment}
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
          />
          <TextField
            id={`${formId}-scaling`}
            label={optionLabels.scaling}
            value={scaling}
            onChange={(event) => setScaling(event.target.value)}
          />
          <label className="flex flex-col gap-2" htmlFor={`${formId}-rpe`}>
            <span className="text-sm font-semibold">
              {optionLabels.effortRpe}
            </span>
            <input
              id={`${formId}-rpe`}
              type="number"
              min={1}
              max={10}
              value={effortRpe ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                setEffortRpe(raw === "" ? null : Number(raw));
              }}
              className="border-border bg-ground min-h-12 rounded-md border px-3"
            />
          </label>
          <TextArea
            id={`${formId}-description`}
            label="Notes"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            id={`${formId}-tags`}
            label="Tags (comma separated)"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold uppercase">
            Sections
          </h2>
          <span className="text-muted text-sm font-semibold">
            {sections.length}
          </span>
        </div>

        {sections.length === 0 ? (
          <p className="text-muted text-sm">
            Add a section to start building this {routineCategoryLabels[category]}{" "}
            routine.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sections.map((section, sectionIndex) => {
              const open = openSectionId === section.clientId;
              return (
                <li
                  key={section.clientId}
                  className={`border-border bg-surface flex flex-col gap-3 rounded-lg border px-4 py-4 ${
                    open ? "border-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
                      onClick={() =>
                        setOpenSectionId(open ? null : section.clientId)
                      }
                    >
                      <span className="font-display text-xl font-extrabold uppercase">
                        {sectionIndex + 1}. {section.name}
                      </span>
                      <span className="text-muted text-sm">
                        {workoutFormatLabels[section.format]} ·{" "}
                        {formatConfigSummary(
                          section.format,
                          section.formatConfig,
                        )}{" "}
                        · {section.exercises.length}{" "}
                        {runningMode ? "segments" : "moves"}
                      </span>
                    </button>
                    <span className="bg-accent text-ground rounded-full px-2 py-1 text-[11px] font-extrabold uppercase">
                      {workoutFormatLabels[section.format]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label="Move section up"
                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                      onClick={() =>
                        setSections((current) =>
                          moveItem(current, sectionIndex, -1),
                        )
                      }
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Move section down"
                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                      onClick={() =>
                        setSections((current) =>
                          moveItem(current, sectionIndex, 1),
                        )
                      }
                    >
                      ▼
                    </button>
                  </div>

                  {open ? (
                    <div className="flex flex-col gap-4">
                      <TextField
                        id={`${formId}-${section.clientId}-name`}
                        label="Section name"
                        value={section.name}
                        onChange={(event) =>
                          updateSection(section.clientId, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
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

                      <ul className="flex flex-col gap-3">
                        {section.exercises.map((movement, moveIndex) => (
                          <li
                            key={movement.clientId}
                            className="border-border flex flex-col gap-2 border-t pt-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">
                                {movement.exerciseName}
                              </p>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  aria-label="Move up"
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
                                  aria-label="Move down"
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
                                  aria-label="Remove"
                                  className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border text-sm"
                                  onClick={() =>
                                    updateSection(
                                      section.clientId,
                                      (current) => ({
                                        ...current,
                                        exercises: current.exercises.filter(
                                          (item) =>
                                            item.clientId !== movement.clientId,
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
                                  updateSection(section.clientId, (current) =>
                                    patchMovement(current, movement.clientId, {
                                      quantity: Math.max(
                                        step,
                                        movement.quantity - step,
                                      ),
                                    }),
                                  );
                                }}
                              >
                                −
                              </button>
                              <span className="text-sm font-semibold">
                                {formatQuantityLabel(
                                  movement.quantity,
                                  movement.quantityUnit,
                                )}
                              </span>
                              <button
                                type="button"
                                className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                onClick={() => {
                                  const step =
                                    quantityStep[movement.quantityUnit];
                                  updateSection(section.clientId, (current) =>
                                    patchMovement(current, movement.clientId, {
                                      quantity: movement.quantity + step,
                                    }),
                                  );
                                }}
                              >
                                ＋
                              </button>

                              {runningMode ||
                              movement.targetPaceSecondsPerKm != null ? (
                                movement.targetPaceSecondsPerKm != null ? (
                                  <>
                                    <button
                                      type="button"
                                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                      aria-label="Faster pace"
                                      onClick={() =>
                                        updateSection(
                                          section.clientId,
                                          (current) =>
                                            patchMovement(
                                              current,
                                              movement.clientId,
                                              {
                                                targetPaceSecondsPerKm:
                                                  Math.max(
                                                    150,
                                                    (movement.targetPaceSecondsPerKm ??
                                                      300) - 5,
                                                  ),
                                              },
                                            ),
                                        )
                                      }
                                    >
                                      −
                                    </button>
                                    <span className="text-sm font-semibold">
                                      {formatPaceLabel(
                                        movement.targetPaceSecondsPerKm,
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                      aria-label="Slower pace"
                                      onClick={() =>
                                        updateSection(
                                          section.clientId,
                                          (current) =>
                                            patchMovement(
                                              current,
                                              movement.clientId,
                                              {
                                                targetPaceSecondsPerKm:
                                                  Math.min(
                                                    1800,
                                                    (movement.targetPaceSecondsPerKm ??
                                                      300) + 5,
                                                  ),
                                              },
                                            ),
                                        )
                                      }
                                    >
                                      ＋
                                    </button>
                                  </>
                                ) : null
                              ) : movement.loadValue != null &&
                                movement.loadUnit ? (
                                <>
                                  <button
                                    type="button"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) =>
                                          patchMovement(
                                            current,
                                            movement.clientId,
                                            {
                                              loadValue: Math.max(
                                                0,
                                                (movement.loadValue ?? 0) - 2.5,
                                              ),
                                              loadUnit:
                                                Math.max(
                                                  0,
                                                  (movement.loadValue ?? 0) -
                                                    2.5,
                                                ) > 0
                                                  ? movement.loadUnit
                                                  : null,
                                            },
                                          ),
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
                                        (current) =>
                                          patchMovement(
                                            current,
                                            movement.clientId,
                                            {
                                              loadValue:
                                                (movement.loadValue ?? 0) + 2.5,
                                              loadUnit:
                                                movement.loadUnit ??
                                                preferredLoadUnit,
                                            },
                                          ),
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
                                    updateSection(section.clientId, (current) =>
                                      patchMovement(current, movement.clientId, {
                                        loadValue: 20,
                                        loadUnit: preferredLoadUnit,
                                      }),
                                    )
                                  }
                                >
                                  ＋ Load
                                </button>
                              )}

                              {movement.segmentRepeats != null ? (
                                <>
                                  <button
                                    type="button"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) =>
                                          patchMovement(
                                            current,
                                            movement.clientId,
                                            {
                                              segmentRepeats: Math.max(
                                                1,
                                                (movement.segmentRepeats ?? 1) -
                                                  1,
                                              ),
                                            },
                                          ),
                                      )
                                    }
                                  >
                                    −
                                  </button>
                                  <span className="text-sm font-semibold">
                                    {movement.segmentRepeats} ×
                                  </span>
                                  <button
                                    type="button"
                                    className="border-border inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border"
                                    onClick={() =>
                                      updateSection(
                                        section.clientId,
                                        (current) =>
                                          patchMovement(
                                            current,
                                            movement.clientId,
                                            {
                                              segmentRepeats: Math.min(
                                                100,
                                                (movement.segmentRepeats ?? 1) +
                                                  1,
                                              ),
                                            },
                                          ),
                                      )
                                    }
                                  >
                                    ＋
                                  </button>
                                </>
                              ) : null}

                              {movement.hrZone ? (
                                <span className="text-muted text-sm font-semibold">
                                  {movement.hrZone}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
                        onClick={() => setSheet("movement")}
                      >
                        {runningMode ? "＋ Add segment" : "＋ Add movement"}
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
        )}

        <button
          type="button"
          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
          onClick={() => setSheet("format")}
        >
          ＋ Add section
        </button>
      </section>
    </>
  );

  const saveForm = (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        const draft = buildPayload();
        const parsed = routineInputSchema.safeParse(draft);
        if (!parsed.success) {
          setClientError(
            parsed.error.issues[0]?.message ??
              "Fix the routine before saving.",
          );
          setPreview(false);
          return;
        }
        setClientError(null);
        formData.set("payload", JSON.stringify(parsed.data));
        formAction(formData);
      }}
    >
      {(clientError || state.error) && (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {clientError ?? state.error}
        </p>
      )}
      {state.success && !clientError && !state.error ? (
        <p className="text-sm text-[#7BE0A4]" role="status">
          Saved to My Training.
        </p>
      ) : null}
      <SubmitButton
        idleLabel={isEditing ? "Save changes" : "Save to My Training"}
        pendingLabel="Saving…"
      />
      <p className="text-muted text-sm">
        {isEditing
          ? "Update this template anytime. Past workout results stay unchanged."
          : "Saving creates a reusable template. Each workout you run is stored separately in history."}
      </p>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">
            {preview ? "Preview" : "Builder"}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            {preview ? "Preview" : name.trim() || "Routine"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          className="text-ink inline-flex min-h-12 items-center justify-center px-2 text-sm font-bold lg:hidden"
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-6">
        <div
          className={`flex flex-col gap-6 ${preview ? "hidden lg:flex" : "flex"}`}
        >
          {editor}
          {saveForm}
          {initial?.id ? (
            <StartWorkoutButton routineId={initial.id} label="Start workout" />
          ) : null}
        </div>

        <div className={`${preview ? "block" : "hidden lg:block"}`}>
          <div className="lg:sticky lg:top-8">
            <PreviewPanel
              name={name}
              category={category}
              sections={sections}
              runningMode={runningMode}
            />
          </div>
        </div>
      </div>

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
        mode={runningMode ? "running" : "standard"}
        exercises={library}
        preferredLoadUnit={preferredLoadUnit}
        onClose={() => setSheet(null)}
        onExerciseEnsured={(exercise) => {
          setLibrary((current) =>
            current.some((item) => item.id === exercise.id)
              ? current
              : [...current, exercise],
          );
        }}
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
  runningMode,
}: {
  name: string;
  category: RoutineCategory;
  sections: DraftSection[];
  runningMode: boolean;
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
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold">
                {index + 1}. {section.name}
              </p>
              <span className="bg-accent text-ground rounded-full px-2 py-0.5 text-[11px] font-extrabold">
                {workoutFormatLabels[section.format]}
              </span>
            </div>
            <p className="text-muted text-sm">
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
                      runningMode,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="text-success text-sm font-bold">
        Saved to My Training as a reusable template.
      </p>
    </section>
  );
}
