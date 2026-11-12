// Questions editor (E4): up to 5; add, edit, remove, reorder with ↑ / ↓ buttons.
import { Button } from '../components/ui.jsx';
import { MAX_QUESTIONS, questionKey } from './spaceForm.js';

export default function QuestionsEditor({ questions, onChange, errors }) {
  const update = (index, text) => onChange(questions.map((q, i) => (i === index ? { ...q, text } : q)));
  const remove = (index) => onChange(questions.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const next = [...questions];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  const add = () => onChange([...questions, { key: questionKey(), id: null, text: '' }]);

  return (
    <div>
      {questions.length === 0 && <p className="text-sm text-slate-600">No questions yet. Questions are optional.</p>}
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const inputId = `question-${q.key}`;
          const error = errors[`questions.${i}`];
          return (
            <li key={q.key} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <label htmlFor={inputId} className="text-sm font-medium text-slate-800">Question {i + 1}</label>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  id={inputId}
                  value={q.text}
                  maxLength={200}
                  onChange={(e) => update(i, e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${inputId}-error` : undefined}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 aria-[invalid=true]:border-red-500 sm:w-auto sm:flex-1"
                />
                <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>↑</Button>
                <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`}>↓</Button>
                <Button variant="ghost" onClick={() => remove(i)} aria-label={`Remove question ${i + 1}`}>Remove</Button>
              </div>
              {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
            </li>
          );
        })}
      </ol>
      {errors.questions && <p className="mt-2 text-sm text-red-700">{errors.questions}</p>}
      <div className="mt-3 flex items-center gap-3">
        <Button variant="secondary" onClick={add} disabled={questions.length >= MAX_QUESTIONS}>+ Add question</Button>
        <span className="text-xs text-slate-500">{questions.length} of {MAX_QUESTIONS}</span>
      </div>
    </div>
  );
}
