/*
  Arduino Soil Moisture Detection System
  Board: Arduino Uno
  Analog soil moisture sensor AO -> A0
  Sensor VCC -> board voltage recommended by sensor maker
  Sensor GND -> GND
  Indicator LED: D7 -> 220-330 ohm resistor -> LED anode
  LED cathode -> GND

  Assumption: higher analog readings indicate drier soil.
  Calibrate DRY_THRESHOLD for your specific sensor and soil.
*/

const int MOISTURE_SENSOR_PIN = A0;
const int DRY_INDICATOR_LED_PIN = 7;

// Example starting value only. Read your sensor in dry and damp soil
// and adjust this threshold before relying on the status.
const int DRY_THRESHOLD = 600;

void setup() {
  pinMode(DRY_INDICATOR_LED_PIN, OUTPUT);
  digitalWrite(DRY_INDICATOR_LED_PIN, LOW);

  Serial.begin(9600);
  Serial.println("Soil Moisture Detection System");
  Serial.println("Calibrate DRY_THRESHOLD for your sensor.");
}

void loop() {
  int moistureReading = analogRead(MOISTURE_SENSOR_PIN);
  bool soilIsDry = moistureReading > DRY_THRESHOLD;

  digitalWrite(DRY_INDICATOR_LED_PIN, soilIsDry ? HIGH : LOW);

  Serial.print("Sensor reading: ");
  Serial.print(moistureReading);
  Serial.print(" | Soil status: ");
  Serial.println(soilIsDry ? "DRY - check watering" : "MOIST");

  delay(1000);
}
