# Hobeian for Homey

Adds support for Hobeian Zigbee devices.

## Supported Devices

### ZG-303Z Soil Moisture Sensor

A battery-powered Zigbee soil moisture sensor with temperature and humidity sensing.

**Capabilities:**
- Soil Moisture (0-100%)
- Temperature (°C)
- Air Humidity (0-100%)
- Battery Level (%)
- Water Shortage Alarm

**Settings:**
- Temperature Calibration (-30 to +30)
- Humidity Calibration (-30 to +30)
- Soil Moisture Calibration (-30 to +30)
- Temperature/Humidity Sampling Interval (5-3600 seconds)
- Soil Moisture Sampling Interval (5-3600 seconds)
- Soil Dryness Threshold (0-100%)

**Technical Details:**
- Zigbee Manufacturer: HOBEIAN (Tuya OEM: _TZE200_wqashyqo)
- Zigbee Model: ZG-303Z (Tuya: TS0601)
- Power: 2x AAA batteries
- Protocol: Tuya Zigbee (Cluster 0xEF00)

## Driver Image Credits

- `drivers/zg-227z/assets/images/small.png` and `drivers/zg-227z/assets/images/large.png` are adapted from the Zigbee2MQTT device image for ZG-227Z: https://www.zigbee2mqtt.io/images/devices/ZG-227Z.png (device page: https://www.zigbee2mqtt.io/devices/ZG-227Z.html).
- `drivers/zg-222z/assets/images/small.png` and `drivers/zg-222z/assets/images/large.png` are adapted from the Zigbee2MQTT device image for ZG-222Z: https://www.zigbee2mqtt.io/images/devices/ZG-222Z.png (device page: https://www.zigbee2mqtt.io/devices/ZG-222Z.html).
- `drivers/zg-303z/assets/images/small.png` and `drivers/zg-303z/assets/images/large.png` are kept unchanged in this update. Reference device page: https://www.zigbee2mqtt.io/devices/ZG-303Z.html.

## Installation

1. Install the app from the Homey App Store
2. Add device: Devices → + → Hobeian → ZG-303Z Soil Sensor
3. Put the sensor in pairing mode (hold button for 5 seconds until LED blinks)
4. Follow the pairing instructions

## Changelog

### 1.0.0
- Initial release
- Added support for ZG-303Z Soil Moisture Sensor