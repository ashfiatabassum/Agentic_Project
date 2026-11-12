// Customer fields (E5): name and email always required; others Off / Optional / Required.
import { CUSTOMER_FIELDS } from './spaceForm.js';

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

export default function FieldModes({ fields, onChange }) {
  return (
    <div className="divide-y divide-slate-200 rounded-lg ring-1 ring-slate-200">
      {['Name', 'Email'].map((label) => (
        <div key={label} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-slate-800">{label}</span>
          <span className="text-sm text-slate-500">Always required</span>
        </div>
      ))}
      {CUSTOMER_FIELDS.map(({ key, label }) => (
        <fieldset key={key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <legend className="float-left text-sm font-medium text-slate-800">{label}</legend>
          <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-300">
            {MODES.map((mode) => (
              <label
                key={mode.value}
                className="cursor-pointer px-3 py-1.5 text-sm text-slate-700 has-checked:bg-indigo-600 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-indigo-400"
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`field-${key}`}
                  value={mode.value}
                  checked={fields[key] === mode.value}
                  onChange={() => onChange({ ...fields, [key]: mode.value })}
                />
                {mode.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
