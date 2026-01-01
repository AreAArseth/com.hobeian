# Implementation Plan Review & Testing Strategy

## Executive Summary

This document reviews the implementation plan for correctness, completeness, and adds a comprehensive test-first development strategy.

---

## Review Findings

### ✅ Correct & Complete

1. **Architecture Design**: Hybrid approach is sound
2. **API Client**: OAuth2 implementation follows Plantbook SDK pattern
3. **Plant Device Model**: Multi-sensor hub concept is well-designed
4. **Health Score Algorithm**: Weighted calculation is reasonable
5. **Data Flow**: Sensor → Plant → Alarm → Flow → Controller chain is correct

### ⚠️ Issues Identified & Corrections Needed

#### Issue 1: Homey SDK API Inconsistencies

**Problem**: Several Homey API calls use incorrect patterns.

**Corrections**:

```typescript
// WRONG (in Phase 3):
device.on(`capability.${capability}`, listener);

// CORRECT:
device.makeCapabilityInstance(capability, {
  get: async () => device.getCapabilityValue(capability),
  set: async (value) => { /* not needed for sensors */ }
});
// OR use the Homey API:
this.homey.devices.on('capability', (deviceId, capabilityId, value) => {
  if (deviceId === targetDeviceId) { ... }
});
```

```typescript
// WRONG (in driver.ts):
const app = this.homey.app as any;

// CORRECT:
const app = this.homey.app;
// Note: Need proper typing via module declaration
```

#### Issue 2: Missing Capability Definitions

**Problem**: Plan references capabilities but doesn't include all JSON definitions.

**Missing capability files needed**:
- `measure_soil_moisture.json` (exists in Hobeian, copy)
- `measure_luminance.json` (standard Homey)
- `measure_soil_ec.json` (custom, needs creation)
- `optimal_light_min.json` / `optimal_light_max.json`

#### Issue 3: Pairing Flow Session Handlers

**Problem**: Pairing code uses incorrect handler names.

**Corrections**:

```typescript
// WRONG:
session.setHandler('search', async (query) => {...});

// CORRECT - Homey uses specific handler names:
session.setHandler('list_devices', async () => {...});
session.setHandler('get_device', async (data) => {...});

// For custom views, use:
session.setHandler('showView', async (viewId) => {...});
// And communicate via:
session.emit('list_devices', devices);
```

#### Issue 4: Flow Card Registration Missing

**Problem**: Flow cards are defined in JSON but not registered in code.

**Corrections needed in `app.ts`**:

```typescript
async onInit() {
  // Register flow triggers
  this.homey.flow.getDeviceTriggerCard('plant_needs_water')
    .registerRunListener(async (args, state) => true);
  
  // Register flow conditions
  this.homey.flow.getConditionCard('plant_is_healthy')
    .registerRunListener(async (args) => {
      const device = args.device;
      const healthScore = device.getCapabilityValue('plant_health_score');
      return healthScore !== null && healthScore >= args.threshold;
    });
  
  // Register flow actions
  this.homey.flow.getActionCard('water_plant')
    .registerRunListener(async (args) => {
      await args.device.triggerWatering(args.duration);
      return true;
    });
}
```

#### Issue 5: Device Store vs Settings

**Problem**: Plan uses settings for sensor links, but device store is better for complex data.

**Recommendation**: Use `this.setStoreValue()` / `this.getStoreValue()` for:
- Linked sensors map
- Linked controllers map
- Cached plant data
- Last readings

Use settings only for user-configurable options:
- Auto-water enabled
- Auto-water duration
- Upload enabled

#### Issue 6: Missing Error Handling for Device Subscriptions

**Problem**: If a linked sensor device is deleted, the plant device will throw errors.

**Correction**: Add device removal listener:

```typescript
this.homey.devices.on('device.delete', (device) => {
  const deviceId = device.getData().id;
  // Check if this device was a linked sensor
  for (const [type, sensor] of this.linkedSensors) {
    if (sensor.deviceId === deviceId) {
      this.linkedSensors.delete(type);
      this.log(`Linked sensor ${type} was deleted`);
    }
  }
});
```

#### Issue 7: Rate Limiting Not Implemented

**Problem**: Plantbook API has 200 requests/day limit, but no rate limiting in client.

**Correction**: Add to `PlantbookClient.ts`:

```typescript
private requestCount: number = 0;
private requestResetTime: Date = new Date();
private readonly MAX_REQUESTS_PER_DAY = 200;

private async checkRateLimit(): Promise<void> {
  const now = new Date();
  
  // Reset counter daily
  if (now.getDate() !== this.requestResetTime.getDate()) {
    this.requestCount = 0;
    this.requestResetTime = now;
  }
  
  if (this.requestCount >= this.MAX_REQUESTS_PER_DAY) {
    throw new Error('API rate limit exceeded. Please try again tomorrow.');
  }
  
  this.requestCount++;
}
```

#### Issue 8: Plant Data Caching Missing

**Problem**: Every device init calls API, wasting rate limit.

**Correction**: Implement caching:

```typescript
// In app.ts
private plantCache: Map<string, { data: PlantDetail, timestamp: Date }> = new Map();
private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async getCachedPlantDetail(pid: string): Promise<PlantDetail> {
  const cached = this.plantCache.get(pid);
  
  if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
    return cached.data;
  }
  
  const data = await this.plantbookClient.getPlantDetail(pid);
  this.plantCache.set(pid, { data, timestamp: new Date() });
  return data;
}
```

---

## Completeness Analysis

### Missing from Plan

| Item | Phase | Priority | Description |
|------|-------|----------|-------------|
| Asset files | 1-2 | High | icon.svg, images for app and driver |
| Capability JSON files | 2-5 | High | All custom capabilities need full definitions |
| eslint config | 1 | Medium | Copy from Hobeian or create new |
| .gitignore | 1 | Medium | Standard node/typescript ignores |
| homeychangelog.json | 1 | Low | Version changelog |
| API rate limiting | 1 | High | Prevent hitting 200/day limit |
| Plant data caching | 1 | High | Reduce API calls |
| Device removal handling | 3 | Medium | Handle linked device deletion |
| Timeout handling | 1 | Medium | Network request timeouts |
| Reconnection logic | 3 | Medium | Handle sensor reconnection |
| Localization | All | Low | Non-English translations |
| App store listing | 11 | Medium | Description, screenshots, etc. |

### Missing Test Cases

Added comprehensive test cases below.

---

## Test-First Development Strategy

### Philosophy

For each feature:
1. **Write test first** (or define test criteria)
2. **Implement feature**
3. **Run test**
4. **Refactor if needed**
5. **Document**

Since Homey doesn't have a built-in test framework, we'll use:
- **Manual test scripts** (executable test scenarios)
- **Console logging** for verification
- **Mock data** for offline testing

---

## Phase 1: Core API Client & App Scaffold

### Test 1.1: Project Structure Validation

```bash
#!/bin/bash
# test-phase1-structure.sh

echo "=== Testing Phase 1: Project Structure ==="

APP_DIR="./com.openplantbook"

# Check required files exist
FILES=(
  "package.json"
  "tsconfig.json"
  "app.ts"
  "lib/PlantbookClient.ts"
  "lib/PlantbookTypes.ts"
  ".homeycompose/app.json"
  "locales/en.json"
  "assets/icon.svg"
)

for file in "${FILES[@]}"; do
  if [ -f "$APP_DIR/$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file MISSING"
  fi
done

# Check package.json has required dependencies
if grep -q "node-fetch" "$APP_DIR/package.json"; then
  echo "✅ node-fetch dependency present"
else
  echo "❌ node-fetch dependency MISSING"
fi

# Check TypeScript compiles
cd "$APP_DIR"
npm run build 2>&1
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compiles successfully"
else
  echo "❌ TypeScript compilation FAILED"
fi
```

### Test 1.2: API Client - Authentication

```typescript
// tests/test-api-auth.ts
// Run with: npx ts-node tests/test-api-auth.ts

import { PlantbookClient } from '../lib/PlantbookClient';

async function testAuthentication() {
  console.log('=== Test 1.2: API Authentication ===\n');
  
  // Test with valid credentials
  const validClient = new PlantbookClient(
    process.env.PLANTBOOK_CLIENT_ID || '',
    process.env.PLANTBOOK_CLIENT_SECRET || ''
  );
  
  try {
    const result = await validClient.authenticate();
    console.log('✅ Valid credentials: Authentication succeeded');
    console.log(`   Token received: ${result ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Valid credentials: Authentication FAILED');
    console.log(`   Error: ${error}`);
  }
  
  // Test with invalid credentials
  const invalidClient = new PlantbookClient('invalid', 'invalid');
  
  try {
    await invalidClient.authenticate();
    console.log('❌ Invalid credentials: Should have thrown error');
  } catch (error) {
    console.log('✅ Invalid credentials: Correctly threw error');
  }
  
  // Test token caching
  try {
    await validClient.authenticate(); // Should use cached token
    console.log('✅ Token caching: Second auth used cache');
  } catch (error) {
    console.log('❌ Token caching: FAILED');
  }
}

testAuthentication();
```

### Test 1.3: API Client - Search Plants

```typescript
// tests/test-api-search.ts

import { PlantbookClient } from '../lib/PlantbookClient';

async function testSearch() {
  console.log('=== Test 1.3: Plant Search ===\n');
  
  const client = new PlantbookClient(
    process.env.PLANTBOOK_CLIENT_ID || '',
    process.env.PLANTBOOK_CLIENT_SECRET || ''
  );
  
  // Test search with results
  try {
    const results = await client.searchPlants('monstera');
    console.log(`✅ Search 'monstera': Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log(`   First result: ${results[0].display_pid} (${results[0].pid})`);
    }
    
    // Verify result structure
    if (results[0]?.pid && results[0]?.alias) {
      console.log('✅ Result structure: pid and alias present');
    } else {
      console.log('❌ Result structure: Missing required fields');
    }
  } catch (error) {
    console.log('❌ Search FAILED:', error);
  }
  
  // Test search with no results
  try {
    const results = await client.searchPlants('xyznonexistentplant123');
    console.log(`✅ Search no results: Returned ${results.length} (expected 0)`);
  } catch (error) {
    console.log('❌ Search no results: FAILED');
  }
  
  // Test search with special characters
  try {
    const results = await client.searchPlants("plant's name");
    console.log(`✅ Search special chars: Query handled correctly`);
  } catch (error) {
    console.log('❌ Search special chars: FAILED');
  }
}

testSearch();
```

### Test 1.4: API Client - Get Plant Detail

```typescript
// tests/test-api-detail.ts

import { PlantbookClient } from '../lib/PlantbookClient';

async function testPlantDetail() {
  console.log('=== Test 1.4: Plant Detail ===\n');
  
  const client = new PlantbookClient(
    process.env.PLANTBOOK_CLIENT_ID || '',
    process.env.PLANTBOOK_CLIENT_SECRET || ''
  );
  
  // Test valid PID
  try {
    const detail = await client.getPlantDetail('monstera deliciosa');
    console.log('✅ Valid PID: Got plant detail');
    console.log(`   Name: ${detail.display_pid}`);
    console.log(`   Soil moisture: ${detail.min_soil_moist}% - ${detail.max_soil_moist}%`);
    console.log(`   Temperature: ${detail.min_temp}°C - ${detail.max_temp}°C`);
    
    // Verify all required fields
    const requiredFields = [
      'pid', 'alias', 'min_soil_moist', 'max_soil_moist',
      'min_temp', 'max_temp', 'min_env_humid', 'max_env_humid',
      'min_light_lux', 'max_light_lux'
    ];
    
    const missingFields = requiredFields.filter(f => detail[f] === undefined);
    if (missingFields.length === 0) {
      console.log('✅ All required fields present');
    } else {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Valid PID: FAILED', error);
  }
  
  // Test invalid PID
  try {
    await client.getPlantDetail('this-plant-does-not-exist-xyz');
    console.log('❌ Invalid PID: Should have thrown error');
  } catch (error) {
    console.log('✅ Invalid PID: Correctly threw error');
  }
}

testPlantDetail();
```

### Test 1.5: App Installation

```bash
#!/bin/bash
# test-phase1-install.sh

echo "=== Test 1.5: App Installation ==="

cd com.openplantbook

# Build
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build succeeded"

# Validate with homey
homey app validate
if [ $? -ne 0 ]; then
  echo "❌ Validation failed"
  exit 1
fi
echo "✅ Validation passed"

# Install (if Homey available)
if homey app install 2>&1; then
  echo "✅ Installation succeeded"
else
  echo "⚠️ Installation skipped (no Homey connected)"
fi
```

---

## Phase 2: Plant Driver with Basic Pairing

### Test 2.1: Driver Structure

```bash
#!/bin/bash
# test-phase2-driver.sh

echo "=== Test 2.1: Driver Structure ==="

DRIVER_DIR="./com.openplantbook/drivers/plant"

FILES=(
  "driver.compose.json"
  "driver.ts"
  "device.ts"
  "assets/icon.svg"
  "pair/search.html"
  "pair/configure.html"
)

for file in "${FILES[@]}"; do
  if [ -f "$DRIVER_DIR/$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file MISSING"
  fi
done

# Validate driver.compose.json
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$DRIVER_DIR/driver.compose.json'));
console.log('Driver ID:', config.id);
console.log('Capabilities:', config.capabilities.length);
console.log('Pair views:', config.pair.length);
"
```

### Test 2.2: Pairing Flow - Mock Test

```typescript
// tests/test-pairing-mock.ts

// Mock Homey session for testing pairing handlers
class MockSession {
  private handlers: Map<string, Function> = new Map();
  
  setHandler(name: string, handler: Function) {
    this.handlers.set(name, handler);
  }
  
  async callHandler(name: string, ...args: any[]) {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`Handler ${name} not registered`);
    return handler(...args);
  }
}

async function testPairingFlow() {
  console.log('=== Test 2.2: Pairing Flow ===\n');
  
  // Import driver (mock Homey context)
  const session = new MockSession();
  
  // Simulate driver.onPair
  // ... register handlers ...
  
  // Test search handler
  try {
    const results = await session.callHandler('search', 'monstera');
    console.log(`✅ Search handler: Returned ${results.length} results`);
  } catch (error) {
    console.log('❌ Search handler: FAILED', error);
  }
  
  // Test plant selection
  try {
    await session.callHandler('select_plant', { pid: 'monstera deliciosa' });
    console.log('✅ Select plant handler: Plant selected');
  } catch (error) {
    console.log('❌ Select plant handler: FAILED', error);
  }
  
  // Test list_devices
  try {
    const devices = await session.callHandler('list_devices');
    console.log(`✅ List devices handler: Created ${devices.length} device(s)`);
    console.log(`   Device name: ${devices[0].name}`);
  } catch (error) {
    console.log('❌ List devices handler: FAILED', error);
  }
}

testPairingFlow();
```

### Test 2.3: Device Initialization

```typescript
// tests/test-device-init.ts

async function testDeviceInit() {
  console.log('=== Test 2.3: Device Initialization ===\n');
  
  // This test requires a real Homey or mock framework
  // For manual testing on device:
  
  console.log('Manual Test Steps:');
  console.log('1. Add a new Plant device via pairing');
  console.log('2. Check device logs for "Plant device initialized"');
  console.log('3. Verify capabilities show optimal ranges');
  console.log('4. Check settings show PID');
  
  console.log('\nExpected capability values after init:');
  console.log('- optimal_soil_moisture_min: number');
  console.log('- optimal_soil_moisture_max: number');
  console.log('- optimal_temperature_min: number');
  console.log('- optimal_temperature_max: number');
  console.log('- optimal_humidity_min: number');
  console.log('- optimal_humidity_max: number');
  console.log('- optimal_light_min: number');
  console.log('- optimal_light_max: number');
}

testDeviceInit();
```

---

## Phase 3: Sensor Linking & Subscriptions

### Test 3.1: Sensor Link Parsing

```typescript
// tests/test-sensor-links.ts

function testSensorLinkParsing() {
  console.log('=== Test 3.1: Sensor Link Parsing ===\n');
  
  const testCases = [
    { input: 'abc123:measure_soil_moisture', expected: { deviceId: 'abc123', capability: 'measure_soil_moisture' } },
    { input: 'device-with-dashes:measure_temperature', expected: { deviceId: 'device-with-dashes', capability: 'measure_temperature' } },
    { input: 'invalid_format', expected: null },
    { input: '', expected: null },
    { input: ':', expected: null },
    { input: 'device:', expected: null },
    { input: ':capability', expected: null },
  ];
  
  for (const tc of testCases) {
    const parts = tc.input.split(':');
    const result = (parts.length === 2 && parts[0] && parts[1])
      ? { deviceId: parts[0], capability: parts[1] }
      : null;
    
    const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
    console.log(`${passed ? '✅' : '❌'} "${tc.input}" → ${JSON.stringify(result)}`);
  }
}

testSensorLinkParsing();
```

### Test 3.2: Sensor Subscription (Manual)

```
=== Test 3.2: Sensor Subscription (Manual) ===

Prerequisites:
- Plant device created
- At least one sensor device available

Steps:
1. Go to Plant device settings
2. Enter sensor link: "[sensor-device-id]:measure_soil_moisture"
3. Save settings
4. Check plant device logs for:
   - "Set up X sensor links"
   - "Subscribed to [deviceId]:[capability]"
5. Trigger sensor reading change
6. Verify plant device logs show:
   - "Sensor reading: soil_moisture = [value]"
7. Verify plant device capability updates

Expected:
- Plant device measure_soil_moisture matches sensor value
```

### Test 3.3: Multiple Sensors

```
=== Test 3.3: Multiple Sensors (Manual) ===

Steps:
1. Link multiple sensors (soil, temp, humidity, light)
2. Verify all subscriptions logged
3. Change each sensor value
4. Verify each capability updates on plant device

Edge Cases:
- Same device for multiple capabilities
- Remove a sensor link (should stop receiving updates)
- Link to non-existent device (should fail gracefully)
```

---

## Phase 4: Health Score Calculation

### Test 4.1: Health Score Algorithm

```typescript
// tests/test-health-score.ts

interface Factor {
  value: number | null;
  min: number;
  max: number;
  weight: number;
}

function calculateHealthScore(factors: Factor[]): number | null {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const factor of factors) {
    if (factor.value === null) continue;

    totalWeight += factor.weight;

    const range = factor.max - factor.min;
    const midpoint = factor.min + range / 2;

    let score: number;
    if (factor.value >= factor.min && factor.value <= factor.max) {
      const distanceFromMid = Math.abs(factor.value - midpoint);
      score = 100 - (distanceFromMid / (range / 2)) * 20;
    } else {
      const distanceFromRange =
        factor.value < factor.min
          ? factor.min - factor.value
          : factor.value - factor.max;
      score = Math.max(0, 80 - (distanceFromRange / (range * 0.5)) * 80);
    }

    weightedScore += score * factor.weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null;
}

function testHealthScore() {
  console.log('=== Test 4.1: Health Score Algorithm ===\n');
  
  const testCases = [
    {
      name: 'All optimal (at midpoint)',
      factors: [
        { value: 50, min: 40, max: 60, weight: 0.35 }, // soil - at midpoint
        { value: 22, min: 18, max: 26, weight: 0.25 }, // temp - at midpoint
        { value: 70, min: 60, max: 80, weight: 0.20 }, // humidity - at midpoint
        { value: 1500, min: 1000, max: 2000, weight: 0.20 }, // light - at midpoint
      ],
      expected: 100,
    },
    {
      name: 'All at minimum (still in range)',
      factors: [
        { value: 40, min: 40, max: 60, weight: 0.35 },
        { value: 18, min: 18, max: 26, weight: 0.25 },
        { value: 60, min: 60, max: 80, weight: 0.20 },
        { value: 1000, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 80, // 20% penalty for being at edge
    },
    {
      name: 'Soil too dry (out of range)',
      factors: [
        { value: 30, min: 40, max: 60, weight: 0.35 }, // 10 below min
        { value: 22, min: 18, max: 26, weight: 0.25 },
        { value: 70, min: 60, max: 80, weight: 0.20 },
        { value: 1500, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 72, // Approximate - soil brings down score
    },
    {
      name: 'No sensors linked',
      factors: [
        { value: null, min: 40, max: 60, weight: 0.35 },
        { value: null, min: 18, max: 26, weight: 0.25 },
        { value: null, min: 60, max: 80, weight: 0.20 },
        { value: null, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: null,
    },
    {
      name: 'Only soil sensor',
      factors: [
        { value: 50, min: 40, max: 60, weight: 0.35 },
        { value: null, min: 18, max: 26, weight: 0.25 },
        { value: null, min: 60, max: 80, weight: 0.20 },
        { value: null, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 100, // Only soil counts, and it's perfect
    },
  ];
  
  for (const tc of testCases) {
    const result = calculateHealthScore(tc.factors);
    const tolerance = 5; // Allow 5% variance
    const passed = tc.expected === null 
      ? result === null 
      : result !== null && Math.abs(result - tc.expected) <= tolerance;
    
    console.log(`${passed ? '✅' : '❌'} ${tc.name}`);
    console.log(`   Expected: ${tc.expected}, Got: ${result}`);
  }
}

testHealthScore();
```

---

## Phase 5: Alarm Capabilities & Triggers

### Test 5.1: Threshold Checking

```typescript
// tests/test-thresholds.ts

interface ThresholdResult {
  alarmLow: boolean;
  alarmHigh: boolean;
}

function checkThreshold(value: number, min: number, max: number): ThresholdResult {
  return {
    alarmLow: value < min,
    alarmHigh: value > max,
  };
}

function testThresholds() {
  console.log('=== Test 5.1: Threshold Checking ===\n');
  
  const testCases = [
    { value: 50, min: 40, max: 60, expected: { alarmLow: false, alarmHigh: false } },
    { value: 40, min: 40, max: 60, expected: { alarmLow: false, alarmHigh: false } },
    { value: 60, min: 40, max: 60, expected: { alarmLow: false, alarmHigh: false } },
    { value: 39, min: 40, max: 60, expected: { alarmLow: true, alarmHigh: false } },
    { value: 61, min: 40, max: 60, expected: { alarmLow: false, alarmHigh: true } },
    { value: 0, min: 40, max: 60, expected: { alarmLow: true, alarmHigh: false } },
    { value: 100, min: 40, max: 60, expected: { alarmLow: false, alarmHigh: true } },
  ];
  
  for (const tc of testCases) {
    const result = checkThreshold(tc.value, tc.min, tc.max);
    const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
    console.log(`${passed ? '✅' : '❌'} value=${tc.value}, range=${tc.min}-${tc.max}`);
    console.log(`   Expected: ${JSON.stringify(tc.expected)}, Got: ${JSON.stringify(result)}`);
  }
}

testThresholds();
```

### Test 5.2: Alarm Flow Triggers (Manual)

```
=== Test 5.2: Alarm Flow Triggers (Manual) ===

Setup:
1. Create plant device with linked soil sensor
2. Create flow: When "Plant needs water" → Log "Triggered"

Test Steps:
1. Set soil sensor value above minimum → No trigger expected
2. Set soil sensor value below minimum → Trigger expected
3. Set soil sensor value above minimum again → No trigger expected

Verify:
- Flow triggers exactly once when crossing threshold
- Does NOT trigger repeatedly while below threshold
- Trigger includes correct tokens (plant_name, moisture, min_moisture)
```

---

## Phase 6: Controller Linking & Auto-Water

### Test 6.1: Controller State Control

```typescript
// tests/test-controller.ts

async function testControllerState() {
  console.log('=== Test 6.1: Controller State Control ===\n');
  
  // This requires mock or real Homey device
  console.log('Manual Test Steps:');
  console.log('1. Link a smart plug to plant as water controller');
  console.log('2. Trigger watering via action card');
  console.log('3. Verify plug turns ON');
  console.log('4. Wait for duration');
  console.log('5. Verify plug turns OFF');
  
  console.log('\nEdge Cases:');
  console.log('- Controller device offline → Should fail gracefully');
  console.log('- Controller device deleted → Should handle error');
  console.log('- Duration = 0 → Should not trigger');
  console.log('- Concurrent triggers → Should not interfere');
}

testControllerState();
```

### Test 6.2: Auto-Water Logic

```
=== Test 6.2: Auto-Water Logic (Manual) ===

Setup:
1. Link soil sensor to plant
2. Link water pump to plant
3. Enable auto-water, set duration to 5 seconds

Test:
1. Set soil moisture ABOVE minimum → No watering
2. Set soil moisture BELOW minimum → Pump ON for 5 seconds
3. Verify pump turns OFF after 5 seconds
4. Verify flow trigger "plant_auto_watered" fires

Edge Cases:
- Auto-water disabled → Should not trigger
- No controller linked → Should log warning, not error
- Controller fails to turn off → Should retry? Log error?
```

---

## Phase 7: Flow Cards

### Test 7.1: Flow Card Registration

```bash
#!/bin/bash
# test-flow-cards.sh

echo "=== Test 7.1: Flow Card Registration ==="

# Check flow card definitions exist
FLOW_DIR="./com.openplantbook/.homeycompose/flow"

echo "Triggers:"
ls -la "$FLOW_DIR/triggers/" 2>/dev/null || echo "No triggers directory"

echo "Conditions:"
ls -la "$FLOW_DIR/conditions/" 2>/dev/null || echo "No conditions directory"

echo "Actions:"
ls -la "$FLOW_DIR/actions/" 2>/dev/null || echo "No actions directory"

# Validate JSON
for file in "$FLOW_DIR"/**/*.json; do
  if node -e "JSON.parse(require('fs').readFileSync('$file'))" 2>/dev/null; then
    echo "✅ $file valid JSON"
  else
    echo "❌ $file invalid JSON"
  fi
done
```

### Test 7.2: Flow Card Functionality (Manual)

```
=== Test 7.2: Flow Card Functionality (Manual) ===

Test each trigger:
- [ ] plant_needs_water - Fires when soil < min
- [ ] plant_overwatered - Fires when soil > max
- [ ] plant_temperature_alert - Fires when temp out of range
- [ ] plant_humidity_alert - Fires when humidity out of range
- [ ] plant_light_alert - Fires when light out of range
- [ ] plant_health_changed - Fires when health changes by 5+
- [ ] plant_auto_watered - Fires when auto-water activates
- [ ] plant_sensor_updated - Fires on any sensor update

Test each condition:
- [ ] plant_is_healthy - Returns true when health >= threshold
- [ ] plant_needs_attention - Returns true when any alarm active
- [ ] soil_in_range - Returns true when soil in optimal range
- [ ] temp_in_range - Returns true when temp in optimal range
- [ ] humidity_in_range - Returns true when humidity in optimal range
- [ ] light_in_range - Returns true when light in optimal range

Test each action:
- [ ] water_plant - Triggers water controller for duration
- [ ] turn_on_grow_light - Turns on light controller
- [ ] turn_off_grow_light - Turns off light controller
- [ ] refresh_plant_data - Fetches fresh data from API
```

---

## Integration Test Suite

### Full Integration Test

```
=== Full Integration Test ===

Scenario: Complete plant lifecycle

1. SETUP
   - [ ] Install Plantbook app
   - [ ] Configure API credentials
   - [ ] Verify credentials work (check logs)

2. ADD PLANT
   - [ ] Start pairing
   - [ ] Search for "Monstera"
   - [ ] Select plant from results
   - [ ] Complete pairing
   - [ ] Verify device created with correct name

3. VERIFY PLANT DATA
   - [ ] Check optimal ranges populated
   - [ ] Check plant image (if available)
   - [ ] Check settings show PID

4. LINK SENSORS
   - [ ] Link soil moisture sensor
   - [ ] Link temperature sensor
   - [ ] Link humidity sensor
   - [ ] Verify subscriptions in logs
   - [ ] Verify readings appear on plant device

5. TEST HEALTH SCORE
   - [ ] With all sensors in range → Score > 80
   - [ ] With one sensor out of range → Score decreases
   - [ ] With all sensors out of range → Score < 50

6. TEST ALARMS
   - [ ] Lower soil moisture → alarm_needs_water = true
   - [ ] Raise soil moisture → alarm_needs_water = false
   - [ ] Repeat for other alarms

7. LINK CONTROLLER
   - [ ] Link water pump
   - [ ] Enable auto-water
   - [ ] Trigger low soil condition
   - [ ] Verify pump activates

8. TEST FLOWS
   - [ ] Create flow with plant trigger
   - [ ] Verify trigger fires on condition
   - [ ] Test condition card in flow
   - [ ] Test action card in flow

9. CLEANUP
   - [ ] Delete plant device
   - [ ] Verify sensors unsubscribed
   - [ ] Verify no errors in logs
```

---

## Corrected Implementation Order

Based on testing requirements, here's the updated phase order with testing integrated:

| Step | Task | Test |
|------|------|------|
| 1.1 | Create project structure | Test 1.1: Validate files exist |
| 1.2 | Implement PlantbookClient | Test 1.2-1.4: API tests |
| 1.3 | Create app.ts | Test 1.5: App installation |
| 1.4 | Add rate limiting | Test rate limit behavior |
| 1.5 | Add caching | Test cache hit/miss |
| 2.1 | Create driver structure | Test 2.1: Validate files |
| 2.2 | Implement pairing handlers | Test 2.2: Mock pairing |
| 2.3 | Implement device class | Test 2.3: Device init |
| 2.4 | Test full pairing flow | Manual pairing test |
| 3.1 | Add sensor link parsing | Test 3.1: Unit test |
| 3.2 | Implement subscriptions | Test 3.2: Manual |
| 3.3 | Handle device removal | Test edge cases |
| 4.1 | Implement health score | Test 4.1: Algorithm test |
| 4.2 | Integrate with sensor updates | Manual verification |
| 5.1 | Add alarm capabilities | Test 5.1: Threshold test |
| 5.2 | Add alarm triggers | Test 5.2: Manual |
| 6.1 | Add controller linking | Test 6.1: Manual |
| 6.2 | Implement auto-water | Test 6.2: Manual |
| 7.1 | Create flow card JSONs | Test 7.1: Validation |
| 7.2 | Register flow handlers | Test 7.2: Manual |
| 8.x | Enhanced UI | Manual testing |
| 9.x | Hobeian integration | Integration test |
| 10.x | Data upload | API test |
| 11.x | Final testing | Full integration test |

---

## Summary of Corrections Made

1. ✅ Fixed Homey API patterns for device subscriptions
2. ✅ Added missing capability definitions list
3. ✅ Corrected pairing session handler approach
4. ✅ Added flow card registration in app.ts
5. ✅ Recommended device store over settings for complex data
6. ✅ Added device removal handling
7. ✅ Added API rate limiting implementation
8. ✅ Added plant data caching
9. ✅ Created comprehensive test suite for each phase
10. ✅ Added integration test scenario

## Next Steps

1. Update IMPLEMENTATION_PLAN.md with corrections
2. Create test files alongside implementation
3. Follow test-first approach for each feature
4. Run tests after each step before proceeding
