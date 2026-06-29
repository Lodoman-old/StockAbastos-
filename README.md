# StockAbastos

Sistema WMS Offline-First para frutería de mercado de abastos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Base de datos | PostgreSQL 16 |
| API Server | Node.js + Fastify + TypeScript |
| App Móvil (operarios) | Capacitor + Ionic React + SQLite (offline-first) |
| Panel Admin | React SPA |

## Arquitectura Offline-First

```
[Con señal] → Descarga Snapshot (lotes activos + productos) → SQLite local
[Sin señal] → Valida escaneos contra SQLite, acumula en sync_queue
[Recupera]  → POST /api/sync/batch (idempotente vía batch_uuid)
```

## Inicio Rápido

```bash
# 1. Iniciar infraestructura (PostgreSQL + PGAdmin)
npm run infra:up

# 2. Instalar dependencias
npm run setup

# 3. Iniciar API Server
npm run server:dev    # http://localhost:4000

# 4. Iniciar Admin Panel
npm run admin:dev     # http://localhost:5173

# 5. Iniciar App Móvil
npm run mobile:dev    # http://localhost:5174
```

## Estructura

```
stockabastos/
├── docker-compose.yml       # PostgreSQL + PGAdmin
├── database/
│   └── migrations/          # SQL versionados (001_init, 002_seed)
├── server/                  # API REST Fastify
│   └── src/
│       ├── routes/          # bodegas, productos, lotes, traspasos, ventas, sync
│       └── services/        # sync.service (snapshot + batch processing)
├── mobile/                  # App operarios (Capacitor + Ionic)
│   └── src/
│       ├── db/              # SQLite schema + init
│       ├── services/        # sync.service, scanner.service
│       ├── pages/           # Dashboard, Traspasos, Escaner, SyncStatus
│       └── hooks/           # useNetwork, useSync
└── admin/                   # Panel administrativo web
    └── src/pages/           # CRUD: Productos, Bodegas, Lotes, Traspasos, Ventas
```

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/productos | Listar productos |
| POST | /api/productos | Crear producto |
| GET | /api/bodegas | Listar bodegas |
| POST | /api/lotes | Crear lote (recepción) |
| POST | /api/traspasos | Crear traspaso |
| POST | /api/ventas | Registrar venta |
| POST | /api/sync/snapshot | Descargar snapshot offline |
| POST | /api/sync/batch | Sincronizar batch |
| GET | /api/sync/batch/:uuid | Consultar estado batch |
