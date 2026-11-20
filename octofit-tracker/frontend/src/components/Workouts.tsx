import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(
      `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`,
    )
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {suggestions === null && !error && <p role="status">Loading workout suggestions...</p>}
        {error && <p role="alert">Unable to load workout suggestions. Please try again.</p>}
        {suggestions?.length === 0 && <p>No workout suggestions yet.</p>}
        {suggestions && suggestions.length > 0 && (
          <ul className="list-group">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={`${suggestion.title}-${index}`}>
                <h3 className="h6">{suggestion.title}</h3>
                {suggestion.reason && <p className="mb-0">{suggestion.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
