/*
  Smart Street Light System
  Board: Arduino Uno
  Sensor: LDR voltage divider on A0
  Output: LED on digital pin 9

  Example divider: 5V -> LDR -> A0 -> 10k resistor -> GND.
  With this arrangement, brighter light usually gives a higher reading.
*/

const int LDR_PIN = A0;
const int LIGHT_PIN = 9;
const int LIGHT_THRESHOLD = 500;  // Tune for your sensor and room lighting.

void setup() {
  pinMode(LIGHT_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lightLevel = analogRead(LDR_PIN);

  // Turn the demonstration LED on when the environment is dark.
  bool isDark = lightLevel < LIGHT_THRESHOLD;
  digitalWrite(LIGHT_PIN, isDark ? HIGH : LOW);

  Serial.print("LDR reading: ");
  Serial.print(lightLevel);
  Serial.print(" | Condition: ");
  Serial.print(isDark ? "Dark" : "Bright");
  Serial.print(" | Light: ");
  Serial.println(isDark ? "ON" : "OFF");

  delay(300);
}
