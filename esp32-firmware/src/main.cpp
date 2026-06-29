// StockAbastos - ESP32 Print Bridge
// Conecta impresoras WiFi (Volteck PDV-81i / Brother QL-810W)
// con el servidor cloud mediante polling HTTPS.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// ========== Configuración ==========
const char* AP_SSID = "StockAbastos-Print";
const char* AP_PASS = "";
const int POLL_INTERVAL_MS = 3000;
const int HTTP_TIMEOUT_MS = 10000;
const int PRINTER_TIMEOUT_MS = 10000;
const int LED_PIN = 2;

// ========== Estado global ==========
struct Config {
  String wifi_ssid;
  String wifi_pass;
  String api_url;
  String api_token;
  bool configured = false;
};

Config cfg;
Preferences prefs;
WebServer httpServer(80);
DNSServer dns;
bool configMode = false;
unsigned long lastPoll = 0;
uint32_t blinkTime = 0;
uint32_t blinkInterval = 1000;

// ========== LED ==========
void ledSet(uint32_t interval) {
  blinkInterval = interval;
  blinkTime = 0;
}
void ledUpdate() {
  if (millis() - blinkTime >= blinkInterval) {
    blinkTime = millis();
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
}
void ledOn() { digitalWrite(LED_PIN, HIGH); }
void ledOff() { digitalWrite(LED_PIN, LOW); }

// ========== Almacenamiento ==========
void saveConfig() {
  prefs.putString("wifi_ssid", cfg.wifi_ssid);
  prefs.putString("wifi_pass", cfg.wifi_pass);
  prefs.putString("api_url", cfg.api_url);
  prefs.putString("api_token", cfg.api_token);
  prefs.putBool("configured", cfg.configured);
  prefs.end();
  Serial.println("Config saved");
}
void loadConfig() {
  prefs.begin("stockabastos", false);
  cfg.wifi_ssid = prefs.getString("wifi_ssid", "");
  cfg.wifi_pass = prefs.getString("wifi_pass", "");
  cfg.api_url = prefs.getString("api_url", "");
  cfg.api_token = prefs.getString("api_token", "");
  cfg.configured = prefs.getBool("configured", false);
  Serial.println("Config loaded");
}

// ========== URL encode ==========
String urlencode(String s) {
  String out;
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      out += c;
    } else {
      char buf[4];
      snprintf(buf, sizeof(buf), "%%%02X", (unsigned char)c);
      out += buf;
    }
  }
  return out;
}

// ========== Portal de configuración ==========
const char CONFIG_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StockAbastos - Configurar Bridge</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}
  h2{color:#1a237e}
  label{display:block;margin:12px 0 4px;font-weight:700}
  input{width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box}
  button{margin-top:20px;padding:10px 24px;background:#1a237e;color:#fff;border:none;border-radius:4px;font-size:16px;cursor:pointer}
  button:hover{background:#283593}
  .hint{font-size:12px;color:#666;margin:2px 0 0}
  .status{display:none;margin-top:16px;padding:12px;border-radius:4px}
  .ok{background:#c8e6c9;color:#2e7d32}
  .err{background:#ffcdd2;color:#c62828}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  td{padding:6px;border-bottom:1px solid #ddd;font-size:14px}
</style>
</head>
<body>
<h2>StockAbastos — Configuración del Bridge</h2>
<form id="cfgForm">
  <label>WiFi SSID</label>
  <input type="text" id="s" name="ssid" required>
  <label>Contraseña WiFi</label>
  <input type="password" id="p" name="pass">
  <label>URL del Servidor</label>
  <input type="url" id="u" name="url" placeholder="https://tudominio.com" required>
  <label>Token de API</label>
  <input type="text" id="t" name="token" required>
  <button type="submit">Guardar y Reiniciar</button>
</form>
<div id="status" class="status"></div>
<hr>
<h3>Escáner de Red WiFi</h3>
<button type="button" onclick="scanWiFi()">Escanear Redes</button>
<table id="networks"></table>
<script>
function showStatus(msg, ok) {
  var s=document.getElementById('status');
  s.className='status '+(ok?'ok':'err');
  s.style.display='block';
  s.textContent=msg;
}
document.getElementById('cfgForm').onsubmit=function(e){
  e.preventDefault();
  var btn=this.querySelector('button');
  btn.disabled=true;
  btn.textContent='Guardando...';
  var f=this;
  fetch('/save?'+new URLSearchParams({
    ssid: f.ssid.value,
    pass: f.pass.value,
    url: f.url.value,
    token: f.token.value
  })).then(function(r){return r.text();}).then(function(t){
    showStatus('Configuraci\u00f3n guardada. El dispositivo se reiniciar\u00e1...', true);
    setTimeout(function(){location.reload();},3000);
  }).catch(function(e){
    showStatus('Error: '+e.message, false);
    btn.disabled=false;
    btn.textContent='Guardar y Reiniciar';
  });
};
function scanWiFi(){
  document.getElementById('networks').innerHTML='<tr><td>Escaneando...</td></tr>';
  fetch('/scan').then(function(r){return r.json();}).then(function(nets){
    var h='';
    nets.forEach(function(n){
      var icon=n.rssi>-50?'\u2591\u2591\u2591':(n.rssi>-70?'\u2591\u2591\u2592':'\u2591\u2593\u2593');
      var enc=n.encryptionType!=7?'🔒':' ';
      h+='<tr><td onclick="setSSID(\''+n.ssid+'\')" style="cursor:pointer">'+enc+n.ssid+'</td><td>'+icon+'</td></tr>';
    });
    document.getElementById('networks').innerHTML=h;
  });
}
function setSSID(ssid){
  document.getElementById('s').value=ssid;
}
</script>
</body>
</html>
)rawliteral";

void handleRoot() {
  httpServer.send(200, "text/html", CONFIG_HTML);
}

void handleSave() {
  cfg.wifi_ssid = httpServer.arg("ssid");
  cfg.wifi_pass = httpServer.arg("pass");
  cfg.api_url = httpServer.arg("url");
  cfg.api_token = httpServer.arg("token");
  cfg.configured = true;
  saveConfig();
  httpServer.send(200, "text/plain", "OK");
  delay(1000);
  ESP.restart();
}

void handleScan() {
  int n = WiFi.scanComplete();
  if (n == -2) {
    WiFi.scanNetworks(true);
    httpServer.send(200, "application/json", "[]");
  } else if (n >= 0) {
    String json = "[";
    for (int i = 0; i < n; i++) {
      if (i > 0) json += ",";
      json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + WiFi.RSSI(i) + ",\"encryptionType\":" + WiFi.encryptionType(i) + "}";
    }
    json += "]";
    WiFi.scanDelete();
    httpServer.send(200, "application/json", json);
  } else {
    httpServer.send(200, "application/json", "[]");
  }
}

void handleNotFound() {
  httpServer.sendHeader("Location", "http://" + WiFi.softAPIP().toString());
  httpServer.send(302, "text/plain", "");
}

// ========== Iniciar modo configuración ==========
void startConfigMode() {
  configMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  delay(500);

  dns.start(53, "*", WiFi.softAPIP());
  httpServer.on("/", handleRoot);
  httpServer.on("/save", handleSave);
  httpServer.on("/scan", handleScan);
  httpServer.onNotFound(handleNotFound);
  httpServer.begin();

  Serial.println("\n=== MODO CONFIGURACIÓN ===");
  Serial.println("Conéctate al WiFi: " + String(AP_SSID));
  Serial.println("Abre http://192.168.4.1 en tu navegador");
  Serial.println("==========================\n");

  ledSet(200);
}

// ========== Conexión WiFi ==========
bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfg.wifi_ssid.c_str(), cfg.wifi_pass.c_str());

  Serial.print("Conectando a WiFi: " + cfg.wifi_ssid);
  ledSet(500);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    ledUpdate();
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi conectado. IP: " + WiFi.localIP().toString());
    ledOn();
    return true;
  } else {
    Serial.println("\nError de conexión WiFi");
    return false;
  }
}

// ========== Petición HTTP ==========
struct ParsedUrl {
  String host;
  int port;
  String path;
  bool isSecure;

  static ParsedUrl from(String url) {
    ParsedUrl p;
    p.isSecure = url.startsWith("https://");
    int s = url.indexOf("://") + 3;
    int ps = url.indexOf("/", s);
    if (ps == -1) { p.host = url.substring(s); p.path = "/"; }
    else { p.host = url.substring(s, ps); p.path = url.substring(ps); }
    p.port = p.isSecure ? 443 : 80;
    int colon = p.host.indexOf(":");
    if (colon != -1) { p.port = p.host.substring(colon + 1).toInt(); p.host = p.host.substring(0, colon); }
    return p;
  }
};

class HttpClient {
public:
  WiFiClient* client = nullptr;
  bool isSecure;

  HttpClient(bool sec) : isSecure(sec) {}

  bool connect(String host, int port) {
    if (isSecure) {
      auto* sec = new WiFiClientSecure();
      sec->setInsecure();
      client = sec;
    } else {
      client = new WiFiClient();
    }
    if (!client->connect(host.c_str(), port, HTTP_TIMEOUT_MS)) {
      delete client; client = nullptr;
      return false;
    }
    return true;
  }

  void close() {
    if (client) { client->stop(); delete client; client = nullptr; }
  }

  // Envía request y retorna (statusCode, body). statusCode = -1 si error.
  struct Response { int status; String body; };
  Response exchange(String method, String path, String headers, String body) {
    if (!client) return {-1, "No client"};

    String req = method + " " + path + " HTTP/1.1\r\n" + headers + "\r\n";
    if (body.length() > 0) req += body;
    client->print(req);

    // Leer status line
    String statusLine = client->readStringUntil('\n');
    int status = -1;
    if (statusLine.startsWith("HTTP/")) {
      int sp1 = statusLine.indexOf(' ');
      int sp2 = statusLine.indexOf(' ', sp1 + 1);
      if (sp2 > sp1) status = statusLine.substring(sp1 + 1, sp2).toInt();
    }

    // Leer headers + body
    String respBody;
    unsigned long timeout = millis() + HTTP_TIMEOUT_MS;
    bool headersDone = false;
    while (client->connected() && millis() < timeout) {
      if (!client->available()) { delay(5); continue; }
      String line = client->readStringUntil('\n');
      line.trim();
      if (!headersDone && line.length() == 0) { headersDone = true; continue; }
      if (headersDone) {
        respBody += line;
        if (client->available()) respBody += '\n';
      }
    }
    close();
    return {status, respBody};
  }
};

// Helper: GET con auto conexión
int httpGet(String fullUrl, String token, String& outBody) {
  auto p = ParsedUrl::from(fullUrl);
  HttpClient hc(p.isSecure);
  if (!hc.connect(p.host, p.port)) return -1;
  String hdrs = "Host: " + p.host + "\r\nAuthorization: Bearer " + token + "\r\nConnection: close\r\n";
  auto r = hc.exchange("GET", p.path, hdrs, "");
  outBody = r.body;
  return r.status;
}

// Helper: POST con auto conexión
int httpPost(String baseUrl, String idPath, String token, String jsonBody, String& outBody) {
  auto p = ParsedUrl::from(baseUrl);
  String fullPath = "/api/impresion/marcar/" + idPath;
  HttpClient hc(p.isSecure);
  if (!hc.connect(p.host, p.port)) return -1;
  String hdrs = "Host: " + p.host + "\r\nAuthorization: Bearer " + token + "\r\n";
  hdrs += "Content-Type: application/json\r\nContent-Length: " + String(jsonBody.length()) + "\r\nConnection: close\r\n";
  auto r = hc.exchange("POST", fullPath, hdrs, jsonBody);
  outBody = r.body;
  return r.status;
}

// ========== Polling e impresión ==========
void pollAndPrint() {
  if (configMode) return;

  String pendientes;
  int st = httpGet(cfg.api_url + "/api/impresion/pendientes", cfg.api_token, pendientes);

  if (st != 200) {
    if (st != -1) {
      Serial.print("Error al consultar pendientes. HTTP ");
      Serial.println(st);
    }
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, pendientes);
  if (err) {
    Serial.print("Error parseando JSON: ");
    Serial.println(err.c_str());
    return;
  }

  JsonArray jobs = doc.as<JsonArray>();
  if (jobs.size() == 0) return;

  Serial.print("Trabajos pendientes: ");
  Serial.println(jobs.size());

  for (JsonObject job : jobs) {
    const char* id = job["id"];
    const char* contenido = job["contenido"];
    const char* ip = job["direccion_ip"];
    int puerto = job["puerto"] | 9100;
    const char* nombre = job["impresora_nombre"];

    Serial.printf("Imprimiendo %s -> %s (%s:%d)\n", id, nombre, ip, puerto);
    ledSet(100);

    WiFiClient printer;
    if (!printer.connect(ip, puerto, PRINTER_TIMEOUT_MS)) {
      Serial.println("Error: No se pudo conectar a la impresora");
      String resp;
      httpPost(cfg.api_url, id, cfg.api_token,
               "{\"estado\":\"error\",\"error_msg\":\"No se pudo conectar\"}", resp);
      continue;
    }

    size_t len = strlen(contenido);
    printer.write((const uint8_t*)contenido, len);
    printer.flush();
    printer.stop();

    Serial.println("Impresión enviada correctamente");

    String resp;
    int st2 = httpPost(cfg.api_url, id, cfg.api_token, "{\"estado\":\"enviado\"}", resp);
    if (st2 != 200) {
      Serial.printf("Error al marcar trabajo. HTTP %d\n", st2);
    }
  }

  ledOn();
}

// ========== Setup y loop ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\nStockAbastos Print Bridge v1.0");

  pinMode(LED_PIN, OUTPUT);
  ledOff();

  loadConfig();

  if (cfg.configured && cfg.wifi_ssid.length() > 0) {
    if (connectWiFi()) {
      configMode = false;
      ledOn();
      Serial.println("Iniciando polling de impresión...");
    } else {
      Serial.println("No se pudo conectar al WiFi. Entrando en modo configuración...");
      startConfigMode();
    }
  } else {
    startConfigMode();
  }
}

void loop() {
  if (configMode) {
    dns.processNextRequest();
    httpServer.handleClient();
    ledUpdate();
  } else {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi desconectado. Intentando reconectar...");
      if (!connectWiFi()) {
        ESP.restart();
      }
    }

    if (millis() - lastPoll >= POLL_INTERVAL_MS) {
      lastPoll = millis();
      pollAndPrint();
    }
  }
}
