/*
  Soil Moisture Detection System
  Board: Arduino Uno
  Analog sensor output: A0
  Dry-condition indicator LED: digital pin 6

  The example assumes a capacitive sensor whose reading decreases
  as soil becomes wetter. Calibrate DRY_VALUE and WET_VALUE for
  your own sensor before using the estimated percentage.
*/

const int MOISTURE_PIN = A0;
const int STATUS_LED_PIN = 6;

// Example calibration only; sensor readings vary by model and soil.
const int DRY_VALUE = 800;
const int WET_VALUE = 350;
const int DRY_THRESHOLD_PERCENT = 35;

int readAverageMoisture() {
  const int samples = 10;
  long total = 0;

  for (int i = 0; i < samples; i++) {
    total += analogRead(MOISTURE_PIN);
    delay(10);
  }

  return total / samples;
}

void setup() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int rawValue = readAverageMoisture();

  // Map calibrated sensor values to an estimated moisture percentage.
  int moisturePercent = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  bool soilIsDry = moisturePercent < DRY_THRESHOLD_PERCENT;
  digitalWrite(STATUS_LED_PIN, soilIsDry ? HIGH : LOW);

  Serial.print("Raw sensor value: ");
  Serial.print(rawValue);
  Serial.print(" | Estimated moisture: ");
  Serial.print(moisturePercent);
  Serial.print("% | Status: ");
  Serial.print(soilIsDry ? "DRY - check watering" : "Moisture adequate");
  Serial.print(" | Indicator LED: ");
  Serial.println(soilIsDry ? "ON" : "OFF");

  delay(1000);
}
