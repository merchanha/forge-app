export type PreferredUnits = "kg" | "lb";

export type ExerciseMovementCategory =
  | "olympic"
  | "strength"
  | "gymnastics"
  | "conditioning"
  | "monostructural"
  | "mobility"
  | "other";

export type RoutineCategory = "crossfit" | "hyrox" | "running" | "custom";

export type WorkoutFormat =
  | "amrap"
  | "emom"
  | "for_time"
  | "rounds_for_time"
  | "tabata"
  | "intervals"
  | "strength"
  | "running"
  | "custom";

export type QuantityUnit = "reps" | "m" | "cal" | "min";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          preferred_units: PreferredUnits;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          preferred_units?: PreferredUnits;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          preferred_units?: PreferredUnits;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          movement_category: ExerciseMovementCategory;
          equipment: string;
          demo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          movement_category: ExerciseMovementCategory;
          equipment: string;
          demo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          movement_category?: ExerciseMovementCategory;
          equipment?: string;
          demo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          category: RoutineCategory;
          tags: string[];
          is_favorite: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          category?: RoutineCategory;
          tags?: string[];
          is_favorite?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          category?: RoutineCategory;
          tags?: string[];
          is_favorite?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_sections: {
        Row: {
          id: string;
          routine_id: string;
          user_id: string;
          sort_order: number;
          name: string;
          format: WorkoutFormat;
          format_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          user_id: string;
          sort_order: number;
          name: string;
          format: WorkoutFormat;
          format_config: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          user_id?: string;
          sort_order?: number;
          name?: string;
          format?: WorkoutFormat;
          format_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_exercises: {
        Row: {
          id: string;
          section_id: string;
          user_id: string;
          exercise_id: string;
          sort_order: number;
          quantity: number;
          quantity_unit: QuantityUnit;
          load_value: number | null;
          load_unit: PreferredUnits | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          user_id: string;
          exercise_id: string;
          sort_order: number;
          quantity: number;
          quantity_unit: QuantityUnit;
          load_value?: number | null;
          load_unit?: PreferredUnits | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          user_id?: string;
          exercise_id?: string;
          sort_order?: number;
          quantity?: number;
          quantity_unit?: QuantityUnit;
          load_value?: number | null;
          load_unit?: PreferredUnits | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_routine: {
        Args: { payload: Json };
        Returns: string;
      };
      duplicate_routine: {
        Args: { source_id: string };
        Returns: string;
      };
    };
    Enums: {
      preferred_units: PreferredUnits;
      exercise_movement_category: ExerciseMovementCategory;
      routine_category: RoutineCategory;
      workout_format: WorkoutFormat;
      quantity_unit: QuantityUnit;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
export type RoutineSection =
  Database["public"]["Tables"]["routine_sections"]["Row"];
export type RoutineExercise =
  Database["public"]["Tables"]["routine_exercises"]["Row"];
