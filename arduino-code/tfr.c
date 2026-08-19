/*
 * ============================================================
 *  GridSentinel — TFR (Tower Footing Resistance) Firmware
 *  Hardware : Arduino Uno + AD620 + ADS1115 + LCD (I2C)
 *  Method   : Fall-of-Potential (3-electrode method)
 *  Output   : JSON over UART at 9600 baud (read by serial_bridge.py)
 *
 *  Wiring:
 *    C1 → tower grounding rod
 *    C2 → remote earth stake (>10 m away)
 *    P  → potential stake at 62% of C1-C2 distance
 *    ADS1115 AIN0(+) → AD620 OUT, AIN1(-) → GND
 *    AD620 IN+ → P electrode, IN- → C1 stake
 * ============================================================
 */

#include <Adafruit_ADS1X15.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

/* ── Hardware objects ──────────────────────────────────────── */
Adafruit_ADS1115 ads;
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* ── Pin definitions ───────────────────────────────────────── */
const int LED_G = 8;   // Green  — HEALTHY  (< 10 Ω)
const int LED_Y = 9;   // Yellow — WARNING  (10–25 Ω)
const int LED_R = 10;  // Red    — CRITICAL (> 25 Ω)

/* ── Measurement constants ─────────────────────────────────── */
const float CURRENT_mA    = 109.0;   // Injected DC current (calibrated)
const float AD620_GAIN    = 100.0;   // Set by 499 Ω gain resistor: G = 1 + 49400/Rg
const float ADS_MULTIPLIER = 0.0001875; // V/LSB at GAIN_ONE (±4.096 V range)
const int   NUM_SAMPLES   = 20;      // Readings averaged per measurement cycle
const int   TOWER_ID      = 1;       // Change per physical unit: 1–10

/* ── Thresholds (Ω) ────────────────────────────────────────── */
const float THR_HEALTHY  = 10.0;
const float THR_WARNING  = 25.0;

/* ── Forward declarations ──────────────────────────────────── */
float measureResistance();
void  updateLED(float r);
void  updateLCD(float r, const char* status);
void  printJSON(float r, const char* status);

/* ─────────────────────────────────────────────────────────── */
void setup() {
  Serial.begin(9600);

  /* LED init */
  pinMode(LED_G, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_R, OUTPUT);

  /* Startup LED sweep (visual self-test) */
  digitalWrite(LED_G, HIGH); delay(400); digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, HIGH); delay(400); digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, HIGH); delay(400); digitalWrite(LED_R, LOW);

  /* ADS1115 init */
  if (!ads.begin()) {
    Serial.println("{\"error\":\"ADS1115 not found\"}");
    while (1);  // halt — hardware fault
  }
  ads.setGain(GAIN_ONE);  // ±4.096 V full-scale

  /* LCD init */
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("GridSentinel TFR");
  lcd.setCursor(0, 1);
  lcd.print("  Initialising..");
  delay(1500);
  lcd.clear();

  Serial.println("{\"boot\":\"TFR_READY\",\"tower_id\":" + String(TOWER_ID) + "}");
}

/* ─────────────────────────────────────────────────────────── */
void loop() {
  float resistance = measureResistance();

  /* Classify */
  const char* status;
  if      (resistance < THR_HEALTHY)  status = "HEALTHY";
  else if (resistance < THR_WARNING)  status = "WARNING";
  else                                 status = "CRITICAL";

  /* Outputs */
  updateLED(resistance);
  updateLCD(resistance, status);
  printJSON(resistance, status);

  delay(1000);
}

/* ─────────────────────────────────────────────────────────── */
/*  measureResistance — averages NUM_SAMPLES ADC reads        */
/*  Returns R in Ohms using R = V / I                         */
/* ─────────────────────────────────────────────────────────── */
float measureResistance() {
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += ads.readADC_Differential_0_1();  // differential: AIN0 - AIN1
    delay(5);
  }
  int16_t raw_avg = (int16_t)(sum / NUM_SAMPLES);

  float amplified_mV = raw_avg * ADS_MULTIPLIER * 1000.0;  // convert V → mV
  float actual_mV    = amplified_mV / AD620_GAIN;          // undo amplifier gain
  float current_A    = CURRENT_mA / 1000.0;

  float resistance = (actual_mV / 1000.0) / current_A;    // R = V/I (Ω)

  /* Clamp to realistic range — negative means reversed polarity or no contact */
  if (resistance < 0.0) resistance = 0.0;
  if (resistance > 999.0) resistance = 999.0;

  return resistance;
}

/* ─────────────────────────────────────────────────────────── */
void updateLED(float r) {
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, LOW);
  if      (r < THR_HEALTHY)  digitalWrite(LED_G, HIGH);
  else if (r < THR_WARNING)  digitalWrite(LED_Y, HIGH);
  else                        digitalWrite(LED_R, HIGH);
}

/* ─────────────────────────────────────────────────────────── */
void updateLCD(float r, const char* status) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T");
  lcd.print(TOWER_ID);
  lcd.print(" R=");
  lcd.print(r, 2);
  lcd.print(" ohm");

  lcd.setCursor(0, 1);
  lcd.print("STS:");
  lcd.print(status);
}

/* ─────────────────────────────────────────────────────────── */
/*  printJSON — emits one line of JSON per reading            */
/*  serial_bridge.py reads and parses this line               */
/*                                                            */
/*  Format:                                                   */
/*  {"device":"TFR","tower_id":1,"tfr_ohm":18.52,            */
/*   "status":"WARNING","current_mA":109.0}                  */
/* ─────────────────────────────────────────────────────────── */
void printJSON(float r, const char* status) {
  Serial.print("{");
  Serial.print("\"device\":\"TFR\",");
  Serial.print("\"tower_id\":");    Serial.print(TOWER_ID);            Serial.print(",");
  Serial.print("\"tfr_ohm\":");     Serial.print(r, 3);                Serial.print(",");
  Serial.print("\"status\":\"");    Serial.print(status);              Serial.print("\",");
  Serial.print("\"current_mA\":"); Serial.print(CURRENT_mA, 1);
  Serial.println("}");
}