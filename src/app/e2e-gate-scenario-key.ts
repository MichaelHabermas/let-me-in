/**
 * Shared `localStorage` key for Playwright gate scenarios (init script + app stub).
 * Kept dependency-free so Playwright helpers do not import the full gate E2E graph.
 */
export const E2E_GATE_SCENARIO_KEY = 'e2e_gate_scenario';
