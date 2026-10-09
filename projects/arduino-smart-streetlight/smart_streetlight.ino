/*
  Arduino Smart Street Lighting System
  Board: Arduino Uno
  Sensor: LDR in a voltage divider on A0
  Demo output: LED on D9

  Wiring assumed:
  5V -> LDR -> A0 -> 10k resistor -> GND
  D9 -> 220-330 ohm resistor -> LED anode
  LED cathode -> GND

  This is a low-voltage LED demonstration, not a mains-light controller.
*/

const int LDR_PIN = A0;
const int STREETLIGHT_LED_PIN = 9;

// Calibrate these values for your sensor and wiring.
// With the wiring above, readings generally rise as the room gets brighter.
const int DARK_THRESHOLD = 420;
const int BRIGHT_THRESHOLD = 500;

bool streetlightOn = false;

void setup() {
  pinMode(STREETLIGHT_LED_PIN, OUTPUT);
  digitalWrite(STREETLIGHT_LED_PIN, LOW);

  Serial.begin(9600);
  Serial.println("Smart Street Lighting System");
  Serial.println("Adjust DARK_THRESHOLD and BRIGHT_THRESHOLD after testing.");
}

void loop() {
  int lightLevel = analogRead(LDR_PIN);

  // Hysteresis helps prevent flickering near the switching point.
  if (!streetlightOn && lightLevel < DARK_THRESHOLD) {
    streetlightOn = true;
  } else if (streetlightOn && lightLevel > BRIGHT_THRESHOLD) {
    streetlightOn = false;
  }

  digitalWrite(STREETLIGHT_LED_PIN, streetlightOn ? HIGH : LOW);

  Serial.print("LDR reading: ");
  Serial.print(lightLevel);
  Serial.print(" | Streetlight: ");
  Serial.println(streetlightOn ? "ON" : "OFF");

  delay(300);
}
