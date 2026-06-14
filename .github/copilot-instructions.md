# Copilot / AI Agent Instructions — orderflow-frontend

Purpose: Give AI coding agents the minimal, project-specific context and examples to be productive quickly.

1) Project overview
- This is a single-page React app bootstrapped with Create React App. The UI is implemented mostly inside `src/App.js` (a large, stateful component). API calls are centralized in `src/api.js` and the production build outputs to the `build/` folder.

2) Major domains & data flow
- Entities: `Distributor` and `Order`.
- Fetch flow: `fetchDistributors()` (in `src/App.js`) calls `getDistributors()` from `src/api.js`. `getOrders()` and `getOrdersByDistributor()` are used to populate `allOrders` and `orders` respectively.
- Mutations: use `createDistributor`, `updateDistributor`, `deleteDistributor`, `createOrder`, `updateOrder`, `deleteOrder` from `src/api.js`.

3) Key files to inspect or update
- [src/App.js](src/App.js): main UI, inline styles, modals, PDF templates, hard-coded presets. Examples:
  - PRESET_USER / PRESET_PASS: login is currently client-side in `App.js`.
  - PDF generation functions: `generatePDF`, `generateAllOrdersPDF`, `shareOrderPDF` — store name `SAI KRUPA MEDICAL AND GENERAL STORE` is hard-coded in the HTML templates here.
- [src/api.js](src/api.js): Axios instance and all backend endpoints. Update `baseURL` here if the backend host changes.
- package.json: scripts (`npm start`, `npm run build`, `npm test`) and dependencies (React, axios).
- build/, public/: production output and static assets.

4) Project-specific conventions & patterns
- Single-file UI: expect a large `App.js` that holds local state hooks for app state rather than many small components or routing. When adding features, keep the existing pattern unless explicitly refactoring.
- Inline styles: components use style objects instead of CSS modules; small UI tweaks can be applied directly in `App.js` or `App.css`.
- Duplicate-detection: distributor uniqueness and invoice uniqueness are implemented in the client (see `handleSaveDist` and `handleSaveOrder` in `App.js`).
- Date and currency formatting: `formatDate()` and `toLocaleString('en-IN')` used throughout — follow these for consistency.
- Printing/PDFs: PDFs are generated client-side by building an HTML string, turning it into a Blob, `window.open()` and calling `print()` on load. Modify templates in `App.js` when changing PDF layout or store name.

5) Integration points & externals
- Backend API: `https://orderflow-backend-5wcq.onrender.com/api` (set in `src/api.js`). All REST endpoints are defined there.
- Libraries: `axios` for HTTP, `react-scripts` for build/dev/test. No client-side database.

6) Development & workflows
- Start dev server: `npm start` (uses `react-scripts start`).
- Build for production: `npm run build` → outputs to `build/`.
- Run tests: `npm test` (react-scripts test).
- Linting/formatting: standard CRA presets via `eslintConfig` in `package.json`.

7) Safe edits and common tasks (examples)
- Change backend host: update `baseURL` in [src/api.js](src/api.js).
- Change store name displayed in PDFs: update the hard-coded store name inside `generatePDF`, `generateAllOrdersPDF`, and `shareOrderPDF` in [src/App.js](src/App.js).
- Add a backend endpoint: export a function in `src/api.js` then call it from `src/App.js` (follow existing naming like `getOrdersByDistributor`).
- Extracting components: if splitting `App.js`, preserve the state initialization flow: distributors → selectedDist → orders/allOrders. Move helper functions (`formatDate`, PDF builders) along with the UI that uses them.

8) Security / secrets
- There are client-side hard-coded credentials `PRESET_USER`/`PRESET_PASS` in `src/App.js`. Login is client-only. Be cautious when changing auth flow — backend `login` exists in `src/api.js` but is not used by default.

9) Tests and verification
- Run `npm test` to launch the test runner. There are basic CRA tests present — changes to `App.js` may require updating tests accordingly.

10) When in doubt (how to ask the repo maintainer)
- If a behavior depends on backend changes, confirm the API contract and baseURL before editing `src/api.js` or adding endpoints.

If any section is unclear or you'd like more examples (component extraction, refactor guidance, or a starter test), tell me which part to expand.
