/*
 * ============================================================
 *  GridSentinel — ERT (Electrical Resistivity Tomography) Firmware
 *  Hardware : Arduino Uno + AD620 + ADS1115
 *  Method   : Wenner Array (4-electrode)
 *  Output   : JSON over UART at 9600 baud (read by serial_bridge.py)
 *
 *  Wenner Array Layout (top view, buried in soil near tower base):
 *
 *    A ────── M ────── N ────── B
 *    |←  a  →|←  a  →|←  a  →|
 *
 *    A, B = current injection electrodes
 *    M, N = voltage measurement electrodes
 *    a    = electrode spacing (meters)
 *
 *  Apparent Resistivity:
 *    ρ = 2π × a × (V_MN / I_AB)   [Ω·m]
 *
 *  Wiring:
 *    Arduino D2  → relay/switch for A electrode (current injection)
 *    Arduino D3  → relay/switch for B electrode (current sink)
 *    ADS1115 AIN0(+) → AD620 OUT
 *    ADS1115 AIN1(-) → GND
 *    AD620 IN+  → M electrode
 *    AD620 IN-  → N electrode
 * ============================================================
 */

#include <Adafruit_ADS1X15.h>
#include <Wire.h>

/* ── Hardware objects ──────────────────────────────────────── */
Adafruit_ADS1115 ads;

/* ── Pin definitions ───────────────────────────────────────── */
const int LED_G     = 8;   // Green  — NORMAL
const int LED_Y     = 9;   // Yellow — ANOMALY (elevated ρ)
const int LED_R     = 10;  // Red    — CRITICAL (very high ρ → corrosion / void)
const int PIN_CUR_A = 2;   // Relay: inject current at A electrode
const int PIN_CUR_B = 3;   // Relay: current return at B electrode

/* ── Measurement constants ─────────────────────────────────── */
const float CURRENT_mA     = 109.0;    // Injected current (calibrated)
const float AD620_GAIN     = 106.0;    // Gain for 470 Ω resistor: G = 1 + 49400/470
const float ADS_MULTIPLIER = 0.0001875; // V/LSB at GAIN_ONE
const int   NUM_SAMPLES    = 20;       // Averaged ADC readings per cycle

/* ── Electrode spacings to sweep (multi-depth profiling) ───── */
// ERT profiles at 3 depths by varying electrode spacing 'a'
// Depth of investigation ≈ 0.5 × a (Wenner rule)
const float SPACING_M[]  = { 0.20, 0.40, 0.60 };   // meters
const int   NUM_SPACINGS = 3;

/* ── Tower / site ID ───────────────────────────────────────── */
const int TOWER_ID = 1;   // Change per physical unit: 1–10

/* ── Anomaly thresholds (Ω·m) ─────────────────────────────── */
// Typical dry soil: 50–200 Ω·m
// Wet/clay soil:   10–50  Ω·m
// Corrosion risk:  elevated ρ + sudden change across depths
const float THR_NORMAL   = 150.0;   // ρ < 150   → NORMAL
const float THR_ANOMALY  = 300.0;   // 150–300   → ANOMALY

/* ── Forward declarations ──────────────────────────────────── */
float measureVoltage_mV();
float computeRho(float voltage_mV, float spacing_m);
void  classifyAndOutput(float rho[], int n);
void  updateLED(const char* status);
void  printJSON(float rho[], int n, const char* status);

/* ─────────────────────────────────────────────────────────── */
void setup() {
  Serial.begin(9600);

  /* Pin init */
  pinMode(LED_G,     OUTPUT);
  pinMode(LED_Y,     OUTPUT);
  pinMode(LED_R,     OUTPUT);
  pinMode(PIN_CUR_A, OUTPUT);
  pinMode(PIN_CUR_B, OUTPUT);

  /* Relays off at start */
  digitalWrite(PIN_CUR_A, LOW);
  digitalWrite(PIN_CUR_B, LOW);

  /* Startup LED sweep */
  digitalWrite(LED_G, HIGH); delay(400); digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, HIGH); delay(400); digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, HIGH); delay(400); digitalWrite(LED_R, LOW);

  /* ADS1115 init */
  if (!ads.begin()) {
    Serial.println("{\"error\":\"ADS1115 not found\"}");
    while (1);
  }
  ads.setGain(GAIN_SIXTEEN);  // ±0.256 V — tiny soil voltages need max gain
  // At GAIN_SIXTEEN: 1 LSB = 0.0000078125 V = 0.0078125 mV
  // Override multiplier for this gain:
  // ADS_MULTIPLIER at GAIN_SIXTEEN = 0.0000078125

  Serial.println("{\"boot\":\"ERT_READY\",\"tower_id\":" + String(TOWER_ID) + "}");
  delay(500);
}

/* ─────────────────────────────────────────────────────────── */
void loop() {
  float rho_profile[NUM_SPACINGS];

  /* Sweep across electrode spacings for multi-depth ERT */
  for (int s = 0; s < NUM_SPACINGS; s++) {
    float spacing = SPACING_M[s];

    /* Activate current injection */
    digitalWrite(PIN_CUR_A, HIGH);
    digitalWrite(PIN_CUR_B, HIGH);
    delay(50);   // wait for current to stabilise

    /* Measure voltage across M-N */
    float vmn_mV = measureVoltage_mV();

    /* Deactivate */
    digitalWrite(PIN_CUR_A, LOW);
    digitalWrite(PIN_CUR_B, LOW);
    delay(50);   // discharge

    rho_profile[s] = computeRho(vmn_mV, spacing);
    delay(200);
  }

  classifyAndOutput(rho_profile, NUM_SPACINGS);

  delay(5000);  // ERT cycle every 5 seconds (power-intensive — less frequent than TFR)
}

/* ─────────────────────────────────────────────────────────── */
/*  measureVoltage_mV — averages NUM_SAMPLES differential reads */
/* ─────────────────────────────────────────────────────────── */
float measureVoltage_mV() {
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += ads.readADC_Differential_0_1();
    delay(5);
  }
  int16_t raw_avg = (int16_t)(sum / NUM_SAMPLES);

  /* At GAIN_SIXTEEN each LSB = 0.0000078125 V */
  float voltage_V  = raw_avg * 0.0000078125;
  float voltage_mV = voltage_V * 1000.0;

  /* Undo AD620 amplifier gain */
  float actual_mV = voltage_mV / AD620_GAIN;

  return actual_mV;
}

/* ─────────────────────────────────────────────────────────── */
/*  computeRho — Wenner formula: ρ = 2π × a × (V/I)          */
/* ─────────────────────────────────────────────────────────── */
float computeRho(float voltage_mV, float spacing_m) {
  float voltage_V = voltage_mV / 1000.0;
  float current_A = CURRENT_mA  / 1000.0;
  float rho = 2.0 * 3.14159265 * spacing_m * (voltage_V / current_A);  // Ω·m

  /* Clamp to physically realistic range */
  if (rho < 0.0)    rho = 0.0;
  if (rho > 5000.0) rho = 5000.0;

  return rho;
}

/* ─────────────────────────────────────────────────────────── */
void classifyAndOutput(float rho[], int n) {
  /* Use the shallowest depth (index 0) as primary indicator */
  float primary_rho = rho[0];

  const char* status;
  if      (primary_rho < THR_NORMAL)  status = "NORMAL";
  else if (primary_rho < THR_ANOMALY) status = "ANOMALY";
  else                                 status = "CRITICAL";

  updateLED(status);
  printJSON(rho, n, status);
}

/* ─────────────────────────────────────────────────────────── */
void updateLED(const char* status) {
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, LOW);
  if      (strcmp(status, "NORMAL")   == 0) digitalWrite(LED_G, HIGH);
  else if (strcmp(status, "ANOMALY")  == 0) digitalWrite(LED_Y, HIGH);
  else                                       digitalWrite(LED_R, HIGH);
}

/* ─────────────────────────────────────────────────────────── */
/*  printJSON — one JSON line per ERT cycle                   */
/*                                                            */
/*  Format:                                                   */
/*  {"device":"ERT","tower_id":1,"status":"NORMAL",          */
/*   "depths":[                                              */
/*     {"spacing_m":0.20,"depth_cm":10,"rho_ohm_m":82.3},   */
/*     {"spacing_m":0.40,"depth_cm":20,"rho_ohm_m":91.7},   */
/*     {"spacing_m":0.60,"depth_cm":30,"rho_ohm_m":108.4}   */
/*   ],"current_mA":109.0}                                   */
/* ─────────────────────────────────────────────────────────── */
void printJSON(float rho[], int n, const char* status) {
  Serial.print("{");
  Serial.print("\"device\":\"ERT\",");
  Serial.print("\"tower_id\":"); Serial.print(TOWER_ID); Serial.print(",");
  Serial.print("\"status\":\""); Serial.print(status);   Serial.print("\",");
  Serial.print("\"depths\":[");

  for (int i = 0; i < n; i++) {
    float spacing   = SPACING_M[i];
    float depth_cm  = spacing * 0.5 * 100.0;  // depth ≈ 0.5a, convert m→cm
    Serial.print("{");
    Serial.print("\"spacing_m\":");  Serial.print(spacing, 2); Serial.print(",");
    Serial.print("\"depth_cm\":");   Serial.print(depth_cm, 0); Serial.print(",");
    Serial.print("\"rho_ohm_m\":"); Serial.print(rho[i], 2);
    Serial.print("}");
    if (i < n - 1) Serial.print(",");
  }

  Serial.print("],");
  Serial.print("\"current_mA\":"); Serial.print(CURRENT_mA, 1);
  Serial.println("}");
}