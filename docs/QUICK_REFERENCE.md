# Quick Reference Guide

## Phase Summary

| Phase | Duration | Priority | Key Deliverables |
|-------|----------|----------|------------------|
| 1 | 1 week | High | API client, app scaffold |
| 2 | 1 week | High | Plant driver, basic pairing |
| 3 | 1 week | High | Sensor linking, subscriptions |
| 4 | 3 days | High | Health score calculation |
| 5 | 3 days | Medium | Alarm capabilities, triggers |
| 6 | 1 week | Medium | Controller linking, auto-water |
| 7 | 1 week | Medium | Flow cards (all types) |
| 8 | 3 days | Medium | Enhanced pairing UI |
| 9 | 3 days | Low | Hobeian integration |
| 10 | 3 days | Low | Data upload feature |
| 11 | 1 week | High | Testing, polish, docs |

## File Structure Quick Reference

### Plantbook App (`com.openplantbook`)

```
com.openplantbook/
├── .homeycompose/
│   ├── app.json
│   ├── capabilities/
│   │   ├── plant_health_score.json
│   │   ├── optimal_*.json (8 files)
│   │   ├── alarm_*.json (7 files)
│   │   └── measure_*.json (4 files)
│   └── flow/
│       ├── triggers/ (8 files)
│       ├── conditions/ (7 files)
│       └── actions/ (7 files)
├── drivers/
│   └── plant/
│       ├── driver.compose.json
│       ├── driver.ts
│       ├── device.ts
│       └── pair/
│           ├── search.html
│           ├── configure.html
│           ├── sensors.html
│           └── controllers.html
├── lib/
│   ├── PlantbookClient.ts
│   └── PlantbookTypes.ts
├── app.ts
├── api.ts
├── package.json
└── tsconfig.json
```

### Hobeian App (`com.hobeian`)

```
com.hobeian/
├── lib/
│   └── PlantbookIntegration.ts (NEW)
└── drivers/
    └── zg-303z/
        └── device.ts (MODIFY)
```

## Key Code Patterns

### Sensor Subscription

```typescript
// Subscribe to sensor capability
const device = await this.homey.devices.getDevice({ id: deviceId });
device.on(`capability.${capability}`, (value) => {
  this.onSensorReading(type, value, deviceId);
});
```

### Health Score Calculation

```typescript
// Weighted calculation
const factors = [
  { value, min, max, weight: 0.35 }, // soil_moisture
  { value, min, max, weight: 0.25 }, // temperature
  // ...
];
const score = weightedSum / totalWeight;
```

### Threshold Checking

```typescript
const tooLow = value < threshold.min;
const tooHigh = value > threshold.max;
await this.setCapabilityValue(alarmCapability, tooLow || tooHigh);
```

### Controller Activation

```typescript
const device = await this.homey.devices.getDevice({ id: controllerId });
await device.setCapabilityValue('onoff', true);
setTimeout(() => device.setCapabilityValue('onoff', false), duration);
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/token/` | POST | OAuth2 authentication |
| `/plant/search?alias={query}` | GET | Search plants |
| `/plant/detail/{pid}` | GET | Get plant details |
| `/sensor-data/instance` | POST | Register plant instance |
| `/sensor-data/upload` | POST | Upload sensor data |

## Capability Mappings

| Sensor Type | Capability | Unit |
|-------------|------------|------|
| soil_moisture | measure_soil_moisture | % |
| temperature | measure_temperature | °C |
| humidity | measure_humidity | % |
| light | measure_luminance | lux |
| soil_ec | measure_soil_ec | μS/cm |

## Flow Card IDs

### Triggers
- `plant_needs_water`
- `plant_overwatered`
- `plant_temperature_alert`
- `plant_humidity_alert`
- `plant_light_alert`
- `plant_health_changed`
- `plant_auto_watered`
- `plant_sensor_updated`

### Conditions
- `plant_is_healthy`
- `plant_needs_attention`
- `soil_in_range`
- `temp_in_range`
- `humidity_in_range`
- `light_in_range`
- `sensor_is_linked`
- `controller_is_linked`

### Actions
- `water_plant`
- `turn_on_grow_light`
- `turn_off_grow_light`
- `refresh_plant_data`
- `link_sensor`
- `link_controller`
- `calculate_health`

## Testing Commands

```bash
# Build TypeScript
npm run build

# Lint code
npm run lint

# Test API connection
node -e "const { PlantbookClient } = require('./lib/PlantbookClient'); ..."
```

## Common Issues & Solutions

### Issue: Token expires frequently
**Solution**: Check token refresh buffer (5 minutes before expiry)

### Issue: Sensor not updating
**Solution**: Verify device ID and capability name format: `deviceId:capability`

### Issue: Health score not calculating
**Solution**: Ensure at least one sensor is linked and has a reading

### Issue: Auto-water not working
**Solution**: Check controller device ID and that `auto_water_enabled` is true

### Issue: Flow trigger not firing
**Solution**: Verify trigger card ID matches handler method name

## Development Workflow

1. **Phase 1-2**: Core functionality
   - Get API working
   - Create basic plant device

2. **Phase 3-4**: Sensor integration
   - Link sensors
   - Calculate health

3. **Phase 5-6**: Alarms & automation
   - Add alarms
   - Link controllers

4. **Phase 7-8**: User experience
   - Flow cards
   - Enhanced UI

5. **Phase 9-10**: Integration & sharing
   - Hobeian integration
   - Data upload

6. **Phase 11**: Polish
   - Testing
   - Documentation

## Git Workflow

```bash
# Create feature branch
git checkout -b phase-1-api-client

# Commit frequently
git add .
git commit -m "Phase 1: Implement PlantbookClient"

# Push to remote
git push origin phase-1-api-client

# Merge when phase complete
git checkout main
git merge phase-1-api-client
```

## Dependencies

### Required
- `homey`: ^3.0.0
- `node-fetch`: ^2.7.0

### Dev Dependencies
- `typescript`: ^5.0.0
- `@types/node`: ^16.18.0
- `@types/homey`: homey-apps-sdk-v3-types@^0.3.12

## Environment Variables

None required - all configuration via Homey app settings.

## API Credentials

Get from: https://open.plantbook.io → API Keys

- Client ID: OAuth2 client identifier
- Client Secret: OAuth2 client secret

## Rate Limits

- 200 requests per day per user
- Implement caching to minimize requests
- Token refresh counts as 1 request

## Next Steps After Each Phase

1. Test all functionality
2. Document any deviations from plan
3. Update this quick reference if needed
4. Commit code
5. Move to next phase
