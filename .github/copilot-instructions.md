# Copilot Instructions for Flowy

## Project Overview
Flowy is a vanilla JavaScript library for building interactive flowchart editors in web applications. It provides drag-and-drop block creation, snapping, rearrangement, and export/import of flowchart data. The core engine is in `engine/flowy.ts` and is distributed as minified JS/CSS in the project root and `demo/`.

## Architecture & Key Components
- **engine/flowy.ts**: Main source file for the flowchart engine. All logic for block manipulation, event handling, and data serialization is here.
- **flowy.min.js / flowy.min.css**: Minified distributables for production/demo use.
- **demo/**: Example app showing Flowy in action. Use `demo/main.js` and `demo/index.html` to see integration patterns.
- **Block Data Model**: Each block has an `id`, `parent`, `data` (inputs), and `attr` (attributes). See `flowy.output()` for the structure.

## Developer Workflows
- **Build**: Run `npm run build` to transpile TypeScript and bundle assets. Output is placed in the project root and `demo/`.
- **Demo**: Open `demo/index.html` in a browser to test changes interactively.
- **No formal test suite**: Manual testing via the demo is standard.

## Integration Patterns
- **Initialization**: Use `flowy(canvas, ongrab, onrelease, onsnap, onrearrange, spacing_x, spacing_y)` to set up the editor. See `demo/main.js` for callback usage.
- **Callbacks**: Implement custom logic for block events (`onGrab`, `onRelease`, `onSnap`, `onRearrange`). These are passed to `flowy()` and control user interactions.
- **Data Export/Import**: Use `flowy.output()` to serialize the flowchart, and `flowy.import(data)` to restore it. Only use trusted data for import due to XSS risk.
- **Block Creation**: Blocks must have the `.create-flowy` class to be draggable.

## Project-Specific Conventions
- **No external dependencies**: Flowy is pure JS/CSS. Do not add frameworks or libraries unless strictly necessary.
- **Minified files**: Always update both `flowy.min.js` and `demo/flowy.min.js` after engine changes.
- **Manual testing**: Use the demo for validation; there are no automated tests.
- **Security**: Never import untrusted flowchart data due to XSS vulnerability in `flowy.import()`.

## TypeScript Conversion Conventions

When converting JavaScript libraries to TypeScript in this project, strictly follow these conventions:

- **Namespace-Based Organization (No ES6 Modules):**
	- All code must be encapsulated within a TypeScript `namespace`.
	- Use the top-level namespace: `appn.sync.YourLibraryName` (replace `YourLibraryName` with a suitable camelCase name).
	- For logical sub-components, use nested namespaces (e.g., `appn.sync.YourLibraryName.SubModule`).
	- Do **not** use `import` or `export` statements for ES6 modules.
	- For multi-file libraries, declare inter-file dependencies with `/// <reference path="..." />` at the top of each file.

- **Strong Typing:**
	- Add explicit type annotations for all variables, parameters, and return types.
	- Define interfaces for complex objects, configuration options, and data models.
	- Use enums for fixed sets of values (e.g., modes, types, states).
	- Ensure compatibility with jQuery types (e.g., `JQuery<HTMLElement>`), and type Lodash usage if present.

- **Code Structure:**
	- Convert plain JS functions to TypeScript functions within the appropriate namespace.
	- Convert prototypal inheritance or stateful objects to TypeScript classes.
	- For jQuery plugins, encapsulate logic in the namespace and augment the `JQuery` interface as needed.

- **Global Scope Handling:**
	- Move any global variables/functions into the namespace as exported members. Do not leave anything in the global scope.

- **Readability and Maintainability:**
	- Preserve and convert all relevant JS comments to TypeScript comments.
	- Ensure code is clean, well-formatted, and idiomatic TypeScript.

- **Examples:**
	- See `namespace appn.designer.mapping`, `namespace appn.designer.form` for style.
	- Reference paths: `/// <reference path="../base/mainBase.ts" />` in `main.ts`.
	- Typing with jQuery: `control: JQuery<HTMLElement>`.

Strict adherence to these conventions is required for all TypeScript conversions in this codebase.

## Examples
- See `demo/main.js` for callback implementations and block setup.
- See `README.md` for API details and usage patterns.

## External Integrations
- No backend or external APIs; Flowy is client-side only.
- Assets (SVGs, PNGs) for demo blocks are in `demo/assets/`.

---
For questions or unclear conventions, review `README.md` or ask for clarification. Update this file if new workflows or patterns emerge.
