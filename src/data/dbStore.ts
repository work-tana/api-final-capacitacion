import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Represents a predefined exercise in the system.
 */
export interface Exercise {
  id: string;
  name: string;
  type: 'hypertrophy' | 'endurance';
  description: string;
  primaryMuscleGroup: string;
}

/**
 * Metric configuration for hypertrophy routines.
 * Targets weight, reps, sets, and rest times.
 */
export interface HypertrophyRoutineMetric {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
  targetRestSeconds?: number;
}

/**
 * Metric configuration for endurance routines.
 * Targets aerobic capacity through duration, distance, and intensity.
 */
export interface EnduranceRoutineMetric {
  exerciseId: string;
  targetDurationMinutes?: number;
  targetDistanceKm?: number;
  targetIntensity?: 'low' | 'medium' | 'high' | string;
}

export type RoutineMetric = HypertrophyRoutineMetric | EnduranceRoutineMetric;

/**
 * A reusable workout template containing planned exercises.
 */
export interface Routine {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  metrics: RoutineMetric[];
}

/**
 * Individual set records for a hypertrophy log entry.
 */
export interface HypertrophyLogSet {
  reps: number;
  weightKg: number;
}

/**
 * Log entry capturing actual execution details of a hypertrophy exercise.
 */
export interface HypertrophyLogMetric {
  exerciseId: string;
  sets: HypertrophyLogSet[];
  restSeconds?: number;
}

/**
 * Log entry capturing actual execution details of an endurance exercise.
 */
export interface EnduranceLogMetric {
  exerciseId: string;
  durationMinutes: number;
  distanceKm?: number;
  averageHeartRate?: number;
  intensityRPE?: number; // Borg Scale 1-10
}

export type LogMetric = HypertrophyLogMetric | EnduranceLogMetric;

/**
 * Historical record of a completed training session.
 */
export interface WorkoutLog {
  id: string;
  routineId?: string;
  name: string;
  date: string;
  metrics: LogMetric[];
}

/**
 * Overall structure of the JSON database file.
 */
export interface DatabaseSchema {
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
}

/**
 * Thread-safe controller for performing JSON read/write operations.
 */
export class DBStore {
  private static filePath = path.join(__dirname, 'db.json');
  
  /**
   * Sequential promise queue lock.
   * We stack file write operations in a linear chain to prevent overlapping file 
   * write calls from corrupting the JSON structure or overwriting newer records.
   */
  private static writeLock: Promise<void> = Promise.resolve();

  /**
   * Reads and parses data from the JSON file.
   * If the database file does not exist, it triggers an initialization step.
   * 
   * @returns The fully parsed DatabaseSchema.
   */
  public static async read(): Promise<DatabaseSchema> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as DatabaseSchema;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // If file doesn't exist, return empty structures
        return { exercises: [], routines: [], logs: [] };
      }
      throw new Error(`Failed to read database file: ${error.message}`);
    }
  }

  /**
   * Serializes the database state and persists it to disk.
   * To prevent race conditions, the write operation is queued behind any currently
   * executing writes using the internal `writeLock` promise chain.
   * 
   * @param data The new DatabaseSchema state to persist.
   * @returns A promise resolving when the write completes.
   */
  public static async write(data: DatabaseSchema): Promise<void> {
    const nextWrite = new Promise<void>(async (resolve, reject) => {
      try {
        // Wait for the prior write in the queue to resolve
        await this.writeLock;
        const serialized = JSON.stringify(data, null, 2);
        
        // Write to a temporary file first, then rename it. This ensures 
        // that if the process is terminated mid-write, the database is not corrupted.
        const tempPath = `${this.filePath}.tmp`;
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, this.filePath);
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    // Append this write operation to the tail of the lock chain
    this.writeLock = nextWrite.catch(() => {});
    return nextWrite;
  }
}
