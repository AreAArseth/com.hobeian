# Open Plantbook Integration - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installing the App](#installing-the-app)
3. [Configuring API Credentials](#configuring-api-credentials)
4. [Adding Your First Plant](#adding-your-first-plant)
5. [Linking Sensors](#linking-sensors)
6. [Linking Controllers](#linking-controllers)
7. [Understanding Health Scores](#understanding-health-scores)
8. [Creating Automations](#creating-automations)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Getting Started

The Open Plantbook integration for Homey allows you to:

- Connect your plant sensors to a comprehensive plant care database
- Get intelligent care recommendations based on your specific plant species
- Automate watering and lighting based on optimal conditions
- Share your sensor data with the global plant care community (optional)

### Prerequisites

- Homey device running Homey OS 12.4 or higher
- Plant sensors (e.g., soil moisture, temperature, humidity, light)
- Optional: Controllers (water pumps, grow lights, humidifiers)
- Open Plantbook API credentials (free account at https://open.plantbook.io)

---

## Installing the App

1. Open the Homey app on your phone or go to `homey.local` in your browser
2. Navigate to **Apps** → **Discover**
3. Search for "Open Plantbook"
4. Click **Install**
5. Wait for installation to complete

---

## Configuring API Credentials

Before you can use the app, you need to set up your Open Plantbook API credentials.

### Step 1: Get API Credentials

1. Go to https://open.plantbook.io
2. Sign up for a free account (if you don't have one)
3. Navigate to **API Keys** in the menu
4. Click **Generate New API Key**
5. Copy your **Client ID** and **Client Secret**

### Step 2: Enter Credentials in Homey

1. Open the Homey app
2. Go to **Apps** → **Open Plantbook** → **Settings**
3. Enter your **Client ID**
4. Enter your **Client Secret**
5. The app will automatically test the connection

**Note**: Your credentials are stored securely and only used to communicate with the Open Plantbook API.

---

## Adding Your First Plant

### Step 1: Start Pairing

1. In Homey, go to **Devices** → **Add Device**
2. Select **Open Plantbook** → **Plant**
3. Click **Start Pairing**

### Step 2: Search for Your Plant

1. In the search field, type your plant's name (e.g., "Monstera", "Snake Plant", "Basil")
2. Wait for results to appear
3. Browse through the matching plants
4. Click on the plant you want to add

**Tip**: You can search by common name or scientific name. The database includes thousands of plants.

### Step 3: Review Plant Information

1. Review the plant's optimal care ranges:
   - **Soil Moisture**: Minimum and maximum percentages
   - **Temperature**: Minimum and maximum in Celsius
   - **Humidity**: Minimum and maximum percentages
   - **Light**: Minimum and maximum in lux
2. Check the plant image to confirm it's the right plant
3. Click **Continue**

### Step 4: Link Sensors (Optional)

You can link sensors now or later in device settings:

1. For each sensor type, select a device from the dropdown:
   - **Soil Moisture Sensor**: Select your soil moisture sensor
   - **Temperature Sensor**: Select your temperature sensor
   - **Humidity Sensor**: Select your humidity sensor
   - **Light Sensor**: Select your light sensor
2. If you don't have a sensor yet, select "(No sensor - skip)"
3. Click **Continue**

### Step 5: Link Controllers (Optional)

1. **Water Pump/Valve**: Select a device that can control watering
2. **Grow Light**: Select a device that can control supplemental lighting
3. Enable automation options if desired:
   - ☑ **Auto-water when dry**: Automatically water when soil is too dry
   - ☑ **Auto-supplement when light is low**: Turn on grow light when needed
4. Click **Add Device**

Your plant device is now created! You'll see it in your device list.

---

## Linking Sensors

If you didn't link sensors during pairing, or want to change them:

### Method 1: Via Device Settings

1. Go to **Devices** → Select your plant device
2. Click **Settings** (gear icon)
3. Scroll to **Linked Sensors**
4. For each sensor type, enter: `deviceId:capability`
   - Example: `abc123-def456:measure_soil_moisture`
5. Click **Save**

**Finding Device IDs**: Go to the sensor device's settings page - the ID is shown at the bottom.

### Method 2: Via Flow Action

1. Create a new flow
2. Add action: **Link sensor to plant**
3. Select your plant device
4. Select sensor type
5. Select the sensor device
6. Select the capability

---

## Linking Controllers

### Water Pump/Valve

1. Go to plant device **Settings**
2. Under **Linked Controllers**, enter the device ID for your water pump/valve
3. Enable **Auto-water when dry** if desired
4. Set **Watering duration** (seconds)
5. Click **Save**

**How it works**: When soil moisture drops below the plant's minimum, the pump will turn on for the specified duration.

### Grow Light

1. Go to plant device **Settings**
2. Under **Linked Controllers**, enter the device ID for your grow light
3. Enable **Auto-supplement when light is low** if desired
4. Click **Save**

**How it works**: When light levels drop below minimum, the grow light turns on. When it exceeds maximum, it turns off.

---

## Understanding Health Scores

The plant device calculates a **Health Score** (0-100%) based on all sensor readings:

- **90-100%**: Excellent - All conditions optimal
- **70-89%**: Good - Minor adjustments needed
- **50-69%**: Fair - Some conditions out of range
- **0-49%**: Poor - Multiple conditions need attention

### How It's Calculated

The health score uses weighted factors:

- **Soil Moisture** (35% weight) - Most critical
- **Temperature** (25% weight)
- **Humidity** (20% weight)
- **Light** (20% weight)

Each factor is scored based on how close it is to the plant's optimal range.

### Viewing Health Score

1. Go to **Devices** → Select your plant
2. The health score is displayed at the top
3. Tap to see detailed breakdown

---

## Creating Automations

### Example 1: Notify When Plant Needs Water

1. Create new flow
2. **Trigger**: When **Plant needs water**
3. Select your plant device
4. **Action**: Send notification
5. Message: "{{plant_name}} needs water! Current moisture: {{moisture}}%"

### Example 2: Auto-Water When Dry

1. Create new flow
2. **Trigger**: When **Plant needs water**
3. Select your plant device
4. **Condition**: If **Auto-water enabled** (optional check)
5. **Action**: Water the plant
6. Set duration (e.g., 10 seconds)

### Example 3: Turn On Grow Light When Dark

1. Create new flow
2. **Trigger**: When **Not enough light**
3. Select your plant device
4. **Action**: Turn on grow light
5. Select your grow light device

### Example 4: Health-Based Alert

1. Create new flow
2. **Trigger**: When **Plant health changed**
3. Select your plant device
4. **Condition**: If **Plant health is below** 50
5. **Action**: Send notification
6. Message: "{{plant_name}} health is low ({{health_score}}%)"

---

## Troubleshooting

### "Plantbook API not configured"

**Solution**: Go to app settings and enter your Client ID and Client Secret.

### "Authentication failed"

**Possible causes**:
- Incorrect Client ID or Secret
- API credentials expired
- Network connectivity issue

**Solution**: 
1. Verify credentials at open.plantbook.io
2. Check your internet connection
3. Try regenerating API keys

### "Sensor not updating"

**Possible causes**:
- Incorrect device ID or capability name
- Sensor device not online
- Format error in settings

**Solution**:
1. Check device ID format: `deviceId:capability`
2. Verify sensor device is online
3. Check capability name matches exactly (case-sensitive)

### "Health score is null"

**Possible causes**:
- No sensors linked
- Sensors not reporting values
- Plant data not loaded

**Solution**:
1. Link at least one sensor
2. Wait for sensor to report a reading
3. Refresh plant data in settings

### "Auto-water not working"

**Possible causes**:
- Controller not linked
- Auto-water not enabled
- Controller device offline

**Solution**:
1. Check controller device ID in settings
2. Enable "Auto-water when dry"
3. Verify controller device is online

### "Flow trigger not firing"

**Possible causes**:
- Trigger condition not met
- Flow not enabled
- Device not linked correctly

**Solution**:
1. Check if trigger condition is actually met
2. Ensure flow is enabled
3. Verify device links are correct

---

## FAQ

### Q: How many plants can I add?

**A**: There's no limit. Add as many plants as you have sensors for.

### Q: Can I use multiple sensors for one plant?

**A**: Yes! You can link different sensors for soil moisture, temperature, humidity, and light. The plant device will aggregate readings from all linked sensors.

### Q: Can one sensor be used for multiple plants?

**A**: Yes, but each plant device will independently subscribe to the sensor's capabilities. This is useful if you have multiple plants in the same location.

### Q: Is my data shared publicly?

**A**: Only if you enable "Share sensor data" in app settings. By default, your data is private.

### Q: What happens if the Plantbook API is down?

**A**: The app will continue to work with cached plant data. New searches and data uploads will fail until the API is back online.

### Q: Can I use this without sensors?

**A**: Yes, you can create plant devices and view optimal care ranges without sensors. However, health scores and automations require linked sensors.

### Q: How often is data uploaded to Plantbook?

**A**: If enabled, data uploads every hour. You can disable this in app settings.

### Q: Can I modify plant care ranges?

**A**: The ranges come from the Plantbook database and are based on scientific research. You cannot modify them, but you can use manual thresholds in your sensor devices if needed.

### Q: Does this work with other plant sensor apps?

**A**: The Plantbook app can work with any Homey device that has the appropriate capabilities. The Hobeian app has enhanced integration, but other sensor apps can also link to plant devices.

### Q: How do I remove a plant?

**A**: Go to the plant device → Settings → Delete Device. This will also unlink all sensors and controllers.

---

## Support

- **Documentation**: See `docs/IMPLEMENTATION_PLAN.md` for technical details
- **Issues**: Report bugs on GitHub
- **Community**: Join the Homey community forum
- **API Docs**: https://documenter.getpostman.com/view/12627470/TVsxBRjD

---

**Last Updated**: 2025-12-31
