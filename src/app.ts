import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import exerciseRoutes from './routes/exerciseRoutes';
import routineRoutes from './routes/routineRoutes';
import logRoutes from './routes/logRoutes';

const app = express();

// Enable CORS so client frontends can make request queries
app.use(cors());

// Enable JSON body parsing for routing controllers
app.use(express.json());

// Mount API routers
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/logs', logRoutes);

/**
 * Root endpoint mapping API metadata and routes overview.
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Sports Training API (Hypertrophy & Endurance)',
    description: 'API sencilla para planificar rutinas y registrar entrenamientos de fuerza y cardio.',
    version: '1.0.0',
    endpoints: {
      exercises: '/api/exercises',
      routines: '/api/routines',
      logs: '/api/logs',
    },
  });
});

/**
 * Global fallback error boundary.
 * Captures request errors, preventing Node application shells from crash termination.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Ocurrió un error interno en el servidor.',
    message: err.message,
  });
});

export default app;
