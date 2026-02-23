// React import not required with the automatic JSX runtime
import { Stack, TextField, IconButton, Button, InputAdornment } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

type DoseScheduleEntry = {
  time: string; // 'HH:mm'
  dose?: string;
}

type DoseScheduleProps = {
  entries: DoseScheduleEntry[];
  onChange: (next: DoseScheduleEntry[]) => void;
  allowPerTimeDose?: boolean;
  addLabel?: string;
}

export default function DoseSchedule({ entries, onChange, allowPerTimeDose = false, addLabel = 'Add time' }: DoseScheduleProps) {
  function setEntry(idx: number, patch: Partial<DoseScheduleEntry>) {
    const next = entries.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onChange(next);
  }
  function removeEntry(idx: number) {
    const next = entries.filter((_, i) => i !== idx);
    onChange(next);
  }
  function addEntry() {
    onChange([...entries, { time: '' }]);
  }

  return (
    <Stack spacing={1}>
      {entries.map((e, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <TextField
            label="Taken at"
            type="time"
            size="small"
            value={e.time ?? ''}
            onChange={(ev) => setEntry(i, { time: ev.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 120 }}
          />
          {allowPerTimeDose && (
            <TextField
              label="Dose"
              size="small"
              value={e.dose ?? ''}
              onChange={(ev) => setEntry(i, { dose: ev.target.value })}
              InputProps={{ endAdornment: <InputAdornment position="end">mg</InputAdornment> }}
            />
          )}
          <IconButton size="small" onClick={() => removeEntry(i)} aria-label="Remove time"><DeleteIcon /></IconButton>
        </Stack>
      ))}

      <Button size="small" onClick={addEntry} startIcon={<AddIcon />}>{addLabel}</Button>
    </Stack>
  );
}
