import { z } from 'zod';
import { Exercise } from '../data/dbStore';

/**
 * Validator for hypertrophy routines.
 * Asserts sets/reps are positive numbers, with optional weight/rest seconds.
 */
export const HypertrophyRoutineMetricSchema = z.object({
  exerciseId: z.string().min(1, 'El ID de ejercicio es requerido'),
  targetSets: z.number().int().positive('Las series objetivo deben ser un entero positivo'),
  targetReps: z.number().int().positive('Las repeticiones objetivo deben ser un entero positivo'),
  targetWeightKg: z.number().positive('El peso objetivo debe ser positivo').optional(),
  targetRestSeconds: z.number().int().positive('El tiempo de descanso debe ser un entero positivo').optional(),
});

/**
 * Validator for endurance routines.
 * Allows tracking aerobic metrics such as target distance or duration.
 */
export const EnduranceRoutineMetricSchema = z.object({
  exerciseId: z.string().min(1, 'El ID de ejercicio es requerido'),
  targetDurationMinutes: z.number().positive('La duración objetivo debe ser un número positivo').optional(),
  targetDistanceKm: z.number().positive('La distancia objetivo debe ser un número positivo').optional(),
  targetIntensity: z.string().optional(),
});

/**
 * Validator for individual sets within a hypertrophy log.
 * Asserts repetitions and loads are non-negative (0 weight is allowed for bodyweight).
 */
export const HypertrophyLogSetSchema = z.object({
  reps: z.number().int().positive('Las repeticiones deben ser un entero positivo'),
  weightKg: z.number().nonnegative('El peso debe ser un número mayor o igual a cero (0 para peso corporal)'),
});

/**
 * Validator for a complete hypertrophy exercise log.
 * Requires at least one logged set.
 */
export const HypertrophyLogMetricSchema = z.object({
  exerciseId: z.string().min(1, 'El ID de ejercicio es requerido'),
  sets: z.array(HypertrophyLogSetSchema).min(1, 'Se requiere registrar al menos una serie'),
  restSeconds: z.number().int().positive('El tiempo de descanso real debe ser un entero positivo').optional(),
});

/**
 * Validator for an endurance exercise log.
 * Enforces duration and allows optional heart rate or RPE fatigue levels.
 */
export const EnduranceLogMetricSchema = z.object({
  exerciseId: z.string().min(1, 'El ID de ejercicio es requerido'),
  durationMinutes: z.number().positive('La duración debe ser un número positivo'),
  distanceKm: z.number().positive('La distancia debe ser un número positivo').optional(),
  averageHeartRate: z.number().int().positive('La frecuencia cardíaca promedio debe ser un entero positivo').optional(),
  intensityRPE: z.number().int().min(1, 'La escala RPE mínima es 1').max(10, 'La escala RPE máxima es 10').optional(),
});

/**
 * Schema for creating a Routine template.
 */
export const CreateRoutineSchema = z.object({
  name: z.string().min(3, 'El nombre de la rutina debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  metrics: z.array(z.any()).min(1, 'La rutina debe contener al menos un ejercicio configurado'),
});

/**
 * Schema for creating a Workout Log entry.
 */
export const CreateLogSchema = z.object({
  routineId: z.string().optional(),
  name: z.string().min(3, 'El nombre del registro de entrenamiento debe tener al menos 3 caracteres'),
  date: z.string().datetime({ message: 'El formato de fecha y hora debe ser ISO 8601' }).optional(),
  metrics: z.array(z.any()).min(1, 'El registro debe contener al menos un ejercicio completado'),
});

/**
 * Cross-validates routine exercises against database categories.
 * This ensures hypertrophy exercises are not saved with endurance metrics, and vice versa.
 * 
 * @param metrics The raw metrics array from the HTTP request body.
 * @param exercises The master exercise catalog list from db.json.
 * @throws Error when exercise type doesn't match payload shape, or ID is unrecognized.
 * @returns Fully typed list of validated metrics.
 */
export function validateRoutineMetrics(metrics: any[], exercises: Exercise[]): any[] {
  const validatedMetrics: any[] = [];
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  for (const metric of metrics) {
    if (!metric || typeof metric !== 'object' || !metric.exerciseId) {
      throw new Error("Cada métrica debe incluir un 'exerciseId' válido.");
    }
    const exercise = exerciseMap.get(metric.exerciseId);
    if (!exercise) {
      throw new Error(`El ejercicio con ID '${metric.exerciseId}' no existe en el catálogo.`);
    }

    if (exercise.type === 'hypertrophy') {
      const result = HypertrophyRoutineMetricSchema.safeParse(metric);
      if (!result.success) {
        throw new Error(
          `Métricas de hipertrofia inválidas para el ejercicio '${exercise.name}': ${result.error.errors[0].message}`
        );
      }
      validatedMetrics.push(result.data);
    } else if (exercise.type === 'endurance') {
      const result = EnduranceRoutineMetricSchema.safeParse(metric);
      if (!result.success) {
        throw new Error(
          `Métricas de resistencia inválidas para el ejercicio '${exercise.name}': ${result.error.errors[0].message}`
        );
      }
      validatedMetrics.push(result.data);
    }
  }

  return validatedMetrics;
}

/**
 * Cross-validates completed exercise logs against database categories.
 * This guarantees proper metrics (sets/reps/weight vs. time/distance) are recorded for each logged sport.
 * 
 * @param metrics The raw metrics array from the HTTP request body.
 * @param exercises The master exercise catalog list from db.json.
 * @throws Error when log type doesn't match exercise type, or exercise ID is missing.
 * @returns Fully typed list of validated log metrics.
 */
export function validateLogMetrics(metrics: any[], exercises: Exercise[]): any[] {
  const validatedMetrics: any[] = [];
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  for (const metric of metrics) {
    if (!metric || typeof metric !== 'object' || !metric.exerciseId) {
      throw new Error("Cada métrica de registro debe incluir un 'exerciseId' válido.");
    }
    const exercise = exerciseMap.get(metric.exerciseId);
    if (!exercise) {
      throw new Error(`El ejercicio con ID '${metric.exerciseId}' no existe en el catálogo.`);
    }

    if (exercise.type === 'hypertrophy') {
      const result = HypertrophyLogMetricSchema.safeParse(metric);
      if (!result.success) {
        throw new Error(
          `Registro de hipertrofia inválido para '${exercise.name}': ${result.error.errors[0].message}`
        );
      }
      validatedMetrics.push(result.data);
    } else if (exercise.type === 'endurance') {
      const result = EnduranceLogMetricSchema.safeParse(metric);
      if (!result.success) {
        throw new Error(
          `Registro de resistencia inválido para '${exercise.name}': ${result.error.errors[0].message}`
        );
      }
      validatedMetrics.push(result.data);
    }
  }

  return validatedMetrics;
}
