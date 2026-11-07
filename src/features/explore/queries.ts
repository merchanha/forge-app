import type {
  ExerciseMovementCategory,
  PreferredUnits,
  QuantityUnit,
  RoutineCategory,
  WorkoutFormat,
} from "@/platform/supabase/database.types";
import { exploreTemplateIdSchema } from "@/features/explore/validation";
import { requireUser } from "@/platform/supabase/require-user";
import {
  formatConfigByFormat,
  type FormatConfigMap,
  type RoutineCategory as ValidatedCategory,
  type WorkoutFormat as ValidatedFormat,
} from "@/features/routines/validation";

export type ExploreListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ValidatedCategory;
  tags: string[];
  sectionCount: number;
};

export type ExploreMovementDetail = {
  id: string;
  exerciseName: string;
  exerciseDescription: string;
  movementCategory: ExerciseMovementCategory;
  equipment: string;
  sortOrder: number;
  quantity: number;
  quantityUnit: QuantityUnit;
  loadValue: number | null;
  loadUnit: PreferredUnits | null;
  notes: string;
};

export type ExploreSectionDetail = {
  id: string;
  name: string;
  format: ValidatedFormat;
  formatConfig: FormatConfigMap[ValidatedFormat];
  sortOrder: number;
  movements: ExploreMovementDetail[];
};

export type ExploreTemplateDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ValidatedCategory;
  tags: string[];
  sections: ExploreSectionDetail[];
};

function parseFormatConfig(
  format: WorkoutFormat,
  config: unknown,
): FormatConfigMap[ValidatedFormat] {
  const schema = formatConfigByFormat[format as ValidatedFormat];
  return schema.parse(config) as FormatConfigMap[ValidatedFormat];
}

function asNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export async function listExploreTemplates(options?: {
  query?: string;
  category?: RoutineCategory | "all";
}): Promise<ExploreListItem[]> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return [];
  }

  let request = supabase
    .from("explore_templates")
    .select("id, slug, name, description, category, tags")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

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
    throw new Error(error.message);
  }

  const templates = data ?? [];
  if (templates.length === 0) {
    return [];
  }

  const { data: sectionRows, error: sectionError } = await supabase
    .from("explore_sections")
    .select("template_id")
    .in(
      "template_id",
      templates.map((template) => template.id),
    );

  if (sectionError) {
    throw new Error(sectionError.message);
  }

  const counts = new Map<string, number>();
  for (const row of sectionRows ?? []) {
    counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1);
  }

  return templates.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category as ValidatedCategory,
    tags: row.tags ?? [],
    sectionCount: counts.get(row.id) ?? 0,
  }));
}

export async function getExploreTemplate(
  id: string,
): Promise<ExploreTemplateDetail | null> {
  const parsedId = exploreTemplateIdSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data: template, error } = await supabase
    .from("explore_templates")
    .select("id, slug, name, description, category, tags")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!template) {
    return null;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("explore_sections")
    .select("id, name, format, format_config, sort_order")
    .eq("template_id", parsedId.data)
    .order("sort_order", { ascending: true });

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  const sectionIds = (sections ?? []).map((section) => section.id);
  const movementsBySection = new Map<string, ExploreMovementDetail[]>();

  if (sectionIds.length > 0) {
    const { data: movements, error: movementsError } = await supabase
      .from("explore_movements")
      .select(
        "id, section_id, sort_order, exercise_name, exercise_description, movement_category, equipment, quantity, quantity_unit, load_value, load_unit, notes",
      )
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true });

    if (movementsError) {
      throw new Error(movementsError.message);
    }

    for (const movement of movements ?? []) {
      const list = movementsBySection.get(movement.section_id) ?? [];
      list.push({
        id: movement.id,
        exerciseName: movement.exercise_name,
        exerciseDescription: movement.exercise_description,
        movementCategory: movement.movement_category,
        equipment: movement.equipment,
        sortOrder: movement.sort_order,
        quantity: asNumber(movement.quantity),
        quantityUnit: movement.quantity_unit,
        loadValue:
          movement.load_value == null ? null : asNumber(movement.load_value),
        loadUnit: movement.load_unit,
        notes: movement.notes,
      });
      movementsBySection.set(movement.section_id, list);
    }
  }

  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    category: template.category as ValidatedCategory,
    tags: template.tags ?? [],
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      name: section.name,
      format: section.format as ValidatedFormat,
      formatConfig: parseFormatConfig(section.format, section.format_config),
      sortOrder: section.sort_order,
      movements: movementsBySection.get(section.id) ?? [],
    })),
  };
}
