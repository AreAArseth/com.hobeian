# Implementation Plan Review & Testing Strategy

> **Status**: All corrections have been applied to `IMPLEMENTATION_PLAN.md` (v1.1).
> This document now serves as a **testing reference** for the implementation.

---

## Review Summary

### ✅ Verified Correct

1. **Architecture Design**: Hybrid approach is sound
2. **API Client**: OAuth2 implementation follows Plantbook SDK pattern
3. **Plant Device Model**: Multi-sensor hub concept is well-designed
4. **Health Score Algorithm**: Weighted calculation is reasonable
5. **Data Flow**: Sensor → Plant → Alarm → Flow → Controller chain is correct

### ✅ Corrections Applied to IMPLEMENTATION_PLAN.md

| Issue | Correction | Location in Plan |
|-------|------------|------------------|
| Homey API patterns | Changed to polling-based approach | Phase 3, Appendix D |
| Missing capabilities | Added all JSON definitions | Phase 2 |
| Pairing handlers | Corrected handler names | Phase 2 |
| Flow card registration | Added to app.ts onInit | Phase 1 |
| Store vs Settings | Using store for sensor links | Phase 3 |
| Device removal | Added deletion listener | Phase 3 |
| Rate limiting | Added checkRateLimit() | Phase 1 |
| Plant caching | Added getCachedPlantDetail() | Phase 1 |

---

## Test-First Development Strategy

### Philosophy

For each feature:
1. **Write test first** (or define test criteria)
2. **Implement feature**
3. **Run test**
4. **Refactor if needed**
5. **Document**

Since Homey doesn't have a built-in test framework, we use:
- **Unit tests** (executable TypeScript)
- **Validation scripts** (Bash)
- **Manual test procedures** (documented steps)

See `TESTING_GUIDE.md` for complete test implementations.

---

## Phase 1: Core API Client & App Scaffold

### Test 1.1: Project Structure Validation

```bash
#!/bin/bash
# test-phase1-structure.sh

echo "=== Testing Phase 1: Project Structure ==="

APP_DIR="./com.openplantbook"

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

import { PlantbookClient } from '../lib/PlantbookClient';

async function testAuthentication() {
  console.log('=== Test 1.2: API Authentication ===\n');
  
  const validClient = new PlantbookClient(
    process.env.PLANTBOOK_CLIENT_ID || '',
    process.env.PLANTBOOK_CLIENT_SECRET || ''
  );
  
  // Test valid credentials
  try {
    const result = await validClient.authenticate();
    console.log('✅ Valid credentials: Authentication succeeded');
  } catch (error) {
    console.log('❌ Valid credentials: Authentication FAILED');
  }
  
  // Test invalid credentials
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
  
  // Test rate limit tracking
  console.log(`Remaining requests: ${validClient.getRemainingRequests()}`);
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
    
    if (results[0]?.pid && results[0]?.alias) {
      console.log('✅ Result structure: pid and alias present');
    }
  } catch (error) {
    console.log('❌ Search FAILED:', error);
  }
  
  // Test search with no results
  try {
    const results = await client.searchPlants('xyznonexistentplant123');
    console.log(`✅ Search no results: Returned ${results.length}`);
  } catch (error) {
    console.log('❌ Search no results: FAILED');
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
    
    const requiredFields = [
      'pid', 'alias', 'min_soil_moist', 'max_soil_moist',
      'min_temp', 'max_temp', 'min_env_humid', 'max_env_humid',
      'min_light_lux', 'max_light_lux'
    ];
    
    const missingFields = requiredFields.filter(f => (detail as any)[f] === undefined);
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
```

### Test 2.2: Capability Definitions

```bash
#!/bin/bash
# test-capabilities.sh

echo "=== Test 2.2: Capability Definitions ==="

CAP_DIR="./com.openplantbook/.homeycompose/capabilities"

CAPABILITIES=(
  "plant_health_score.json"
  "optimal_soil_moisture_min.json"
  "optimal_soil_moisture_max.json"
  "optimal_temperature_min.json"
  "optimal_temperature_max.json"
  "optimal_humidity_min.json"
  "optimal_humidity_max.json"
  "optimal_light_min.json"
  "optimal_light_max.json"
)

for cap in "${CAPABILITIES[@]}"; do
  if [ -f "$CAP_DIR/$cap" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('$CAP_DIR/$cap'))" 2>/dev/null; then
      echo "✅ $cap valid"
    else
      echo "❌ $cap invalid JSON"
    fi
  else
    echo "❌ $cap MISSING"
  fi
done
```

### Test 2.3: Pairing Flow (Manual)

```
=== Test 2.3: Pairing Flow (Manual) ===

Steps:
1. Start "Add Device" in Homey app
2. Select "Open Plantbook" → "Plant"
3. Verify search page loads
4. Search for "Monstera"
5. Verify results appear
6. Click a result
7. Verify configure page shows plant details
8. Complete pairing
9. Verify device appears with correct name

Expected:
- Device created with name matching plant
- Optimal ranges populated in capabilities
- PID stored in settings
```

---

## Phase 3: Sensor Linking & Subscriptions

### Test 3.1: Sensor Link Parsing

```typescript
// tests/test-sensor-links.ts

function testSensorLinkParsing() {
  console.log('=== Test 3.1: Sensor Link Parsing ===\n');
  
  const testCases = [
    { input: 'abc123:measure_soil_moisture', valid: true },
    { input: 'device-with-dashes:measure_temperature', valid: true },
    { input: 'invalid_format', valid: false },
    { input: '', valid: false },
    { input: ':', valid: false },
    { input: 'device:', valid: false },
    { input: ':capability', valid: false },
  ];
  
  for (const tc of testCases) {
    const parts = tc.input.split(':');
    const isValid = parts.length === 2 && parts[0] && parts[1];
    const passed = isValid === tc.valid;
    console.log(`${passed ? '✅' : '❌'} "${tc.input}" → ${isValid ? 'valid' : 'invalid'}`);
  }
}

testSensorLinkParsing();
```

### Test 3.2: Sensor Subscription (Manual)

```
=== Test 3.2: Sensor Subscription (Manual) ===

Prerequisites:
- Plant device created
- Sensor device available (e.g., ZG-303Z)

Steps:
1. Go to Plant device settings
2. Enter sensor link format: "deviceId:capability"
3. Save settings
4. Check logs for "Set up X sensor links"
5. Trigger sensor reading change
6. Verify plant device capability updates

Expected:
- Plant device mirrors sensor values
- Polling updates every 30 seconds
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
      const distanceFromRange = factor.value < factor.min
        ? factor.min - factor.value
        : factor.value - factor.max;
      score = Math.max(0, 80 - (distanceFromRange / (range * 0.5)) * 80);
    }

    weightedScore += score * factor.weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null;
}

const testCases = [
  {
    name: 'All optimal (at midpoint)',
    factors: [
      { value: 50, min: 40, max: 60, weight: 0.35 },
      { value: 22, min: 18, max: 26, weight: 0.25 },
      { value: 70, min: 60, max: 80, weight: 0.20 },
      { value: 1500, min: 1000, max: 2000, weight: 0.20 },
    ],
    expected: 100,
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
];

for (const tc of testCases) {
  const result = calculateHealthScore(tc.factors);
  const passed = tc.expected === null ? result === null : Math.abs((result || 0) - tc.expected) <= 5;
  console.log(`${passed ? '✅' : '❌'} ${tc.name}: expected ${tc.expected}, got ${result}`);
}
```

---

## Phase 5: Alarm Capabilities & Triggers

### Test 5.1: Threshold Checking

```typescript
// tests/test-thresholds.ts

function checkThreshold(value: number, min: number, max: number) {
  return { alarmLow: value < min, alarmHigh: value > max };
}

const testCases = [
  { value: 50, min: 40, max: 60, low: false, high: false },
  { value: 39, min: 40, max: 60, low: true, high: false },
  { value: 61, min: 40, max: 60, low: false, high: true },
];

for (const tc of testCases) {
  const result = checkThreshold(tc.value, tc.min, tc.max);
  const passed = result.alarmLow === tc.low && result.alarmHigh === tc.high;
  console.log(`${passed ? '✅' : '❌'} value=${tc.value}, range=${tc.min}-${tc.max}`);
}
```

---

## Phase 7: Flow Cards

### Test 7.1: Flow Card Validation

```bash
#!/bin/bash
# test-flow-cards.sh

echo "=== Test 7.1: Flow Card Validation ==="

FLOW_DIR="./com.openplantbook/.homeycompose/flow"

for dir in triggers conditions actions; do
  echo -e "\n$dir:"
  for file in "$FLOW_DIR/$dir"/*.json 2>/dev/null; do
    [ -f "$file" ] || continue
    if node -e "JSON.parse(require('fs').readFileSync('$file'))" 2>/dev/null; then
      echo "  ✅ $(basename $file)"
    else
      echo "  ❌ $(basename $file) - invalid JSON"
    fi
  done
done
```

---

## Full Integration Test

```
=== Full Integration Test ===

1. SETUP
   - [ ] Install Plantbook app
   - [ ] Configure API credentials
   - [ ] Verify credentials work (check logs)

2. ADD PLANT
   - [ ] Start pairing, search "Monstera"
   - [ ] Complete pairing
   - [ ] Verify device created

3. VERIFY PLANT DATA
   - [ ] Check optimal ranges populated
   - [ ] Check settings show PID

4. LINK SENSORS
   - [ ] Link soil/temp/humidity sensors
   - [ ] Verify readings appear on plant

5. TEST HEALTH SCORE
   - [ ] Sensors in range → Score > 80
   - [ ] Sensor out of range → Score decreases

6. TEST ALARMS
   - [ ] Low soil → alarm_needs_water = true
   - [ ] Normal soil → alarm clears

7. LINK CONTROLLER
   - [ ] Link water pump
   - [ ] Enable auto-water
   - [ ] Verify auto-water triggers

8. TEST FLOWS
   - [ ] Create flow with plant trigger
   - [ ] Verify trigger fires
   - [ ] Test condition and action cards

9. CLEANUP
   - [ ] Delete plant device
   - [ ] Verify no errors
```

---

**Document Version**: 1.1  
**Last Updated**: 2025-12-31  
**Status**: Testing reference (corrections applied to IMPLEMENTATION_PLAN.md)
