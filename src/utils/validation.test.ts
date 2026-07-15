import { describe, it, expect } from 'vitest';
import { Exercise } from '../data/dbStore';
import {
  HypertrophyRoutineMetricSchema,
  EnduranceRoutineMetricSchema,
  HypertrophyLogMetricSchema,
  EnduranceLogMetricSchema,
  validateRoutineMetrics,
  validateLogMetrics,
} from './validation';

// Mock exercise catalog database to feed cross-validation helpers
const mockExercises: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Press de Banca',
    type: 'hypertrophy',
    description: 'Strength exercise',
    primaryMuscleGroup: 'pecho',
  },
  {
    id: 'running',
    name: 'Carrera',
    type: 'endurance',
    description: 'Cardio exercise',
    primaryMuscleGroup: 'cardio',
  },
];

describe('Validaciones de Esquemas de Rutinas', () => {
  it('debe validar exitosamente métricas de hipertrofia correctas', () => {
    const validHypertrophy = {
      exerciseId: 'bench-press',
      targetSets: 4,
      targetReps: 10,
      targetWeightKg: 80,
      targetRestSeconds: 90,
    };
    const parseResult = HypertrophyRoutineMetricSchema.safeParse(validHypertrophy);
    expect(parseResult.success).toBe(true);
  });

  it('debe fallar si las series u objetivos de hipertrofia son negativos o cero', () => {
    const invalidHypertrophy = {
      exerciseId: 'bench-press',
      targetSets: -1, // Invalid
      targetReps: 0,  // Invalid
    };
    const parseResult = HypertrophyRoutineMetricSchema.safeParse(invalidHypertrophy);
    expect(parseResult.success).toBe(false);
  });

  it('debe validar exitosamente métricas de resistencia correctas', () => {
    const validEndurance = {
      exerciseId: 'running',
      targetDurationMinutes: 30,
      targetDistanceKm: 5,
      targetIntensity: 'High',
    };
    const parseResult = EnduranceRoutineMetricSchema.safeParse(validEndurance);
    expect(parseResult.success).toBe(true);
  });
});

describe('Validaciones de Esquemas de Logs de Entrenamiento', () => {
  it('debe validar exitosamente logs de hipertrofia correctos', () => {
    const validLog = {
      exerciseId: 'bench-press',
      sets: [
        { reps: 10, weightKg: 80 },
        { reps: 10, weightKg: 80 },
      ],
      restSeconds: 90,
    };
    const parseResult = HypertrophyLogMetricSchema.safeParse(validLog);
    expect(parseResult.success).toBe(true);
  });

  it('debe fallar si no se registran series de hipertrofia', () => {
    const invalidLog = {
      exerciseId: 'bench-press',
      sets: [], // Invalid: needs at least 1 set
    };
    const parseResult = HypertrophyLogMetricSchema.safeParse(invalidLog);
    expect(parseResult.success).toBe(false);
  });

  it('debe validar exitosamente logs de resistencia correctos', () => {
    const validLog = {
      exerciseId: 'running',
      durationMinutes: 45,
      distanceKm: 8,
      intensityRPE: 8,
    };
    const parseResult = EnduranceLogMetricSchema.safeParse(validLog);
    expect(parseResult.success).toBe(true);
  });
});

describe('Validaciones Cruzadas (Cross-Validation Helpers)', () => {
  it('debe mapear correctamente métricas de hipertrofia para un ejercicio de fuerza', () => {
    const rawMetrics = [
      {
        exerciseId: 'bench-press',
        targetSets: 3,
        targetReps: 12,
      },
    ];
    // Should run validation without throwing exceptions
    expect(() => validateRoutineMetrics(rawMetrics, mockExercises)).not.toThrow();
  });

  it('debe arrojar error si se intenta guardar métricas de hipertrofia en un ejercicio de cardio', () => {
    const mixedMetrics = [
      {
        exerciseId: 'running', // Endurance exercise in mock catalog
        targetSets: 3,         // Hypertrophy field (violates running schema rules)
        targetReps: 12,
      },
    ];
    // Why we test this: ensures user cannot assign sets/reps target configurations on endurance items
    expect(() => validateRoutineMetrics(mixedMetrics, mockExercises)).toThrow(
      /Métricas de resistencia inválidas para el ejercicio/
    );
  });

  it('debe arrojar error si el exerciseId no existe en el catálogo', () => {
    const orphanMetrics = [
      {
        exerciseId: 'non-existent-exercise',
        targetSets: 3,
        targetReps: 12,
      },
    ];
    expect(() => validateRoutineMetrics(orphanMetrics, mockExercises)).toThrow(
      /no existe en el catálogo/
    );
  });

  it('debe arrojar error si se registra un log de cardio en un ejercicio de hipertrofia', () => {
    const mixedLogs = [
      {
        exerciseId: 'bench-press', // Hypertrophy exercise
        durationMinutes: 45,       // Endurance field (violates strength schema rules)
      },
    ];
    expect(() => validateLogMetrics(mixedLogs, mockExercises)).toThrow(
      /Registro de hipertrofia inválido para/
    );
  });
});
