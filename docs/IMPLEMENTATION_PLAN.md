# Open Plantbook Integration - Implementation Plan

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

export class PlantbookClient {
  private clientId: string;
  private clientSecret: string;
  private token: TokenResponse | null = null;
  private tokenExpiry: Date | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
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

    try {
      const response = await fetch(
        `${PLANTBOOK_BASE_URL}/plant/search?alias=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token!.access_token}`,
          },
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

    try {
      const url = new URL(`${PLANTBOOK_BASE_URL}/plant/detail/${pid}`);
      if (lang) {
        url.searchParams.set('lang', lang);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.token!.access_token}`,
        },
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

    try {
      const response = await fetch(`${PLANTBOOK_BASE_URL}/sensor-data/instance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token!.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registration),
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
}
```

#### Step 1.6: Create App Class (`app.ts`)

```typescript
import Homey from 'homey';
import { PlantbookClient } from './lib/PlantbookClient';

class PlantbookApp extends Homey.App {
  private plantbookClient: PlantbookClient | null = null;

  async onInit() {
    this.log('Plantbook app is running...');

    // Initialize client if credentials are set
    const clientId = this.homey.settings.get('client_id');
    const clientSecret = this.homey.settings.get('client_secret');

    if (clientId && clientSecret) {
      this.plantbookClient = new PlantbookClient(clientId, clientSecret);
      this.log('Plantbook client initialized');
    } else {
      this.log('Plantbook credentials not configured');
    }

    // Listen for settings changes
    this.homey.settings.on('set', async (key: string) => {
      if (key === 'client_id' || key === 'client_secret') {
        const newClientId = this.homey.settings.get('client_id');
        const newClientSecret = this.homey.settings.get('client_secret');
        
        if (newClientId && newClientSecret) {
          this.plantbookClient = new PlantbookClient(newClientId, newClientSecret);
          this.log('Plantbook client reinitialized');
        }
      }
    });
  }

  getPlantbookClient(): PlantbookClient | null {
    return this.plantbookClient;
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

- [ ] App installs without errors
- [ ] App settings page shows API credential fields
- [ ] Client ID and Secret can be saved
- [ ] API client authenticates successfully with valid credentials
- [ ] API client handles invalid credentials gracefully
- [ ] Token refresh works correctly
- [ ] Search plants endpoint returns results
- [ ] Get plant detail endpoint returns plant data

### Checkpoint

At the end of Phase 1, you should be able to:
- Install the app on Homey
- Configure API credentials
- Successfully authenticate with Plantbook API
- Search for plants and retrieve plant details

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
/drivers/
└── plant/
    ├── driver.compose.json
    ├── driver.ts
    ├── device.ts
    └── pair/
        ├── search.html
        └── configure.html
```

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

```typescript
import { Homey } from 'homey';

class PlantDriver extends Homey.Driver {
  async onInit() {
    this.log('Plant driver has been initialized');
  }

  async onPair(session: any) {
    let searchQuery = '';
    let selectedPlant: any = null;

    session.setHandler('search', async (query: string) => {
      searchQuery = query;
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

    session.setHandler('select_plant', async (plant: any) => {
      selectedPlant = plant;
      this.log('Plant selected:', plant.pid);
    });

    session.setHandler('get_plant_detail', async (pid: string) => {
      const app = this.homey.app as any;
      const client = app.getPlantbookClient();

      if (!client) {
        throw new Error('Plantbook API not configured');
      }

      try {
        const detail = await client.getPlantDetail(pid);
        return detail;
      } catch (error) {
        this.error('Get plant detail failed:', error);
        throw error;
      }
    });

    session.setHandler('list_devices', async () => {
      if (!selectedPlant) {
        throw new Error('No plant selected');
      }

      return [
        {
          name: selectedPlant.display_pid || selectedPlant.alias,
          data: {
            id: `plant_${selectedPlant.pid}_${Date.now()}`,
            pid: selectedPlant.pid,
          },
          settings: {
            pid: selectedPlant.pid,
            scientific_name: selectedPlant.pid,
          },
        },
      ];
    });
  }
}

module.exports = PlantDriver;
```

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
    }
    .search-container {
      margin-bottom: 20px;
    }
    input[type="text"] {
      width: 100%;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .results {
      max-height: 400px;
      overflow-y: auto;
    }
    .plant-item {
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .plant-item:hover {
      background-color: #f5f5f5;
    }
    .plant-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .plant-pid {
      color: #666;
      font-size: 14px;
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    .error {
      color: #d32f2f;
      padding: 10px;
      background-color: #ffebee;
      border-radius: 4px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="search-container">
    <input type="text" id="search-input" placeholder="Search for a plant (e.g., Monstera, Snake Plant)">
  </div>
  <div id="error-container"></div>
  <div id="results-container" class="results"></div>

  <script>
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const errorContainer = document.getElementById('error-container');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 500);
    });

    async function performSearch(query) {
      resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
      errorContainer.innerHTML = '';

      try {
        const results = await Homey.app.search(query);
        
        if (results.length === 0) {
          resultsContainer.innerHTML = '<div class="loading">No plants found</div>';
          return;
        }

        resultsContainer.innerHTML = results.map(plant => `
          <div class="plant-item" data-pid="${plant.pid}">
            <div class="plant-name">${plant.display_pid || plant.alias}</div>
            <div class="plant-pid">${plant.pid}</div>
          </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.plant-item').forEach(item => {
          item.addEventListener('click', async () => {
            const pid = item.dataset.pid;
            try {
              const detail = await Homey.app.get_plant_detail(pid);
              await Homey.app.select_plant(detail);
              Homey.emit('continue');
            } catch (error) {
              showError('Failed to load plant details');
            }
          });
        });
      } catch (error) {
        showError('Search failed: ' + error.message);
        resultsContainer.innerHTML = '';
      }
    }

    function showError(message) {
      errorContainer.innerHTML = `<div class="error">${message}</div>`;
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
    }
    .plant-info {
      text-align: center;
      margin-bottom: 30px;
    }
    .plant-image {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .plant-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .plant-pid {
      color: #666;
      font-size: 14px;
    }
    .ranges {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .range-item {
      margin-bottom: 15px;
    }
    .range-label {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .range-value {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="plant-info">
    <img id="plant-image" class="plant-image" src="" alt="Plant">
    <div class="plant-name" id="plant-name"></div>
    <div class="plant-pid" id="plant-pid"></div>
  </div>

  <div class="ranges">
    <h3>Optimal Care Ranges</h3>
    <div class="range-item">
      <div class="range-label">Soil Moisture</div>
      <div class="range-value" id="soil-moisture"></div>
    </div>
    <div class="range-item">
      <div class="range-label">Temperature</div>
      <div class="range-value" id="temperature"></div>
    </div>
    <div class="range-item">
      <div class="range-label">Humidity</div>
      <div class="range-value" id="humidity"></div>
    </div>
    <div class="range-item">
      <div class="range-label">Light</div>
      <div class="range-value" id="light"></div>
    </div>
  </div>

  <script>
    (async () => {
      try {
        const plant = await Homey.app.get_selected_plant();
        
        if (plant.image_url) {
          document.getElementById('plant-image').src = plant.image_url;
        }
        document.getElementById('plant-name').textContent = plant.display_pid || plant.alias;
        document.getElementById('plant-pid').textContent = plant.pid;
        
        document.getElementById('soil-moisture').textContent = 
          `${plant.min_soil_moist}% - ${plant.max_soil_moist}%`;
        document.getElementById('temperature').textContent = 
          `${plant.min_temp}°C - ${plant.max_temp}°C`;
        document.getElementById('humidity').textContent = 
          `${plant.min_env_humid}% - ${plant.max_env_humid}%`;
        document.getElementById('light').textContent = 
          `${plant.min_light_lux} - ${plant.max_light_lux} lux`;
      } catch (error) {
        console.error('Failed to load plant:', error);
      }
    })();
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

```typescript
import { Homey } from 'homey';

interface LinkedSensor {
  deviceId: string;
  capability: string;
  type: string;
}

class PlantDevice extends Homey.Device {
  private plantData: any = null;
  private linkedSensors: Map<string, LinkedSensor> = new Map();
  private sensorListeners: Map<string, Function> = new Map();

  async onInit() {
    this.log('Plant device initialized:', this.getName());

    const pid = this.getSetting('pid');
    if (pid) {
      await this.refreshPlantData();
    }

    await this.setupSensorLinks();
  }

  // ... existing refreshPlantData method ...

  /**
   * Set up listeners for all linked sensors
   */
  async setupSensorLinks() {
    const sensorTypes = ['soil_moisture', 'temperature', 'humidity', 'light'];

    for (const type of sensorTypes) {
      const linkString = this.getSetting(`sensor_${type}`);
      if (!linkString) continue;

      const [deviceId, capability] = linkString.split(':');
      if (!deviceId || !capability) {
        this.log(`Invalid sensor link format for ${type}: ${linkString}`);
        continue;
      }

      this.linkedSensors.set(type, { deviceId, capability, type });
      await this.subscribeToSensor(deviceId, capability, type);
    }

    this.log(`Set up ${this.linkedSensors.size} sensor links`);
  }

  /**
   * Subscribe to a sensor's capability changes
   */
  async subscribeToSensor(deviceId: string, capability: string, type: string) {
    try {
      const device = await this.homey.devices.getDevice({ id: deviceId });
      if (!device) {
        this.error(`Device not found: ${deviceId}`);
        return;
      }

      // Get initial value
      const initialValue = device.getCapabilityValue(capability);
      if (initialValue !== null && initialValue !== undefined) {
        await this.onSensorReading(type, initialValue, deviceId);
      }

      // Create listener for changes
      const listener = async (value: any) => {
        await this.onSensorReading(type, value, deviceId);
      };

      device.on(`capability.${capability}`, listener);
      this.sensorListeners.set(`${deviceId}:${capability}`, listener);

      this.log(`Subscribed to ${deviceId}:${capability} for ${type}`);
    } catch (error) {
      this.error(`Failed to subscribe to sensor ${deviceId}:`, error);
    }
  }

  /**
   * Handle incoming sensor reading
   */
  async onSensorReading(type: string, value: number, deviceId: string) {
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

    // Trigger flow card for sensor update
    await this.homey.flow.getDeviceTriggerCard('plant_sensor_updated')
      .trigger(this, { sensor_type: type, value })
      .catch(this.error);
  }

  /**
   * Unsubscribe from a sensor
   */
  async unsubscribeFromSensor(deviceId: string, capability: string) {
    const listener = this.sensorListeners.get(`${deviceId}:${capability}`);
    if (listener) {
      try {
        const device = await this.homey.devices.getDevice({ id: deviceId });
        if (device) {
          device.off(`capability.${capability}`, listener);
        }
      } catch (error) {
        this.error(`Failed to unsubscribe from ${deviceId}:`, error);
      }
      this.sensorListeners.delete(`${deviceId}:${capability}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: any) {
    if (changedKeys.includes('pid')) {
      await this.refreshPlantData();
    }

    // Re-setup sensors if sensor links changed
    const sensorKeys = changedKeys.filter((k: string) => k.startsWith('sensor_'));
    if (sensorKeys.length > 0) {
      // Unsubscribe old listeners
      for (const [key, listener] of this.sensorListeners) {
        const [deviceId, capability] = key.split(':');
        await this.unsubscribeFromSensor(deviceId, capability);
      }
      this.sensorListeners.clear();
      this.linkedSensors.clear();

      await this.setupSensorLinks();
    }
  }

  async onDeleted() {
    // Clean up all listeners
    for (const [key, listener] of this.sensorListeners) {
      const [deviceId, capability] = key.split(':');
      await this.unsubscribeFromSensor(deviceId, capability);
    }
    this.sensorListeners.clear();
    this.linkedSensors.clear();
  }
}

module.exports = PlantDevice;
```

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

### A. Capability Definitions

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

### B. API Rate Limits

Open Plantbook API has a limit of 200 requests per day per user (as of November 2025). Implement:
- Token caching (already done)
- Request throttling
- Error handling for rate limits

### C. Error Codes

Common API errors:
- `not_authenticated`: Invalid or missing credentials
- `validation_error`: Invalid request data
- `not_found`: Plant PID not found
- `rate_limit_exceeded`: Too many requests

### D. Resources

- [Open Plantbook API Docs](https://documenter.getpostman.com/view/12627470/TVsxBRjD)
- [Homey SDK Documentation](https://apps.developer.athom.com/)
- [JSON Time Series Spec](https://docs.eagle.io/en/latest/reference/historic/jts.html)

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-31  
**Author**: Implementation Team
