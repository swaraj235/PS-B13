#include <Adafruit_ADS1X15.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

Adafruit_ADS1115 ads;
LiquidCrystal_I2C lcd(0x27, 16, 2);

const int LED_G = 8;
const int LED_Y = 9;
const int LED_R = 10;

const float CURRENT_mA = 109.0;
const float AD620_GAIN = 100.0;
const float ADS_MULTIPLIER = 0.0001875;

void setup() {
  Serial.begin(9600);

  pinMode(LED_G, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_R, OUTPUT);

  // Test each LED on startup
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
    Serial.println("ADS1115 not found! Check wiring.");
    while (1)
      ;
  }
  ads.setGain(GAIN_ONE);

  // Start LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("TFR System Ready");
  delay(2000);

  Serial.println("Advanced TFR System Ready");
  Serial.println("---------------------------");
}

void loop() {
  // Read from ADS1115 AIN0
  int16_t raw = ads.readADC_SingleEnded(0);
  float amplified_mV = raw * ADS_MULTIPLIER;
  float actual_mV = amplified_mV / AD620_GAIN;

  // Calculate resistance R = V / I
  float current_A = CURRENT_mA / 1000.0;
  float resistance = (actual_mV / 1000.0) / current_A;

  // Print to serial
  Serial.print("Raw ADC: ");
  Serial.print(raw);
  Serial.print("  |  Amplified: ");
  Serial.print(amplified_mV, 3);
  Serial.print(" mV  |  Actual: ");
  Serial.print(actual_mV, 3);
  Serial.print(" mV  |  Resistance: ");
  Serial.print(resistance, 2);
  Serial.print(" ohm  |  Status: ");

  // Show on LCD line 1
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("R=");
  lcd.print(resistance, 1);
  lcd.print(" ohm");

  // Reset LEDs
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_Y, LOW);
  digitalWrite(LED_R, LOW);

  // Decision logic
  if (resistance < 10.0) {
    digitalWrite(LED_G, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("STATUS: HEALTHY ");
    Serial.println("HEALTHY — Green");
  } else if (resistance < 25.0) {
    digitalWrite(LED_Y, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("STATUS: WARNING ");
    Serial.println("WARNING — Yellow");
  } else {
    digitalWrite(LED_R, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("STATUS: CRITICAL");
    Serial.println("CRITICAL — Red");
  }

  Serial.println("---------------------------");
  delay(1000);
}