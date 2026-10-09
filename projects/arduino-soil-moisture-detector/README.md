# Arduino Soil Moisture Detection System

An Arduino Uno project that reads an analog soil-moisture sensor, reports the reading over Serial Monitor, and lights an indicator LED when the soil is detected as dry.

## Features
- Reads an analog soil sensor through A0.
- Shows raw sensor values and a DRY/WET status in Serial Monitor.
- Turns an indicator LED on when the reading crosses the configured dry threshold.
- Uses a configurable threshold so it can be calibrated for different sensors and soil types.

## Components
- Arduino Uno
- Analog soil moisture sensor (with AO, VCC, and GND pins)
- LED
- 220–330 Ω resistor for the LED
- Breadboard and jumper wires
- USB cable
- Potting soil and a small plant pot for testing

## Wiring

### Soil moisture sensor
- **VCC** → Arduino **5V** (follow the voltage rating of your sensor)
- **GND** → Arduino **GND**
- **AO** → Arduino **A0**

### Dry indicator LED
- Arduino **D7** → **220–330 Ω resistor** → LED anode (long leg)
- LED cathode (short leg) → **GND**

Keep the sensor's electronics and connector out of soil and water. Only insert the probe section as recommended by its manufacturer. Disconnect power before changing wiring.

## Run it
1. Open `soil_moisture_detector.ino` in Arduino IDE.
2. Select **Arduino Uno** and the correct serial port.
3. Upload the sketch.
4. Open Serial Monitor at **9600 baud**.
5. Compare readings in air, dry soil, and damp soil.
6. Adjust `DRY_THRESHOLD` to fit your sensor and conditions.

## Calibration matters
Sensor readings vary by sensor type, soil composition, and supply voltage. Many common analog modules produce higher readings when dry and lower readings when wet, but not all sensors behave the same way. This example assumes **higher readings mean drier soil**. If your sensor behaves in the opposite direction, reverse the comparison in the sketch.

## How it works
The Arduino reads the sensor using `analogRead(A0)`, prints the raw value, and compares it with a threshold. The LED turns on when the code classifies the soil as dry.

## Reference
The sketch is an original beginner-friendly implementation using the Arduino analog input interface and common soil-moisture sensor calibration practices:
- [Arduino reference: analogRead()](https://docs.arduino.cc/language-reference/en/functions/analog-io/analogRead/)
- [ArduinoGetStarted: Soil Moisture Sensor](https://arduinogetstarted.com/tutorials/arduino-soil-moisture-sensor)
- [Adafruit Learning System: Simple Soil Moisture Sensor](https://learn.adafruit.com/adafruit-simple-soil-moisture-sensor/arduino-2)

## Variant: percentage calibration
`variants/soil_moisture_detection/soil_moisture_detection.ino` extends the idea. It averages 10 readings to reduce noise, converts them to an estimated 0 to 100% moisture value from two calibration points (`DRY_VALUE` and `WET_VALUE`), and lights the LED when the estimate falls below a percentage threshold. **This variant drives the LED from D6, not D7.**

The percentage is an estimate based on your calibration, not a laboratory measurement. Record readings from dry and well-watered soil and update both calibration values before relying on it. A capacitive sensor is recommended for longer-term use.

Further reading for this variant:
- [SunFounder: Capacitive Soil Moisture Module](https://docs.sunfounder.com/projects/umsk/en/latest/02_arduino/uno_lesson02_soil_moisture.html)
- [Arduino Project Hub: Soil Moisture Sensor with Arduino](https://projecthub.arduino.cc/Aswinth/soil-moisture-sensor-with-arduino-91c818)
