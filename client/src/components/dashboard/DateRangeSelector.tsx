import type { DateRangePreset } from '../../types/dashboard';

type DateRangeSelectorProps = {
  selectedRange: DateRangePreset;
  onRangeChange: (range: DateRangePreset) => void;
  disabled?: boolean;
};

const RANGES: { label: string; value: DateRangePreset }[] = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '12 Months', value: '12m' },
];

export function DateRangeSelector({ selectedRange, onRangeChange, disabled }: DateRangeSelectorProps) {
  return (
    <div className="date-range-picker">
      <span className="date-range-label">Period:</span>
      <div className="button-group">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={disabled}
            className={`btn-range ${selectedRange === r.value ? 'active' : ''}`}
            onClick={() => onRangeChange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
