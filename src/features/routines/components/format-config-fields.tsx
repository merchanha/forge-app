"use client";

import { clockToSeconds, secondsToClock } from "@/features/routines/lib/duration";
import {
  type FormatConfigMap,
  type WorkoutFormat,
} from "@/features/routines/validation";

const fieldClassName =
  "border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)]";

type FormatConfigFieldsProps = {
  format: WorkoutFormat;
  value: FormatConfigMap[WorkoutFormat];
  onChange: (next: FormatConfigMap[WorkoutFormat]) => void;
};

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-muted text-sm font-semibold">{label}</span>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={fieldClassName}
      />
    </label>
  );
}

function ClockField({
  id,
  label,
  valueSeconds,
  onChange,
}: {
  id: string;
  label: string;
  valueSeconds: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-muted text-sm font-semibold">{label}</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        defaultValue={secondsToClock(valueSeconds)}
        key={`${id}-${valueSeconds}`}
        onBlur={(event) => {
          const parsed = clockToSeconds(event.target.value);
          if (parsed != null) {
            onChange(parsed);
          }
        }}
        className={fieldClassName}
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className="text-muted text-xs">
        Use m:ss or total seconds
      </span>
    </label>
  );
}

export function FormatConfigFields({
  format,
  value,
  onChange,
}: FormatConfigFieldsProps) {
  switch (format) {
    case "amrap": {
      const config = value as FormatConfigMap["amrap"];
      return (
        <ClockField
          id="amrap-duration"
          label="Duration"
          valueSeconds={config.durationSeconds}
          onChange={(durationSeconds) => onChange({ durationSeconds })}
        />
      );
    }
    case "emom": {
      const config = value as FormatConfigMap["emom"];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <ClockField
            id="emom-duration"
            label="Duration"
            valueSeconds={config.durationSeconds}
            onChange={(durationSeconds) =>
              onChange({ ...config, durationSeconds })
            }
          />
          <ClockField
            id="emom-interval"
            label="Interval"
            valueSeconds={config.intervalSeconds}
            onChange={(intervalSeconds) =>
              onChange({ ...config, intervalSeconds })
            }
          />
        </div>
      );
    }
    case "for_time":
    case "rounds_for_time": {
      const config = value as FormatConfigMap["for_time"];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id={`${format}-rounds`}
            label="Rounds"
            value={config.rounds}
            min={1}
            max={100}
            onChange={(rounds) => onChange({ ...config, rounds })}
          />
          <ClockField
            id={`${format}-cap`}
            label="Time cap (optional)"
            valueSeconds={config.timeCapSeconds ?? 600}
            onChange={(timeCapSeconds) =>
              onChange({ ...config, timeCapSeconds })
            }
          />
          <button
            type="button"
            className="text-muted border-border min-h-12 rounded-md border px-4 text-sm font-semibold"
            onClick={() => {
              onChange({ rounds: config.rounds });
            }}
          >
            Clear time cap
          </button>
        </div>
      );
    }
    case "tabata":
    case "intervals": {
      const config = value as FormatConfigMap["tabata"];
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <ClockField
            id={`${format}-work`}
            label="Work"
            valueSeconds={config.workSeconds}
            onChange={(workSeconds) => onChange({ ...config, workSeconds })}
          />
          <ClockField
            id={`${format}-rest`}
            label="Rest"
            valueSeconds={config.restSeconds}
            onChange={(restSeconds) => onChange({ ...config, restSeconds })}
          />
          <NumberField
            id={`${format}-rounds`}
            label="Rounds"
            value={config.rounds}
            min={1}
            max={format === "tabata" ? 60 : 100}
            onChange={(rounds) => onChange({ ...config, rounds })}
          />
        </div>
      );
    }
    case "strength": {
      const config = value as FormatConfigMap["strength"];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id="strength-sets"
            label="Sets"
            value={config.sets}
            min={1}
            max={20}
            onChange={(sets) => onChange({ ...config, sets })}
          />
          <NumberField
            id="strength-reps"
            label="Reps"
            value={config.reps}
            min={1}
            max={100}
            onChange={(reps) => onChange({ ...config, reps })}
          />
          <ClockField
            id="strength-rest"
            label="Rest"
            valueSeconds={config.restSeconds}
            onChange={(restSeconds) => onChange({ ...config, restSeconds })}
          />
          <NumberField
            id="strength-rpe"
            label="RPE (optional)"
            value={config.rpe ?? 8}
            min={1}
            max={10}
            step={0.5}
            onChange={(rpe) => onChange({ ...config, rpe })}
          />
          <button
            type="button"
            className="text-muted border-border min-h-12 rounded-md border px-4 text-sm font-semibold sm:col-span-2"
            onClick={() => {
              onChange({
                sets: config.sets,
                reps: config.reps,
                restSeconds: config.restSeconds,
              });
            }}
          >
            Clear RPE
          </button>
        </div>
      );
    }
    case "running": {
      const config = value as FormatConfigMap["running"];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id="running-distance"
            label="Distance (m)"
            value={config.distanceMeters}
            min={50}
            max={100000}
            step={50}
            onChange={(distanceMeters) =>
              onChange({ ...config, distanceMeters })
            }
          />
          <ClockField
            id="running-pace"
            label="Target pace /km (optional)"
            valueSeconds={config.targetPaceSecondsPerKm ?? 270}
            onChange={(targetPaceSecondsPerKm) =>
              onChange({ ...config, targetPaceSecondsPerKm })
            }
          />
          <button
            type="button"
            className="text-muted border-border min-h-12 rounded-md border px-4 text-sm font-semibold sm:col-span-2"
            onClick={() => {
              onChange({ distanceMeters: config.distanceMeters });
            }}
          >
            Clear target pace
          </button>
        </div>
      );
    }
    case "custom": {
      const config = value as FormatConfigMap["custom"];
      return (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2" htmlFor="custom-timer-mode">
            <span className="text-muted text-sm font-semibold">Timer</span>
            <select
              id="custom-timer-mode"
              className={fieldClassName}
              value={config.timerMode}
              onChange={(event) => {
                const timerMode = event.target.value as
                  | "none"
                  | "stopwatch"
                  | "countdown";
                if (timerMode === "countdown") {
                  onChange({ timerMode, durationSeconds: 300 });
                  return;
                }
                onChange({ timerMode });
              }}
            >
              <option value="stopwatch">Stopwatch</option>
              <option value="countdown">Countdown</option>
              <option value="none">No timer</option>
            </select>
          </label>
          {config.timerMode === "countdown" ? (
            <ClockField
              id="custom-duration"
              label="Duration"
              valueSeconds={config.durationSeconds}
              onChange={(durationSeconds) =>
                onChange({ timerMode: "countdown", durationSeconds })
              }
            />
          ) : null}
        </div>
      );
    }
  }
}
