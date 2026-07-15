import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

import exerciseRoutes from './routes/exerciseRoutes';
import routineRoutes from './routes/routineRoutes';
import logRoutes from './routes/logRoutes';
import { DBStore } from './data/dbStore';

// Load environmental variables (e.g. custom port configurations)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so that client-side frontends (like React/Next.js apps) can communicate with the API
app.use(cors());

// Parse incoming requests with JSON payloads (standard API body parsing)
app.use(express.json());

/**
 * Startup sanity check.
 * Verifies that db.json exists in the data directory and is seeded with standard exercises.
 * If the file is missing or corrupted, we re-initialize it to ensure the API works out-of-the-box.
 */
const initializeDatabase = async (): Promise<void> => {
  const dataDir = path.join(__dirname, 'data');
  const dbPath = path.join(dataDir, 'db.json');

  try {
    // Ensure the data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    let dbExists = false;
    try {
      await fs.access(dbPath);
      dbExists = true;
    } catch {
      // File does not exist
    }

    if (!dbExists) {
      // Seed default database schema
      const seedData = {
        exercises: [
          {
            id: 'bench-press',
            name: 'Press de Banca',
            type: 'hypertrophy',
            description: 'Ejercicio compuesto enfocado en pectorales, hombros y tríceps.',
            primaryMuscleGroup: 'pecho',
          },
          {
            id: 'squat',
            name: 'Sentadilla Libre',
            type: 'hypertrophy',
            description: 'Ejercicio compuesto para el desarrollo de cuádriceps, glúteos y core.',
            primaryMuscleGroup: 'piernas',
          },
          {
            id: 'deadlift',
            name: 'Peso Muerto',
            type: 'hypertrophy',
            description: 'Ejercicio multiarticular que trabaja la cadena posterior (isquiotibiales, glúteos, espalda).',
            primaryMuscleGroup: 'espalda',
          },
          {
            id: 'bicep-curl',
            name: 'Curl de Bíceps con Mancuernas',
            type: 'hypertrophy',
            description: 'Ejercicio de aislamiento para los bíceps.',
            primaryMuscleGroup: 'brazos',
          },
          {
            id: 'running',
            name: 'Carrera',
            type: 'endurance',
            description: 'Actividad aeróbica de carrera continua o de intervalos para resistencia cardiovascular.',
            primaryMuscleGroup: 'cardio',
          },
          {
            id: 'cycling',
            name: 'Ciclismo',
            type: 'endurance',
            description: 'Entrenamiento de bicicleta en ruta o estática.',
            primaryMuscleGroup: 'cardio',
          },
          {
            id: 'swimming',
            name: 'Natación',
            type: 'endurance',
            description: 'Entrenamiento acuático aeróbico de cuerpo completo.',
            primaryMuscleGroup: 'cardio',
          },
        ],
        routines: [],
        logs: [],
      };
      await fs.writeFile(dbPath, JSON.stringify(seedData, null, 2), 'utf-8');
      console.log('Database initialized and seeded successfully.');
    }
  } catch (error: any) {
    console.error(`Error during database initialization: ${error.message}`);
  }
};

// Mount endpoints
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/logs', logRoutes);

/**
 * Root endpoint returning API metadata and availability structure.
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
 * Prevents application shell errors from crashing the Node.js server.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Ocurrió un error interno en el servidor.',
    message: err.message,
  });
});

// Initialize database data-layer, then launch the Express listener
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server]: Runnning at http://localhost:${PORT}`);
  });
});
