# Open Plantbook Integration - Documentation

This directory contains comprehensive documentation for implementing and using the Open Plantbook integration for Homey.

## Documentation Files

### 📋 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**For Developers** - Complete phase-by-phase implementation guide

This is the main technical documentation covering:
- Detailed implementation steps for all 11 phases
- Code examples and file structures
- Testing checklists for each phase
- Architecture overview
- API integration details

**Use this when**: Implementing the integration, understanding the architecture, or debugging issues.

---

### 🔍 [PLAN_REVIEW.md](./PLAN_REVIEW.md)
**For Developers** - Testing reference and test cases

Testing-focused document covering:
- Review summary (all corrections applied)
- Unit tests for each phase
- Validation scripts
- Manual test procedures
- Integration test checklist

**Use this when**: Writing tests, running validations, or checking test requirements.

---

### 🧪 [TESTING_GUIDE.md](./TESTING_GUIDE.md)
**For Developers** - Complete testing strategy and procedures

Testing documentation covering:
- Test directory structure
- Unit test implementations
- Validation scripts
- Manual test procedures
- Integration test checklists
- Bug reporting format

**Use this when**: Writing tests, running validation, or performing manual testing.

---

### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**For Developers** - Quick lookup guide

Quick reference for:
- Phase summaries and timelines
- File structure overview
- Code patterns and snippets
- API endpoints
- Common issues and solutions

**Use this when**: You need a quick reminder of how something works or where to find code.

---

### 👤 [USER_GUIDE.md](./USER_GUIDE.md)
**For End Users** - How to use the app

User-friendly guide covering:
- Installation and setup
- Adding plants
- Linking sensors and controllers
- Creating automations
- Troubleshooting common issues
- FAQ

**Use this when**: Creating user documentation, writing help text, or explaining features to users.

---

## Documentation Structure

```
docs/
├── README.md              (this file - navigation guide)
├── IMPLEMENTATION_PLAN.md (main technical guide)
├── PLAN_REVIEW.md         (corrections and test cases)
├── TESTING_GUIDE.md       (testing strategy and procedures)
├── QUICK_REFERENCE.md     (developer quick reference)
└── USER_GUIDE.md          (end user guide)
```

## Quick Start

### For Developers

1. **Start here**: Read [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Phase 1
2. **During development**: Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for quick lookups
3. **When stuck**: Check the troubleshooting sections in both documents

### For Users

1. **Start here**: Read [USER_GUIDE.md](./USER_GUIDE.md) "Getting Started" section
2. **For specific tasks**: Jump to the relevant section in the user guide
3. **For problems**: Check the "Troubleshooting" section

## Implementation Phases Overview

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | API Client & App Scaffold | 1 week |
| 2 | Plant Driver & Pairing | 1 week |
| 3 | Sensor Linking | 1 week |
| 4 | Health Score | 3 days |
| 5 | Alarms & Triggers | 3 days |
| 6 | Controllers & Auto-Water | 1 week |
| 7 | Flow Cards | 1 week |
| 8 | Enhanced UI | 3 days |
| 9 | Hobeian Integration | 3 days |
| 10 | Data Upload | 3 days |
| 11 | Testing & Polish | 1 week |

**Total Estimated Time**: 6-8 weeks

## Key Concepts

### Architecture

- **Hybrid Approach**: Two apps working together
  - `com.openplantbook`: Standalone plant management app
  - `com.hobeian`: Enhanced with optional Plantbook integration

### Core Features

- **Multi-Sensor Support**: One plant can have multiple sensors
- **Controller Integration**: Automatic watering and lighting
- **Health Scoring**: Weighted calculation based on all factors
- **Flow Cards**: Triggers, conditions, and actions for automation

### Data Flow

```
Sensor → Plant Device → Threshold Check → Alarms → Flow Triggers → Controllers
```

## Contributing

When updating documentation:

1. **Technical changes**: Update IMPLEMENTATION_PLAN.md
2. **Quick fixes**: Update QUICK_REFERENCE.md
3. **User-facing changes**: Update USER_GUIDE.md
4. **Major changes**: Update this README

## Related Resources

- [Open Plantbook API Documentation](https://documenter.getpostman.com/view/12627470/TVsxBRjD)
- [Homey SDK Documentation](https://apps.developer.athom.com/)
- [Open Plantbook Website](https://open.plantbook.io)

## Recommended Reading Order

### For New Developers
1. **IMPLEMENTATION_PLAN.md** - Understand the full scope
2. **PLAN_REVIEW.md** - Learn about corrections and testing
3. **TESTING_GUIDE.md** - Set up testing infrastructure
4. **QUICK_REFERENCE.md** - Keep open during development

### For Ongoing Development
1. **PLAN_REVIEW.md** - Check test requirements for current phase
2. **TESTING_GUIDE.md** - Run tests before/after changes
3. **QUICK_REFERENCE.md** - Quick lookups

### For Documentation/User Support
1. **USER_GUIDE.md** - Understand user perspective
2. **IMPLEMENTATION_PLAN.md** - Technical details if needed

---

## Document Status

| Document | Version | Status | Last Updated |
|----------|---------|--------|--------------|
| IMPLEMENTATION_PLAN.md | 1.1 | ✅ Primary reference (all corrections applied) | 2025-12-31 |
| PLAN_REVIEW.md | 1.1 | ✅ Testing reference (cleaned up) | 2025-12-31 |
| TESTING_GUIDE.md | 1.0 | ✅ Complete | 2025-12-31 |
| QUICK_REFERENCE.md | 1.0 | ✅ Complete | 2025-12-31 |
| USER_GUIDE.md | 1.0 | ✅ Complete | 2025-12-31 |
| README.md | 1.1 | ✅ Complete | 2025-12-31 |

---

## Corrections Applied

All corrections have been integrated into `IMPLEMENTATION_PLAN.md` (v1.1):

| Correction | Phase |
|------------|-------|
| API Rate Limiting (`checkRateLimit()`) | 1 |
| Plant Data Caching (24-hour TTL) | 1 |
| Flow Card Registration in `onInit()` | 1 |
| Capability JSON definitions | 2 |
| Pairing handler patterns | 2 |
| Polling-based sensor subscriptions | 3 |
| Device store for sensor links | 3 |
| Device deletion handling | 3 |
| Enhanced pairing UI | 2 |

**The IMPLEMENTATION_PLAN.md is the primary reference document.**  
**The PLAN_REVIEW.md now serves as a testing reference.**

---

**Questions?** Check the relevant documentation file or refer to the troubleshooting sections.
