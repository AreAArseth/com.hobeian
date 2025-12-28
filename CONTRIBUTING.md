# Contributing to Hobeian for Homey

First of all, thank you for taking the time to contribute to the Hobeian Homey app!

The following is a set of guidelines for contributing to this project, which is hosted on [GitHub](https://github.com/AreAArseth/com.hobeian). These are just guidelines, not rules. Use your best judgment, and feel free to open an issue if you have any questions.

For general Homey development discussions, please join the [Homey community forum](https://community.homey.app).

## Before submitting a bug or feature request

* **Have you actually read the error message**?
* Have you searched for similar issues in the [GitHub Issues](https://github.com/AreAArseth/com.hobeian/issues)?
* Have you updated Homey, all apps, and the development tools (if applicable)?
* Have you checked that it's not a problem with Homey itself or another app?
* Have you looked at what's involved in fixing/implementing this?

Capable programmers should always attempt to investigate and fix problems themselves before asking for others to help. Submit a pull request instead of an issue!

## A great bug report contains

* Context – what were you trying to achieve?
* Device information – which Hobeian device model and firmware version?
* Detailed steps to reproduce the error from scratch. Try isolating the minimal amount of code needed to reproduce the error.
* Any applicable log files or device IDs.
* Evidence you've looked into solving the problem and ideally, a theory on the cause and a possible solution.
* Homey version and app version.

## A great feature request contains

* The current situation.
* How and why the current situation is problematic.
* A detailed proposal or pull request that demonstrates how the problem could be solved.
* A use case – who needs this feature and why?
* Any caveats or considerations for Zigbee device compatibility.

## Adding support for new Hobeian devices

If you want to add support for a new Hobeian Zigbee device:

1. Check if the device is already supported or if there's an open issue for it.
2. Gather device information:
   - Zigbee manufacturer name and product ID
   - Device capabilities and clusters
   - Power source (battery or mains)
   - Device images (small: 75x75, large: 500x500 PNG format)
3. Create a new driver in the `drivers/` directory following the existing structure.
4. Update the README.md with device information.
5. Test thoroughly with the actual device before submitting.

## A great pull request contains

* Minimal changes. Only submit code relevant to the current issue. Other changes should go in new pull requests.
* Minimal commits. Please squash to a single commit before sending your pull request.
* No conflicts. Please rebase off the latest main branch before submitting.
* Code conforming to the existing conventions and formats. i.e. Please don't reformat whitespace.
* TypeScript code that compiles without errors (`npm run build`).
* Relevant documentation updates (README.md, driver.compose.json, etc.).
* For new device drivers: proper device images and complete driver configuration.

## Code style

* Follow the existing TypeScript/JavaScript style in the codebase.
* Use meaningful variable and function names.
* Add comments for complex logic, especially Zigbee cluster handling.
* Ensure all TypeScript code compiles successfully.

## Speeding up your pull request

Merging pull requests takes time. While we always try to merge your pull request as soon as possible, there are certain things you can do to speed up this process:

* Ask developers to review your code changes and post their feedback.
* Ask users to test your changes with actual devices and post their feedback.
* Keep your changes to the minimal required amount, and dedicated to one issue/feature only.
* Ensure your code passes validation (`homey app validate`).

## Questions?

If you have questions about contributing, please open an issue on [GitHub](https://github.com/AreAArseth/com.hobeian/issues) or reach out through the [Homey community forum](https://community.homey.app).
