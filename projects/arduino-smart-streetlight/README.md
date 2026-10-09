# Arduino Smart Street Lighting System

An Arduino Uno project that uses an LDR (light-dependent resistor) to detect ambient light and automatically switch an LED streetlight on in low-light conditions.

## Features
- Reads ambient light using an LDR voltage divider.
- Uses threshold hysteresis to reduce rapid switching near dusk/dawn.
- Prints sensor readings and light status to the Serial Monitor.
- Uses a low-voltage LED demonstration output; it does **not** control mains-powered streetlights.

## Components
- Arduino Uno
- LDR/photoresistor
- 10 kΩ resistor
- LED
- 220–330 Ω resistor for the LED
- Breadboard and jumper wires
- USB cable

## Wiring

### LDR voltage divider
1. Connect one LDR leg to **5V**.
2. Connect the other LDR leg to **A0**.
3. Connect a **10 kΩ resistor** from **A0** to **GND**.

With this arrangement, the analog reading will generally rise in brighter conditions.

### LED output
1. Connect Arduino **D9** to a **220–330 Ω resistor**.
2. Connect the resistor to the LED anode (long leg).
3. Connect the LED cathode (short leg) to **GND**.

Disconnect USB power before changing wiring. Do not connect this circuit directly to mains electricity.

## Run it
1. Open `smart_streetlight.ino` in the Arduino IDE.
2. Select **Arduino Uno** and the correct serial port.
3. Upload the sketch.
4. Open Serial Monitor at **9600 baud**.
5. Cover and uncover the LDR to test the light response.

## Calibration
The example uses `DARK_THRESHOLD = 420` and `BRIGHT_THRESHOLD = 500`. These are starting points, not universal values. Observe the Serial Monitor readings in bright and dark conditions, then adjust both values for your room and LDR. The bright threshold should be higher than the dark threshold.

## How it works
The Arduino reads the LDR voltage through `analogRead(A0)`, which on a standard Uno returns values from 0 to 1023. When the reading falls below the dark threshold, the LED turns on; when it rises above the bright threshold, the LED turns off.

## Reference
The sketch is an original beginner-friendly implementation based on the documented Arduino `analogRead()` behavior and common LDR divider practice:
- [Arduino reference: analogRead()](https://docs.arduino.cc/language-reference/en/functions/analog-io/analogRead/)
- [Arduino Project Hub: Working with an LDR](https://projecthub.arduino.cc/SBR/working-with-light-dependent-resistor-ldr-265175)

## Variant: single threshold
`variants/smart_street_light/smart_street_light.ino` is a simpler version of the sketch. It uses one `LIGHT_THRESHOLD` instead of a dark/bright pair, so it has no hysteresis and can flicker near dusk. The wiring is identical (LED on D9), which makes it a good first test before moving to the main sketch. Calibrate the threshold for your own room and sensor.

Further reading for this variant:
- [Arduino Project Hub: Automatic Street Light Controller](https://projecthub.arduino.cc/SURYATEJA/automatic-street-light-controller-5e5cbf)
- [Example GitHub project: Smart Street Light](https://github.com/anchitctrl/Smart-Street-Light)
