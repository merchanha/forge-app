export type PreferredUnits = "kg" | "lb";

export type ExerciseMovementCategory =
  | "olympic"
  | "strength"
  | "gymnastics"
  | "conditioning"
  | "monostructural"
  | "mobility"
  | "other";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      preferred_units: PreferredUnits;
      exercise_movement_category: ExerciseMovementCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
