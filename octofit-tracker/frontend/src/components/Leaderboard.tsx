import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => {
        if (active) setLeaderboard(result);
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
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {leaderboard === null && !error && <p role="status">Loading leaderboard...</p>}
        {error && <p role="alert">Unable to load leaderboard. Please try again.</p>}
        {leaderboard?.length === 0 && <p>No leaderboard scores yet.</p>}
        {leaderboard && leaderboard.length > 0 && (
          <ol className="list-group list-group-numbered">
            {leaderboard.map((entry) => (
              <li className="list-group-item" key={entry.rank}>
                {entry.teamName}: {entry.totalPoints} points
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
