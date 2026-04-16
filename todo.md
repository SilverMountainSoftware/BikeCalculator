# Bike Calculator Task Plan

- [x] Create a static website structure for the bicycle calculator.
- [x] Implement gear ratio, cadence, speed, and hill-climb analysis logic.
- [x] Build a responsive UI for riders to enter bike, rider, and terrain values.
- [x] Verify the page in a browser with realistic sample inputs.
- [x] Add metric and imperial unit switching for key inputs and outputs.
- [x] Add a full drivetrain comparison table from chainring and cassette lists.
- [x] Add charts for cadence versus speed and grade versus power.
- [x] Verify the expanded UI in the browser with interactive checks.
- [x] Add a minimal TypeScript project configuration for the static site.
- [x] Convert the browser logic from JavaScript to typed TypeScript.
- [x] Compile TypeScript back to browser-ready JavaScript.
- [x] Verify the TypeScript version behaves the same in the browser.
- [x] Add a Calculate Chainring action that recommends the largest valid chainring from the full allowed range.
- [x] Verify the recommendation against the largest cassette cog and current power budget assumptions.
- [x] Add a Calculate Cassette action that recommends the minimum largest rear cog needed for the current chainring.
- [x] Verify the cassette recommendation against both already-sufficient and increase-needed cases.

## Review

- Verified the page by opening [index.html](c:/Code/SMS/BikeCalculator/index.html) in the browser.
- Confirmed default calculations render correctly and the preset buttons update outputs.
- Checked a steep mountain bike preset to validate low-gear climbing behavior.
- Feature expansion requested: unit switching, gear comparison table, and charts.
- Verified metric to imperial switching updates input labels, summary cards, comparison table values, and chart scales.
- Verified the loaded gravel preset updates chainring and cassette lists and refreshes the full drivetrain table.
- Verified both SVG charts re-render after unit changes and preset changes.
- Installed TypeScript, compiled [app.ts](c:/Code/SMS/BikeCalculator/app.ts) to [app.js](c:/Code/SMS/BikeCalculator/app.js), and confirmed the page still renders correctly in the browser.
- Added a Calculate Chainring button that checks the entered chainring set against the largest cassette cog and current ride assumptions.
- Verified the recommendation starts blank, clears on input edits, and returns a no-solution message when the listed chainrings exceed the power budget.
- Confirmed the recommendation does not overwrite the Front chainring input and remains advisory only.
- Corrected the chainring recommendation to search the full allowed front-chainring range instead of only the entered chainring list.
- Added a Calculate Cassette button that finds the minimum largest rear cog needed for the current front chainring.
- Verified a default case where the existing 34T cassette already exceeds the required 32T largest cog, and a 50T chainring case that needs a 46T largest cog.
