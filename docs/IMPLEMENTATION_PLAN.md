# Open Plantbook Integration - Implementation Plan

> **📋 Document Version 1.1** - This document has been updated with corrections.
> See [PLAN_REVIEW.md](./PLAN_REVIEW.md) for detailed review notes and [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing procedures.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Core API Client & App Scaffold](#phase-1-core-api-client--app-scaffold)
4. [Phase 2: Plant Driver with Basic Pairing](#phase-2-plant-driver-with-basic-pairing)
5. [Phase 3: Sensor Linking & Subscriptions](#phase-3-sensor-linking--subscriptions)
6. [Phase 4: Health Score Calculation](#phase-4-health-score-calculation)
7. [Phase 5: Alarm Capabilities & Triggers](#phase-5-alarm-capabilities--triggers)
8. [Phase 6: Controller Linking & Auto-Water](#phase-6-controller-linking--auto-water)
9. [Phase 7: Flow Cards](#phase-7-flow-cards)
10. [Phase 8: Enhanced Pairing UI](#phase-8-enhanced-pairing-ui)
11. [Phase 9: Hobeian Integration Helper](#phase-9-hobeian-integration-helper)
12. [Phase 10: Data Upload to Plantbook](#phase-10-data-upload-to-plantbook)
13. [Phase 11: Testing & Polish](#phase-11-testing--polish)
14. [Appendix](#appendix)

---

## Overview

This document outlines the step-by-step implementation plan for integrating Open Plantbook API support into the Homey ecosystem. The implementation follows a hybrid approach with two apps:

- **`com.openplantbook`**: Standalone app providing plant database, virtual plant devices, and flow cards
- **`com.hobeian`**: Enhanced with optional Plantbook integration when both apps are installed

### Key Features

- Multi-sensor support per plant (soil moisture, temperature, humidity, light, EC)
- Controller integration (water pumps, grow lights, humidifiers)
- Intelligent health scoring based on multiple factors
- Automatic watering and lighting control
- Flow cards for automation
- Community data sharing (optional)

### Prerequisites

- Node.js 16+ (Homey SDK 3 requirement)
- TypeScript knowledge
- Homey app development experience
- Open Plantbook API credentials (from https://open.plantbook.io)
- Homey CLI installed (`npm install -g homey`)

### Development Approach

This implementation follows a **test-first** development approach:

1. **Before implementing**: Review test requirements for the phase
2. **Create tests first**: Write unit tests or prepare manual test procedures
3. **Implement feature**: Build the functionality
4. **Run tests**: Verify all tests pass
5. **Document**: Update any documentation if needed
6. **Proceed**: Move to next feature/phase

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete testing documentation.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Homey Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │  Hobeian App    │         │  Plantbook App       │     │
│  │  (com.hobeian)   │         │  (com.openplantbook) │     │
│  │                 │         │                      │     │
│  │  • ZG-303Z      │         │  • Plant Devices     │     │
│  │    Driver       │         │  • API Client        │     │
│  │  • Sensor Data  │         │  • Flow Cards        │     │
│  │  • Basic Alarms │         │  • Health Scoring   │     │
│  └────────┬────────┘         └──────────┬───────────┘     │
│           │                               │                 │
│           └───────────┬───────────────────┘               │
│                       │                                     │
│              ┌────────┴────────┐                           │
│              │  Plant Device    │                           │
│              │  (Virtual Hub)   │                           │
│              └────────┬─────────┘                           │
│                       │                                     │
│        ┌──────────────┼──────────────┐                     │
│        │              │              │                     │
│   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐                │
│   │ Sensors │   │ Sensors │   │Controllers│               │
│   │ (Input) │   │ (Input) │   │ (Output) │               │
│   └─────────┘   └─────────┘   └─────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Sensor Reading** → Device capability change
2. **Plant Device** → Subscribes to sensor capabilities
3. **Plant Device** → Receives reading, updates own capability
4. **Plant Device** → Checks against optimal ranges
5. **Plant Device** → Updates alarms and health score
6. **Plant Device** → Triggers flow cards if needed
7. **Plant Device** → Optionally triggers controllers (auto-water, etc.)

---

## Phase 1: Core API Client & App Scaffold

**Duration**: 1 week  
**Priority**: High  
**Dependencies**: None

### Objectives

- Create the Plantbook app project structure
- Implement OAuth2 authentication client
- Set up app configuration and settings
- Create basic API client for Plantbook endpoints

### Files to Create

```
/com.openplantbook/
├── .homeycompose/
│   └── app.json
├── lib/
│   ├── PlantbookClient.ts
│   └── PlantbookTypes.ts
├── app.ts
├── package.json
├── tsconfig.json
├── locales/
│   └── en.json
└── README.md
```

### Implementation Steps

#### Step 1.1: Initialize Project

```bash
# Create project directory
mkdir com.openplantbook
cd com.openplantbook

# Initialize npm
npm init -y

# Install dependencies
npm install --save homey
npm install --save-dev typescript @types/node @types/homey
npm install --save node-fetch@2
```

#### Step 1.2: Create `package.json`

```json
{
  "name": "com.openplantbook",
  "version": "1.0.0",
  "description": "Open Plantbook integration for Homey",
  "main": "app.js",
  "scripts": {
    "build": "tsc",
    "lint": "eslint --ext .js,.ts ."
  },
  "dependencies": {
    "homey": "^3.0.0",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "@types/homey": "npm:homey-apps-sdk-v3-types@^0.3.12",
    "@types/node": "^16.18.0",
    "typescript": "^5.0.0"
  }
}
```

#### Step 1.3: Create `tsconfig.json`

```json
{
  "extends": "@tsconfig/node16/tsconfig.json",
  "compilerOptions": {
    "outDir": "./",
    "rootDir": "./",
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### Step 1.4: Create Type Definitions (`lib/PlantbookTypes.ts`)

```typescript
/**
 * Open Plantbook API Type Definitions
 */

export interface PlantSearchResult {
  pid: string;
  alias: string;
  display_pid: string;
  category?: string;
  image_url?: string;
}

export interface PlantDetail {
  pid: string;
  alias: string;
  display_pid: string;
  image_url: string;
  max_light_lux: number;
  min_light_lux: number;
  max_temp: number;
  min_temp: number;
  max_env_humid: number;
  min_env_humid: number;
  max_soil_moist: number;
  min_soil_moist: number;
  max_soil_ec: number;
  min_soil_ec: number;
  category?: string;
  scientific_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PlantInstanceRegistration {
  custom_id: string;
  pid: string;
  location_country?: string;
  location_by_IP?: boolean;
  location_lon?: number;
  location_lat?: number;
}

export interface SensorReading {
  timestamp: string;
  soil_moisture?: number;
  temperature?: number;
  humidity?: number;
  light_lux?: number;
  soil_ec?: number;
}

export interface ApiError {
  type: string;
  errors: Array<{
    code: string;
    detail: string;
    attr: string | null;
  }>;
}
```

#### Step 1.5: Create API Client (`lib/PlantbookClient.ts`)

```typescript
import fetch from 'node-fetch';
import { PlantSearchResult, PlantDetail, TokenResponse, PlantInstanceRegistration, ApiError } from './PlantbookTypes';

const PLANTBOOK_BASE_URL = 'https://open.plantbook.io/api/v1';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_REQUESTS_PER_DAY = 200; // API rate limit

export class PlantbookClient {
  private clientId: string;
  private clientSecret: string;
  private token: TokenResponse | null = null;
  private tokenExpiry: Date | null = null;
  
  // Rate limiting
  private requestCount: number = 0;
  private requestResetTime: Date = new Date();

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Check and enforce API rate limits
   */
  private checkRateLimit(): void {
    const now = new Date();
    
    // Reset counter daily
    if (now.getDate() !== this.requestResetTime.getDate() ||
        now.getMonth() !== this.requestResetTime.getMonth()) {
      this.requestCount = 0;
      this.requestResetTime = now;
    }
    
    if (this.requestCount >= MAX_REQUESTS_PER_DAY) {
      throw new Error('API rate limit exceeded (200 requests/day). Please try again tomorrow.');
    }
    
    this.requestCount++;
  }

  /**
   * Authenticate and get OAuth2 token
   */
  async authenticate(): Promise<boolean> {
    // Check if token is still valid
    if (this.token && this.tokenExpiry) {
      const now = new Date();
      const refreshTime = new Date(this.tokenExpiry.getTime() - TOKEN_REFRESH_BUFFER);
      if (now < refreshTime) {
        return true; // Token still valid
      }
    }

    this.checkRateLimit();

    try {
      const response = await fetch(`${PLANTBOOK_BASE_URL}/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(`Authentication failed: ${error.errors?.[0]?.detail || response.statusText}`);
      }

      this.token = await response.json() as TokenResponse;
      this.tokenExpiry = new Date(Date.now() + this.token.expires_in * 1000);
      return true;
    } catch (error) {
      console.error('Plantbook authentication error:', error);
      throw error;
    }
  }

  /**
   * Search for plants by name/alias
   */
  async searchPlants(query: string): Promise<PlantSearchResult[]> {
    await this.authenticate();
    this.checkRateLimit();

    try {
      const response = await fetch(
        `${PLANTBOOK_BASE_URL}/plant/search?alias=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token!.access_token}`,
          },
          timeout: 10000,
        }
      );

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(`Search failed: ${error.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.results || [];
    } catch (error) {
      console.error('Plantbook search error:', error);
      throw error;
    }
  }

  /**
   * Get plant details by PID
   */
  async getPlantDetail(pid: string, lang?: string): Promise<PlantDetail> {
    await this.authenticate();
    this.checkRateLimit();

    try {
      const url = new URL(`${PLANTBOOK_BASE_URL}/plant/detail/${encodeURIComponent(pid)}`);
      if (lang) {
        url.searchParams.set('lang', lang);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.token!.access_token}`,
        },
        timeout: 10000,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(`Get plant detail failed: ${error.errors?.[0]?.detail || response.statusText}`);
      }

      return await response.json() as PlantDetail;
    } catch (error) {
      console.error('Plantbook get plant detail error:', error);
      throw error;
    }
  }

  /**
   * Register a plant instance (sensor-plant pairing)
   */
  async registerPlantInstance(registration: PlantInstanceRegistration): Promise<string> {
    await this.authenticate();
    this.checkRateLimit();

    try {
      const response = await fetch(`${PLANTBOOK_BASE_URL}/sensor-data/instance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registration),
        timeout: 10000,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(`Registration failed: ${error.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      return data.id || data.instance_id;
    } catch (error) {
      console.error('Plantbook registration error:', error);
      throw error;
    }
  }

  /**
   * Get remaining API requests for today
   */
  getRemainingRequests(): number {
    return Math.max(0, MAX_REQUESTS_PER_DAY - this.requestCount);
  }
}
```

#### Step 1.6: Create App Class (`app.ts`)

```typescript
import Homey from 'homey';
import { PlantbookClient } from './lib/PlantbookClient';
import { PlantDetail } from './lib/PlantbookTypes';

// Cache entry with timestamp
interface CacheEntry<T> {
  data: T;
  timestamp: Date;
}

class PlantbookApp extends Homey.App {
  private plantbookClient: PlantbookClient | null = null;
  
  // Plant data cache (24 hour TTL)
  private plantCache: Map<string, CacheEntry<PlantDetail>> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async onInit() {
    this.log('Plantbook app is running...');

    // Initialize client if credentials are set
    await this.initializeClient();

    // Listen for settings changes
    this.homey.settings.on('set', async (key: string) => {
      if (key === 'client_id' || key === 'client_secret') {
        await this.initializeClient();
      }
    });

    // Register flow cards
    await this.registerFlowCards();
  }

  /**
   * Initialize or reinitialize the Plantbook client
   */
  private async initializeClient(): Promise<void> {
    const clientId = this.homey.settings.get('client_id');
    const clientSecret = this.homey.settings.get('client_secret');

    if (clientId && clientSecret) {
      this.plantbookClient = new PlantbookClient(clientId, clientSecret);
      this.log('Plantbook client initialized');
      
      // Test connection
      try {
        await this.plantbookClient.authenticate();
        this.log('Plantbook API connection verified');
      } catch (error) {
        this.error('Plantbook API connection failed:', error);
      }
    } else {
      this.plantbookClient = null;
      this.log('Plantbook credentials not configured');
    }
  }

  /**
   * Register all flow cards
   */
  private async registerFlowCards(): Promise<void> {
    // Register device trigger cards (these are triggered from device.ts)
    // No run listener needed for device triggers - they are triggered programmatically
    
    // Register condition cards
    const plantIsHealthyCondition = this.homey.flow.getConditionCard('plant_is_healthy');
    plantIsHealthyCondition.registerRunListener(async (args) => {
      const device = args.device;
      const healthScore = device.getCapabilityValue('plant_health_score');
      return healthScore !== null && healthScore >= args.threshold;
    });

    const plantNeedsAttentionCondition = this.homey.flow.getConditionCard('plant_needs_attention');
    plantNeedsAttentionCondition.registerRunListener(async (args) => {
      const device = args.device;
      const alarms = [
        'alarm_needs_water', 'alarm_overwatered', 
        'alarm_too_cold', 'alarm_too_hot',
        'alarm_low_humidity', 'alarm_low_light', 'alarm_too_bright'
      ];
      return alarms.some(alarm => device.getCapabilityValue(alarm) === true);
    });

    const soilInRangeCondition = this.homey.flow.getConditionCard('soil_in_range');
    soilInRangeCondition.registerRunListener(async (args) => {
      const device = args.device;
      const value = device.getCapabilityValue('measure_soil_moisture');
      const min = device.getCapabilityValue('optimal_soil_moisture_min');
      const max = device.getCapabilityValue('optimal_soil_moisture_max');
      return value !== null && value >= min && value <= max;
    });

    // Register action cards
    const waterPlantAction = this.homey.flow.getActionCard('water_plant');
    waterPlantAction.registerRunListener(async (args) => {
      const device = args.device;
      await device.triggerWatering(args.duration);
      return true;
    });

    const refreshPlantDataAction = this.homey.flow.getActionCard('refresh_plant_data');
    refreshPlantDataAction.registerRunListener(async (args) => {
      const device = args.device;
      await device.refreshPlantData();
      return true;
    });

    this.log('Flow cards registered');
  }

  /**
   * Get Plantbook client instance
   */
  getPlantbookClient(): PlantbookClient | null {
    return this.plantbookClient;
  }

  /**
   * Get plant detail with caching
   * Reduces API calls by caching plant data for 24 hours
   */
  async getCachedPlantDetail(pid: string): Promise<PlantDetail | null> {
    // Check cache first
    const cached = this.plantCache.get(pid);
    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < this.CACHE_TTL) {
        this.log(`Plant data for ${pid} served from cache`);
        return cached.data;
      }
    }

    // Fetch from API
    if (!this.plantbookClient) {
      this.error('Plantbook client not initialized');
      return null;
    }

    try {
      const data = await this.plantbookClient.getPlantDetail(pid);
      
      // Store in cache
      this.plantCache.set(pid, {
        data,
        timestamp: new Date(),
      });
      
      this.log(`Plant data for ${pid} fetched and cached`);
      return data;
    } catch (error) {
      this.error(`Failed to fetch plant data for ${pid}:`, error);
      
      // Return stale cache if available
      if (cached) {
        this.log(`Returning stale cache for ${pid}`);
        return cached.data;
      }
      
      return null;
    }
  }

  /**
   * Clear the plant cache
   */
  clearPlantCache(): void {
    this.plantCache.clear();
    this.log('Plant cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: Date | null } {
    let oldestEntry: Date | null = null;
    
    for (const entry of this.plantCache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    }
    
    return {
      entries: this.plantCache.size,
      oldestEntry,
    };
  }
}

module.exports = PlantbookApp;
```

#### Step 1.7: Create App Configuration (`.homeycompose/app.json`)

```json
{
  "id": "com.openplantbook",
  "version": "1.0.0",
  "compatibility": ">=12.4.0",
  "sdk": 3,
  "platforms": [
    "local"
  ],
  "name": {
    "en": "Open Plantbook"
  },
  "description": {
    "en": "Connect your plant sensors to the Open Plantbook database for intelligent plant care guidance"
  },
  "category": [
    "tools"
  ],
  "permissions": [
    "homey:manager:api"
  ],
  "icon": "/assets/icon.svg",
  "images": {
    "small": "/assets/images/small.png",
    "large": "/assets/images/large.png",
    "xlarge": "/assets/images/xlarge.png"
  },
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "settings": [
    {
      "type": "group",
      "label": {
        "en": "API Credentials"
      },
      "children": [
        {
          "id": "client_id",
          "type": "text",
          "label": {
            "en": "Client ID"
          },
          "hint": {
            "en": "Get this from open.plantbook.io → API Keys"
          }
        },
        {
          "id": "client_secret",
          "type": "password",
          "label": {
            "en": "Client Secret"
          },
          "hint": {
            "en": "Get this from open.plantbook.io → API Keys"
          }
        }
      ]
    }
  ]
}
```

#### Step 1.8: Create Locales (`locales/en.json`)

```json
{
  "app": {
    "name": "Open Plantbook",
    "description": "Connect your plant sensors to the Open Plantbook database for intelligent plant care guidance"
  },
  "settings": {
    "client_id": {
      "label": "Client ID",
      "hint": "Get this from open.plantbook.io → API Keys"
    },
    "client_secret": {
      "label": "Client Secret",
      "hint": "Get this from open.plantbook.io → API Keys"
    }
  }
}
```

### Testing Checklist

**Structure Validation:**
- [ ] All required files exist (see Files to Create)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)

**API Client Tests:**
- [ ] Valid credentials authenticate successfully
- [ ] Invalid credentials throw descriptive error
- [ ] Token caching works (second auth is instant)
- [ ] Token refresh happens before expiry
- [ ] Rate limiting prevents >200 requests/day
- [ ] Search returns results for "monstera"
- [ ] Search returns empty array for non-existent plant
- [ ] Search handles special characters correctly
- [ ] Get plant detail returns complete data
- [ ] Get plant detail throws for invalid PID
- [ ] Network timeout is handled gracefully

**App Installation Tests:**
- [ ] App installs without errors
- [ ] App settings page shows API credential fields
- [ ] Client ID and Secret can be saved
- [ ] Settings change triggers client reinitialization
- [ ] Flow cards are registered (check logs)
- [ ] Cache stats available via `getCacheStats()`

**Test Commands:**
```bash
# Build and validate
npm run build
npm run lint

# Run unit tests (if test framework configured)
npm test

# Validate with Homey CLI
homey app validate
```

### Checkpoint

At the end of Phase 1, you should be able to:
- Install the app on Homey
- Configure API credentials
- Successfully authenticate with Plantbook API
- Search for plants and retrieve plant details
- See rate limit protection working
- Verify flow cards are registered in logs

---

## Phase 2: Plant Driver with Basic Pairing

**Duration**: 1 week  
**Priority**: High  
**Dependencies**: Phase 1

### Objectives

- Create virtual plant device driver
- Implement basic pairing flow (search and select plant)
- Store plant data in device
- Display plant information in device card

### Files to Create

```
/com.openplantbook/
├── .homeycompose/
│   └── capabilities/
│       ├── plant_health_score.json
│       ├── optimal_soil_moisture_min.json
│       ├── optimal_soil_moisture_max.json
│       ├── optimal_temperature_min.json
│       ├── optimal_temperature_max.json
│       ├── optimal_humidity_min.json
│       ├── optimal_humidity_max.json
│       ├── optimal_light_min.json
│       └── optimal_light_max.json
├── drivers/
│   └── plant/
│       ├── driver.compose.json
│       ├── driver.ts
│       ├── device.ts
│       ├── assets/
│       │   └── icon.svg
│       └── pair/
│           ├── search.html
│           └── configure.html
└── assets/
    └── icon.svg
```

### Step 2.0: Create Capability Definitions

Before creating the driver, we need to define the custom capabilities.

#### `.homeycompose/capabilities/plant_health_score.json`

```json
{
  "type": "number",
  "title": {
    "en": "Health Score"
  },
  "getable": true,
  "setable": false,
  "insights": true,
  "units": {
    "en": "%"
  },
  "min": 0,
  "max": 100,
  "icon": "/assets/health.svg"
}
```

#### `.homeycompose/capabilities/optimal_soil_moisture_min.json`

```json
{
  "type": "number",
  "title": {
    "en": "Min Soil Moisture"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "%"
  },
  "min": 0,
  "max": 100
}
```

#### `.homeycompose/capabilities/optimal_soil_moisture_max.json`

```json
{
  "type": "number",
  "title": {
    "en": "Max Soil Moisture"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "%"
  },
  "min": 0,
  "max": 100
}
```

#### `.homeycompose/capabilities/optimal_temperature_min.json`

```json
{
  "type": "number",
  "title": {
    "en": "Min Temperature"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "°C"
  },
  "min": -10,
  "max": 50
}
```

#### `.homeycompose/capabilities/optimal_temperature_max.json`

```json
{
  "type": "number",
  "title": {
    "en": "Max Temperature"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "°C"
  },
  "min": -10,
  "max": 50
}
```

#### `.homeycompose/capabilities/optimal_humidity_min.json`

```json
{
  "type": "number",
  "title": {
    "en": "Min Humidity"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "%"
  },
  "min": 0,
  "max": 100
}
```

#### `.homeycompose/capabilities/optimal_humidity_max.json`

```json
{
  "type": "number",
  "title": {
    "en": "Max Humidity"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "%"
  },
  "min": 0,
  "max": 100
}
```

#### `.homeycompose/capabilities/optimal_light_min.json`

```json
{
  "type": "number",
  "title": {
    "en": "Min Light"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "lux"
  },
  "min": 0,
  "max": 100000
}
```

#### `.homeycompose/capabilities/optimal_light_max.json`

```json
{
  "type": "number",
  "title": {
    "en": "Max Light"
  },
  "getable": true,
  "setable": false,
  "insights": false,
  "units": {
    "en": "lux"
  },
  "min": 0,
  "max": 100000
}
```

> **Note**: The driver will also use standard Homey capabilities:
> - `measure_soil_moisture` (custom, copy from Hobeian app)
> - `measure_temperature` (built-in)
> - `measure_humidity` (built-in)
> - `measure_luminance` (built-in)

### Implementation Steps

#### Step 2.1: Create Driver Compose (`drivers/plant/driver.compose.json`)

```json
{
  "id": "plant",
  "name": {
    "en": "Plant"
  },
  "class": "sensor",
  "platforms": [
    "local"
  ],
  "capabilities": [
    "plant_health_score",
    "optimal_soil_moisture_min",
    "optimal_soil_moisture_max",
    "optimal_temperature_min",
    "optimal_temperature_max",
    "optimal_humidity_min",
    "optimal_humidity_max",
    "optimal_light_min",
    "optimal_light_max"
  ],
  "pair": [
    {
      "id": "search",
      "template": "search"
    },
    {
      "id": "configure",
      "template": "configure"
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ],
  "settings": [
    {
      "id": "pid",
      "type": "label",
      "label": {
        "en": "Plant ID"
      }
    },
    {
      "id": "scientific_name",
      "type": "label",
      "label": {
        "en": "Scientific Name"
      }
    }
  ],
  "images": {
    "small": "/drivers/plant/assets/images/small.png",
    "large": "/drivers/plant/assets/images/large.png"
  }
}
```

#### Step 2.2: Create Driver Class (`drivers/plant/driver.ts`)

> **Note**: Homey pairing uses specific handler names. Custom handlers are called from pair HTML views.

```typescript
import Homey from 'homey';
import { PlantDetail, PlantSearchResult } from '../../lib/PlantbookTypes';

class PlantDriver extends Homey.Driver {
  
  // Store selected plant during pairing session
  private selectedPlant: PlantDetail | null = null;

  async onInit() {
    this.log('Plant driver has been initialized');
  }

  async onPair(session: Homey.Driver.PairSession) {
    // Reset state for new pairing session
    this.selectedPlant = null;

    // Handler: Search for plants (called from search.html)
    session.setHandler('searchPlants', async (query: string): Promise<PlantSearchResult[]> => {
      this.log('Searching for plants:', query);

      const app = this.homey.app as any;
      const client = app.getPlantbookClient();

      if (!client) {
        throw new Error('Plantbook API not configured. Please set credentials in app settings.');
      }

      try {
        const results = await client.searchPlants(query);
        return results;
      } catch (error) {
        this.error('Search failed:', error);
        throw error;
      }
    });

    // Handler: Get plant details (called from search.html when plant is clicked)
    session.setHandler('getPlantDetail', async (pid: string): Promise<PlantDetail> => {
      this.log('Getting plant detail:', pid);

      const app = this.homey.app as any;
      
      // Use cached data when possible
      const detail = await app.getCachedPlantDetail(pid);

      if (!detail) {
        throw new Error('Failed to load plant details');
      }

      return detail;
    });

    // Handler: Select plant for pairing (called from search.html)
    session.setHandler('selectPlant', async (plant: PlantDetail): Promise<void> => {
      this.selectedPlant = plant;
      this.log('Plant selected:', plant.pid, plant.display_pid);
    });

    // Handler: Get the currently selected plant (called from configure.html)
    session.setHandler('getSelectedPlant', async (): Promise<PlantDetail | null> => {
      return this.selectedPlant;
    });

    // Handler: Get available sensor devices for linking (called from sensors.html)
    session.setHandler('getAvailableDevices', async (): Promise<any[]> => {
      const devices = await this.homey.devices.getDevices();
      
      return Object.values(devices).map((device: any) => ({
        id: device.id,
        name: device.name,
        capabilities: Object.keys(device.capabilitiesObj || {}),
        zone: device.zone?.name || 'Unknown',
      }));
    });

    // Handler: Standard Homey handler - list devices to add
    session.setHandler('list_devices', async () => {
      if (!this.selectedPlant) {
        throw new Error('No plant selected. Please go back and select a plant.');
      }

      // Create unique device ID
      const deviceId = `plant_${this.selectedPlant.pid.replace(/\s+/g, '_')}_${Date.now()}`;

      return [
        {
          name: this.selectedPlant.display_pid || this.selectedPlant.alias || this.selectedPlant.pid,
          data: {
            id: deviceId,
          },
          settings: {
            pid: this.selectedPlant.pid,
            scientific_name: this.selectedPlant.pid,
          },
          store: {
            plantData: this.selectedPlant,
          },
        },
      ];
    });

    // Handler: Called when pairing view changes
    session.setHandler('showView', async (viewId: string) => {
      this.log('Pairing view changed to:', viewId);
      
      // Reset selected plant if going back to search
      if (viewId === 'search') {
        this.selectedPlant = null;
      }
    });
  }

  async onRepair(session: Homey.Driver.PairSession, device: Homey.Device) {
    // Handle device repair (re-pairing)
    this.log('Repairing device:', device.getName());
    
    session.setHandler('getPlantDetail', async (pid: string) => {
      const app = this.homey.app as any;
      return await app.getCachedPlantDetail(pid);
    });
  }
}

module.exports = PlantDriver;
```

> **Key Points:**
> - Handler names are custom and called from HTML views via `Homey.emit('handlerName', data)`
> - `list_devices` is the standard Homey handler that returns devices to add
> - `showView` is called when navigating between pairing views
> - Store plant data in device `store` for persistence

#### Step 2.3: Create Device Class (`drivers/plant/device.ts`)

```typescript
import { Homey } from 'homey';

class PlantDevice extends Homey.Device {
  private plantData: any = null;

  async onInit() {
    this.log('Plant device initialized:', this.getName());

    const pid = this.getSetting('pid');
    if (pid) {
      await this.refreshPlantData();
    }
  }

  async refreshPlantData() {
    const pid = this.getSetting('pid');
    if (!pid) {
      this.log('No PID configured');
      return;
    }

    try {
      const app = this.homey.app as any;
      const client = app.getPlantbookClient();

      if (!client) {
        this.log('Plantbook client not available');
        return;
      }

      this.plantData = await client.getPlantDetail(pid);

      // Update optimal range capabilities
      await this.setCapabilityValue('optimal_soil_moisture_min', this.plantData.min_soil_moist);
      await this.setCapabilityValue('optimal_soil_moisture_max', this.plantData.max_soil_moist);
      await this.setCapabilityValue('optimal_temperature_min', this.plantData.min_temp);
      await this.setCapabilityValue('optimal_temperature_max', this.plantData.max_temp);
      await this.setCapabilityValue('optimal_humidity_min', this.plantData.min_env_humid);
      await this.setCapabilityValue('optimal_humidity_max', this.plantData.max_env_humid);
      await this.setCapabilityValue('optimal_light_min', this.plantData.min_light_lux);
      await this.setCapabilityValue('optimal_light_max', this.plantData.max_light_lux);

      // Update device name if needed
      if (this.plantData.display_pid && this.getName() !== this.plantData.display_pid) {
        await this.setName(this.plantData.display_pid);
      }

      this.log('Plant data refreshed:', this.plantData.display_pid);
    } catch (error) {
      this.error('Failed to refresh plant data:', error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: any) {
    if (changedKeys.includes('pid')) {
      await this.refreshPlantData();
    }
  }
}

module.exports = PlantDevice;
```

#### Step 2.4: Create Pairing Template - Search (`drivers/plant/pair/search.html`)

> **Note**: Homey pairing templates use `Homey.emit(handlerName, data)` to call session handlers defined in `driver.ts`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Search Plant</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: var(--homey-background-color, #fff);
      color: var(--homey-text-color, #333);
    }
    .search-container {
      margin-bottom: 20px;
    }
    input[type="text"] {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid var(--homey-border-color, #ddd);
      border-radius: 8px;
      box-sizing: border-box;
      background: var(--homey-input-background, #fff);
      color: var(--homey-text-color, #333);
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--homey-primary-color, #007bff);
    }
    .results {
      max-height: 400px;
      overflow-y: auto;
    }
    .plant-item {
      padding: 15px;
      border: 1px solid var(--homey-border-color, #ddd);
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    .plant-item:hover {
      background-color: var(--homey-hover-background, #f5f5f5);
      transform: translateX(2px);
    }
    .plant-item.selected {
      border-color: var(--homey-primary-color, #007bff);
      background-color: var(--homey-selected-background, #e3f2fd);
    }
    .plant-name {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .plant-pid {
      color: var(--homey-secondary-text-color, #666);
      font-size: 14px;
    }
    .loading {
      text-align: center;
      padding: 40px 20px;
      color: var(--homey-secondary-text-color, #666);
    }
    .loading::after {
      content: '';
      animation: dots 1.5s infinite;
    }
    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
    .error {
      color: #d32f2f;
      padding: 12px;
      background-color: #ffebee;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .hint {
      text-align: center;
      color: var(--homey-secondary-text-color, #888);
      padding: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="search-container">
    <input type="text" id="search-input" placeholder="Search for a plant (e.g., Monstera, Snake Plant)" autofocus>
  </div>
  <div id="error-container"></div>
  <div id="results-container" class="results">
    <div class="hint">Enter a plant name to search the Open Plantbook database</div>
  </div>

  <script>
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const errorContainer = document.getElementById('error-container');
    let searchTimeout;

    // Focus search input on load
    searchInput.focus();

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        resultsContainer.innerHTML = '<div class="hint">Enter at least 2 characters to search</div>';
        return;
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 500); // Debounce 500ms
    });

    async function performSearch(query) {
      resultsContainer.innerHTML = '<div class="loading">Searching</div>';
      errorContainer.innerHTML = '';

      try {
        // Call session handler defined in driver.ts
        const results = await Homey.emit('searchPlants', query);
        
        if (!results || results.length === 0) {
          resultsContainer.innerHTML = '<div class="hint">No plants found. Try a different search term.</div>';
          return;
        }

        resultsContainer.innerHTML = results.map(plant => `
          <div class="plant-item" data-pid="${escapeHtml(plant.pid)}">
            <div class="plant-name">${escapeHtml(plant.display_pid || plant.alias)}</div>
            <div class="plant-pid">${escapeHtml(plant.pid)}</div>
          </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.plant-item').forEach(item => {
          item.addEventListener('click', async () => {
            const pid = item.dataset.pid;
            
            // Visual feedback
            document.querySelectorAll('.plant-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            try {
              // Get full plant details
              const detail = await Homey.emit('getPlantDetail', pid);
              
              // Store selected plant in session
              await Homey.emit('selectPlant', detail);
              
              // Navigate to next view (configure)
              await Homey.nextView();
            } catch (error) {
              showError('Failed to load plant details: ' + (error.message || error));
            }
          });
        });
      } catch (error) {
        showError('Search failed: ' + (error.message || error));
        resultsContainer.innerHTML = '<div class="hint">Search failed. Please try again.</div>';
      }
    }

    function showError(message) {
      errorContainer.innerHTML = `<div class="error">${message}</div>`;
      setTimeout(() => {
        errorContainer.innerHTML = '';
      }, 5000);
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }
  </script>
</body>
</html>
```

#### Step 2.5: Create Pairing Template - Configure (`drivers/plant/pair/configure.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Configure Plant</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: var(--homey-background-color, #fff);
      color: var(--homey-text-color, #333);
    }
    .plant-info {
      text-align: center;
      margin-bottom: 30px;
    }
    .plant-image {
      width: 180px;
      height: 180px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .plant-image.placeholder {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
    }
    .plant-name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .plant-pid {
      color: var(--homey-secondary-text-color, #666);
      font-size: 14px;
      font-style: italic;
    }
    .ranges {
      background-color: var(--homey-card-background, #f5f5f5);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .ranges h3 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 16px;
      color: var(--homey-text-color, #333);
    }
    .range-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .range-item {
      background: var(--homey-background-color, #fff);
      padding: 12px;
      border-radius: 8px;
    }
    .range-label {
      font-weight: 500;
      margin-bottom: 4px;
      font-size: 12px;
      color: var(--homey-secondary-text-color, #888);
      text-transform: uppercase;
    }
    .range-value {
      font-size: 16px;
      font-weight: 600;
    }
    .range-icon {
      margin-right: 6px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: var(--homey-secondary-text-color, #666);
    }
    .error {
      color: #d32f2f;
      padding: 12px;
      background-color: #ffebee;
      border-radius: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="loading">Loading plant details...</div>
  </div>

  <script>
    (async () => {
      const content = document.getElementById('content');
      
      try {
        // Get selected plant from session (stored when user clicked plant in search)
        const plant = await Homey.emit('getSelectedPlant');
        
        if (!plant) {
          content.innerHTML = '<div class="error">No plant selected. Please go back and select a plant.</div>';
          return;
        }

        // Build the UI
        content.innerHTML = `
          <div class="plant-info">
            ${plant.image_url 
              ? `<img class="plant-image" src="${escapeHtml(plant.image_url)}" alt="${escapeHtml(plant.display_pid)}" onerror="this.classList.add('placeholder'); this.innerHTML='🌱'; this.onerror=null;">`
              : `<div class="plant-image placeholder">🌱</div>`
            }
            <div class="plant-name">${escapeHtml(plant.display_pid || plant.alias)}</div>
            <div class="plant-pid">${escapeHtml(plant.pid)}</div>
          </div>

          <div class="ranges">
            <h3>Optimal Care Ranges</h3>
            <div class="range-grid">
              <div class="range-item">
                <div class="range-label"><span class="range-icon">💧</span>Soil Moisture</div>
                <div class="range-value">${plant.min_soil_moist}% - ${plant.max_soil_moist}%</div>
              </div>
              <div class="range-item">
                <div class="range-label"><span class="range-icon">🌡️</span>Temperature</div>
                <div class="range-value">${plant.min_temp}°C - ${plant.max_temp}°C</div>
              </div>
              <div class="range-item">
                <div class="range-label"><span class="range-icon">💨</span>Humidity</div>
                <div class="range-value">${plant.min_env_humid}% - ${plant.max_env_humid}%</div>
              </div>
              <div class="range-item">
                <div class="range-label"><span class="range-icon">☀️</span>Light</div>
                <div class="range-value">${formatLux(plant.min_light_lux)} - ${formatLux(plant.max_light_lux)}</div>
              </div>
            </div>
          </div>
        `;
        
      } catch (error) {
        console.error('Failed to load plant:', error);
        content.innerHTML = `<div class="error">Failed to load plant details: ${escapeHtml(error.message || error)}</div>`;
      }
    })();

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function formatLux(lux) {
      if (lux >= 10000) {
        return Math.round(lux / 1000) + 'k lux';
      }
      return lux + ' lux';
    }
  </script>
</body>
</html>
```

### Testing Checklist

- [ ] Driver appears in Homey's "Add Device" flow
- [ ] Search page loads and accepts input
- [ ] Search returns results from Plantbook API
- [ ] Plant selection works
- [ ] Configure page displays plant information
- [ ] Device is created with correct PID
- [ ] Device capabilities are set with optimal ranges
- [ ] Device card displays plant information

### Checkpoint

At the end of Phase 2, you should be able to:
- Search for plants in the pairing flow
- Select a plant and see its details
- Create a plant device with optimal ranges displayed
- View the plant device in Homey's device list

---

## Phase 3: Sensor Linking & Subscriptions

**Duration**: 1 week  
**Priority**: High  
**Dependencies**: Phase 2

### Objectives

- Add sensor linking settings to plant device
- Subscribe to sensor capability changes
- Update plant device capabilities with sensor readings
- Handle multiple sensors per plant

### Files to Modify/Create

```
/drivers/plant/
├── device.ts (MODIFY)
└── driver.compose.json (MODIFY - add sensor settings)
```

### Implementation Steps

#### Step 3.1: Update Driver Compose - Add Sensor Settings

Add to `drivers/plant/driver.compose.json`:

```json
{
  "settings": [
    // ... existing settings ...
    {
      "type": "group",
      "label": {
        "en": "Linked Sensors"
      },
      "children": [
        {
          "id": "sensor_soil_moisture",
          "type": "text",
          "label": {
            "en": "Soil Moisture Sensor"
          },
          "hint": {
            "en": "Device ID:capability (e.g., abc123:measure_soil_moisture)"
          }
        },
        {
          "id": "sensor_temperature",
          "type": "text",
          "label": {
            "en": "Temperature Sensor"
          },
          "hint": {
            "en": "Device ID:capability"
          }
        },
        {
          "id": "sensor_humidity",
          "type": "text",
          "label": {
            "en": "Humidity Sensor"
          },
          "hint": {
            "en": "Device ID:capability"
          }
        },
        {
          "id": "sensor_light",
          "type": "text",
          "label": {
            "en": "Light Sensor"
          },
          "hint": {
            "en": "Device ID:capability"
          }
        }
      ]
    }
  ]
}
```

#### Step 3.2: Update Device Class - Add Sensor Subscriptions

Modify `drivers/plant/device.ts`:

> **⚠️ IMPORTANT**: This implementation uses the device store (not settings) for sensor links,
> and properly handles the Homey API for device capability subscriptions.

```typescript
import Homey from 'homey';
import { PlantDetail } from '../../lib/PlantbookTypes';

interface LinkedSensor {
  deviceId: string;
  capability: string;
  type: string;
}

interface LinkedController {
  deviceId: string;
  capability: string;
  type: string;
}

class PlantDevice extends Homey.Device {
  private plantData: PlantDetail | null = null;
  private linkedSensors: Map<string, LinkedSensor> = new Map();
  private linkedControllers: Map<string, LinkedController> = new Map();
  private capabilityInstances: Map<string, any> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  async onInit() {
    this.log('Plant device initialized:', this.getName());

    // Load plant data (with caching)
    const pid = this.getSetting('pid');
    if (pid) {
      await this.refreshPlantData();
    }

    // Set up sensor subscriptions
    await this.setupSensorLinks();
    
    // Set up controller links
    await this.setupControllerLinks();

    // Listen for device deletions (linked sensors being removed)
    this.homey.devices.on('device.delete', (device: any) => {
      this.handleDeviceDeleted(device);
    });

    // Start polling for sensor updates (fallback for devices that don't emit events)
    this.startPolling();
  }

  /**
   * Refresh plant data from API (with caching)
   */
  async refreshPlantData(): Promise<void> {
    const pid = this.getSetting('pid');
    if (!pid) {
      this.log('No PID configured');
      return;
    }

    try {
      const app = this.homey.app as any;
      
      // Use cached data when possible
      this.plantData = await app.getCachedPlantDetail(pid);
      
      if (!this.plantData) {
        this.error('Failed to load plant data');
        return;
      }

      // Update optimal range capabilities
      await this.setCapabilityValue('optimal_soil_moisture_min', this.plantData.min_soil_moist).catch(this.error);
      await this.setCapabilityValue('optimal_soil_moisture_max', this.plantData.max_soil_moist).catch(this.error);
      await this.setCapabilityValue('optimal_temperature_min', this.plantData.min_temp).catch(this.error);
      await this.setCapabilityValue('optimal_temperature_max', this.plantData.max_temp).catch(this.error);
      await this.setCapabilityValue('optimal_humidity_min', this.plantData.min_env_humid).catch(this.error);
      await this.setCapabilityValue('optimal_humidity_max', this.plantData.max_env_humid).catch(this.error);
      await this.setCapabilityValue('optimal_light_min', this.plantData.min_light_lux).catch(this.error);
      await this.setCapabilityValue('optimal_light_max', this.plantData.max_light_lux).catch(this.error);

      this.log('Plant data refreshed:', this.plantData.display_pid);
    } catch (error) {
      this.error('Failed to refresh plant data:', error);
    }
  }

  /**
   * Set up listeners for all linked sensors using device store
   */
  async setupSensorLinks(): Promise<void> {
    const sensorTypes = ['soil_moisture', 'temperature', 'humidity', 'light'];

    for (const type of sensorTypes) {
      // Use device store for sensor links (more reliable than settings for complex data)
      const linkString = this.getStoreValue(`sensor_${type}`) || this.getSetting(`sensor_${type}`);
      if (!linkString) continue;

      const parts = linkString.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        this.log(`Invalid sensor link format for ${type}: ${linkString}`);
        continue;
      }

      const [deviceId, capability] = parts;
      this.linkedSensors.set(type, { deviceId, capability, type });
      await this.subscribeToSensor(deviceId, capability, type);
    }

    this.log(`Set up ${this.linkedSensors.size} sensor links`);
  }

  /**
   * Subscribe to a sensor's capability changes
   * 
   * NOTE: Homey SDK doesn't support direct capability event subscriptions on other devices.
   * We use makeCapabilityInstance for our own capabilities, and polling for external devices.
   */
  async subscribeToSensor(deviceId: string, capability: string, type: string): Promise<void> {
    try {
      // Get the device from Homey's device manager
      const devices = await this.homey.devices.getDevices();
      const device = Object.values(devices).find((d: any) => d.id === deviceId);
      
      if (!device) {
        this.error(`Device not found: ${deviceId}`);
        return;
      }

      // Get initial value
      const capabilityObj = (device as any).capabilitiesObj?.[capability];
      const initialValue = capabilityObj?.value;
      
      if (initialValue !== null && initialValue !== undefined) {
        await this.onSensorReading(type, initialValue, deviceId);
      }

      // Store the subscription info for polling
      this.capabilityInstances.set(`${deviceId}:${capability}`, {
        deviceId,
        capability,
        type,
        lastValue: initialValue,
      });

      this.log(`Subscribed to ${deviceId}:${capability} for ${type} (initial: ${initialValue})`);
    } catch (error) {
      this.error(`Failed to subscribe to sensor ${deviceId}:`, error);
    }
  }

  /**
   * Start polling for sensor updates
   * This is a fallback since we can't directly subscribe to other devices' capability changes
   */
  private startPolling(): void {
    // Poll every 30 seconds
    this.pollingInterval = setInterval(async () => {
      await this.pollSensorValues();
    }, 30000);
  }

  /**
   * Poll all linked sensors for updated values
   */
  private async pollSensorValues(): Promise<void> {
    const devices = await this.homey.devices.getDevices();
    
    for (const [key, instance] of this.capabilityInstances) {
      try {
        const device = Object.values(devices).find((d: any) => d.id === instance.deviceId);
        if (!device) continue;

        const capabilityObj = (device as any).capabilitiesObj?.[instance.capability];
        const currentValue = capabilityObj?.value;

        // Only update if value changed
        if (currentValue !== instance.lastValue && currentValue !== null && currentValue !== undefined) {
          instance.lastValue = currentValue;
          await this.onSensorReading(instance.type, currentValue, instance.deviceId);
        }
      } catch (error) {
        this.error(`Error polling ${key}:`, error);
      }
    }
  }

  /**
   * Handle incoming sensor reading
   */
  async onSensorReading(type: string, value: number, deviceId: string): Promise<void> {
    this.log(`Sensor reading: ${type} = ${value} from ${deviceId}`);

    // Map sensor type to capability
    const capabilityMap: Record<string, string> = {
      'soil_moisture': 'measure_soil_moisture',
      'temperature': 'measure_temperature',
      'humidity': 'measure_humidity',
      'light': 'measure_luminance',
    };

    const capability = capabilityMap[type];
    if (capability && this.hasCapability(capability)) {
      await this.setCapabilityValue(capability, value).catch(this.error);
    }

    // Check thresholds and update alarms
    await this.checkThresholds(type, value);

    // Recalculate health score
    await this.calculateHealthScore();

    // Run automations
    await this.runAutomations(type, value);

    // Trigger flow card for sensor update
    await this.homey.flow.getDeviceTriggerCard('plant_sensor_updated')
      .trigger(this, { sensor_type: type, value })
      .catch(this.error);
  }

  /**
   * Handle a linked device being deleted
   */
  private handleDeviceDeleted(device: any): void {
    const deviceId = device?.id || device?.getData?.()?.id;
    if (!deviceId) return;

    // Check if this device was a linked sensor
    for (const [type, sensor] of this.linkedSensors) {
      if (sensor.deviceId === deviceId) {
        this.log(`Linked sensor ${type} (${deviceId}) was deleted`);
        this.linkedSensors.delete(type);
        this.capabilityInstances.delete(`${deviceId}:${sensor.capability}`);
        
        // Clear the store value
        this.setStoreValue(`sensor_${type}`, null).catch(this.error);
      }
    }

    // Check if this device was a linked controller
    for (const [type, controller] of this.linkedControllers) {
      if (controller.deviceId === deviceId) {
        this.log(`Linked controller ${type} (${deviceId}) was deleted`);
        this.linkedControllers.delete(type);
        
        // Clear the store value
        this.setStoreValue(`controller_${type}`, null).catch(this.error);
      }
    }
  }

  /**
   * Unsubscribe from a sensor
   */
  async unsubscribeFromSensor(deviceId: string, capability: string): Promise<void> {
    const key = `${deviceId}:${capability}`;
    if (this.capabilityInstances.has(key)) {
      this.capabilityInstances.delete(key);
      this.log(`Unsubscribed from ${key}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: {
    oldSettings: Record<string, any>;
    newSettings: Record<string, any>;
    changedKeys: string[];
  }): Promise<void> {
    if (changedKeys.includes('pid')) {
      await this.refreshPlantData();
    }

    // Re-setup sensors if sensor links changed
    const sensorKeys = changedKeys.filter((k: string) => k.startsWith('sensor_'));
    if (sensorKeys.length > 0) {
      // Clear existing subscriptions
      this.capabilityInstances.clear();
      this.linkedSensors.clear();

      // Also save to store for persistence
      for (const key of sensorKeys) {
        await this.setStoreValue(key, newSettings[key]).catch(this.error);
      }

      await this.setupSensorLinks();
    }

    // Re-setup controllers if controller links changed
    const controllerKeys = changedKeys.filter((k: string) => k.startsWith('controller_'));
    if (controllerKeys.length > 0) {
      this.linkedControllers.clear();
      
      for (const key of controllerKeys) {
        await this.setStoreValue(key, newSettings[key]).catch(this.error);
      }
      
      await this.setupControllerLinks();
    }
  }

  async onDeleted(): Promise<void> {
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Clean up
    this.capabilityInstances.clear();
    this.linkedSensors.clear();
    this.linkedControllers.clear();
    
    this.log('Plant device deleted');
  }

  // Placeholder methods - implemented in later phases
  async checkThresholds(type: string, value: number): Promise<void> {
    // Implemented in Phase 5
  }

  async calculateHealthScore(): Promise<void> {
    // Implemented in Phase 4
  }

  async runAutomations(type: string, value: number): Promise<void> {
    // Implemented in Phase 6
  }

  async setupControllerLinks(): Promise<void> {
    // Implemented in Phase 6
  }

  async triggerWatering(duration?: number): Promise<void> {
    // Implemented in Phase 6
  }
}

module.exports = PlantDevice;
```

> **Key Changes from Original Plan:**
> 
> 1. **Device Store vs Settings**: Sensor links are stored in device store (`setStoreValue`/`getStoreValue`) for reliability
> 2. **Polling Instead of Events**: Homey doesn't support subscribing to other devices' capability changes directly, so we use polling
> 3. **Device Deletion Handling**: Added listener for when linked devices are deleted
> 4. **Cached Plant Data**: Uses `getCachedPlantDetail` from app to reduce API calls
> 5. **Proper Typing**: Added TypeScript interfaces for better type safety

#### Step 3.3: Add Capabilities to Driver Compose

Add to `drivers/plant/driver.compose.json` capabilities array:

```json
{
  "capabilities": [
    "plant_health_score",
    "optimal_soil_moisture_min",
    "optimal_soil_moisture_max",
    "optimal_temperature_min",
    "optimal_temperature_max",
    "optimal_humidity_min",
    "optimal_humidity_max",
    "optimal_light_min",
    "optimal_light_max",
    "measure_soil_moisture",
    "measure_temperature",
    "measure_humidity",
    "measure_luminance"
  ]
}
```

### Testing Checklist

- [ ] Sensor links can be configured in device settings
- [ ] Device subscribes to linked sensor capabilities
- [ ] Sensor readings update plant device capabilities
- [ ] Multiple sensors can be linked to one plant
- [ ] Sensor links can be changed/removed
- [ ] Listeners are cleaned up when device is deleted
- [ ] Flow trigger fires when sensor reading updates

### Checkpoint

At the end of Phase 3, you should be able to:
- Link multiple sensors to a plant device
- See sensor readings reflected in the plant device
- Change sensor links dynamically
- Receive flow triggers when sensors update

---

## Phase 4: Health Score Calculation

**Duration**: 3 days  
**Priority**: High  
**Dependencies**: Phase 3

### Objectives

- Implement weighted health score calculation
- Update health score when sensor readings change
- Trigger flow cards on significant health changes

### Files to Modify

```
/drivers/plant/
└── device.ts (MODIFY - add health calculation)
```

### Implementation Steps

#### Step 4.1: Add Health Score Capability

Ensure `plant_health_score` is in driver.compose.json capabilities.

#### Step 4.2: Implement Health Calculation

Add to `drivers/plant/device.ts`:

```typescript
/**
 * Calculate overall plant health score (0-100)
 */
async calculateHealthScore() {
  if (!this.plantData) {
    await this.setCapabilityValue('plant_health_score', null).catch(this.error);
    return;
  }

  const factors: Array<{
    value: number | null;
    min: number;
    max: number;
    weight: number;
  }> = [
    {
      value: this.getCapabilityValue('measure_soil_moisture'),
      min: this.plantData.min_soil_moist,
      max: this.plantData.max_soil_moist,
      weight: 0.35, // Soil moisture is most critical
    },
    {
      value: this.getCapabilityValue('measure_temperature'),
      min: this.plantData.min_temp,
      max: this.plantData.max_temp,
      weight: 0.25,
    },
    {
      value: this.getCapabilityValue('measure_humidity'),
      min: this.plantData.min_env_humid,
      max: this.plantData.max_env_humid,
      weight: 0.20,
    },
    {
      value: this.getCapabilityValue('measure_luminance'),
      min: this.plantData.min_light_lux,
      max: this.plantData.max_light_lux,
      weight: 0.20,
    },
  ];

  let totalWeight = 0;
  let weightedScore = 0;

  for (const factor of factors) {
    if (factor.value === null || factor.value === undefined) continue;

    totalWeight += factor.weight;

    // Calculate how "in range" this value is
    const range = factor.max - factor.min;
    const midpoint = factor.min + range / 2;

    let score: number;
    if (factor.value >= factor.min && factor.value <= factor.max) {
      // In range: score based on how close to midpoint
      const distanceFromMid = Math.abs(factor.value - midpoint);
      score = 100 - (distanceFromMid / (range / 2)) * 20; // Max 20% penalty
    } else {
      // Out of range: score decreases with distance
      const distanceFromRange =
        factor.value < factor.min
          ? factor.min - factor.value
          : factor.value - factor.max;
      score = Math.max(0, 80 - (distanceFromRange / (range * 0.5)) * 80);
    }

    weightedScore += score * factor.weight;
  }

  const healthScore =
    totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null;

  const previousScore = this.getCapabilityValue('plant_health_score');
  await this.setCapabilityValue('plant_health_score', healthScore).catch(
    this.error
  );

  // Trigger flow if health changed significantly
  if (
    previousScore !== null &&
    healthScore !== null &&
    Math.abs(healthScore - previousScore) >= 5
  ) {
    await this.homey.flow
      .getDeviceTriggerCard('plant_health_changed')
      .trigger(this, {
        health_score: healthScore,
        previous_score: previousScore,
      })
      .catch(this.error);
  }
}

// Call this from onSensorReading:
async onSensorReading(type: string, value: number, deviceId: string) {
  // ... existing code ...
  
  // Recalculate overall health
  await this.calculateHealthScore();
}
```

### Testing Checklist

- [ ] Health score calculates correctly when all sensors are in range
- [ ] Health score decreases when sensors go out of range
- [ ] Health score updates when sensor readings change
- [ ] Flow trigger fires when health changes by 5+ points
- [ ] Health score is null when no sensors are linked
- [ ] Weighted calculation gives more importance to soil moisture

### Checkpoint

At the end of Phase 4, you should be able to:
- See a health score (0-100) on the plant device
- Watch the score update as sensor readings change
- Receive flow triggers when health changes significantly

---

## Phase 5: Alarm Capabilities & Triggers

**Duration**: 3 days  
**Priority**: Medium  
**Dependencies**: Phase 4

### Objectives

- Add alarm capabilities for out-of-range conditions
- Check thresholds and update alarms
- Create flow trigger cards for alarms

### Files to Create/Modify

```
/drivers/plant/
├── device.ts (MODIFY - add threshold checking)
└── driver.compose.json (MODIFY - add alarm capabilities)

/.homeycompose/
└── capabilities/
    ├── alarm_needs_water.json
    ├── alarm_overwatered.json
    ├── alarm_too_cold.json
    ├── alarm_too_hot.json
    ├── alarm_low_humidity.json
    ├── alarm_low_light.json
    └── alarm_too_bright.json
```

### Implementation Steps

#### Step 5.1: Create Alarm Capabilities

Create `.homeycompose/capabilities/alarm_needs_water.json`:

```json
{
  "type": "boolean",
  "title": {
    "en": "Needs Water"
  },
  "getable": true,
  "setable": false,
  "insights": false
}
```

Repeat for other alarms (alarm_overwatered, alarm_too_cold, etc.)

#### Step 5.2: Add Threshold Checking

Add to `drivers/plant/device.ts`:

```typescript
/**
 * Check value against plant's optimal thresholds
 */
async checkThresholds(type: string, value: number) {
  if (!this.plantData) return;

  const thresholds: Record<
    string,
    {
      min: number;
      max: number;
      alarmLow: string;
      alarmHigh: string;
    }
  > = {
    soil_moisture: {
      min: this.plantData.min_soil_moist,
      max: this.plantData.max_soil_moist,
      alarmLow: 'alarm_needs_water',
      alarmHigh: 'alarm_overwatered',
    },
    temperature: {
      min: this.plantData.min_temp,
      max: this.plantData.max_temp,
      alarmLow: 'alarm_too_cold',
      alarmHigh: 'alarm_too_hot',
    },
    humidity: {
      min: this.plantData.min_env_humid,
      max: this.plantData.max_env_humid,
      alarmLow: 'alarm_low_humidity',
      alarmHigh: '', // No "too humid" alarm typically
    },
    light: {
      min: this.plantData.min_light_lux,
      max: this.plantData.max_light_lux,
      alarmLow: 'alarm_low_light',
      alarmHigh: 'alarm_too_bright',
    },
  };

  const threshold = thresholds[type];
  if (!threshold) return;

  const tooLow = value < threshold.min;
  const tooHigh = value > threshold.max;

  if (threshold.alarmLow && this.hasCapability(threshold.alarmLow)) {
    await this.setCapabilityValue(threshold.alarmLow, tooLow).catch(
      this.error
    );

    if (tooLow) {
      await this.homey.flow
        .getDeviceTriggerCard(`plant_${type}_alert`)
        .trigger(this, {
          value,
          status: 'low',
          min: threshold.min,
          max: threshold.max,
        })
        .catch(this.error);
    }
  }

  if (threshold.alarmHigh && this.hasCapability(threshold.alarmHigh)) {
    await this.setCapabilityValue(threshold.alarmHigh, tooHigh).catch(
      this.error
    );

    if (tooHigh) {
      await this.homey.flow
        .getDeviceTriggerCard(`plant_${type}_alert`)
        .trigger(this, {
          value,
          status: 'high',
          min: threshold.min,
          max: threshold.max,
        })
        .catch(this.error);
    }
  }
}

// Call from onSensorReading:
async onSensorReading(type: string, value: number, deviceId: string) {
  // ... existing code ...
  
  // Check against optimal ranges and update alarms
  await this.checkThresholds(type, value);
}
```

### Testing Checklist

- [ ] Alarms activate when values go below minimum
- [ ] Alarms activate when values go above maximum
- [ ] Alarms deactivate when values return to range
- [ ] Flow triggers fire when alarms activate
- [ ] Multiple alarms can be active simultaneously

### Checkpoint

At the end of Phase 5, you should be able to:
- See alarm states on the plant device
- Receive flow triggers when conditions go out of range
- Use alarms in automations

---

## Phase 6: Controller Linking & Auto-Water

**Duration**: 1 week  
**Priority**: Medium  
**Dependencies**: Phase 5

### Objectives

- Add controller linking settings
- Implement auto-watering functionality
- Add auto-light control
- Create controller action flow cards

### Files to Modify/Create

```
/drivers/plant/
├── device.ts (MODIFY - add controller logic)
└── driver.compose.json (MODIFY - add controller settings)
```

### Implementation Steps

#### Step 6.1: Add Controller Settings

Add to `drivers/plant/driver.compose.json`:

```json
{
  "settings": [
    // ... existing settings ...
    {
      "type": "group",
      "label": {
        "en": "Linked Controllers"
      },
      "children": [
        {
          "id": "controller_water",
          "type": "text",
          "label": {
            "en": "Water Pump/Valve"
          },
          "hint": {
            "en": "Device ID for watering control"
          }
        },
        {
          "id": "controller_light",
          "type": "text",
          "label": {
            "en": "Grow Light"
          },
          "hint": {
            "en": "Device ID for supplemental lighting"
          }
        }
      ]
    },
    {
      "type": "group",
      "label": {
        "en": "Automation"
      },
      "children": [
        {
          "id": "auto_water_enabled",
          "type": "checkbox",
          "label": {
            "en": "Auto-water when dry"
          },
          "value": false
        },
        {
          "id": "auto_water_duration",
          "type": "number",
          "label": {
            "en": "Watering duration (seconds)"
          },
          "value": 10,
          "min": 1,
          "max": 300
        },
        {
          "id": "auto_light_enabled",
          "type": "checkbox",
          "label": {
            "en": "Auto-supplement when light is low"
          },
          "value": false
        }
      ]
    }
  ]
}
```

#### Step 6.2: Implement Controller Logic

Add to `drivers/plant/device.ts`:

```typescript
interface LinkedController {
  deviceId: string;
  capability: string;
  type: string;
}

class PlantDevice extends Homey.Device {
  private linkedControllers: Map<string, LinkedController> = new Map();

  async setupControllerLinks() {
    const controllerTypes = ['water', 'light'];

    for (const type of controllerTypes) {
      const deviceId = this.getSetting(`controller_${type}`);
      if (!deviceId) continue;

      const capability = 'onoff'; // Most controllers use on/off
      this.linkedControllers.set(type, { deviceId, capability, type });
    }

    this.log(`Set up ${this.linkedControllers.size} controller links`);
  }

  async runAutomations(type: string, value: number) {
    if (!this.plantData) return;

    // Auto-water
    if (
      type === 'soil_moisture' &&
      this.getSetting('auto_water_enabled')
    ) {
      if (value < this.plantData.min_soil_moist) {
        await this.triggerWatering();
      }
    }

    // Auto-light
    if (type === 'light' && this.getSetting('auto_light_enabled')) {
      const controllerLink = this.linkedControllers.get('light');
      if (controllerLink && value < this.plantData.min_light_lux) {
        await this.setControllerState('light', true);
      } else if (
        controllerLink &&
        value > this.plantData.max_light_lux
      ) {
        await this.setControllerState('light', false);
      }
    }
  }

  async triggerWatering() {
    const waterController = this.linkedControllers.get('water');
    if (!waterController) return;

    const duration = this.getSetting('auto_water_duration') || 10;

    this.log(`Auto-watering for ${duration} seconds`);

    try {
      await this.setControllerState('water', true);

      setTimeout(async () => {
        await this.setControllerState('water', false);
      }, duration * 1000);

      await this.homey.flow
        .getDeviceTriggerCard('plant_auto_watered')
        .trigger(this, { duration })
        .catch(this.error);
    } catch (error) {
      this.error('Auto-watering failed:', error);
    }
  }

  async setControllerState(type: string, state: boolean) {
    const controller = this.linkedControllers.get(type);
    if (!controller) return;

    try {
      const device = await this.homey.devices.getDevice({
        id: controller.deviceId,
      });
      await device.setCapabilityValue(controller.capability, state);
      this.log(`Set ${type} controller to ${state}`);
    } catch (error) {
      this.error(`Failed to set ${type} controller:`, error);
    }
  }
}
```

### Testing Checklist

- [ ] Controllers can be linked in settings
- [ ] Auto-watering triggers when soil is dry
- [ ] Auto-watering turns off after duration
- [ ] Auto-light turns on when light is low
- [ ] Auto-light turns off when light is sufficient
- [ ] Flow triggers fire when auto-actions occur

### Checkpoint

At the end of Phase 6, you should be able to:
- Link controllers to plant devices
- Enable automatic watering and lighting
- See controllers activate based on sensor readings

---

## Phase 7: Flow Cards

**Duration**: 1 week  
**Priority**: Medium  
**Dependencies**: Phases 5-6

### Objectives

- Create trigger flow cards for plant events
- Create condition flow cards for plant checks
- Create action flow cards for plant control

### Files to Create

```
/.homeycompose/
└── flow/
    ├── triggers/
    │   ├── plant_needs_water.json
    │   ├── plant_overwatered.json
    │   ├── plant_temperature_alert.json
    │   ├── plant_humidity_alert.json
    │   ├── plant_light_alert.json
    │   ├── plant_health_changed.json
    │   ├── plant_auto_watered.json
    │   └── plant_sensor_updated.json
    ├── conditions/
    │   ├── plant_is_healthy.json
    │   ├── plant_needs_attention.json
    │   ├── soil_in_range.json
    │   ├── temp_in_range.json
    │   ├── humidity_in_range.json
    │   ├── light_in_range.json
    │   ├── sensor_is_linked.json
    │   └── controller_is_linked.json
    └── actions/
        ├── water_plant.json
        ├── turn_on_grow_light.json
        ├── turn_off_grow_light.json
        ├── refresh_plant_data.json
        ├── link_sensor.json
        ├── link_controller.json
        └── calculate_health.json
```

### Implementation Steps

#### Step 7.1: Create Trigger Cards

Example: `.homeycompose/flow/triggers/plant_needs_water.json`:

```json
{
  "id": "plant_needs_water",
  "title": {
    "en": "Plant needs water"
  },
  "args": [
    {
      "name": "device",
      "type": "device",
      "filter": "driver_id=plant"
    }
  ],
  "tokens": {
    "plant_name": {
      "type": "string",
      "title": {
        "en": "Plant name"
      }
    },
    "moisture": {
      "type": "number",
      "title": {
        "en": "Current moisture"
      },
      "units": {
        "en": "%"
      }
    },
    "min_moisture": {
      "type": "number",
      "title": {
        "en": "Minimum moisture"
      },
      "units": {
        "en": "%"
      }
    }
  }
}
```

#### Step 7.2: Implement Trigger Handlers

Add to `drivers/plant/device.ts`:

```typescript
// In checkThresholds method, when alarm activates:
if (tooLow && type === 'soil_moisture') {
  await this.homey.flow
    .getDeviceTriggerCard('plant_needs_water')
    .trigger(this, {
      plant_name: this.getName(),
      moisture: value,
      min_moisture: threshold.min,
    })
    .catch(this.error);
}
```

#### Step 7.3: Create Condition Cards

Example: `.homeycompose/flow/conditions/plant_is_healthy.json`:

```json
{
  "id": "plant_is_healthy",
  "title": {
    "en": "Plant health is above"
  },
  "args": [
    {
      "name": "device",
      "type": "device",
      "filter": "driver_id=plant"
    },
    {
      "name": "threshold",
      "type": "number",
      "title": {
        "en": "Health score threshold"
      },
      "min": 0,
      "max": 100
    }
  ]
}
```

Implement in `device.ts`:

```typescript
async onFlowConditionPlantIsHealthy(args: any) {
  const healthScore = this.getCapabilityValue('plant_health_score');
  return healthScore !== null && healthScore >= args.threshold;
}
```

#### Step 7.4: Create Action Cards

Example: `.homeycompose/flow/actions/water_plant.json`:

```json
{
  "id": "water_plant",
  "title": {
    "en": "Water the plant"
  },
  "args": [
    {
      "name": "device",
      "type": "device",
      "filter": "driver_id=plant"
    },
    {
      "name": "duration",
      "type": "number",
      "title": {
        "en": "Duration"
      },
      "min": 1,
      "max": 300,
      "units": {
        "en": "seconds"
      }
    }
  ]
}
```

Implement in `device.ts`:

```typescript
async onFlowActionWaterPlant(args: any) {
  const duration = args.duration || 10;
  await this.setControllerState('water', true);
  
  setTimeout(async () => {
    await this.setControllerState('water', false);
  }, duration * 1000);
  
  return true;
}
```

### Testing Checklist

- [ ] All trigger cards appear in flow editor
- [ ] Triggers fire when conditions are met
- [ ] Condition cards evaluate correctly
- [ ] Action cards execute successfully
- [ ] Tokens are populated correctly in triggers

### Checkpoint

At the end of Phase 7, you should be able to:
- Use plant triggers in automations
- Check plant conditions in flows
- Control plants via flow actions

---

## Phase 8: Enhanced Pairing UI

**Duration**: 3 days  
**Priority**: Medium  
**Dependencies**: Phase 3

### Objectives

- Create sensor selection UI in pairing flow
- Create controller selection UI in pairing flow
- Improve user experience with device pickers

### Files to Create/Modify

```
/drivers/plant/
└── pair/
    ├── sensors.html (NEW)
    └── controllers.html (NEW)
```

### Implementation Steps

#### Step 8.1: Create Sensor Selection UI

Create `drivers/plant/pair/sensors.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Link Sensors</title>
  <style>
    /* Add styling similar to search.html */
  </style>
</head>
<body>
  <h2>Link Sensors to Your Plant</h2>
  
  <div class="sensor-selection">
    <label>Soil Moisture Sensor:</label>
    <select id="soil-moisture">
      <option value="">(No sensor)</option>
      <!-- Populated via JavaScript -->
    </select>
  </div>
  
  <!-- Repeat for other sensors -->
  
  <script>
    // Fetch available devices and populate dropdowns
    // Allow user to select device and capability
  </script>
</body>
</html>
```

#### Step 8.2: Update Driver Pair Handler

Modify `drivers/plant/driver.ts` to handle sensor/controller selection:

```typescript
session.setHandler('get_available_devices', async () => {
  const devices = await this.homey.devices.getDevices();
  return devices.map(d => ({
    id: d.getData().id,
    name: d.getName(),
    capabilities: Object.keys(d.getCapabilitiesObj() || {}),
  }));
});

session.setHandler('save_sensor_links', async (links: any) => {
  // Store links to be used in list_devices
});
```

### Testing Checklist

- [ ] Sensor selection UI loads
- [ ] Available devices are listed
- [ ] Capabilities are selectable
- [ ] Links are saved correctly
- [ ] Controller selection UI works

### Checkpoint

At the end of Phase 8, you should be able to:
- Select sensors during pairing
- Select controllers during pairing
- Complete full pairing flow with all steps

---

## Phase 9: Hobeian Integration Helper

**Duration**: 3 days  
**Priority**: Low  
**Dependencies**: Phase 1 (Plantbook app)

### Objectives

- Create helper class for Hobeian app to detect Plantbook
- Allow Hobeian devices to optionally link to plants
- Provide basic integration without tight coupling

### Files to Create

```
/com.hobeian/
└── lib/
    └── PlantbookIntegration.ts (NEW)
```

### Implementation Steps

#### Step 9.1: Create Integration Helper

Create `com.hobeian/lib/PlantbookIntegration.ts`:

```typescript
import Homey from 'homey';

class PlantbookIntegration {
  private homey: Homey.App;
  private plantbookAppId = 'com.openplantbook';

  constructor(homey: Homey.App) {
    this.homey = homey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const api = await this.homey.api.getApiApp(this.plantbookAppId);
      return api !== null;
    } catch {
      return false;
    }
  }

  async getPlants(): Promise<any[]> {
    if (!(await this.isAvailable())) return [];

    try {
      const api = await this.homey.api.getApiApp(this.plantbookAppId);
      return await api.get('/plants');
    } catch (error) {
      this.homey.error('Failed to get plants:', error);
      return [];
    }
  }

  async checkReading(
    plantDeviceId: string,
    type: 'soil_moisture' | 'temperature' | 'humidity',
    value: number
  ): Promise<any> {
    if (!(await this.isAvailable())) return null;

    try {
      const api = await this.homey.api.getApiApp(this.plantbookAppId);
      return await api.get(`/check/${plantDeviceId}/${type}/${value}`);
    } catch (error) {
      return null;
    }
  }
}

export { PlantbookIntegration };
```

#### Step 9.2: Use in Hobeian Device

Add to `com.hobeian/drivers/zg-303z/device.ts`:

```typescript
import { PlantbookIntegration } from '../../lib/PlantbookIntegration';

class ZG303ZDevice extends ZigBeeDevice {
  private plantbookIntegration: PlantbookIntegration | null = null;

  async onNodeInit() {
    // ... existing code ...
    
    this.plantbookIntegration = new PlantbookIntegration(this.homey.app);
    const isAvailable = await this.plantbookIntegration.isAvailable();
    
    if (isAvailable) {
      this.log('Plantbook app detected');
    }
  }
}
```

### Testing Checklist

- [ ] Hobeian detects Plantbook app when installed
- [ ] Integration works when both apps are installed
- [ ] Hobeian works standalone when Plantbook is not installed
- [ ] No errors when Plantbook app is unavailable

### Checkpoint

At the end of Phase 9, you should be able to:
- Use Hobeian sensors with Plantbook plants
- Have Hobeian work independently
- See enhanced features when both apps are installed

---

## Phase 10: Data Upload to Plantbook

**Duration**: 3 days  
**Priority**: Low  
**Dependencies**: Phase 1, Phase 3

### Objectives

- Implement sensor data upload to Plantbook community
- Create JTS (JSON Time Series) documents
- Schedule periodic uploads

### Files to Modify

```
/lib/
└── PlantbookClient.ts (MODIFY - add upload method)

/drivers/plant/
└── device.ts (MODIFY - add upload logic)
```

### Implementation Steps

#### Step 10.1: Add Upload Method to Client

Add to `lib/PlantbookClient.ts`:

```typescript
async uploadSensorData(
  instanceId: string,
  readings: Array<{
    timestamp: string;
    soil_moisture?: number;
    temperature?: number;
    humidity?: number;
    light_lux?: number;
  }>
): Promise<boolean> {
  await this.authenticate();

  // Create JTS document
  const jtsDoc = {
    // JTS format implementation
  };

  try {
    const response = await fetch(
      `${PLANTBOOK_BASE_URL}/sensor-data/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jtsDoc),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Upload failed:', error);
    return false;
  }
}
```

#### Step 10.2: Implement Upload Scheduling

Add to `drivers/plant/device.ts`:

```typescript
private uploadInterval: NodeJS.Timeout | null = null;

async startDataUpload() {
  if (!this.getSetting('upload_enabled')) return;

  // Upload every hour
  this.uploadInterval = setInterval(async () => {
    await this.uploadCurrentReadings();
  }, 60 * 60 * 1000);
}

async uploadCurrentReadings() {
  // Collect current readings and upload
}
```

### Testing Checklist

- [ ] Data uploads successfully to Plantbook
- [ ] Upload respects privacy settings
- [ ] Upload scheduling works correctly
- [ ] Errors are handled gracefully

### Checkpoint

At the end of Phase 10, you should be able to:
- Optionally share sensor data with Plantbook community
- See data appear in Plantbook's global sensor map

---

## Phase 11: Testing & Polish

**Duration**: 1 week  
**Priority**: High  
**Dependencies**: All previous phases

### Objectives

- Comprehensive testing
- Error handling improvements
- Documentation
- User experience polish

### Testing Areas

1. **Unit Tests**
   - API client methods
   - Health score calculation
   - Threshold checking

2. **Integration Tests**
   - Full pairing flow
   - Sensor linking
   - Controller activation
   - Flow card triggers

3. **Error Handling**
   - Network failures
   - API rate limits
   - Invalid credentials
   - Missing devices
   - Invalid sensor links

4. **User Experience**
   - Clear error messages
   - Loading indicators
   - Helpful hints
   - Documentation

### Files to Create

```
/docs/
├── USER_GUIDE.md
└── API_REFERENCE.md

/README.md (UPDATE)
```

### Final Checklist

- [ ] All phases completed
- [ ] All tests passing
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for release

---

## Appendix

### A. Complete Capability Definitions

All capability JSON files should follow this structure:

```json
{
  "type": "number|boolean",
  "title": {
    "en": "Capability Name"
  },
  "getable": true,
  "setable": false,
  "insights": true|false,
  "units": {
    "en": "unit"
  },
  "min": 0,
  "max": 100
}
```

**Required Custom Capabilities:**

| Capability | Type | Unit | Phase |
|------------|------|------|-------|
| `plant_health_score` | number | % | 2 |
| `optimal_soil_moisture_min` | number | % | 2 |
| `optimal_soil_moisture_max` | number | % | 2 |
| `optimal_temperature_min` | number | °C | 2 |
| `optimal_temperature_max` | number | °C | 2 |
| `optimal_humidity_min` | number | % | 2 |
| `optimal_humidity_max` | number | % | 2 |
| `optimal_light_min` | number | lux | 2 |
| `optimal_light_max` | number | lux | 2 |
| `alarm_needs_water` | boolean | - | 5 |
| `alarm_overwatered` | boolean | - | 5 |
| `alarm_too_cold` | boolean | - | 5 |
| `alarm_too_hot` | boolean | - | 5 |
| `alarm_low_humidity` | boolean | - | 5 |
| `alarm_low_light` | boolean | - | 5 |
| `alarm_too_bright` | boolean | - | 5 |

**Standard Homey Capabilities Used:**

| Capability | Type | Description |
|------------|------|-------------|
| `measure_temperature` | number | Current temperature |
| `measure_humidity` | number | Current humidity |
| `measure_luminance` | number | Current light level |

**Custom Capability from Hobeian (copy):**

| Capability | Type | Description |
|------------|------|-------------|
| `measure_soil_moisture` | number | Current soil moisture |

### B. API Rate Limits

Open Plantbook API has a limit of **200 requests per day** per user (as of November 2025).

**Implementation:**
```typescript
// In PlantbookClient.ts
private requestCount: number = 0;
private requestResetTime: Date = new Date();
private readonly MAX_REQUESTS_PER_DAY = 200;

private checkRateLimit(): void {
  const now = new Date();
  
  // Reset counter daily
  if (now.getDate() !== this.requestResetTime.getDate()) {
    this.requestCount = 0;
    this.requestResetTime = now;
  }
  
  if (this.requestCount >= MAX_REQUESTS_PER_DAY) {
    throw new Error('API rate limit exceeded. Try again tomorrow.');
  }
  
  this.requestCount++;
}
```

**Caching Strategy:**
- Plant data cached for 24 hours
- Cache hit returns immediately (no API call)
- Stale cache returned on API error
- Cache cleared on app restart (acceptable since data doesn't change often)

### C. Error Codes

Common API errors:
- `not_authenticated`: Invalid or missing credentials
- `validation_error`: Invalid request data
- `not_found`: Plant PID not found
- `rate_limit_exceeded`: Too many requests (HTTP 429)

**Error Handling Pattern:**
```typescript
try {
  const result = await client.searchPlants(query);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Show user-friendly message about daily limit
  } else if (error.message.includes('Authentication')) {
    // Prompt to check credentials
  } else {
    // Generic error handling
  }
}
```

### D. Homey API Patterns

**⚠️ Important Corrections:**

1. **Device Capability Subscriptions**: Homey SDK doesn't support subscribing to other devices' capability changes directly. Use polling instead:
   ```typescript
   // WRONG - doesn't work
   device.on('capability.measure_temperature', handler);
   
   // CORRECT - use polling
   setInterval(async () => {
     const value = device.getCapabilityValue('measure_temperature');
     if (value !== lastValue) {
       await handleValueChange(value);
       lastValue = value;
     }
   }, 30000);
   ```

2. **Device Store vs Settings**: Use store for complex/internal data:
   ```typescript
   // Settings - for user-configurable options
   this.getSetting('auto_water_enabled');
   
   // Store - for internal data structures
   this.getStoreValue('sensor_links');
   this.setStoreValue('sensor_links', data);
   ```

3. **Flow Card Registration**: Must be done in `app.ts` `onInit`:
   ```typescript
   async onInit() {
     // Conditions need run listeners
     this.homey.flow.getConditionCard('plant_is_healthy')
       .registerRunListener(async (args) => { ... });
     
     // Actions need run listeners
     this.homey.flow.getActionCard('water_plant')
       .registerRunListener(async (args) => { ... });
     
     // Device triggers are called from device.ts, no listener needed here
   }
   ```

4. **Getting Other Devices**:
   ```typescript
   // Get all devices
   const devices = await this.homey.devices.getDevices();
   
   // Find specific device
   const device = Object.values(devices).find(d => d.id === deviceId);
   
   // Get capability value
   const value = device.capabilitiesObj?.measure_temperature?.value;
   ```

### E. File Structure Summary

```
com.openplantbook/
├── .homeycompose/
│   ├── app.json
│   ├── capabilities/
│   │   ├── plant_health_score.json
│   │   ├── optimal_*.json (8 files)
│   │   └── alarm_*.json (7 files)
│   └── flow/
│       ├── triggers/ (8 files)
│       ├── conditions/ (8 files)
│       └── actions/ (7 files)
├── drivers/
│   └── plant/
│       ├── driver.compose.json
│       ├── driver.ts
│       ├── device.ts
│       ├── assets/
│       │   └── icon.svg
│       └── pair/
│           ├── search.html
│           ├── configure.html
│           ├── sensors.html
│           └── controllers.html
├── lib/
│   ├── PlantbookClient.ts
│   └── PlantbookTypes.ts
├── tests/
│   ├── unit/
│   └── scripts/
├── assets/
│   ├── icon.svg
│   └── images/
├── locales/
│   └── en.json
├── app.ts
├── api.ts
├── package.json
├── tsconfig.json
└── README.md
```

### F. Testing Strategy

See `TESTING_GUIDE.md` for complete testing documentation.

**Quick Reference:**
```bash
# Unit tests
npm test

# Structure validation
bash tests/scripts/validate-structure.sh

# Flow card validation
bash tests/scripts/validate-flow-cards.sh

# Full build and validate
npm run build && homey app validate
```

### G. Resources

- [Open Plantbook API Docs](https://documenter.getpostman.com/view/12627470/TVsxBRjD)
- [Homey SDK Documentation](https://apps.developer.athom.com/)
- [JSON Time Series Spec](https://docs.eagle.io/en/latest/reference/historic/jts.html)
- [Open Plantbook Client GitHub](https://github.com/slaxor505/OpenPlantbook-client)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-31 | Initial plan |
| 1.1 | 2025-12-31 | Added corrections: rate limiting, caching, Homey API patterns, capability definitions, testing strategy |

---

**Document Version**: 1.1  
**Last Updated**: 2025-12-31  
**Author**: Implementation Team
