import { Router, Request, Response } from 'express';
import { DBStore, WorkoutLog } from '../data/dbStore';
import { CreateLogSchema, validateLogMetrics } from '../utils/validation';

const router = Router();

/**
 * Route handler to fetch all logged workouts (historical records).
 * Useful for building progress graphs or workout calendar feeds on the client.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await DBStore.read();
    res.json(db.logs);
  } catch (error: any) {
    res.status(500).json({ error: `Error al obtener el historial de entrenamientos: ${error.message}` });
  }
});

/**
 * Route handler to compute training stats.
 * We aggregate total hypertrophy volume (sets * reps * weight) and total endurance metrics (distance/duration)
 * so that users can verify progressive overload and cardio mileage accomplishments from a single response.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const db = await DBStore.read();
    
    let totalHypertrophyVolume = 0;
    let totalEnduranceDistanceKm = 0;
    let totalEnduranceDurationMinutes = 0;
    const totalWorkoutSessions = db.logs.length;
    
    const exerciseMap = new Map(db.exercises.map((e) => [e.id, e]));

    for (const log of db.logs) {
      for (const metric of log.metrics) {
        const exercise = exerciseMap.get(metric.exerciseId);
        if (!exercise) {
          // Skip if the exercise type is unrecognized
          continue;
        }

        if (exercise.type === 'hypertrophy') {
          const strengthMetric = metric as any;
          if (strengthMetric.sets && Array.isArray(strengthMetric.sets)) {
            for (const set of strengthMetric.sets) {
              totalHypertrophyVolume += (set.reps || 0) * (set.weightKg || 0);
            }
          }
        } else if (exercise.type === 'endurance') {
          const enduranceMetric = metric as any;
          totalEnduranceDistanceKm += enduranceMetric.distanceKm || 0;
          totalEnduranceDurationMinutes += enduranceMetric.durationMinutes || 0;
        }
      }
    }

    res.json({
      totalWorkoutSessions,
      hypertrophy: {
        totalVolumeLiftedKg: totalHypertrophyVolume,
      },
      endurance: {
        totalDistanceKm: Number(totalEnduranceDistanceKm.toFixed(2)),
        totalDurationMinutes: Number(totalEnduranceDurationMinutes.toFixed(2)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: `Error al generar estadísticas de entrenamiento: ${error.message}` });
  }
});

/**
 * Route handler to log a completed workout session.
 * Checks if the routineId exists (if provided), validates metrics, and saves the entry.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateLogSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name, routineId, date, metrics } = parseResult.data;
    const db = await DBStore.read();

    // Verify template relationship if linking log to a pre-defined routine
    if (routineId) {
      const routineExists = db.routines.some((r) => r.id === routineId);
      if (!routineExists) {
        return res.status(400).json({ error: `La rutina de referencia con ID '${routineId}' no existe.` });
      }
    }

    let validatedMetrics;
    try {
      // Ensure the actual repetitions/weights or cardiorespiratory stats match the sport type
      validatedMetrics = validateLogMetrics(metrics, db.exercises);
    } catch (validationErr: any) {
      return res.status(400).json({ error: validationErr.message });
    }

    const newLog: WorkoutLog = {
      id: `log_${Date.now()}`,
      routineId,
      name,
      date: date || new Date().toISOString(),
      metrics: validatedMetrics,
    };

    db.logs.push(newLog);
    await DBStore.write(db);

    res.status(201).json(newLog);
  } catch (error: any) {
    res.status(500).json({ error: `Error al guardar el registro de entrenamiento: ${error.message}` });
  }
});

export default router;
