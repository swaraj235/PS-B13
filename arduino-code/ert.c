#include <Adafruit_ADS1X15.h>
#include <Wire.h>

Adafruit_ADS1115 ads;

// LED Pins
const int LED_G = 8;
const int LED_Y = 9;
const int LED_R = 10;

// System Parameters
const float CURRENT_mA = 109.0;
const float AD620_GAIN = 106.0; // For 470Ω gain resistor
const float ADS_MULTIPLIER = 0.0001875;

void setup() {
  Serial.begin(9600);

  // LED Outputs
  pinMode(LED_G, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_R, OUTPUT);

  // LED Test
  Serial.println("Testing LEDs...");

  digitalWrite(LED_G, HIGH);
  delay(500);
  digitalWrite(LED_G, LOW);

  digitalWrite(LED_Y, HIGH);
  delay(500);
  digitalWrite(LED_Y, LOW);

  digitalWrite(LED_R, HIGH);
  delay(500);
  digitalWrite(LED_R, LOW);

  // Start ADS1115
  if (!ads.begin()) {
    Serial.println("ADS1115 not found!");
    while (1)
      ;
  }

  ads.setGain(GAIN_ONE);

  Serial.println("Advanced TFR System Ready");
  Serial.println("---------------------------");
}

void loop() {

  // Average 10 readings for stability
  long sum = 0;

  for (int i = 0; i < 10; i++) {
    sum += ads.readADC_SingleEnded(0);
    delay(5);
  }

  int16_t raw = sum / 10;

  // Voltage Calculations
  float amplified_mV = raw * ADS_MULTIPLIER;
  float actual_mV = amplified_mV / AD620_GAIN;

  // Resistance Calculation
  float current_A = CURRENT_mA / 1000.0;

  float resistance = (actual_mV / 1000.0) / current_A;

  // Serial Monitor Output
  Serial.print("Raw ADC: ");
  Serial.print(raw);

  Serial.print(" | Amplified: ");
  Serial.print(amplified_mV, 3);
  Serial.print(" mV");

  Serial.print(" | Actual: ");
  Serial.print(actual_mV, 3);
  Serial.print(" mV");

  Serial.print(" | Resistance: ");
  Serial.print(resistance, 2);
  Serial.print(" ohm");

  Serial.print(" | Status: ");

  // Turn OFF all LEDs first
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, LOW);

  // Decision Logic
  if (resistance < 0.005) {

    digitalWrite(LED_G, HIGH);
    if (resistance < 0.010) {

      digitalWrite(LED_R, HIGH);

      Serial.println("CRITICAL (Red)");

    } else if (resistance < 0.025) {

      digitalWrite(LED_Y, HIGH);

      Serial.println("WARNING (Yellow)");

    } else {

      digitalWrite(LED_G, HIGH);

      Serial.println("HEALTHY (Green)");
    }

    Serial.println("---------------------------");

    delay(1000);
  }