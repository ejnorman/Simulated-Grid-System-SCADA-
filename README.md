# GridMaster — EMS/SCADA Power Grid Simulator

GridMaster is an interactive Energy Management System (EMS) and SCADA simulator built on the IEEE 14-bus standard network. It lets engineering students and trainees practice monitoring and responding to real electrical grid emergencies in a safe, simulated environment using actual power flow calculations.

---

## Features

- Live grid diagram with real-time line loading, generator output, and bus voltages
- Active alarm system with severity levels (warning/critical) and operator acknowledgment
- Five training scenarios: Generator Trip, Load Spike, Line Outage, Generation Crisis, N-1 Cascade
- Manual operator controls: adjust generator output and trip or restore transmission lines
- Peak Demand mode that stress-tests the grid under high-load conditions
- Stabilizer toggle for frequency control during generation redispatch

---

## Architecture

GridMaster runs as three Docker services that communicate over a private network:

```
Browser
   │
   ▼
Frontend (React + MUI)           — port 3000
   │  polls /metrics, /alarms every 2s
   │  sends control commands
   ▼
Backend (FastAPI)                — port 8002
   │  polls /telemetry every 2s
   │  forwards control commands
   ▼
Simulation (Python + pandapower) — port 8001
```

| Service    | Technology         | Role                                                       |
|------------|--------------------|------------------------------------------------------------|
| Frontend   | React, MUI         | Operator dashboard, visualizes grid state, sends commands |
| Backend    | Python, FastAPI    | Orchestrates data flow and evaluates alarm thresholds      |
| Simulation | Python, pandapower | Runs IEEE 14-bus power flow, applies commands and disturbances |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) (with Docker Compose)

### 1. Clone the repository

```bash
git clone <repo-url>
cd Simulated-Grid-System-SCADA-
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development.

### 3. Build and start all services

```bash
docker-compose up --build
```

First build takes a few minutes while Docker downloads base images and installs dependencies. Subsequent starts are faster.

### 4. Open the dashboard

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

All services must be healthy before the dashboard loads data. Check status with:

```bash
docker-compose ps
```

### Stopping the app

```bash
docker-compose down
```

---

## Project Structure

```
├── frontend/          # React dashboard
├── backend/           # FastAPI orchestration service
├── simulation/        # pandapower power flow engine
├── docker-compose.yml
└── .env.example
```
