# API de Entrenamiento Deportivo (Hipertrofia & Resistencia)

Esta es una API RESTful sencilla desarrollada con **Node.js**, **Express** y **TypeScript**. Está orientada al ámbito deportivo y está diseñada para ser el proyecto final de capacitación. 

La API permite registrar dos modalidades con enfoques de entrenamiento y métricas radicalmente opuestas:
1. **Hipertrofia / Fuerza**: Centrado en levantamientos musculares por series, repeticiones, peso y tiempos de descanso.
2. **Resistencia / Cardio**: Centrado en actividades continuas medidas por duración, distancia y zonas de esfuerzo/ritmo cardíaco.

No requiere de motores de bases de datos externos; persiste la información de manera segura y atómica en un archivo local `db.json`.

---

## 🛠️ Tecnologías y Arquitectura

* **Core**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) con **TypeScript** en modo estricto.
* **Persistencia**: Archivo JSON estático (`src/data/db.json`).
* **Concurrencia**: Administrador de base de datos (`src/data/dbStore.ts`) con una cola asíncrona (Promise Lock) para asegurar que escrituras concurrentes no corrompan los datos.
* **Validación**: [Zod](https://zod.dev/) para validar los tipos de datos entrantes e impedir que mezcles métricas de cardio con fuerza y viceversa.

---

## 🚀 Requisitos e Instalación

### Prerrequisitos
* Node.js v18 o superior instalado.
* NPM (incluido por defecto con Node.js).

### Instalación de dependencias
Clona el repositorio e instala los paquetes necesarios corriendo:
```bash
npm install
```

### Ejecutar en Desarrollo
Para encender el servidor de desarrollo local con recarga en vivo (hot-reload):
```bash
npm run dev
```
El servidor levantará en: **`http://localhost:3000`**

### Construcción y Producción
Para compilar el código TypeScript a JavaScript de producción:
```bash
npm run build
npm start
```

### Ejecutar Pruebas (Tests)
Hemos configurado **Vitest** y **Supertest** para pruebas unitarias y de integración. Para correr todos los tests (con base de datos en memoria simulada):
```bash
# Correr tests una sola vez
npm run test

# Correr en modo interactivo (watch mode)
npx vitest
```

*Nota: Al iniciar el servidor por primera vez, si el archivo `src/data/db.json` no existe, la aplicación se autocurará creándolo e inyectándole ejercicios semilla (como Press de Banca y Carrera).*

---

## 📋 Endpoints de la API

La API cuenta con los siguientes puntos de acceso:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/` | Retorna metadatos y disponibilidad de la API. |
| **GET** | `/api/exercises` | Lista el catálogo predefinido de ejercicios. |
| **GET** | `/api/routines` | Obtiene la lista de todas las rutinas (plantillas) guardadas. |
| **POST**| `/api/routines` | Crea una nueva rutina (con validación de métricas). |
| **GET** | `/api/logs` | Obtiene el historial completo de entrenamientos realizados. |
| **POST**| `/api/logs` | Registra una sesión de entrenamiento completada. |
| **GET** | `/api/logs/stats` | Obtiene estadísticas acumuladas de volumen (pesos) y cardio (distancia y duración). |

---

## 🧪 Ejemplos de Pruebas (Cómo probar)

A continuación, tienes las estructuras de payloads y comandos rápidos para interactuar con la API usando PowerShell o Curl.

### 1. Obtener catálogo de Ejercicios
Para ver qué ejercicios están cargados (y sus IDs requeridos):
* **PowerShell**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/exercises" | ConvertTo-Json -Depth 5
  ```
* **Curl / HTTP Client**:
  ```bash
  curl http://localhost:3000/api/exercises
  ```

### 2. Crear una Rutina Combinada (POST)
Envía un cuerpo JSON para planificar una rutina de entrenamiento.
* **Cuerpo JSON esperado (`POST /api/routines`)**:
  ```json
  {
    "name": "Mi Rutina Híbrida Semanal",
    "description": "Rutina combinando hipertrofia de empujes con resistencia aeróbica",
    "metrics": [
      {
        "exerciseId": "bench-press",
        "targetSets": 4,
        "targetReps": 10,
        "targetWeightKg": 80,
        "targetRestSeconds": 90
      },
      {
        "exerciseId": "running",
        "targetDurationMinutes": 30,
        "targetDistanceKm": 5,
        "targetIntensity": "Moderada"
      }
    ]
  }
  ```
* **Comando PowerShell**:
  ```powershell
  $body = @{
      name = "Mi Rutina Hibrida"
      description = "Rutina combinando hipertrofia con resistencia"
      metrics = @(
          @{
              exerciseId = "bench-press"
              targetSets = 4
              targetReps = 10
              targetWeightKg = 80
              targetRestSeconds = 90
          },
          @{
              exerciseId = "running"
              targetDurationMinutes = 30
              targetDistanceKm = 5
              targetIntensity = "Moderada"
          }
      )
  } | ConvertTo-Json -Depth 10
  
  Invoke-RestMethod -Uri "http://localhost:3000/api/routines" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
  ```

### 3. Guardar un Registro Diario de Entrenamiento (POST)
Registra los datos reales logrados en la sesión de hoy. Opcionalmente puedes enlazarlo al ID de la rutina previa.
* **Cuerpo JSON esperado (`POST /api/logs`)**:
  ```json
  {
    "name": "Entrenamiento de Miércoles",
    "routineId": "routine_1784153261837",
    "metrics": [
      {
        "exerciseId": "bench-press",
        "sets": [
          { "reps": 10, "weightKg": 80 },
          { "reps": 9, "weightKg": 80 },
          { "reps": 8, "weightKg": 75 }
        ],
        "restSeconds": 90
      },
      {
        "exerciseId": "running",
        "durationMinutes": 28.5,
        "distanceKm": 5.2,
        "averageHeartRate": 145,
        "intensityRPE": 7
      }
    ]
  }
  ```
* **Comando PowerShell** *(Asegúrate de reemplazar el `routineId` con uno real que devuelva el paso anterior)*:
  ```powershell
  $body = @{
      name = "Mi Entrenamiento Real Hoy"
      routineId = "routine_1784153261837"
      metrics = @(
          @{
              exerciseId = "bench-press"
              sets = @(
                  @{ reps = 10; weightKg = 80 }
                  @{ reps = 9; weightKg = 80 }
              )
              restSeconds = 90
          },
          @{
              exerciseId = "running"
              durationMinutes = 30
              distanceKm = 5.1
              averageHeartRate = 148
              intensityRPE = 6
          }
      )
  } | ConvertTo-Json -Depth 10

  Invoke-RestMethod -Uri "http://localhost:3000/api/logs" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
  ```

### 4. Consultar Historial de Entrenamientos
Obtén todas las sesiones que has completado para graficar progresiones:
* **PowerShell**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/logs" | ConvertTo-Json -Depth 10
  ```
* **Curl**:
  ```bash
  curl http://localhost:3000/api/logs
  ```

### 5. Consultar Estadísticas Acumuladas
Obtén un resumen de tu carga de trabajo total acumulada (volumen total levantado para fuerza y kilómetros/duración acumulados para cardio):
* **PowerShell**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/logs/stats" | ConvertTo-Json -Depth 5
  ```
* **Curl**:
  ```bash
  curl http://localhost:3000/api/logs/stats
  ```

* **Ejemplo de respuesta**:
  ```json
  {
    "totalWorkoutSessions": 2,
    "hypertrophy": {
      "totalVolumeLiftedKg": 5040
    },
    "endurance": {
      "totalDistanceKm": 9.3,
      "totalDurationMinutes": 48
    }
  }
  ```

---

## 🔒 Reglas de Validación de la API

Para garantizar la calidad de los datos sin requerir un motor SQL estricto, la API aplica las siguientes reglas cruzadas:
* Si intentas crear una rutina o registrar un entrenamiento para `bench-press` (tipo hipertrofia) pero colocas parámetros de cardio como `distanceKm` o `durationMinutes`, **el servidor responderá con un error HTTP 400**.
* Si intentas registrar repeticiones/series para un ejercicio de cardio como `running` (tipo resistencia), **el servidor responderá con un error HTTP 400**.
* Los valores de series, repeticiones, distancias y tiempos deben ser estrictamente numéricos positivos y mayores a cero (a excepción del peso en hipertrofia, que admite 0 para ejercicios que usen únicamente peso corporal).
