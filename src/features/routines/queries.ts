import type {
  PreferredUnits,
  QuantityUnit,
  Routine,
  RoutineCategory,
  WorkoutFormat,
} from "@/platform/supabase/database.types";
import { requireUser } from "@/platform/supabase/require-user";
import {
  formatConfigByFormat,
  routineIdSchema,
  type FormatConfigMap,
  type RoutineCategory as ValidatedCategory,
  type WorkoutFormat as ValidatedFormat,
} from "@/features/routines/validation";

export type RoutineListItem = Routine & {
  section_count: number;
};

export type RoutineExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  demoUrl: string | null;
  sortOrder: number;
  quantity: number;
  quantityUnit: QuantityUnit;
  loadValue: number | null;
  loadUnit: PreferredUnits | null;
  notes: string;
};

export type RoutineSectionDetail = {
  id: string;
  name: string;
  format: ValidatedFormat;
  formatConfig: FormatConfigMap[ValidatedFormat];
  sortOrder: number;
  exercises: RoutineExerciseDetail[];
};

export type RoutineDetail = {
  id: string;
  name: string;
  description: string;
  category: ValidatedCategory;
  tags: string[];
  isFavorite: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections: RoutineSectionDetail[];
};

const routineColumns =
  "id, user_id, name, description, category, tags, is_favorite, archived_at, created_at, updated_at";

function parseFormatConfig(
  format: WorkoutFormat,
  config: unknown,
): FormatConfigMap[ValidatedFormat] {
  const schema = formatConfigByFormat[format as ValidatedFormat];
  return schema.parse(config) as FormatConfigMap[ValidatedFormat];
}

export async function listOwnRoutines(options?: {
  query?: string;
  category?: RoutineCategory | "all";
  includeArchived?: boolean;
}): Promise<RoutineListItem[]> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return [];
  }

  let request = supabase
    .from("routines")
    .select(routineColumns)
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    request = request.is("archived_at", null);
  }

  if (options?.category && options.category !== "all") {
    request = request.eq("category", options.category);
  }

  const search = options?.query?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, "");
    if (escaped.length > 0) {
      request = request.or(
        `name.ilike.%${escaped}%,description.ilike.%${escaped}%`,
      );
    }
  }

  const { data, error } = await request;
  if (error) {
    throw new Error("Could not load routines.");
  }

  const routines = data ?? [];
  if (routines.length === 0) {
    return [];
  }

  const { data: sectionRows, error: sectionError } = await supabase
    .from("routine_sections")
    .select("routine_id")
    .eq("user_id", user.id)
    .in(
      "routine_id",
      routines.map((routine) => routine.id),
    );

  if (sectionError) {
    throw new Error("Could not load routines.");
  }

  const counts = new Map<string, number>();
  for (const row of sectionRows ?? []) {
    counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
  }

  return routines.map((routine) => ({
    ...routine,
    section_count: counts.get(routine.id) ?? 0,
  }));
}

export async function getOwnRoutine(id: string): Promise<RoutineDetail | null> {
  const parsedId = routineIdSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select(routineColumns)
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (routineError) {
    throw new Error("Could not load this routine.");
  }
  if (!routine) {
    return null;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("routine_sections")
    .select("id, name, format, format_config, sort_order")
    .eq("routine_id", parsedId.data)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (sectionsError) {
    throw new Error("Could not load this routine.");
  }

  const sectionList = sections ?? [];
  const sectionIds = sectionList.map((section) => section.id);

  let exerciseRows: Array<{
    id: string;
    section_id: string;
    exercise_id: string;
    sort_order: number;
    quantity: number;
    quantity_unit: QuantityUnit;
    load_value: number | null;
    load_unit: PreferredUnits | null;
    notes: string;
  }> = [];

  if (sectionIds.length > 0) {
    const { data, error } = await supabase
      .from("routine_exercises")
      .select(
        "id, section_id, exercise_id, sort_order, quantity, quantity_unit, load_value, load_unit, notes",
      )
      .eq("user_id", user.id)
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error("Could not load this routine.");
    }
    exerciseRows = data ?? [];
  }

  const exerciseIds = [
    ...new Set(exerciseRows.map((row) => row.exercise_id)),
  ];
  const exerciseMeta = new Map<
    string,
    { name: string; demo_url: string | null }
  >();

  if (exerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, demo_url")
      .eq("user_id", user.id)
      .in("id", exerciseIds);

    if (error) {
      throw new Error("Could not load this routine.");
    }

    for (const exercise of data ?? []) {
      exerciseMeta.set(exercise.id, {
        name: exercise.name,
        demo_url: exercise.demo_url,
      });
    }
  }

  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    category: routine.category,
    tags: routine.tags,
    isFavorite: routine.is_favorite,
    archivedAt: routine.archived_at,
    createdAt: routine.created_at,
    updatedAt: routine.updated_at,
    sections: sectionList.map((section) => ({
      id: section.id,
      name: section.name,
      format: section.format,
      formatConfig: parseFormatConfig(section.format, section.format_config),
      sortOrder: section.sort_order,
      exercises: exerciseRows
        .filter((row) => row.section_id === section.id)
        .map((row) => {
          const meta = exerciseMeta.get(row.exercise_id);
          return {
            id: row.id,
            exerciseId: row.exercise_id,
            exerciseName: meta?.name ?? "Exercise",
            demoUrl: meta?.demo_url ?? null,
            sortOrder: row.sort_order,
            quantity: Number(row.quantity),
            quantityUnit: row.quantity_unit,
            loadValue: row.load_value == null ? null : Number(row.load_value),
            loadUnit: row.load_unit,
            notes: row.notes,
          };
        }),
    })),
  };
}
