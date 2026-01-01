# Testing Guide

## Overview

This guide provides a comprehensive testing strategy for the Open Plantbook integration. Since Homey apps don't have a built-in test framework, we use a combination of:

1. **Unit tests** - TypeScript tests for isolated logic
2. **Validation scripts** - Bash scripts for structure verification
3. **Manual test procedures** - Step-by-step guides for UI/integration testing
4. **Integration tests** - End-to-end scenarios

---

## Test Directory Structure

```
com.openplantbook/
├── tests/
│   ├── unit/
│   │   ├── test-api-auth.ts
│   │   ├── test-api-search.ts
│   │   ├── test-api-detail.ts
│   │   ├── test-health-score.ts
│   │   ├── test-thresholds.ts
│   │   └── test-sensor-links.ts
│   ├── integration/
│   │   └── test-full-flow.ts
│   ├── scripts/
│   │   ├── validate-structure.sh
│   │   ├── validate-flow-cards.sh
│   │   └── run-all-tests.sh
│   └── manual/
│       ├── PAIRING_TEST.md
│       ├── SENSOR_TEST.md
│       ├── CONTROLLER_TEST.md
│       └── FLOW_TEST.md
├── package.json (add test scripts)
└── tsconfig.test.json
```

---

## Setup

### Install Test Dependencies

Add to `package.json`:

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:validate",
    "test:unit": "ts-node tests/run-tests.ts",
    "test:validate": "bash tests/scripts/validate-structure.sh"
  },
  "devDependencies": {
    "ts-node": "^10.9.2"
  }
}
```

### Environment Variables

Create `.env.test` (DO NOT commit):

```bash
PLANTBOOK_CLIENT_ID=your_client_id_here
PLANTBOOK_CLIENT_SECRET=your_client_secret_here
```

Load in tests:

```typescript
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
```

---

## Unit Tests

### Test Runner (`tests/run-tests.ts`)

```typescript
#!/usr/bin/env ts-node

import * as path from 'path';
import * as fs from 'fs';

const testDir = path.join(__dirname, 'unit');
const testFiles = fs.readdirSync(testDir).filter(f => f.startsWith('test-') && f.endsWith('.ts'));

console.log('========================================');
console.log('       OPEN PLANTBOOK TEST SUITE');
console.log('========================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const file of testFiles) {
    console.log(`\nRunning: ${file}`);
    console.log('-'.repeat(40));
    
    try {
      const testModule = await import(path.join(testDir, file));
      if (typeof testModule.default === 'function') {
        await testModule.default();
      }
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error}`);
      failed++;
    }
  }
  
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
```

### Unit Test: API Authentication (`tests/unit/test-api-auth.ts`)

```typescript
import { PlantbookClient } from '../../lib/PlantbookClient';

export default async function testAuthentication() {
  console.log('Test: API Authentication\n');
  
  const clientId = process.env.PLANTBOOK_CLIENT_ID;
  const clientSecret = process.env.PLANTBOOK_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('⚠️  Skipped: No API credentials in environment');
    return;
  }
  
  const tests = [
    {
      name: 'Valid credentials authenticate',
      run: async () => {
        const client = new PlantbookClient(clientId, clientSecret);
        const result = await client.authenticate();
        if (!result) throw new Error('Expected true');
      }
    },
    {
      name: 'Invalid credentials throw error',
      run: async () => {
        const client = new PlantbookClient('invalid', 'invalid');
        try {
          await client.authenticate();
          throw new Error('Should have thrown');
        } catch (e: any) {
          if (e.message === 'Should have thrown') throw e;
          // Expected error
        }
      }
    },
    {
      name: 'Token caching works',
      run: async () => {
        const client = new PlantbookClient(clientId, clientSecret);
        await client.authenticate();
        const start = Date.now();
        await client.authenticate(); // Should use cache
        const elapsed = Date.now() - start;
        if (elapsed > 100) throw new Error(`Too slow: ${elapsed}ms (expected <100ms for cache)`);
      }
    }
  ];
  
  for (const test of tests) {
    try {
      await test.run();
      console.log(`  ✅ ${test.name}`);
    } catch (error: any) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
}
```

### Unit Test: Health Score (`tests/unit/test-health-score.ts`)

```typescript
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

export default async function testHealthScore() {
  console.log('Test: Health Score Calculation\n');
  
  const tests = [
    {
      name: 'Perfect conditions = 100',
      factors: [
        { value: 50, min: 40, max: 60, weight: 0.35 },
        { value: 22, min: 18, max: 26, weight: 0.25 },
        { value: 70, min: 60, max: 80, weight: 0.20 },
        { value: 1500, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 100,
      tolerance: 0,
    },
    {
      name: 'At edge of range = ~80',
      factors: [
        { value: 40, min: 40, max: 60, weight: 0.35 },
        { value: 18, min: 18, max: 26, weight: 0.25 },
        { value: 60, min: 60, max: 80, weight: 0.20 },
        { value: 1000, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 80,
      tolerance: 2,
    },
    {
      name: 'Out of range decreases score',
      factors: [
        { value: 30, min: 40, max: 60, weight: 0.35 },
        { value: 22, min: 18, max: 26, weight: 0.25 },
        { value: 70, min: 60, max: 80, weight: 0.20 },
        { value: 1500, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 72,
      tolerance: 5,
    },
    {
      name: 'No sensors = null',
      factors: [
        { value: null, min: 40, max: 60, weight: 0.35 },
        { value: null, min: 18, max: 26, weight: 0.25 },
        { value: null, min: 60, max: 80, weight: 0.20 },
        { value: null, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: null,
      tolerance: 0,
    },
    {
      name: 'Single sensor only',
      factors: [
        { value: 50, min: 40, max: 60, weight: 0.35 },
        { value: null, min: 18, max: 26, weight: 0.25 },
        { value: null, min: 60, max: 80, weight: 0.20 },
        { value: null, min: 1000, max: 2000, weight: 0.20 },
      ],
      expected: 100,
      tolerance: 0,
    },
  ];
  
  for (const test of tests) {
    const result = calculateHealthScore(test.factors);
    const passed = test.expected === null 
      ? result === null 
      : result !== null && Math.abs(result - test.expected) <= test.tolerance;
    
    if (passed) {
      console.log(`  ✅ ${test.name}`);
    } else {
      console.log(`  ❌ ${test.name}: Expected ${test.expected}±${test.tolerance}, got ${result}`);
    }
  }
}
```

### Unit Test: Threshold Checking (`tests/unit/test-thresholds.ts`)

```typescript
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

export default async function testThresholds() {
  console.log('Test: Threshold Checking\n');
  
  const tests = [
    { value: 50, min: 40, max: 60, expectedLow: false, expectedHigh: false },
    { value: 40, min: 40, max: 60, expectedLow: false, expectedHigh: false },
    { value: 60, min: 40, max: 60, expectedLow: false, expectedHigh: false },
    { value: 39, min: 40, max: 60, expectedLow: true, expectedHigh: false },
    { value: 61, min: 40, max: 60, expectedLow: false, expectedHigh: true },
    { value: 0, min: 40, max: 60, expectedLow: true, expectedHigh: false },
    { value: 100, min: 40, max: 60, expectedLow: false, expectedHigh: true },
  ];
  
  for (const test of tests) {
    const result = checkThreshold(test.value, test.min, test.max);
    const passed = result.alarmLow === test.expectedLow && result.alarmHigh === test.expectedHigh;
    
    if (passed) {
      console.log(`  ✅ value=${test.value}, range=${test.min}-${test.max}`);
    } else {
      console.log(`  ❌ value=${test.value}, range=${test.min}-${test.max}`);
      console.log(`     Expected: low=${test.expectedLow}, high=${test.expectedHigh}`);
      console.log(`     Got: low=${result.alarmLow}, high=${result.alarmHigh}`);
    }
  }
}
```

---

## Validation Scripts

### Structure Validation (`tests/scripts/validate-structure.sh`)

```bash
#!/bin/bash

echo "=========================================="
echo "     STRUCTURE VALIDATION"
echo "=========================================="

APP_DIR="${1:-.}"
ERRORS=0

check_file() {
  if [ -f "$APP_DIR/$1" ]; then
    echo "✅ $1"
  else
    echo "❌ $1 MISSING"
    ERRORS=$((ERRORS + 1))
  fi
}

check_dir() {
  if [ -d "$APP_DIR/$1" ]; then
    echo "✅ $1/"
  else
    echo "❌ $1/ MISSING"
    ERRORS=$((ERRORS + 1))
  fi
}

echo ""
echo "Core Files:"
echo "-----------"
check_file "package.json"
check_file "tsconfig.json"
check_file "app.ts"
check_file ".homeycompose/app.json"

echo ""
echo "Library Files:"
echo "--------------"
check_file "lib/PlantbookClient.ts"
check_file "lib/PlantbookTypes.ts"

echo ""
echo "Driver Files:"
echo "-------------"
check_dir "drivers/plant"
check_file "drivers/plant/driver.ts"
check_file "drivers/plant/device.ts"
check_file "drivers/plant/driver.compose.json"

echo ""
echo "Assets:"
echo "-------"
check_file "assets/icon.svg"
check_dir "assets/images"

echo ""
echo "Locales:"
echo "--------"
check_file "locales/en.json"

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed"
  exit 0
else
  echo "❌ $ERRORS errors found"
  exit 1
fi
```

### Flow Card Validation (`tests/scripts/validate-flow-cards.sh`)

```bash
#!/bin/bash

echo "=========================================="
echo "     FLOW CARD VALIDATION"
echo "=========================================="

APP_DIR="${1:-.}"
FLOW_DIR="$APP_DIR/.homeycompose/flow"
ERRORS=0

validate_json() {
  if node -e "JSON.parse(require('fs').readFileSync('$1'))" 2>/dev/null; then
    echo "✅ $(basename $1)"
  else
    echo "❌ $(basename $1) - Invalid JSON"
    ERRORS=$((ERRORS + 1))
  fi
}

echo ""
echo "Triggers:"
echo "---------"
if [ -d "$FLOW_DIR/triggers" ]; then
  for file in "$FLOW_DIR/triggers"/*.json; do
    [ -f "$file" ] && validate_json "$file"
  done
else
  echo "⚠️  No triggers directory"
fi

echo ""
echo "Conditions:"
echo "-----------"
if [ -d "$FLOW_DIR/conditions" ]; then
  for file in "$FLOW_DIR/conditions"/*.json; do
    [ -f "$file" ] && validate_json "$file"
  done
else
  echo "⚠️  No conditions directory"
fi

echo ""
echo "Actions:"
echo "--------"
if [ -d "$FLOW_DIR/actions" ]; then
  for file in "$FLOW_DIR/actions"/*.json; do
    [ -f "$file" ] && validate_json "$file"
  done
else
  echo "⚠️  No actions directory"
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All flow cards valid"
  exit 0
else
  echo "❌ $ERRORS errors found"
  exit 1
fi
```

---

## Manual Test Procedures

### Pairing Test (`tests/manual/PAIRING_TEST.md`)

```markdown
# Manual Test: Pairing Flow

## Prerequisites
- [ ] App installed on Homey
- [ ] API credentials configured
- [ ] Network connectivity

## Test Steps

### 1. Start Pairing
- [ ] Open Homey app → Devices → Add Device
- [ ] Select "Open Plantbook" → "Plant"
- [ ] Click "Start Pairing"

Expected: Search page appears

### 2. Search Plant
- [ ] Enter "Monstera" in search field
- [ ] Wait for results

Expected: List of monstera varieties appears

### 3. Select Plant
- [ ] Click on "Monstera deliciosa"

Expected: Configure page shows with:
- Plant image
- Scientific name
- Optimal ranges

### 4. Complete Pairing
- [ ] Click "Continue"
- [ ] Confirm device creation

Expected: 
- Device appears in device list
- Device name matches plant name
- Optimal ranges populated

### 5. Verify Device
- [ ] Open device
- [ ] Check capabilities show ranges
- [ ] Check settings show PID

## Edge Cases

### Empty Search
- [ ] Search with empty string
Expected: No results or prompt to enter text

### No Results
- [ ] Search "xyznonexistent123"
Expected: "No plants found" message

### Special Characters
- [ ] Search "plant's name"
Expected: Query handled correctly

### Network Error
- [ ] Disconnect network, then search
Expected: Error message shown

## Results

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Start Pairing | | |
| Search Plant | | |
| Select Plant | | |
| Complete Pairing | | |
| Verify Device | | |
| Empty Search | | |
| No Results | | |
| Special Characters | | |
| Network Error | | |

Tester: _____________
Date: _____________
```

### Sensor Test (`tests/manual/SENSOR_TEST.md`)

```markdown
# Manual Test: Sensor Linking

## Prerequisites
- [ ] Plant device created
- [ ] At least one sensor device available
- [ ] Sensor device reporting values

## Test Steps

### 1. Link Soil Moisture Sensor
- [ ] Open Plant device settings
- [ ] Find "Linked Sensors" section
- [ ] Enter sensor link: `[device-id]:measure_soil_moisture`
- [ ] Save settings

Expected:
- Settings save without error
- Logs show "Subscribed to [device]"

### 2. Verify Reading Updates
- [ ] Check plant device
- [ ] Compare soil moisture value to sensor value

Expected: Values match

### 3. Link Additional Sensors
- [ ] Link temperature sensor
- [ ] Link humidity sensor
- [ ] Link light sensor

Expected: All readings appear on plant device

### 4. Test Value Changes
- [ ] Change sensor value (if possible)
- [ ] Observe plant device update

Expected: Plant device updates within seconds

### 5. Test Health Score
- [ ] With all sensors in range
- [ ] Check health score

Expected: Score > 80%

## Edge Cases

### Invalid Format
- [ ] Enter "invalid_format" (no colon)
Expected: Fails gracefully, logged

### Non-Existent Device
- [ ] Enter "fake-device:measure_soil_moisture"
Expected: Error logged, no crash

### Remove Sensor Link
- [ ] Clear sensor link, save
Expected: Stops receiving updates

### Sensor Goes Offline
- [ ] Disable sensor device
Expected: Plant device handles gracefully

## Results

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Link Soil Sensor | | |
| Verify Reading | | |
| Link Additional | | |
| Value Changes | | |
| Health Score | | |
| Invalid Format | | |
| Non-Existent | | |
| Remove Link | | |
| Sensor Offline | | |

Tester: _____________
Date: _____________
```

---

## Integration Test Checklist

### Full Integration Test (`tests/manual/INTEGRATION_TEST.md`)

```markdown
# Full Integration Test

## Phase 1: Installation & Configuration

- [ ] Install app from store/local
- [ ] App appears in Apps list
- [ ] Open app settings
- [ ] Enter Client ID
- [ ] Enter Client Secret
- [ ] Settings save successfully
- [ ] Check logs: "Plantbook client initialized"

## Phase 2: Add Plant Device

- [ ] Start pairing flow
- [ ] Search returns results
- [ ] Plant selection works
- [ ] Device created successfully
- [ ] Device shows in device list
- [ ] Optimal ranges populated
- [ ] Health score shows (null until sensors linked)

## Phase 3: Link Sensors

- [ ] Link soil moisture sensor
- [ ] Link temperature sensor
- [ ] Link humidity sensor
- [ ] Link light sensor
- [ ] All readings appear on plant device
- [ ] Health score calculates

## Phase 4: Test Alarms

- [ ] Set soil below minimum
- [ ] alarm_needs_water = true
- [ ] Set soil above minimum
- [ ] alarm_needs_water = false
- [ ] Test other alarms similarly

## Phase 5: Link Controllers

- [ ] Link water controller
- [ ] Enable auto-water
- [ ] Trigger dry condition
- [ ] Controller activates
- [ ] Controller deactivates after duration

## Phase 6: Flow Cards

- [ ] Create test flow with plant trigger
- [ ] Trigger fires on condition
- [ ] Condition card evaluates correctly
- [ ] Action card executes

## Phase 7: Edge Cases

- [ ] Delete sensor device → Plant handles gracefully
- [ ] Network disconnect → Error messages shown
- [ ] Invalid API credentials → Clear error
- [ ] API rate limit → Proper message

## Phase 8: Cleanup

- [ ] Delete plant device
- [ ] Sensor subscriptions cleaned up
- [ ] No errors in logs
- [ ] Uninstall app

## Final Result

| Phase | Pass | Fail | Blocked |
|-------|------|------|---------|
| Installation | | | |
| Add Plant | | | |
| Link Sensors | | | |
| Test Alarms | | | |
| Link Controllers | | | |
| Flow Cards | | | |
| Edge Cases | | | |
| Cleanup | | | |

Overall: ____________

Tester: _____________
Date: _____________
Version: _____________
```

---

## Continuous Testing During Development

### After Each File Change

```bash
# Quick validation
npm run build && npm run lint

# If tests exist for the changed file
npm test
```

### After Each Phase Completion

1. Run unit tests: `npm test`
2. Run structure validation: `bash tests/scripts/validate-structure.sh`
3. Complete relevant manual test procedure
4. Update test documentation with results
5. Fix any issues before proceeding

### Before Pull Request

1. All unit tests pass
2. All validation scripts pass
3. Manual integration test complete
4. No linting errors
5. Documentation updated

---

## Test Coverage Goals

| Phase | Unit Tests | Validation | Manual Tests |
|-------|------------|------------|--------------|
| 1 | API auth, search, detail | Structure | Installation |
| 2 | - | Driver structure | Pairing |
| 3 | Sensor link parsing | - | Sensor linking |
| 4 | Health score algorithm | - | Health display |
| 5 | Threshold logic | - | Alarm triggers |
| 6 | - | - | Controllers |
| 7 | - | Flow card JSON | All flow cards |
| 8 | - | UI HTML | Pairing UI |
| 9 | - | - | Integration |
| 10 | - | - | Data upload |
| 11 | All | All | Full integration |

---

## Reporting Issues

When a test fails, document:

1. **Test name and phase**
2. **Expected result**
3. **Actual result**
4. **Steps to reproduce**
5. **Logs/screenshots**
6. **Environment details**

Example:

```
## Bug Report

**Test**: Phase 3 - Sensor Link Parsing
**Phase**: 3

**Expected**: Link "device123:measure_soil_moisture" parses correctly
**Actual**: Error thrown: "Cannot read property 'split' of undefined"

**Steps**:
1. Create plant device
2. Go to settings
3. Enter sensor link
4. Save

**Logs**:
```
Error: Cannot read property 'split' of undefined
    at PlantDevice.setupSensorLinks (device.ts:45)
```

**Environment**:
- Homey version: 12.4.0
- App version: 1.0.0
- Node version: 16.20.0
```
