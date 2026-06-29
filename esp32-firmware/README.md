# StockAbastos — Firmware ESP32 (Print Bridge)

## ¿Qué hace?

El ESP32 se conecta al WiFi de la tienda, consulta el servidor cada 3 segundos por trabajos de impresión pendientes, y los envía directamente a la impresora (Volteck PDV-81i o Brother QL-810W) por TCP/IP.

## Hardware necesario

- ESP32 Dev Board (cualquier modelo con WiFi)
- Cable USB-C o micro-USB para alimentación
- Cargador USB de 5V (cualquier cargador de celular)

## Configuración inicial

### 1. Flashear el firmware

#### Opción A — PlatformIO (recomendada)
1. Instalar [VS Code](https://code.visualstudio.com/) + extensión [PlatformIO](https://platformio.org/)
2. Abrir la carpeta `esp32-firmware/` en PlatformIO
3. Click en **Upload** (flecha derecha en la barra inferior)
4. Cuando termine, abre el Monitor Serie (icono de enchufe) para ver logs

#### Opción B — Arduino IDE
1. Instalar [Arduino IDE](https://www.arduino.cc/en/software)
2. Agregar soporte ESP32: Archivo → Preferencias → URLs Adicionales: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Herramientas → Placa → ESP32 Dev Module
4. Instalar librería ArduiJson desde el Gestor de Librerías
5. Abrir `src/main.cpp`, compilar y subir

### 2. Configurar WiFi y servidor

1. Conecta el ESP32 por USB (se enciende el LED)
2. En tu celular, busca redes WiFi y conéctate a **StockAbastos-Print** (sin contraseña)
3. Abre el navegador en `http://192.168.4.1`
4. Verás un formulario con:
   - **WiFi SSID** — el nombre de tu red WiFi
   - **Contraseña WiFi** — la clave de tu red
   - **URL del Servidor** — la URL de tu API (ej: `https://tudominio.com`)
   - **Token de API** — el token de autenticación (mismo que usa el admin)
5. Click en **Guardar y Reiniciar**
6. El ESP32 se reinicia, se conecta al WiFi y empieza a trabajar

### 3. Verificar funcionamiento

- **LED fijo encendido** → conectado y funcionando
- **LED parpadea rápido** → modo configuración (conectado a StockAbastos-Print)
- **LED parpadea lento** → conectando al WiFi
- **LED parpadea muy rápido** → enviando a impresora

## Si algo sale mal

- Mantén presionado el botón BOOT del ESP32 mientras lo conectas por USB → factory reset (opción de menú en el configurador)
- Abre el Monitor Serie (115200 baud) para ver mensajes de diagnóstico
- Verifica que la impresora esté encendida y conectada al mismo WiFi

## Especificaciones técnicas

- Polling: cada 3 segundos al servidor
- Timeout de conexión a impresora: 10 segundos
- Consumo: ~0.05W (20mA promedio)
- Conexiones: HTTPS al servidor, TCP/IP raw a impresora en puerto configurado (default 9100)
