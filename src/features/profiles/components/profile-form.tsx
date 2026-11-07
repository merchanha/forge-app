"use client";

import { useActionState, useMemo, useState } from "react";

import {
  updateProfileAction,
  type ProfileActionState,
} from "@/features/profiles/actions";
import {
  experienceLevelLabels,
  experienceLevelSchema,
  trainingDisciplineSchema,
  trainingDisciplines,
  trainingGoalLabels,
  trainingGoalSchema,
  type TrainingDiscipline,
} from "@/features/profiles/validation";
import type {
  ExperienceLevel,
  PreferredUnits,
  ProfileTheme,
  TrainingGoal,
} from "@/platform/supabase/database.types";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";

const initialState: ProfileActionState = { error: null, success: false };

type ProfileFormProps = {
  displayName: string;
  preferredUnits: PreferredUnits;
  theme: ProfileTheme;
  experienceLevel: ExperienceLevel | null;
  disciplines: string[];
  primaryDiscipline: string | null;
  goal: TrainingGoal | null;
  daysPerWeek: number | null;
  targetEvent: string;
};

function SegmentedOption({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="border-border bg-raised text-muted has-checked:border-ink has-checked:bg-ink has-checked:text-ground flex min-h-12 min-w-20 cursor-pointer items-center justify-center rounded-md border px-4 font-semibold">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {label}
    </label>
  );
}

export function ProfileForm({
  displayName,
  preferredUnits,
  theme,
  experienceLevel,
  disciplines,
  primaryDiscipline,
  goal,
  daysPerWeek,
  targetEvent,
}: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const initialDisciplines = useMemo(() => {
    return disciplines.filter((value): value is TrainingDiscipline => {
      return trainingDisciplineSchema.safeParse(value).success;
    });
  }, [disciplines]);
  const [selectedDisciplines, setSelectedDisciplines] =
    useState<TrainingDiscipline[]>(initialDisciplines);
  const [selectedPrimary, setSelectedPrimary] = useState<string>(
    primaryDiscipline ?? "",
  );

  function toggleDiscipline(discipline: TrainingDiscipline) {
    setSelectedDisciplines((current) => {
      const next = current.includes(discipline)
        ? current.filter((item) => item !== discipline)
        : [...current, discipline];
      if (selectedPrimary && !next.includes(selectedPrimary as TrainingDiscipline)) {
        setSelectedPrimary(next[0] ?? "");
      } else if (!selectedPrimary && next.length === 1) {
        setSelectedPrimary(next[0] ?? "");
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField
        id="displayName"
        name="displayName"
        label="Name"
        defaultValue={displayName}
        autoComplete="name"
        required
        maxLength={80}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">Units</legend>
        <div className="flex flex-wrap gap-2">
          {(["kg", "lb"] as const).map((unit) => (
            <SegmentedOption
              key={unit}
              name="preferredUnits"
              value={unit}
              label={unit.toUpperCase()}
              defaultChecked={preferredUnits === unit}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">Theme</legend>
        <div className="flex flex-wrap gap-2">
          <SegmentedOption
            name="theme"
            value="dark"
            label="Dark"
            defaultChecked={theme === "dark"}
          />
          <SegmentedOption
            name="theme"
            value="light"
            label="Light"
            defaultChecked={theme === "light"}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">Experience</legend>
        <div className="flex flex-wrap gap-2">
          <SegmentedOption
            name="experienceLevel"
            value=""
            label="Not set"
            defaultChecked={experienceLevel == null}
          />
          {experienceLevelSchema.options.map((level) => (
            <SegmentedOption
              key={level}
              name="experienceLevel"
              value={level}
              label={experienceLevelLabels[level]}
              defaultChecked={experienceLevel === level}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">
          Disciplines
        </legend>
        <div className="flex flex-wrap gap-2">
          {trainingDisciplines.map((discipline) => {
            const on = selectedDisciplines.includes(discipline);
            return (
              <button
                key={discipline}
                type="button"
                onClick={() => toggleDiscipline(discipline)}
                className={`inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                  on
                    ? "border-accent bg-accent text-ground"
                    : "border-border bg-raised text-ink"
                }`}
                aria-pressed={on}
              >
                {discipline}
              </button>
            );
          })}
        </div>
        {selectedDisciplines.map((discipline) => (
          <input
            key={discipline}
            type="hidden"
            name="disciplines"
            value={discipline}
          />
        ))}
        {selectedDisciplines.length === 0 ? (
          <input type="hidden" name="disciplines" value="" />
        ) : null}
        <p className="text-muted text-sm">
          Tap to select. The first selected becomes primary unless you change
          it below.
        </p>
      </fieldset>

      <label className="flex flex-col gap-2" htmlFor="primaryDiscipline">
        <span className="text-muted text-sm font-semibold">
          Primary discipline
        </span>
        <select
          id="primaryDiscipline"
          name="primaryDiscipline"
          value={selectedPrimary}
          onChange={(event) => setSelectedPrimary(event.target.value)}
          className="border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)]"
        >
          <option value="">Not set</option>
          {selectedDisciplines.map((discipline) => (
            <option key={discipline} value={discipline}>
              {discipline}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">Goal</legend>
        <div className="flex flex-wrap gap-2">
          <SegmentedOption
            name="goal"
            value=""
            label="Not set"
            defaultChecked={goal == null}
          />
          {trainingGoalSchema.options.map((option) => (
            <SegmentedOption
              key={option}
              name="goal"
              value={option}
              label={trainingGoalLabels[option]}
              defaultChecked={goal === option}
            />
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2" htmlFor="daysPerWeek">
        <span className="text-muted text-sm font-semibold">Days per week</span>
        <select
          id="daysPerWeek"
          name="daysPerWeek"
          defaultValue={daysPerWeek?.toString() ?? ""}
          className="border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)]"
        >
          <option value="">Not set</option>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <TextField
        id="targetEvent"
        name="targetEvent"
        label="Target event"
        defaultValue={targetEvent}
        maxLength={80}
        placeholder="Open qualifier"
      />

      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-success text-sm" role="status">
          Profile saved.
        </p>
      ) : null}

      <SubmitButton idleLabel="Save profile" pendingLabel="Saving…" />
    </form>
  );
}
