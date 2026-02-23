import type { Reading } from "../types";

const KEY = "diabetes.appstate.v1";

type AppState = {
  readings: Reading[];
  settings?: Record<string, any>;
  meds?: { insulinMeds?: Array<any>; steroids?: Array<any>; scales?: Array<any>; nonInsulin?: Record<string, any> };
};

function readState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { readings: [], settings: {} };
    const parsed = JSON.parse(raw) as AppState;
    return {
      readings: parsed.readings ?? [],
      settings: parsed.settings ?? {}
    };
  } catch (e) {
    console.warn("Failed to read app state:", e);
    return { readings: [], settings: {} };
  }
}

function writeState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to write app state:", e);
  }
}

export function saveReadings(readings: Reading[]) {
  const state = readState();
  state.readings = readings;
  writeState(state);
}

export function loadReadings(): Reading[] {
  return readState().readings;
}

export function saveSettings(settings: Record<string, any>) {
  const state = readState();
  state.settings = { ...(state.settings || {}), ...settings };
  writeState(state);
}

export function loadSettings(): Record<string, any> {
  return readState().settings ?? {};
}

export function saveMeds(meds: { insulinMeds?: Array<any>; steroids?: Array<any>; scales?: Array<any>; nonInsulin?: Record<string, any> }) {
  const state = readState();
  state.meds = { ...(state.meds || {}), ...meds };
  writeState(state);
}

export function loadMeds(): { insulinMeds?: Array<any>; steroids?: Array<any>; scales?: Array<any>; nonInsulin?: Record<string, any> } {
  return readState().meds ?? { insulinMeds: [], steroids: [], scales: [], nonInsulin: {} };
}

export function clearReadings() {
  const state = readState();
  state.readings = [];
  writeState(state);
}

