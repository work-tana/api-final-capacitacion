import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from './app';
import { DBStore, DatabaseSchema } from './data/dbStore';

// Mock the DBStore class so that integration tests are executed completely 
// in-memory, avoiding writes to the local db.json file on disk.
let mockDbState: DatabaseSchema;

vi.mock('./data/dbStore', () => {
  return {
    DBStore: {
      read: vi.fn(async () => {
        // Deep copy to prevent reference mutations between test suites
        return JSON.parse(JSON.stringify(mockDbState));
      }),
      write: vi.fn(async (data: DatabaseSchema) => {
        mockDbState = JSON.parse(JSON.stringify(data));
      }),
    },
  };
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    // Reset database state before each test to guarantee test isolation
    mockDbState = {
      exercises: [
        {
          id: 'bench-press',
          name: 'Press de Banca',
          type: 'hypertrophy',
          description: 'Ejercicio de pectorales',
          primaryMuscleGroup: 'pecho',
        },
        {
          id: 'running',
          name: 'Carrera',
          type: 'endurance',
          description: 'Carrera continua',
          primaryMuscleGroup: 'cardio',
        },
      ],
      routines: [],
      logs: [],
    };
  });

  describe('GET / (Metadata)', () => {
    it('debe responder con información sobre la API y sus endpoints', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/exercises', () => {
    it('debe listar los ejercicios del catálogo semilla', async () => {
      const response = await request(app).get('/api/exercises');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('bench-press');
    });
  });

  describe('POST /api/routines (Crear Rutina)', () => {
    it('debe permitir crear una rutina híbrida con datos correctos', async () => {
      const validPayload = {
        name: 'Mi rutina de prueba',
        description: 'Fuerza + Trote',
        metrics: [
          {
            exerciseId: 'bench-press',
            targetSets: 3,
            targetReps: 8,
          },
          {
            exerciseId: 'running',
            targetDurationMinutes: 20,
          },
        ],
      };

      const response = await request(app)
        .post('/api/routines')
        .send(validPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Mi rutina de prueba');
      expect(response.body.metrics).toHaveLength(2);
    });

    it('debe retornar 400 Bad Request si los datos son inválidos', async () => {
      const invalidPayload = {
        name: 'Rutina rota',
        metrics: [
          {
            exerciseId: 'bench-press',
            targetSets: -5, // Invalid sets
            targetReps: 8,
          },
        ],
      };

      const response = await request(app)
        .post('/api/routines')
        .send(invalidPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/logs (Registrar Log)', () => {
    it('debe registrar un entrenamiento completado exitosamente', async () => {
      const logPayload = {
        name: 'Entrenamiento completado hoy',
        metrics: [
          {
            exerciseId: 'bench-press',
            sets: [{ reps: 10, weightKg: 80 }],
          },
        ],
      };

      const response = await request(app)
        .post('/api/logs')
        .send(logPayload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.metrics[0].exerciseId).toBe('bench-press');
    });
  });

  describe('GET /api/logs/stats (Estadísticas)', () => {
    it('debe calcular estadísticas acumuladas de fuerza y cardio correctamente', async () => {
      // Set logs into mock database state
      mockDbState.logs = [
        {
          id: 'log_1',
          name: 'Log Fuerza',
          date: new Date().toISOString(),
          metrics: [
            {
              exerciseId: 'bench-press',
              sets: [
                { reps: 10, weightKg: 80 }, // 800 kg
                { reps: 8, weightKg: 90 },  // 720 kg
              ],
            },
          ],
        },
        {
          id: 'log_2',
          name: 'Log Cardio',
          date: new Date().toISOString(),
          metrics: [
            {
              exerciseId: 'running',
              durationMinutes: 40,
              distanceKm: 8.5,
            },
          ],
        },
      ];

      const response = await request(app).get('/api/logs/stats');
      expect(response.status).toBe(200);
      expect(response.body.totalWorkoutSessions).toBe(2);
      expect(response.body.hypertrophy.totalVolumeLiftedKg).toBe(1520);
      expect(response.body.endurance.totalDistanceKm).toBe(8.5);
      expect(response.body.endurance.totalDurationMinutes).toBe(40);
    });
  });
});
