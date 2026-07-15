import app from './app';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment configurations
dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Startup database check.
 * Creates the database directory and seeds db.json if missing.
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

// Initialize database data-layer, then launch the Express listener
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server]: Runnning at http://localhost:${PORT}`);
  });
});
