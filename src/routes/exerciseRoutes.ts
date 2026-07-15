import { Router, Request, Response } from 'express';
import { DBStore } from '../data/dbStore';

const router = Router();

/**
 * Route handler to fetch all available exercises.
 * We isolate this route so client apps can query the master list of exercises
 * to dynamically render selection forms for hypertrophy or endurance parameters.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await DBStore.read();
    res.json(db.exercises);
  } catch (error: any) {
    res.status(500).json({ error: `Error al leer la base de datos de ejercicios: ${error.message}` });
  }
});

export default router;
