import type {
  ExerciseMovementCategory,
} from "@/platform/supabase/database.types";
import type {
  HrZone,
  QuantityUnit,
  RoutineCategory,
  WorkoutFormat,
} from "@/features/routines/validation";
import { defaultFormatConfig } from "@/features/routines/validation";

export type RunSegmentPreset = {
  name: string;
  hint: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  targetPaceSecondsPerKm: number | null;
  hrZone: HrZone | null;
  segmentRepeats: number | null;
  movementCategory: ExerciseMovementCategory;
  equipment: string;
  description: string;
};

export const runSegmentPresets: RunSegmentPreset[] = [
  {
    name: "Easy run",
    hint: "Zone 2 · conversational",
    quantity: 5,
    quantityUnit: "km",
    targetPaceSecondsPerKm: 390,
    hrZone: "Z2",
    segmentRepeats: null,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Steady conversational run.",
  },
  {
    name: "Tempo run",
    hint: "Zone 4 · comfortably hard",
    quantity: 3,
    quantityUnit: "km",
    targetPaceSecondsPerKm: 310,
    hrZone: "Z4",
    segmentRepeats: null,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Comfortably hard sustained effort.",
  },
  {
    name: "Intervals",
    hint: "Zone 5 · repeats with rest",
    quantity: 400,
    quantityUnit: "m",
    targetPaceSecondsPerKm: 290,
    hrZone: "Z5",
    segmentRepeats: 6,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Fast repeats with recovery.",
  },
  {
    name: "Long run",
    hint: "Zone 2 · endurance",
    quantity: 10,
    quantityUnit: "km",
    targetPaceSecondsPerKm: 380,
    hrZone: "Z2",
    segmentRepeats: null,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Endurance aerobic run.",
  },
  {
    name: "Fartlek",
    hint: "Zone 3 · surges",
    quantity: 30,
    quantityUnit: "min",
    targetPaceSecondsPerKm: 345,
    hrZone: "Z3",
    segmentRepeats: null,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Varied pace surges.",
  },
  {
    name: "Hill repeats",
    hint: "Zone 5 · strength",
    quantity: 200,
    quantityUnit: "m",
    targetPaceSecondsPerKm: 300,
    hrZone: "Z5",
    segmentRepeats: 8,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Uphill strength repeats.",
  },
  {
    name: "Strides",
    hint: "Zone 5 · short and fast",
    quantity: 100,
    quantityUnit: "m",
    targetPaceSecondsPerKm: 270,
    hrZone: "Z5",
    segmentRepeats: 6,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Short fast accelerations.",
  },
  {
    name: "Walk recovery",
    hint: "Zone 1 · reset",
    quantity: 2,
    quantityUnit: "min",
    targetPaceSecondsPerKm: null,
    hrZone: "Z1",
    segmentRepeats: null,
    movementCategory: "monostructural",
    equipment: "None",
    description: "Easy walk recovery.",
  },
];

export type CategoryStarterSection = {
  name: string;
  format: WorkoutFormat;
  formatConfig: ReturnType<typeof defaultFormatConfig>;
  movements: Array<{
    name: string;
    quantity: number;
    quantityUnit: QuantityUnit;
    loadValue: number | null;
    targetPaceSecondsPerKm: number | null;
    hrZone: HrZone | null;
    segmentRepeats: number | null;
    notes: string;
  }>;
};

export function starterSectionsForCategory(
  category: RoutineCategory,
): CategoryStarterSection[] {
  if (category === "running") {
    return [
      {
        name: "Warm-up",
        format: "running",
        formatConfig: defaultFormatConfig("running"),
        movements: [
          {
            name: "Easy run",
            quantity: 10,
            quantityUnit: "min",
            loadValue: null,
            targetPaceSecondsPerKm: 400,
            hrZone: "Z2",
            segmentRepeats: null,
            notes: "",
          },
        ],
      },
      {
        name: "Main set",
        format: "intervals",
        formatConfig: {
          workSeconds: 180,
          restSeconds: 60,
          rounds: 6,
        },
        movements: [
          {
            name: "Intervals",
            quantity: 600,
            quantityUnit: "m",
            loadValue: null,
            targetPaceSecondsPerKm: 300,
            hrZone: "Z4",
            segmentRepeats: 6,
            notes: "",
          },
          {
            name: "Walk recovery",
            quantity: 1,
            quantityUnit: "min",
            loadValue: null,
            targetPaceSecondsPerKm: null,
            hrZone: "Z1",
            segmentRepeats: null,
            notes: "",
          },
        ],
      },
      {
        name: "Cooldown",
        format: "running",
        formatConfig: {
          distanceMeters: 1000,
          targetPaceSecondsPerKm: 420,
        },
        movements: [
          {
            name: "Easy run",
            quantity: 5,
            quantityUnit: "min",
            loadValue: null,
            targetPaceSecondsPerKm: 420,
            hrZone: "Z1",
            segmentRepeats: null,
            notes: "",
          },
        ],
      },
    ];
  }

  if (category === "hyrox") {
    return [
      {
        name: "Warm-up",
        format: "running",
        formatConfig: defaultFormatConfig("running"),
        movements: [
          {
            name: "Easy run",
            quantity: 8,
            quantityUnit: "min",
            loadValue: null,
            targetPaceSecondsPerKm: 390,
            hrZone: "Z2",
            segmentRepeats: null,
            notes: "",
          },
        ],
      },
      {
        name: "Stations",
        format: "rounds_for_time",
        formatConfig: { rounds: 4, timeCapSeconds: 1680 },
        movements: [
          {
            name: "Farmers carry",
            quantity: 100,
            quantityUnit: "m",
            loadValue: null,
            targetPaceSecondsPerKm: null,
            hrZone: null,
            segmentRepeats: null,
            notes: "",
          },
          {
            name: "Wall ball",
            quantity: 20,
            quantityUnit: "reps",
            loadValue: null,
            targetPaceSecondsPerKm: null,
            hrZone: null,
            segmentRepeats: null,
            notes: "",
          },
        ],
      },
    ];
  }

  if (category === "custom") {
    return [];
  }

  return [
    {
      name: "Metcon",
      format: "amrap",
      formatConfig: defaultFormatConfig("amrap"),
      movements: [],
    },
  ];
}

export function defaultMoreOptions(category: RoutineCategory): {
  objective: string;
  equipment: string;
  scaling: string;
  effortRpe: number | null;
} {
  if (category === "running") {
    return {
      objective: "First 5k",
      equipment: "Road",
      scaling: "On",
      effortRpe: 6,
    };
  }
  if (category === "hyrox") {
    return {
      objective: "Aerobic base",
      equipment: "Sled, SkiErg, ball",
      scaling: "Rx and Scaled",
      effortRpe: 8,
    };
  }
  return {
    objective: "Aerobic base",
    equipment: "Barbell, box, ball",
    scaling: "Rx and Scaled",
    effortRpe: 8,
  };
}

export function moreOptionLabels(category: RoutineCategory): {
  objective: string;
  equipment: string;
  scaling: string;
  effortRpe: string;
} {
  if (category === "running") {
    return {
      objective: "Goal",
      equipment: "Surface",
      scaling: "Heart-rate zones",
      effortRpe: "Effort RPE",
    };
  }
  return {
    objective: "Objective",
    equipment: "Equipment",
    scaling: "Scaling",
    effortRpe: "Strength RPE",
  };
}
