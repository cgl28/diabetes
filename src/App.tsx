import { useState, useEffect } from 'react'
import './App.css'
import type { Reading } from './types.ts'
import { clearReadings, loadReadings, saveReadings, saveSettings, loadSettings, saveMeds, loadMeds } from './lib/storage'
import type { InsulinMed } from './types.ts'
import type { Steroid } from './types.ts'
import {
  AppBar, Toolbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, Button, Stack, Tooltip, Container, CssBaseline, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, Chip, Checkbox, FormControlLabel, MenuItem
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ScienceIcon from "@mui/icons-material/Science";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoseSchedule from './components/DoseSchedule'
// AccessTimeIcon removed (not used)
// Download/export buttons removed

function uid() {
  // Simple id fallback if crypto.randomUUID isn't available
  return (typeof crypto !== "undefined" && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function App() {
  const [readings, setReadings] = useState<Reading[]>(() => loadReadings());
  const savedSettings = loadSettings();
  const [diabetesType, setDiabetesType] = useState<string>(savedSettings.diabetesType ?? 't2dm');
  // clinical context persisted in settings
  const savedClinical = (savedSettings && (savedSettings as any).clinicalContext) || {};
  const [clinicalContext, setClinicalContext] = useState<any>({
    egfr: savedClinical.egfr ?? '',
    weightKg: savedClinical.weightKg ?? '',
    carbs: savedClinical.carbs ?? 'normal', // normal | reduced | variable | enteral | tpn | npo
    wardType: savedClinical.wardType ?? 'Medical',
    pregnancy: savedClinical.pregnancy ?? false,
    age: savedClinical.age ?? '',
    vomiting: savedClinical.vomiting ?? false,
    weightChange: savedClinical.weightChange ?? 'stable',
    albumin: savedClinical.albumin ?? '',
    albuminDate: savedClinical.albuminDate ?? ''
  });
  const [dataCheckerOpen, setDataCheckerOpen] = useState(false);
  const [showInsulinInfo, setShowInsulinInfo] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);

  const demoData = {
    readings: [
      { ts: "2025-11-02T07:10", value: 5.8, ketones: null },
      { ts: "2025-11-02T12:45", value: 15.8, ketones: 0.3 },
      { ts: "2025-11-02T21:20", value: 8.6, ketones: null },
      { ts: "2025-11-03T08:10", value: 6.2 },
      { ts: "2025-11-03T14:20", value: 13.8 },
      { ts: "2025-11-03T22:15", value: 5.6 },
      { ts: "2025-11-04T07:55", value: 3.4 },
      { ts: "2025-11-04T16:05", value: 12.6 },
      { ts: "2025-11-04T21:40", value: 10.8 },
      { ts: "2025-11-05T09:00", value: 7.1 },
      { ts: "2025-11-05T15:30", value: 14.2 },
      { ts: "2025-11-05T23:10", value: 6.4 }
    ],
    meds: {
      basalInsulin: true, basalDose: 18,
      bolusInsulin: false,
      su: true, suName: "Gliclazide", suDose: 80,
      metformin: true, sglt2: false, steroidAM: true
    },
    context: { egfr: 28, npo: false, weightKg: 78 }
  };
  const insulinCatalog = [
    {
      group: 'Rapid-acting',
      items: [
        { name: 'Novorapid', acting: 'rapid', onsetHours: 0.25, durationHours: 3, approxDropPerUnit1h: 0.15 },
        { name: 'Fiasp', acting: 'rapid', onsetHours: 0.17, durationHours: 3, approxDropPerUnit1h: 0.18 },
      ]
    },
    {
      group: 'Short-acting',
      items: [
        { name: 'Actrapid', acting: 'short', onsetHours: 0.5, durationHours: 5, approxDropPerUnit1h: 0.12 },
        { name: 'Humulin S', acting: 'short', onsetHours: 0.5, durationHours: 5, approxDropPerUnit1h: 0.12 },
      ]
    },
    {
      group: 'Intermediate-acting',
      items: [
        { name: 'Insulatard', acting: 'intermediate', onsetHours: 1.5, durationHours: 16, approxDropPerUnit1h: 0.06 },
        { name: 'Humulin I', acting: 'intermediate', onsetHours: 1.5, durationHours: 16, approxDropPerUnit1h: 0.06 },
      ]
    },
    {
      group: 'Long-acting',
      items: [
        { name: 'Glargine', acting: 'long', onsetHours: 1, durationHours: 24, approxDropPerUnit1h: 0.01 },
        { name: 'Detemir', acting: 'long', onsetHours: 1, durationHours: 18, approxDropPerUnit1h: 0.01 },
        { name: 'Degludec', acting: 'long', onsetHours: 1, durationHours: 42, approxDropPerUnit1h: 0.01 },
      ]
    },
    {
      group: 'Mixed / Premix',
      items: [
        { name: 'Premix 30/70', acting: 'premix', onsetHours: 0.5, durationHours: 12, approxDropPerUnit1h: 0.1 },
      ]
    },
    {
      group: 'Other',
      items: [ { name: 'Other', acting: '', onsetHours: 0, durationHours: 0, approxDropPerUnit1h: 0 } ]
    }
  ];
  const steroidCatalog = [
    { name: 'Prednisone', potency: 'moderate', typicalDoseMg: '5-60', effectSummary: 'Can raise blood glucose; higher doses cause greater hyperglycaemia.' },
    { name: 'Prednisolone', potency: 'moderate', typicalDoseMg: '5-60', effectSummary: 'Similar to prednisone; can increase glucose, especially at higher doses.' },
    { name: 'Dexamethasone', potency: 'high', typicalDoseMg: '0.5-10', effectSummary: 'High potency; commonly causes marked hyperglycaemia even at low mg doses.' },
    { name: 'Hydrocortisone', potency: 'low', typicalDoseMg: '20-200', effectSummary: 'Lower potency per mg; large doses (e.g. IV stress doses) can increase glucose.' },
    { name: 'Methylprednisolone', potency: 'moderate', typicalDoseMg: '4-125', effectSummary: 'Systemic steroids that can increase glucose; IV doses often higher effect.' }
  ];
  // Non-insulin diabetes meds catalogs
  const sglt2List = [ 'Empagliflozin', 'Dapagliflozin', 'Canagliflozin' ];
  const glp1List = [ 'Dulaglutide', 'Liraglutide', 'Semaglutide' ];
  const dpp4List = [ 'Sitagliptin', 'Vildagliptin', 'Saxagliptin' ];
  const pioglitazoneList = [ 'Pioglitazone' ];
  const insulinTemplates: Record<string, InsulinMed[]> = {
    'basal-only': [
      { id: uid(), name: 'Glargine', acting: 'long', doseUnits: 18, time: '22:00', onsetHours: 1, durationHours: 24, approxDropPerUnit1h: 0.01 }
    ],
    'basal-bolus': [
      { id: uid(), name: 'Glargine', acting: 'long', doseUnits: 18, time: '22:00', onsetHours: 1, durationHours: 24, approxDropPerUnit1h: 0.01 },
      { id: uid(), name: 'Novorapid', acting: 'rapid', doseUnits: 6, time: '08:00', onsetHours: 0.25, durationHours: 3, approxDropPerUnit1h: 0.15 },
      { id: uid(), name: 'Novorapid', acting: 'rapid', doseUnits: 6, time: '13:00', onsetHours: 0.25, durationHours: 3, approxDropPerUnit1h: 0.15 },
      { id: uid(), name: 'Novorapid', acting: 'rapid', doseUnits: 6, time: '19:00', onsetHours: 0.25, durationHours: 3, approxDropPerUnit1h: 0.15 }
    ],
    'premixed-bd': [
      { id: uid(), name: 'Premix 30/70', acting: 'premix', doseUnits: 20, time: '08:00', onsetHours: 0.5, durationHours: 12, approxDropPerUnit1h: 0.1 },
      { id: uid(), name: 'Premix 30/70', acting: 'premix', doseUnits: 20, time: '18:00', onsetHours: 0.5, durationHours: 12, approxDropPerUnit1h: 0.1 }
    ],
    'sliding-scale': [
      { id: uid(), name: 'Actrapid (sliding scale)', acting: 'short', doseUnits: undefined, time: '', onsetHours: 0.5, durationHours: 5, approxDropPerUnit1h: 0.12 }
    ],
    'insulin-naive': []
  };

  const insulinStructureDescriptions: Record<string, { color: string; title: string; desc: string }> = {
    'basal-only': { color: '#059669', title: 'Basal only', desc: 'Single long-acting basal insulin once daily to cover background insulin needs.' },
    'basal-bolus': { color: '#2563EB', title: 'Basal–bolus', desc: 'Combination of long-acting basal plus rapid-acting boluses with meals.' },
    'premixed-bd': { color: '#7C3AED', title: 'Premixed BD', desc: 'Twice-daily premixed insulin covering both basal and bolus components.' },
    'sliding-scale': { color: '#F97316', title: 'Sliding scale', desc: 'Short-acting insulin given according to a sliding scale for hyperglycaemia.' },
    'insulin-naive': { color: '#6B7280', title: 'Insulin naïve', desc: 'No insulin currently prescribed.' }
  };
  const savedMeds = loadMeds();
  // normalize saved meds so older shape with `times` array is collapsed to single `time` (first entry)
  const normalizedSavedMeds = (savedMeds.insulinMeds ?? []).map((m: any) => ({ ...m, time: (m.time ?? (Array.isArray(m.times) && m.times.length ? m.times[0] : '')) , onsetHours: m.onsetHours ?? m.onset, durationHours: m.durationHours ?? m.duration, approxDropPerUnit1h: m.approxDropPerUnit1h ?? m.approxDrop }));
  const [insulinMeds, setInsulinMeds] = useState<InsulinMed[]>(normalizedSavedMeds);
  // load saved steroids from meds storage if present
  const savedSteroids = (savedMeds && (savedMeds as any).steroids) ?? [];
  const [steroids, setSteroids] = useState<Steroid[]>(savedSteroids.map((s:any) => ({ ...s })) );
  const [showSteroidInfo, setShowSteroidInfo] = useState(false);
  const [insulinStructure, setInsulinStructure] = useState<string>(savedSettings.insulinStructure ?? 'basal-only');
  const [pendingStructure, setPendingStructure] = useState<string | null>(null);
  const [showStructureConfirm, setShowStructureConfirm] = useState(false);
  const [showScaleEditor, setShowScaleEditor] = useState(false);
  const [scaleEditingMedId, setScaleEditingMedId] = useState<string | null>(null);
  const [editingScale, setEditingScale] = useState<any | null>(null);
  const savedMedsFull = loadMeds();
  const savedScales = (savedMedsFull && (savedMedsFull as any).scales) ?? [];
  const [scales, setScales] = useState<any[]>(savedScales.map((s:any) => ({ ...s })) );
  // VRII (variable rate insulin infusion) persisted under meds.vrInfusion
  const savedVr = (savedMedsFull && (savedMedsFull as any).vrInfusion) ?? {};
  const [vrInfusion, setVrInfusion] = useState<any>({
    enabled: savedVr.enabled ?? false,
    rate: savedVr.rate ?? '', // units per hour
    concentration: savedVr.concentration ?? '50U/50mL',
    startTime: savedVr.startTime ?? '',
    targetBG: savedVr.targetBG ?? '',
    notes: savedVr.notes ?? ''
  });

  // Non-insulin diabetes meds state (persisted under meds)
  const savedNonInsulin = (savedMedsFull && (savedMedsFull as any).nonInsulin) ?? {};
  // helper: normalise legacy single `time` or array-of-strings into array of objects {time, dose}
  const ensureTimeEntries = (entry: any) => {
    if (!entry) return [] as any[];
    if (Array.isArray(entry.times)) {
      const arr = entry.times;
      if (arr.length === 0) return [] as any[];
      // array might be strings (legacy) or objects
      if (typeof arr[0] === 'string') {
        return (arr as string[]).map(t => ({ time: t, dose: entry.dose ?? '' }));
      }
      return (arr as any[]).map(it => ({ time: it.time ?? (typeof it === 'string' ? it : ''), dose: it.dose ?? '' }));
    }
    if (entry.time) return [{ time: entry.time, dose: entry.dose ?? '' }];
    return [] as any[];
  };

  const [nonInsulinMeds, setNonInsulinMeds] = useState<any>({
  sglt2: { enabled: savedNonInsulin.sglt2?.enabled ?? false, name: (savedNonInsulin.sglt2 && savedNonInsulin.sglt2.name) ? savedNonInsulin.sglt2.name : sglt2List[0], dose: savedNonInsulin.sglt2?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.sglt2) },
  glp1: { enabled: savedNonInsulin.glp1?.enabled ?? false, name: (savedNonInsulin.glp1 && savedNonInsulin.glp1.name) ? savedNonInsulin.glp1.name : glp1List[0], dose: savedNonInsulin.glp1?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.glp1) },
  dpp4: { enabled: savedNonInsulin.dpp4?.enabled ?? false, name: (savedNonInsulin.dpp4 && savedNonInsulin.dpp4.name) ? savedNonInsulin.dpp4.name : dpp4List[0], dose: savedNonInsulin.dpp4?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.dpp4) },
    pioglitazone: { enabled: savedNonInsulin.pioglitazone?.enabled ?? false, name: (savedNonInsulin.pioglitazone && savedNonInsulin.pioglitazone.name) ? savedNonInsulin.pioglitazone.name : 'Pioglitazone', dose: savedNonInsulin.pioglitazone?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.pioglitazone) },
    metformin: { enabled: savedNonInsulin.metformin?.enabled ?? false, dose: savedNonInsulin.metformin?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.metformin) },
    su: { enabled: savedNonInsulin.su?.enabled ?? false, name: savedNonInsulin.su?.name ?? 'Gliclazide', dose: savedNonInsulin.su?.dose ?? '', times: ensureTimeEntries(savedNonInsulin.su) }
  });

  const [showNonInsulinInfo, setShowNonInsulinInfo] = useState(false);
  const [showClinicalInfo, setShowClinicalInfo] = useState(false);

  useEffect(() => {
    // persist scales when they change
  saveMeds({ insulinMeds, steroids, scales, vrInfusion } as any);
  }, [scales]);

  // persist non-insulin meds when they change
  useEffect(() => {
  saveMeds({ insulinMeds, steroids, scales, nonInsulin: nonInsulinMeds, vrInfusion } as any);
  }, [nonInsulinMeds]);

  useEffect(() => {
    if (showScaleEditor && scaleEditingMedId) {
      const med = insulinMeds.find(m => m.id === scaleEditingMedId);
      const linkedScale = med && med.slidingScaleId ? scales.find(s => s.id === med.slidingScaleId) : null;
      if (linkedScale) {
        setEditingScale(JSON.parse(JSON.stringify(linkedScale)));
      } else {
        setEditingScale({ id: uid(), medName: med?.name ?? 'Novorapid', rules: [{ min: 12, max: 15, units: '4' }, { min: 8, max: 11, units: '2' }], notes: '' });
      }
    } else {
      setEditingScale(null);
    }
  }, [showScaleEditor, scaleEditingMedId]);

  function validateScaleRules(rules: Array<{ min?: number; max?: number }>) {
    // ensure no overlap between rules and no gaps where possible
    // We'll sort by min (treat undefined min as -Infinity)
    const normalized = rules.map(r => ({ min: typeof r.min === 'number' ? r.min : -Infinity, max: typeof r.max === 'number' ? r.max : Infinity }));
    normalized.sort((a,b) => a.min - b.min);
    for (let i=1;i<normalized.length;i++) {
      const prev = normalized[i-1];
      const cur = normalized[i];
      if (prev.max >= cur.min) {
        return { valid: false, message: 'Scale ranges overlap or are contiguous; ensure distinct ranges.' };
      }
    }
    return { valid: true };
  }

  function saveScale(scale: any) {
    // upsert
    setScales(prev => {
      const found = prev.findIndex(p => p.id === scale.id);
      if (found >= 0) {
        const next = [...prev]; next[found] = scale; return next;
      }
      return [...prev, scale];
    });
  }

  function linkScaleToMed(scaleId: string, medId: string) {
    setInsulinMeds(prev => prev.map(m => m.id === medId ? { ...m, isSlidingScale: true, slidingScaleId: scaleId, name: `${m.name || 'Novorapid'} (sliding scale)` } : m));
  }

  // helper: get next occurrence Date for a time string 'hh:mm' (today or tomorrow)
  function nextDoseDateForTime(time?: string): Date | null {
    if (!time) return null;
    const [hh, mm] = time.split(':').map(n => Number(n));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (dt.getTime() <= now.getTime()) {
      // schedule tomorrow
      dt.setDate(dt.getDate() + 1);
    }
    return dt;
  }

  function formatRelativeFromNow(target: Date | null) {
    if (!target) return '—';
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const abs = Math.abs(diff);
    const mins = Math.round(abs / 60000);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const parts = [] as string[];
    if (hours) parts.push(`${hours}h`);
    if (remMins) parts.push(`${remMins}m`);
    const s = parts.length ? parts.join(' ') : '0m';
    return diff >= 0 ? `in ${s}` : `${s} ago`;
  }

  function effectWindowHoursForPotency(potency?: string) {
    switch ((potency || '').toLowerCase()) {
      case 'low': return 8;
      case 'moderate': return 24;
      case 'high': return 48;
      default: return 24;
    }
  }

  useEffect(() => {
    saveMeds({ insulinMeds });
  }, [insulinMeds]);

  useEffect(() => {
    // saveMeds typed to accept insulinMeds; pass steroids as any to avoid strict typing here
    saveMeds({ insulinMeds, steroids: steroids as any });
  }, [steroids]);

  useEffect(() => {
    saveReadings(readings);
  }, [readings]);

  useEffect(() => {
    saveSettings({ diabetesType });
  }, [diabetesType]);

  useEffect(() => {
    saveSettings({ clinicalContext });
  }, [clinicalContext]);

  useEffect(() => {
    saveSettings({ insulinStructure });
  }, [insulinStructure]);

  function addRow(withNow = false) {
    const ts = withNow ? new Date().toISOString().slice(0,16) : "";
    setReadings(r => [...r, { id: uid(), ts, value: null, ketones: null }]);
  }

  function updateRow(id: string, patch: Partial<Reading>) {
    setReadings(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function deleteRow(id: string) {
    setReadings(prev => prev.filter(r => r.id !== id));
  }

  function performLoadDemo() {
    try {
  // populate from the richer demo dataset (preserve ketone values when present)
  setReadings(demoData.readings.map(r => ({ id: uid(), ts: r.ts, value: r.value, ketones: (r as any).ketones ?? null })));
  // set diabetes type from demo
  setDiabetesType('t1dm');
    // set clinical context per user request: eGFR 90, weight 75kg, oral intake normal, no metformin/SU, albumin 36, albumin date = today
    const todayDate = new Date().toISOString().slice(0,10);
    setClinicalContext((s:any) => ({
      ...s,
      egfr: 90,
      weightKg: 75,
      carbs: 'normal',
      wardType: 'Medical',
      pregnancy: false,
      age: 35,
      vomiting: false,
  weightChange: 'stable',
      metformin: false,
      metforminDose: '',
      metforminTime: '',
      su: false,
      suName: 'Gliclazide',
      suDose: '',
      albumin: 36,
      albuminDate: todayDate
    }));
    // create premix insulin regimen (two doses)
    const premixItem = insulinCatalog
      .flatMap(g => (g.items || []))
      .find((i: any) => i.name === 'Premix 30/70');
    const premixMed1 = premixItem ? { id: uid(), name: premixItem.name, acting: premixItem.acting, onsetHours: premixItem.onsetHours, durationHours: premixItem.durationHours, approxDropPerUnit1h: premixItem.approxDropPerUnit1h, doseUnits: 20, time: '08:30' } : { id: uid(), name: 'Premix 30/70', acting: 'premix', doseUnits: 20, time: '08:30' };
    const premixMed2 = premixItem ? { id: uid(), name: premixItem.name, acting: premixItem.acting, onsetHours: premixItem.onsetHours, durationHours: premixItem.durationHours, approxDropPerUnit1h: premixItem.approxDropPerUnit1h, doseUnits: 20, time: '18:30' } : { id: uid(), name: 'Premix 30/70', acting: 'premix', doseUnits: 20, time: '18:30' };
    setInsulinMeds([premixMed1, premixMed2]);
  // reflect the preset structure in the UI
  setInsulinStructure('premixed-bd');
    // demo non-insulin meds from demoData.meds
    setNonInsulinMeds({
      sglt2: { enabled: !!(demoData.meds?.sglt2), name: '', dose: '', times: [] },
      glp1: { enabled: false, name: '', dose: '', times: [] },
      dpp4: { enabled: false, name: '', dose: '', times: [] },
      pioglitazone: { enabled: false, name: 'Pioglitazone', dose: '', times: [] },
  su: { enabled: !!(demoData.meds?.su), name: demoData.meds?.suName ?? 'Gliclazide', dose: demoData.meds?.suDose ? String((demoData.meds as any).suDose) : '', times: [] },
  metformin: { enabled: !!(demoData.meds?.metformin), dose: (demoData.meds as any)?.metforminDose ? String((demoData.meds as any).metforminDose) : (demoData.meds?.metformin ? '500' : ''), times: !!(demoData.meds?.metformin) ? [{ time: '08:00', dose: '500' }, { time: '20:00', dose: '500' }] : [] }
    });
    } catch (err) {
      console.error('Failed to load demo', err);
      alert('Failed to load demo data — see console for details');
    }
  }

  function applyInsulinTemplate(key: string) {
    const template = insulinTemplates[key] ?? [];
    // replace current insulinMeds with template copies (new ids already set in template)
    setInsulinMeds(template.map(t => ({ ...t, id: uid() })));
    setInsulinStructure(key);
  }

  // clear only readings
  function clearReadingsOnly() {
    try {
      clearReadings();
      setReadings([]);
    } catch (err) {
      console.error('Failed to clear readings', err);
      alert('Failed to clear readings — see console for details');
    }
  }

  // clear only insulin regimen
  function clearInsulin() {
    try {
      setInsulinMeds([]);
      setInsulinStructure('insulin-naive');
      setVrInfusion({ enabled: false, rate: '', concentration: '50U/50mL', startTime: '', targetBG: '', notes: '' });
    } catch (err) {
      console.error('Failed to clear insulin regimen', err);
      alert('Failed to clear insulin regimen — see console for details');
    }
  }

  // clear only steroids
  function clearSteroidsOnly() {
    try {
      setSteroids([]);
    } catch (err) {
      console.error('Failed to clear steroids', err);
      alert('Failed to clear steroids — see console for details');
    }
  }

  // clear only non-insulin meds
  function clearNonInsulin() {
    try {
      setNonInsulinMeds({
        sglt2: { enabled: false, name: sglt2List[0], dose: '', times: [] },
        glp1: { enabled: false, name: glp1List[0], dose: '', times: [] },
        dpp4: { enabled: false, name: dpp4List[0], dose: '', times: [] },
        pioglitazone: { enabled: false, name: 'Pioglitazone', dose: '', times: [] },
        metformin: { enabled: false, dose: '', times: [] },
        su: { enabled: false, name: 'Gliclazide', dose: '', times: [] }
      });
    } catch (err) {
      console.error('Failed to clear non-insulin meds', err);
      alert('Failed to clear non-insulin meds — see console for details');
    }
  }

  // clear only clinical context
  function clearClinicalContext() {
    try {
      setClinicalContext((s:any) => ({
        ...s,
        egfr: '',
        weightKg: '',
        wardType: '',
        carbs: '',
        pregnancy: false,
        age: '',
        vomiting: false,
        weightChange: '',
        albumin: '',
        albuminDate: ''
      }));
    } catch (err) {
      console.error('Failed to clear clinical context', err);
      alert('Failed to clear clinical context — see console for details');
    }
  }

  function handleLoadDemoClick() {
    // if there are existing readings or meds, confirm before overwriting
    const hasReadings = readings && readings.length > 0;
    const hasMeds = insulinMeds && insulinMeds.length > 0;
    if (hasReadings || hasMeds) {
      setShowDemoConfirm(true);
      return;
    }
    performLoadDemo();
  }

  // export functions removed

  function clearAll() {
    try {
      clearReadings();
      setReadings([]);
  setInsulinMeds([]);
  setInsulinStructure('insulin-naive');
      setSteroids([]);
      setNonInsulinMeds({
        sglt2: { enabled: false, name: '', dose: '', times: [] },
        glp1: { enabled: false, name: '', dose: '', times: [] },
        dpp4: { enabled: false, name: '', dose: '', times: [] },
        pioglitazone: { enabled: false, name: 'Pioglitazone', dose: '', times: [] },
        metformin: { enabled: false, dose: '', times: [] },
        su: { enabled: false, name: 'Gliclazide', dose: '', times: [] }
      });
      // reset clinical context to blank values (avoid introducing defaults that may be inaccurate)
      setClinicalContext((s:any) => ({
        ...s,
        egfr: '',
        weightKg: '',
        wardType: '',
        carbs: '',
        metformin: false,
        metforminDose: '',
        metforminTime: '',
        su: false,
        suName: 'Gliclazide',
        suDose: '',
        pregnancy: false,
        age: '',
        vomiting: false,
        weightChange: '',
        albumin: '',
        albuminDate: ''
      }));
    } catch (err) {
      console.error('Failed to clear data', err);
      alert('Failed to clear data — see console for details');
    }
  }

  return (
    <>
      <CssBaseline />
      <AppBar position="fixed" color="primary" enableColorOnDark>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
          <Typography variant="h6" sx={{ pl: 1 }}>
            Inpatient Diabetes Advisor — Prototype
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="inherit" onClick={handleLoadDemoClick} startIcon={<ContentCopyIcon />}>Load Demo</Button>
            <Button variant="outlined" color="inherit" onClick={clearAll} startIcon={<RestartAltIcon />}>Clear</Button>
            <Button variant="outlined" color="inherit" onClick={() => setDataCheckerOpen(true)}>Data Checker</Button>
          </Stack>
        </Toolbar>
      </AppBar>

  {/* Spacer so page content isn't hidden under fixed AppBar */}
  <Toolbar />

  <Container maxWidth="lg" sx={{ mt: 2 }}>

        {/* readings section (below) */}
        {/* Diabetes type card (moved from App.jsx) */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <div>
              <Typography variant="subtitle1">Diabetes type</Typography>
              <Typography variant="caption" color="text.secondary">Select the patient’s diabetes type</Typography>
            </div>
            <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
              <Button variant={diabetesType === 't1dm' ? 'contained' : 'outlined'} onClick={() => setDiabetesType('t1dm')}>T1DM</Button>
              <Button variant={diabetesType === 't2dm' ? 'contained' : 'outlined'} onClick={() => setDiabetesType('t2dm')}>T2DM</Button>
              <Button variant={diabetesType === 'steroid-induced' ? 'contained' : 'outlined'} onClick={() => setDiabetesType('steroid-induced')}>Steroid-induced</Button>
              <Button variant={diabetesType === 'pancreatogenic' ? 'contained' : 'outlined'} onClick={() => setDiabetesType('pancreatogenic')}>Pancreatogenic</Button>
              <Button variant={diabetesType === 'other' ? 'contained' : 'outlined'} onClick={() => setDiabetesType('other')}>Other</Button>
            </Stack>
          </Stack>
        </Paper>

        <Dialog open={showNonInsulinInfo} onClose={() => setShowNonInsulinInfo(false)} maxWidth="md" fullWidth>
          <DialogTitle>Non-insulin diabetic medications — information</DialogTitle>
          <DialogContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Drug classes</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell>Examples</TableCell>
                    <TableCell>Typical dose</TableCell>
                    <TableCell>Key effects / notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="SGLT2" size="small" sx={{ bgcolor: '#7C3AED', color: '#fff' }} /></TableCell>
                    <TableCell>{sglt2List.join(', ')}</TableCell>
                    <TableCell>10–25 mg (varies)</TableCell>
                    <TableCell>Lower glucose via urinary glucose excretion; risk of DKA (euglycaemic). Avoid in low eGFR.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="GLP-1" size="small" sx={{ bgcolor: '#2563EB', color: '#fff' }} /></TableCell>
                    <TableCell>{glp1List.join(', ')}</TableCell>
                    <TableCell>Weekly or daily injectable doses (varies by agent)</TableCell>
                    <TableCell>Promote weight loss, reduce glucose; often injectable; GI side effects common.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="DPP-4" size="small" sx={{ bgcolor: '#059669', color: '#fff' }} /></TableCell>
                    <TableCell>{dpp4List.join(', ')}</TableCell>
                    <TableCell>100 mg (varies)</TableCell>
                    <TableCell>Oral, well tolerated; modest glucose-lowering; low hypoglycaemia risk.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="Pioglitazone" size="small" sx={{ bgcolor: '#6B7280', color: '#fff' }} /></TableCell>
                    <TableCell>{pioglitazoneList.join(', ')}</TableCell>
                    <TableCell>15–45 mg once daily</TableCell>
                    <TableCell>Can cause fluid retention and weight gain; caution in heart failure.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowNonInsulinInfo(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Clinical context card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Clinical context</Typography>
            <Typography variant="caption" color="text.secondary">Patient factors: renal function, weight, nutrition and other meds</Typography>
          </Stack>

          <Stack spacing={2}>
            {/* Lab results grouped */}
            <Stack direction="column" spacing={0.5}>
              <Typography variant="caption">Lab results</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField label="eGFR (mL/min/1.73m2)" type="number" size="small" value={clinicalContext.egfr ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, egfr: e.target.value }))} sx={{ minWidth: 140 }} />
                <TextField label="Albumin (g/L)" size="small" type="number" value={clinicalContext.albumin ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, albumin: e.target.value }))} sx={{ minWidth: 140 }} />
                <TextField label="Albumin date" size="small" type="date" InputLabelProps={{ shrink: true }} value={clinicalContext.albuminDate ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, albuminDate: e.target.value }))} sx={{ minWidth: 160 }} />
              </Stack>
            </Stack>

            {/* Weight grouping */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="column" spacing={0.3} sx={{ minWidth: 140 }}>
                <Typography variant="caption">Weight</Typography>
                <TextField label="Weight (kg)" type="number" size="small" value={clinicalContext.weightKg ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, weightKg: e.target.value }))} />
              </Stack>
              <Stack direction="column" spacing={0.3} sx={{ minWidth: 160 }}>
                <Typography variant="caption">Weight change</Typography>
                <FormControl size="small" fullWidth>
                  <Select value={clinicalContext.weightChange ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, weightChange: e.target.value }))} displayEmpty inputProps={{ 'aria-label': 'Weight change' }}>
                    <MenuItem value="" disabled><em>Select weight change…</em></MenuItem>
                    <MenuItem value="stable">Stable weight</MenuItem>
                    <MenuItem value="loss">Recent weight loss</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {/* Nutrition and ward */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="column" spacing={0.3} sx={{ minWidth: 160 }}>
                <Typography variant="caption">Oral intake</Typography>
                <FormControl size="small" fullWidth>
                  <Select value={clinicalContext.carbs ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, carbs: e.target.value }))} displayEmpty inputProps={{ 'aria-label': 'Oral intake' }}>
                    <MenuItem value="" disabled><em>Select oral intake…</em></MenuItem>
                    <MenuItem value="normal">Normal diet</MenuItem>
                    <MenuItem value="reduced">Reduced intake</MenuItem>
                    <MenuItem value="variable">Variable intake</MenuItem>
                    <MenuItem value="enteral">Enteral feeding</MenuItem>
                    <MenuItem value="tpn">TPN</MenuItem>
                    <MenuItem value="npo">Nil by mouth</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="column" spacing={0.3} sx={{ minWidth: 140 }}>
                <Typography variant="caption">Ward type</Typography>
                <FormControl size="small" fullWidth>
                  <Select value={clinicalContext.wardType ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, wardType: e.target.value }))} displayEmpty inputProps={{ 'aria-label': 'Ward type' }}>
                    <MenuItem value="" disabled><em>Select ward type…</em></MenuItem>
                    <MenuItem value="Surgical">Surgical</MenuItem>
                    <MenuItem value="Medical">Medical</MenuItem>
                    <MenuItem value="ICU">ICU</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {/* Other context */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel control={<Checkbox checked={clinicalContext.pregnancy ?? false} onChange={(e) => setClinicalContext((s:any) => ({ ...s, pregnancy: e.target.checked }))} />} label="Pregnancy" />
              <TextField label="Age" type="number" size="small" value={clinicalContext.age ?? ''} onChange={(e) => setClinicalContext((s:any) => ({ ...s, age: e.target.value === '' ? '' : Number(e.target.value) }))} />
              <FormControlLabel control={<Checkbox checked={clinicalContext.vomiting ?? false} onChange={(e) => setClinicalContext((s:any) => ({ ...s, vomiting: e.target.checked }))} />} label="Vomiting" />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => setShowClinicalInfo(true)}>Show clinical context</Button>
              <Button color="error" onClick={clearClinicalContext}>Clear clinical context</Button>
            </Stack>
          </Stack>
        </Paper>

        <Dialog open={showClinicalInfo} onClose={() => setShowClinicalInfo(false)} maxWidth="md" fullWidth>
          <DialogTitle>Clinical context — why this information matters</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Why it matters</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><Chip label="eGFR" size="small" sx={{ bgcolor: '#7C3AED', color: '#fff' }} /></TableCell>
                  <TableCell>Renal function affects dosing and suitability of some agents (e.g., SGLT2 efficacy and safety).</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Weight" size="small" sx={{ bgcolor: '#059669', color: '#fff' }} /></TableCell>
                  <TableCell>Useful for dosing decisions and to identify malnutrition or changes that may affect glucose control.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Ward" size="small" sx={{ bgcolor: '#2563EB', color: '#fff' }} /></TableCell>
                  <TableCell>ICU or surgical patients may require different management strategies and monitoring intensity.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Pregnancy" size="small" sx={{ bgcolor: '#D14343', color: '#fff' }} /></TableCell>
                  <TableCell>Pregnancy changes insulin sensitivity and contraindicates some oral agents; requires obstetric input.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Age" size="small" sx={{ bgcolor: '#F97316', color: '#fff' }} /></TableCell>
                  <TableCell>Age affects risks from hypoglycaemia and choice of agents; frailty may alter targets.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Vomiting" size="small" sx={{ bgcolor: '#059669', color: '#fff' }} /></TableCell>
                  <TableCell>Vomiting may reduce oral intake and increase hypoglycaemia risk; may require IV fluids/insulin adjustments.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Albumin" size="small" sx={{ bgcolor: '#6B7280', color: '#fff' }} /></TableCell>
                  <TableCell>Low albumin can indicate malnutrition or illness severity and influence drug binding for certain meds.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowClinicalInfo(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <ScienceIcon color="primary" />
            <div>
              <Typography variant="subtitle1">Blood glucose readings</Typography>
              <Typography variant="caption" color="text.secondary">Enter capillary or lab values (mmol/L) with timestamps (local time).</Typography>
            </div>
          </Stack>

          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>Time (local)</TableCell>
                  <TableCell sx={{ width: '25%' }}>Glucose (mmol/L)</TableCell>
                  <TableCell sx={{ width: '20%' }}>Ketones (mmol/L)</TableCell>
                  <TableCell align="right" sx={{ width: '15%' }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {readings.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <TextField
                        type="datetime-local"
                        value={r.ts}
                        onChange={(e) => updateRow(r.id, { ts: e.target.value })}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        type="number"
                        inputProps={{ step: "0.1", min: "0" }}
                        value={r.value == null ? "" : String(r.value)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { value: v === "" ? null : Number(v) });
                        }}
                        size="small"
                        fullWidth
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        type="number"
                        inputProps={{ step: "0.1", min: "0" }}
                        value={r.ketones == null ? "" : String(r.ketones)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, { ketones: v === "" ? null : Number(v) });
                        }}
                        size="small"
                        fullWidth
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Delete">
                        <IconButton onClick={() => deleteRow(r.id)} size="small"><DeleteIcon /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {readings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No readings yet — add a row or use the toolbar Load Demo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => addRow(false)}>Add row</Button>
            <Button color="error" onClick={clearReadingsOnly}>Clear readings</Button>
          </Stack>
        </Paper>

        {/* Insulin regimen card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Insulin regimen</Typography>
            <Typography variant="caption" color="text.secondary">Add insulin types, doses and administration times.</Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button variant={insulinStructure === 'basal-only' ? 'contained' : 'outlined'} onClick={() => { if (!insulinMeds || insulinMeds.length === 0) { applyInsulinTemplate('basal-only'); } else { setPendingStructure('basal-only'); setShowStructureConfirm(true); } }}>Basal only</Button>
            <Button variant={insulinStructure === 'basal-bolus' ? 'contained' : 'outlined'} onClick={() => { if (!insulinMeds || insulinMeds.length === 0) { applyInsulinTemplate('basal-bolus'); } else { setPendingStructure('basal-bolus'); setShowStructureConfirm(true); } }}>Basal–bolus</Button>
            <Button variant={insulinStructure === 'premixed-bd' ? 'contained' : 'outlined'} onClick={() => { if (!insulinMeds || insulinMeds.length === 0) { applyInsulinTemplate('premixed-bd'); } else { setPendingStructure('premixed-bd'); setShowStructureConfirm(true); } }}>Premixed BD</Button>
            <Button variant={insulinStructure === 'sliding-scale' ? 'contained' : 'outlined'} onClick={() => { if (!insulinMeds || insulinMeds.length === 0) { applyInsulinTemplate('sliding-scale'); } else { setPendingStructure('sliding-scale'); setShowStructureConfirm(true); } }}>Sliding scale</Button>
            <Button variant={insulinStructure === 'insulin-naive' ? 'contained' : 'outlined'} onClick={() => { if (!insulinMeds || insulinMeds.length === 0) { applyInsulinTemplate('insulin-naive'); } else { setPendingStructure('insulin-naive'); setShowStructureConfirm(true); } }}>Insulin naïve</Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Dose (units)</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {insulinMeds.map(m => {
                const isSliding = String(m.name || '').toLowerCase().includes('sliding');
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 300 }}>
                        <InputLabel id={`insulin-name-${m.id}-label`}>Insulin</InputLabel>
                        <Select
                          labelId={`insulin-name-${m.id}-label`}
                          id={`insulin-name-${m.id}`}
                          value={m.name ?? ''}
                          label="Insulin"
                          onChange={(e) => {
                            const newName = (e.target as HTMLInputElement).value;
                            let found = null as null | { name: string; acting: string; onsetHours?: number; durationHours?: number; approxDropPerUnit1h?: number };
                            for (const g of insulinCatalog) {
                              for (const it of (g as any).items) {
                                if (it.name === newName) { found = it; break; }
                              }
                              if (found) break;
                            }
                            const acting = found ? found.acting : '';
                            const onsetHours = found ? (found.onsetHours ?? undefined) : undefined;
                            const durationHours = found ? (found.durationHours ?? undefined) : undefined;
                            const approxDropPerUnit1h = found ? (found.approxDropPerUnit1h ?? undefined) : undefined;
                            setInsulinMeds(prev => prev.map(x => x.id===m.id?{...x,name:newName, acting, onsetHours, durationHours, approxDropPerUnit1h}:x));
                          }}
                          inputProps={{ 'aria-label': 'Insulin' }}
                        >
                          <MenuItem value="" disabled><em>Select insulin…</em></MenuItem>
                          {insulinCatalog.flatMap((group: any) => [
                            <MenuItem key={`header-${group.group}`} disabled sx={{ fontWeight: 'bold', opacity: 1 }}>{group.group}</MenuItem>,
                            ...group.items.map((i: any) => (
                              <MenuItem key={i.name} value={i.name}>{`${i.name} — onset ${i.onsetHours}h, duration ${i.durationHours ?? '—'}h`}</MenuItem>
                            ))
                          ])}
                          {m.name && !insulinCatalog.flatMap((g:any) => g.items.map((it:any)=>it.name)).includes(m.name) && (
                            <MenuItem value={m.name}>{m.name}</MenuItem>
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      {isSliding ? (
                        <Typography variant="body2">variable — see scale</Typography>
                      ) : (
                        <TextField size="small" type="number" value={m.doseUnits ?? ''} onChange={(e) => setInsulinMeds(prev => prev.map(x => x.id===m.id?{...x,doseUnits: e.target.value === '' ? undefined : Number(e.target.value)}:x))} />
                      )}
                    </TableCell>

                    <TableCell>
                      {isSliding ? (
                        <Chip label="PRN" size="small" color="warning" />
                      ) : (
                        <TextField size="small" type="time" value={m.time ?? ''} onChange={(e) => setInsulinMeds(prev => prev.map(x => x.id===m.id?{...x, time: e.target.value}:x))} />
                      )}
                    </TableCell>

                    <TableCell align="right">
                      {isSliding ? (
                        <>
                          <Button size="small" onClick={() => { setScaleEditingMedId(m.id); setShowScaleEditor(true); }}>Edit scale</Button>
                          <IconButton size="small" onClick={() => setInsulinMeds(prev => prev.filter(x=>x.id!==m.id))}><DeleteIcon /></IconButton>
                        </>
                      ) : (
                        <IconButton size="small" onClick={() => setInsulinMeds(prev => prev.filter(x=>x.id!==m.id))}><DeleteIcon /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setInsulinMeds(prev => [...prev, { id: uid(), name: '', acting: 'long', onsetHours: 1, doseUnits: undefined, times: [] }])}>Add insulin</Button>
            <Button variant="outlined" onClick={() => setShowInsulinInfo(true)}>Show insulin info</Button>
            <Button color="error" onClick={clearInsulin}>Clear insulin</Button>
          </Stack>

          {/* Variable Rate Insulin Infusion (VRII) compact UI */}
          <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel control={<Checkbox checked={vrInfusion.enabled ?? false} onChange={(e) => setVrInfusion((s:any) => ({ ...s, enabled: e.target.checked }))} />} label="Variable rate insulin infusion (VRII)" />
              {vrInfusion.enabled && (
                <>
                  <TextField size="small" label="Rate (U/hr)" value={vrInfusion.rate ?? ''} onChange={(e) => setVrInfusion((s:any) => ({ ...s, rate: e.target.value }))} sx={{ width: 120 }} />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="vr-conc-label">Concentration</InputLabel>
                    <Select labelId="vr-conc-label" value={vrInfusion.concentration ?? '50U/50mL'} label="Concentration" onChange={(e) => setVrInfusion((s:any) => ({ ...s, concentration: e.target.value }))}>
                      <MenuItem value="50U/50mL">50U/50mL</MenuItem>
                      <MenuItem value="100U/100mL">100U/100mL</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Target BG (mmol/L)" value={vrInfusion.targetBG ?? ''} onChange={(e) => setVrInfusion((s:any) => ({ ...s, targetBG: e.target.value }))} sx={{ width: 140 }} />
                </>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => { setVrInfusion({ enabled: false, rate: '', concentration: '50U/50mL', startTime: '', targetBG: '', notes: '' }); }}>Clear VRII</Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Steroid therapy card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Steroid therapy</Typography>
            <Typography variant="caption" color="text.secondary">Add common oral steroids, doses and administration times.</Typography>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Dose (mg)</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {steroids.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 300 }}>
                      <InputLabel id={`steroid-name-${s.id}-label`}>Steroid</InputLabel>
                      <Select
                        labelId={`steroid-name-${s.id}-label`}
                        id={`steroid-name-${s.id}`}
                        value={s.name ?? ''}
                        label="Steroid"
                        onChange={(e) => {
                          const newName = (e.target as HTMLSelectElement).value;
                          const found = steroidCatalog.find(sc => sc.name === newName);
                          const potency = found ? (found.potency as any) : '';
                          const effectSummary = found ? found.effectSummary : '';
                          setSteroids(prev => prev.map(x => x.id===s.id?{...x,name:newName,potency,effectSummary}:x));
                        }}
                        inputProps={{ 'aria-label': 'Steroid' }}
                      >
                        <MenuItem value="" disabled><em>Select steroid…</em></MenuItem>
                        {steroidCatalog.map((st) => (
                          <MenuItem key={st.name} value={st.name}>{`${st.name} — potency ${st.potency}, typical ${st.typicalDoseMg} mg`}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={s.doseMg ?? ''} onChange={(e) => setSteroids(prev => prev.map(x => x.id===s.id?{...x,doseMg: e.target.value === '' ? undefined : Number(e.target.value)}:x))} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="time" value={s.time ?? ''} onChange={(e) => setSteroids(prev => prev.map(x => x.id===s.id?{...x, time: e.target.value}:x))} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setSteroids(prev => prev.filter(x=>x.id!==s.id))}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setSteroids(prev => [...prev, { id: uid(), name: '', doseMg: undefined, time: '', potency: 'moderate', effectSummary: '' }])}>Add steroid</Button>
            <Button variant="outlined" onClick={() => setShowSteroidInfo(true)}>Show steroid info</Button>
            <Button color="error" onClick={clearSteroidsOnly}>Clear steroids</Button>
          </Stack>
        </Paper>

        {/* Non-Insulin diabetes meds */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', width: '100%' }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Non-Insulin Diabetes Meds</Typography>
            <Typography variant="caption" color="text.secondary">SGLT2, GLP-1, DPP-4 and Pioglitazone — record use, exact agent, dose and timing.</Typography>
          </Stack>

          <Stack spacing={2}>
            {/* SGLT2 */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.sglt2.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                const existing = s.sglt2 || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                const name = existing.name || sglt2List[0];
                return { ...s, sglt2: { ...existing, enabled, times, name } };
              })} />} label="SGLT2 inhibitor" />
              {nonInsulinMeds.sglt2.enabled && (
                <>
                  <FormControl size="small">
                    <Select value={nonInsulinMeds.sglt2.name} onChange={(e) => setNonInsulinMeds((s:any) => ({ ...s, sglt2: { ...s.sglt2, name: e.target.value } }))}>
                      {sglt2List.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <DoseSchedule
                    entries={(nonInsulinMeds.sglt2.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                    onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, sglt2: { ...s.sglt2, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                    allowPerTimeDose={true}
                    addLabel="Add SGLT2 time"
                  />
                </>
              )}
            </Stack>

            {/* GLP-1 */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.glp1.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                const existing = s.glp1 || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                const name = existing.name || glp1List[0];
                return { ...s, glp1: { ...existing, enabled, times, name } };
              })} />} label="GLP-1 analogue" />
              {nonInsulinMeds.glp1.enabled && (
                <>
                  <FormControl size="small">
                    <Select value={nonInsulinMeds.glp1.name} onChange={(e) => setNonInsulinMeds((s:any) => ({ ...s, glp1: { ...s.glp1, name: e.target.value } }))}>
                      {glp1List.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <DoseSchedule
                    entries={(nonInsulinMeds.glp1.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                    onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, glp1: { ...s.glp1, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                    allowPerTimeDose={true}
                    addLabel="Add GLP-1 time"
                  />
                </>
              )}
            </Stack>

            {/* DPP-4 */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.dpp4.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                const existing = s.dpp4 || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                const name = existing.name || dpp4List[0];
                return { ...s, dpp4: { ...existing, enabled, times, name } };
              })} />} label="DPP-4 inhibitor" />
              {nonInsulinMeds.dpp4.enabled && (
                <>
                  <FormControl size="small">
                    <Select value={nonInsulinMeds.dpp4.name} onChange={(e) => setNonInsulinMeds((s:any) => ({ ...s, dpp4: { ...s.dpp4, name: e.target.value } }))}>
                      {dpp4List.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <DoseSchedule
                    entries={(nonInsulinMeds.dpp4.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                    onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, dpp4: { ...s.dpp4, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                    allowPerTimeDose={true}
                    addLabel="Add DPP-4 time"
                  />
                </>
              )}
            </Stack>

            {/* Pioglitazone */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.pioglitazone.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                const existing = s.pioglitazone || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                const name = existing.name || 'Pioglitazone';
                return { ...s, pioglitazone: { ...existing, enabled, times, name } };
              })} />} label="Pioglitazone" />
              {nonInsulinMeds.pioglitazone.enabled && (
                <DoseSchedule
                  entries={(nonInsulinMeds.pioglitazone.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                  onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, pioglitazone: { ...s.pioglitazone, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                  allowPerTimeDose={true}
                  addLabel="Add pioglitazone time"
                />
              )}
            </Stack>

            {/* Metformin */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.metformin.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                // if enabling and no times exist, create an initial entry using any existing dose
                const existing = s.metformin || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                return { ...s, metformin: { ...existing, enabled, times } };
              })} />} label="Metformin" />
              {nonInsulinMeds.metformin.enabled && (
                <DoseSchedule
                  entries={(nonInsulinMeds.metformin.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                  onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, metformin: { ...s.metformin, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                  allowPerTimeDose={true}
                  addLabel="Add metformin time"
                />
              )}
            </Stack>

            {/* Sulfonylurea */}
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <FormControlLabel control={<Checkbox checked={nonInsulinMeds.su.enabled} onChange={(e) => setNonInsulinMeds((s:any) => {
                const enabled = e.target.checked;
                const existing = s.su || {};
                const times = (existing.times && existing.times.length) ? existing.times : (enabled ? [{ time: '', dose: existing.dose ?? '' }] : []);
                return { ...s, su: { ...existing, enabled, times } };
              })} />} label="Sulfonylurea (SU)" />
              {nonInsulinMeds.su.enabled && (
                <>
                  <FormControl size="small">
                    <Select value={nonInsulinMeds.su.name} onChange={(e) => setNonInsulinMeds((s:any) => ({ ...s, su: { ...s.su, name: e.target.value } }))}>
                      <MenuItem value="Gliclazide">Gliclazide</MenuItem>
                      <MenuItem value="Glipizide">Glipizide</MenuItem>
                      <MenuItem value="Glibenclamide">Glibenclamide</MenuItem>
                    </Select>
                  </FormControl>
                  <DoseSchedule
                    entries={(nonInsulinMeds.su.times || []).map((it:any) => ({ time: it.time ?? '', dose: it.dose ?? '' }))}
                    onChange={(next) => setNonInsulinMeds((s:any) => ({ ...s, su: { ...s.su, times: next.map((e:any) => ({ time: e.time, dose: e.dose ?? '' })) } }))}
                    allowPerTimeDose={true}
                    addLabel="Add SU time"
                  />
                </>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => setShowNonInsulinInfo(true)}>Show non-insulin diabetic med info</Button>
              <Button color="error" onClick={clearNonInsulin}>Clear non-insulin meds</Button>
            </Stack>
          </Stack>
        </Paper>

        <Dialog open={showSteroidInfo} onClose={() => setShowSteroidInfo(false)} maxWidth="md" fullWidth>
          <DialogTitle>Steroid information</DialogTitle>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Common oral steroids</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Medication</TableCell>
                  <TableCell>Potency</TableCell>
                  <TableCell>Typical dose (mg)</TableCell>
                  <TableCell>Glycaemic effect</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {steroidCatalog.map(sc => (
                  <TableRow key={sc.name}>
                    <TableCell>{sc.name}</TableCell>
                    <TableCell>
                      <Chip label={sc.potency} size="small" sx={{ bgcolor: sc.potency === 'high' ? '#D14343' : sc.potency === 'moderate' ? '#F97316' : '#059669', color: '#fff' }} />
                    </TableCell>
                    <TableCell>{sc.typicalDoseMg}</TableCell>
                    <TableCell>{sc.effectSummary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Selected steroids</Typography>
            {steroids.length === 0 ? (
              <Typography color="text.secondary">No steroids recorded.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dose (mg)</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Next dose</TableCell>
                    <TableCell>When</TableCell>
                    <TableCell>Potency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {steroids.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name || '—'}</TableCell>
                      <TableCell>{s.doseMg ?? '—'}</TableCell>
                      <TableCell>{s.time ?? '—'}</TableCell>
                      <TableCell>{(() => {
                        const nd = nextDoseDateForTime(s.time);
                        return nd ? nd.toLocaleString() : '—';
                      })()}</TableCell>
                      <TableCell>{formatRelativeFromNow(nextDoseDateForTime(s.time))}</TableCell>
                      <TableCell>
                        <Chip label={s.potency || '—'} size="small" sx={{ bgcolor: s.potency === 'high' ? '#D14343' : s.potency === 'moderate' ? '#F97316' : '#059669', color: '#fff' }} />
                        <Typography variant="caption" sx={{ display: 'block' }}>{`Effect ~ ${effectWindowHoursForPotency(s.potency)}h`}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSteroidInfo(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showInsulinInfo} onClose={() => setShowInsulinInfo(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Insulin information</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle1">Regimen structure: {insulinStructure === 'basal-only' ? 'Basal only' : insulinStructure === 'basal-bolus' ? 'Basal–bolus' : insulinStructure === 'premixed-bd' ? 'Premixed BD' : insulinStructure === 'sliding-scale' ? 'Sliding scale' : 'Insulin naïve'}</Typography>

            <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>Structure descriptions</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Structure</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(insulinStructureDescriptions).map(([k,v]) => (
                  <TableRow key={k}>
                    <TableCell><Chip label={v.title} size="small" sx={{ bgcolor: v.color, color: '#fff' }} /></TableCell>
                    <TableCell>{v.desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="h6" sx={{ mb: 1 }}>Catalog</Typography>
            {insulinCatalog.map((group: any) => (
              <Paper key={group.group} variant="outlined" sx={{ mb: 2, p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.group}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Medication</TableCell>
                      <TableCell>Acting</TableCell>
                      <TableCell>Onset (h)</TableCell>
                      <TableCell>Duration (h)</TableCell>
                      <TableCell>Approx drop (mmol/L per unit /1h)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((it: any) => (
                      <TableRow key={it.name}>
                        <TableCell>{it.name}</TableCell>
                        <TableCell>
                          <Chip label={it.acting || '—'} size="small" sx={{ bgcolor: actingColor(it.acting), color: '#fff' }} />
                        </TableCell>
                        <TableCell>{it.onsetHours ?? '—'}</TableCell>
                        <TableCell>{it.durationHours ?? '—'}</TableCell>
                        <TableCell>{it.approxDropPerUnit1h ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ))}

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Selected medications</Typography>
            {insulinMeds.length === 0 ? (
              <Typography color="text.secondary">No medications selected.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Acting</TableCell>
                    <TableCell>Dose (units)</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Onset (h)</TableCell>
                    <TableCell>Duration (h)</TableCell>
                    <TableCell>Approx drop (1h)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insulinMeds.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name || '—'}</TableCell>
                      <TableCell><Chip label={m.acting || '—'} size="small" sx={{ bgcolor: actingColor(m.acting), color: '#fff' }} /></TableCell>
                      <TableCell>{m.doseUnits ?? '—'}</TableCell>
                      <TableCell>{m.time ?? '—'}</TableCell>
                      <TableCell>{m.onsetHours ?? '—'}</TableCell>
                      <TableCell>{m.durationHours ?? '—'}</TableCell>
                      <TableCell>{m.approxDropPerUnit1h ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInsulinInfo(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showDemoConfirm} onClose={() => setShowDemoConfirm(false)}>
          <DialogTitle>Overwrite existing data?</DialogTitle>
          <DialogContent>
            <Typography>Loading the demo will overwrite current readings and insulin regimen. Continue?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDemoConfirm(false)}>Cancel</Button>
            <Button onClick={() => { setShowDemoConfirm(false); performLoadDemo(); }} autoFocus>Yes, overwrite</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showStructureConfirm} onClose={() => { setShowStructureConfirm(false); setPendingStructure(null); }}>
          <DialogTitle>Apply insulin template?</DialogTitle>
          <DialogContent>
            <Typography>Applying a template will replace the current insulin rows with the selected regimen template. Continue?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setShowStructureConfirm(false); setPendingStructure(null); }}>Cancel</Button>
            <Button onClick={() => { if (pendingStructure) { applyInsulinTemplate(pendingStructure); } setShowStructureConfirm(false); setPendingStructure(null); }} autoFocus>Yes, apply</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showScaleEditor} onClose={() => { setShowScaleEditor(false); setScaleEditingMedId(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Edit sliding scale</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Define BG ranges and the units of Novorapid to give for each range. Min or max can be left blank to indicate open-ended.</Typography>
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>Editing for med id: {scaleEditingMedId ?? '—'}</Typography>

            {/* Find the scale linked to this med (if any) */}
            {editingScale ? (
              <div>
                <TextField fullWidth label="Scale name" size="small" value={editingScale.medName} sx={{ mb: 1 }} onChange={(e) => setEditingScale((s:any) => ({ ...s, medName: e.target.value }))} />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>BG min</TableCell>
                      <TableCell>BG max</TableCell>
                      <TableCell>Units</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editingScale.rules.map((r: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell><TextField size="small" type="number" value={r.min ?? ''} onChange={(e) => setEditingScale((s:any) => { const next = { ...s }; next.rules[idx].min = e.target.value === '' ? undefined : Number(e.target.value); return next; })} /></TableCell>
                        <TableCell><TextField size="small" type="number" value={r.max ?? ''} onChange={(e) => setEditingScale((s:any) => { const next = { ...s }; next.rules[idx].max = e.target.value === '' ? undefined : Number(e.target.value); return next; })} /></TableCell>
                        <TableCell><TextField size="small" value={r.units} onChange={(e) => setEditingScale((s:any) => { const next = { ...s }; next.rules[idx].units = e.target.value; return next; })} /></TableCell>
                        <TableCell><Button size="small" onClick={() => setEditingScale((s:any) => { const next = { ...s }; next.rules = next.rules.filter((_:any, i:number) => i !== idx); return next; })}>Remove</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button sx={{ mt: 1 }} onClick={() => setEditingScale((s:any) => ({ ...s, rules: [...s.rules, { min: undefined, max: undefined, units: '' }] }))}>Add rule</Button>
              </div>
            ) : (
              <Typography color="text.secondary">No scale ready to edit.</Typography>
            )}

          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setShowScaleEditor(false); setScaleEditingMedId(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (!editingScale) { setShowScaleEditor(false); setScaleEditingMedId(null); return; }
              const rulesForValidation = editingScale.rules.map((r:any) => ({ min: r.min, max: r.max }));
              const v = validateScaleRules(rulesForValidation);
              if (!v.valid) {
                // TODO: show user-visible error; for now console.warn
                console.warn('Scale validation failed:', v.message);
                return;
              }
              // save and link
              saveScale(editingScale);
              if (scaleEditingMedId) linkScaleToMed(editingScale.id, scaleEditingMedId);
              setShowScaleEditor(false);
              setScaleEditingMedId(null);
            }} autoFocus>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Simple Data Checker dialog placeholder */}
        <Dialog open={dataCheckerOpen} onClose={() => setDataCheckerOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Data checker — summary</DialogTitle>
          <DialogContent>
            {/* Summary info */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Diabetes type</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>{
              diabetesType === 't1dm' ? 'T1DM' :
              diabetesType === 't2dm' ? 'T2DM' :
              diabetesType === 'steroid-induced' ? 'Steroid-induced' :
              diabetesType === 'pancreatogenic' ? 'Pancreatogenic' :
              'Other'
            }</Typography>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Insulin regimen — {insulinStructure === 'basal-only' ? 'Basal only' : insulinStructure === 'basal-bolus' ? 'Basal–bolus' : insulinStructure === 'premixed-bd' ? 'Premixed BD' : insulinStructure === 'sliding-scale' ? 'Sliding scale' : 'Insulin naïve'}</Typography>
            {insulinMeds.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No insulin medications configured.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dose (units)</TableCell>
                    <TableCell>Times</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insulinMeds.map(m => (
                    <TableRow key={m.id}>
                      <TableCell sx={{ fontSize: 13 }}>{m.acting || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{m.name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{m.doseUnits == null ? '—' : String(m.doseUnits)}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{m.time ? m.time : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Clinical context</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableBody>
                <TableRow>
                  <TableCell>eGFR (mL/min/1.73m2)</TableCell>
                  <TableCell>{clinicalContext.egfr ?? '\u2014'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Weight (kg)</TableCell>
                  <TableCell>{clinicalContext.weightKg ?? '\u2014'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ward type</TableCell>
                  <TableCell>{clinicalContext.wardType ?? '\u2014'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pregnancy</TableCell>
                  <TableCell>{clinicalContext.pregnancy ? 'Yes' : 'No'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Age</TableCell>
                  <TableCell>{clinicalContext.age ?? '\u2014'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vomiting</TableCell>
                  <TableCell>{clinicalContext.vomiting ? 'Yes' : 'No'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Weight change</TableCell>
                  <TableCell>{clinicalContext.weightChange === 'loss' ? 'Recent weight loss' : (clinicalContext.weightChange === 'stable' ? 'Stable weight' : '\u2014')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Oral intake</TableCell>
                  <TableCell>{
                    clinicalContext.carbs === 'normal' ? 'Normal diet' :
                    clinicalContext.carbs === 'reduced' ? 'Reduced intake' :
                    clinicalContext.carbs === 'variable' ? 'Variable intake' :
                    clinicalContext.carbs === 'enteral' ? 'Enteral feeding' :
                    clinicalContext.carbs === 'tpn' ? 'TPN' :
                    clinicalContext.carbs === 'npo' ? 'Nil by mouth' : '\u2014'
                  }</TableCell>
                </TableRow>
                {/* Metformin and SU have been moved to Non-Insulin meds */}
                <TableRow>
                  <TableCell>Albumin (g/L)</TableCell>
                  <TableCell>{clinicalContext.albumin ?? '\u2014'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Albumin date</TableCell>
                  <TableCell>{clinicalContext.albuminDate ?? '\u2014'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Steroids summary in Data Checker */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Steroid therapy</Typography>
            {steroids.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No steroids recorded.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dose (mg)</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Next dose</TableCell>
                    <TableCell>When</TableCell>
                    <TableCell>Potency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {steroids.map(s => (
                    <TableRow key={s.id}>
                      <TableCell sx={{ fontSize: 13 }}>{s.name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{s.doseMg ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{s.time ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{(() => { const nd = nextDoseDateForTime(s.time); return nd ? nd.toLocaleString() : '—'; })()}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{formatRelativeFromNow(nextDoseDateForTime(s.time))}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}><Chip label={s.potency || '—'} size="small" sx={{ bgcolor: s.potency === 'high' ? '#D14343' : s.potency === 'moderate' ? '#F97316' : '#059669', color: '#fff' }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Typography variant="subtitle1" sx={{ mb: 1, mt: 2 }}>Non-Insulin diabetes medications</Typography>
            {(!nonInsulinMeds) ? (
              <Typography color="text.secondary">No non-insulin meds recorded.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Dose</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {['sglt2','glp1','dpp4','pioglitazone','metformin','su'].map((k:any) => {
                    const entry = (nonInsulinMeds as any)[k];
                    const label = k === 'sglt2' ? 'SGLT2' : k === 'glp1' ? 'GLP-1' : k === 'dpp4' ? 'DPP-4' : k === 'pioglitazone' ? 'Pioglitazone' : k === 'metformin' ? 'Metformin' : 'Sulfonylurea (SU)';
                    if (!entry || !entry.enabled) return null;
                    return (
                        <TableRow key={k}>
                            <TableCell sx={{ fontSize: 13 }}>{label}</TableCell>
                            <TableCell sx={{ fontSize: 13 }}>{entry.name ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 13 }}>{entry.dose ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 13 }}>{(entry.times && entry.times.length) ? String((entry.times || []).map((it:any) => it.dose ? `${it.time} (${it.dose} mg)` : it.time).join(', ')) : (entry.time ?? '—')}</TableCell>
                          </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Readings</Typography>
            {readings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No readings entered.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Value (mmol/L)</TableCell>
                    <TableCell>Ketones (mmol/L)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readings
                    .slice()
                    .sort((a,b) => String(a.ts).localeCompare(String(b.ts)))
                    .map(r => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ fontSize: 13 }}>{r.ts || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{r.value == null ? '—' : String(r.value)}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{r.ketones == null ? '—' : String(r.ketones)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDataCheckerOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

function actingColor(acting: string | undefined) {
  switch ((acting || '').toLowerCase()) {
    case 'rapid': return '#D14343';
    case 'short': return '#F97316';
    case 'intermediate': return '#2563EB';
    case 'long': return '#059669';
    case 'premix': return '#7C3AED';
    default: return '#6B7280';
  }
}

export default App

