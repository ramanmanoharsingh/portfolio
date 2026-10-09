# Smart Street Light System (Arduino Uno + LDR)

An introductory Arduino project that switches an LED on when ambient light falls below an adjustable threshold and switches it off in brighter conditions.

## Components
- Arduino Uno
- LDR (photoresistor)
- 10 kΩ resistor
- LED and a suitable current-limiting resistor (for example, 220–330 Ω)
- Breadboard and jumper wires

## Example wiring
Build an LDR voltage divider: connect one LDR leg to 5V and the other leg to A0; connect a 10 kΩ resistor between A0 and GND. Connect the LED anode through its current-limiting resistor to digital pin 9, and the LED cathode to GND.

This divider arrangement usually produces higher analog readings in brighter light. If your divider is wired differently, the readings may be reversed.

## Run it
1. Open `smart_street_light.ino` in the Arduino IDE.
2. Select **Arduino Uno** and the correct serial port.
3. Upload the sketch.
4. Open Serial Monitor at **9600 baud** and test by covering/uncovering the LDR.
5. Adjust `LIGHT_THRESHOLD` for your room and sensor.

## How it works
The Uno reads the LDR voltage through A0. When the reading falls below the configured threshold, it switches on the demonstration LED; otherwise, it switches it off.

> This is a low-voltage educational prototype using an LED, not a mains-powered streetlight controller. Do not connect household mains voltage directly to the Arduino or breadboard.

## Attribution and further reading
This is a simple, independently written example based on common Arduino LDR/automatic-light tutorials. See:
- [Arduino Project Hub — Automatic Street Light Controller](https://projecthub.arduino.cc/SURYATEJA/automatic-street-light-controller-5e5cbf)
- [Example GitHub project — Smart Street Light](https://github.com/anchitctrl/Smart-Street-Light)

The sketch in this repository is provided as an educational starting point; calibrate it for your own components.
