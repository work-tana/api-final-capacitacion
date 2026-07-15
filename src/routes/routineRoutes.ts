import { Router, Request, Response } from 'express';
import { DBStore, Routine } from '../data/dbStore';
import { CreateRoutineSchema, validateRoutineMetrics } from '../utils/validation';

const router = Router();

/**
 * Route handler to fetch all saved workout routines.
 * Clients use this to list saved templates in the user's dashboard.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await DBStore.read();
    res.json(db.routines);
  } catch (error: any) {
    res.status(500).json({ error: `Error al obtener las rutinas: ${error.message}` });
  }
});

/**
 * Route handler to create a new workout routine template.
 * Validates the body structure using Zod, then cross-checks metric parameters against
 * exercise profiles in the database to ensure hypertrophy/endurance alignment.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateRoutineSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name, description, metrics } = parseResult.data;
    const db = await DBStore.read();

    let validatedMetrics;
    try {
      // We cross-validate because Zod schemas alone cannot inspect current DB state
      validatedMetrics = validateRoutineMetrics(metrics, db.exercises);
    } catch (validationErr: any) {
      return res.status(400).json({ error: validationErr.message });
    }

    const newRoutine: Routine = {
      id: `routine_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      metrics: validatedMetrics,
    };

    db.routines.push(newRoutine);
    await DBStore.write(db);

    res.status(201).json(newRoutine);
  } catch (error: any) {
    res.status(500).json({ error: `Error al crear la rutina: ${error.message}` });
  }
});

export default router;
