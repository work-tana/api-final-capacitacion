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
