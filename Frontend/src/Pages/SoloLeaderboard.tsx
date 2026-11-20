import { useEffect, useState } from 'react'
import Navbar from '../Components/Navbar'

type SoloLeaderboardProps = {
  onBack: () => void
  onNavigate: (path: string) => void
}

type LeaderboardEntry = {
  rank: number
  username: string
  points: number
  bestStreak: number
}

function SoloLeaderboard({
  onBack,
  onNavigate,
}: SoloLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetch(
          'http://localhost:5002/api/leaderboard/solo',
        )

        if (!response.ok) {
          throw new Error('Could not load the leaderboard.')
        }

        setEntries((await response.json()) as LeaderboardEntry[])
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Could not load the leaderboard.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadLeaderboard()
  }, [])

  return (
    <>
      <Navbar onNavigate={onNavigate} />

      <main className="game game-screen leaderboard-page">
        <header className="game-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
        </header>

        <section className="leaderboard-card">
          <p className="card-kicker">Top players</p>
          <h1>Solo leaderboard</h1>
          <p className="leaderboard-intro">
            The best solo game from each player.
          </p>

          {isLoading && (
            <p className="profile-status">Loading leaderboard...</p>
          )}

          {error && (
            <p className="profile-status profile-error">{error}</p>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <p className="profile-status">
              No solo games have been saved yet.
            </p>
          )}

          {!isLoading && !error && entries.length > 0 && (
            <div className="leaderboard-list">
              {entries.map((entry) => (
                <article className="leaderboard-row" key={entry.username}>
                  <strong className="leaderboard-rank">
                    #{entry.rank}
                  </strong>

                  <strong className="leaderboard-username">
                    {entry.username}
                  </strong>

                  <span className="leaderboard-stat">
                    <strong>{entry.points}</strong>
                    <small>points</small>
                  </span>

                  <span className="leaderboard-stat">
                    <strong>{entry.bestStreak}</strong>
                    <small>streak</small>
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default SoloLeaderboard