# StockAbastos — Raspberry Pi Middleware de Impresión

Polling loop que consulta la cola de impresión del servidor y envía trabajos
pendientes a las impresoras vía TCP/IP (RAW).

## Configuración

Copiar `.env.example` a `.env` y editar:

| Variable | Descripción |
|---|---|
| `API_URL` | URL del servidor (ej. `https://tuservidor.com`) |
| `API_TOKEN` | Token JWT para autenticación |
| `POLL_INTERVAL` | Intervalo en ms entre consultas (defecto: 3000) |
| `PRINT_TIMEOUT` | Timeout en ms para impresión (defecto: 10000) |

## Uso

```bash
npm install
cp .env.example .env
# editar .env
npm start
```
