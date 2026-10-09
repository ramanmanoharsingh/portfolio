# Soil Moisture Detection System (Arduino Uno)

A beginner-friendly project that reads an analog soil-moisture sensor, estimates a moisture percentage using calibration values, and lights an LED when the soil appears dry.

## Components
- Arduino Uno
- Analog soil moisture sensor (capacitive sensor recommended for longer-term use)
- LED and a suitable current-limiting resistor (for example, 220–330 Ω)
- Breadboard and jumper wires
- USB cable

## Wiring
- Sensor VCC → Arduino 5V
- Sensor GND → Arduino GND
- Sensor analog output (AO) → A0
- LED anode through a current-limiting resistor → digital pin 6
- LED cathode → GND

## Run it
1. Open `soil_moisture_detection.ino` in the Arduino IDE.
2. Select **Arduino Uno** and the correct serial port.
3. Upload the sketch and open Serial Monitor at **9600 baud**.
4. Note the readings from dry soil and well-watered soil.
5. Update `DRY_VALUE` and `WET_VALUE` in the sketch for your particular sensor. The example values are not universal.

The sketch assumes the common capacitive sensor behavior where a higher reading is drier and a lower reading is wetter. If your module behaves in the opposite direction, swap the calibration logic accordingly.

## How it works
The Arduino samples the sensor's analog output, averages a few readings to reduce noise, converts the result to an estimated 0–100% range using your calibration points, and turns on the LED when the estimated moisture falls below the configured threshold.

> The percentage is an estimate based on calibration, not a laboratory measurement. Keep electronics and exposed connections away from water.

## Attribution and further reading
This is an independently written beginner example based on common Arduino soil-moisture sensing practices. Helpful references:
- [SunFounder — Capacitive Soil Moisture Module](https://docs.sunfounder.com/projects/umsk/en/latest/02_arduino/uno_lesson02_soil_moisture.html)
- [Arduino Project Hub — Soil Moisture Sensor with Arduino](https://projecthub.arduino.cc/Aswinth/soil-moisture-sensor-with-arduino-91c818)

Please calibrate the sketch with your own sensor before relying on the displayed percentage.
