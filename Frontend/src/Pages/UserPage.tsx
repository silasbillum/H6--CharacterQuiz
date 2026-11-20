import {useEffect, useState } from "react"
import Navbar from "../Components/Navbar"
import { API_URL } from '../config'

type UserPageProps = {
    onBack: () => void
  onNavigate: (path: string) => void
}

type RecentGame = {
  gameId: number
  gameMode: string
  difficulty: string
  startedAt: string
  endedAt: string | null
  points: number
  streak: number
  bestStreak: number
  correctGuesses: number
  placement: number | null
}

type UserProfile = {
  id: number
  username: string
  createdAt: string
  soloGames: number
  bestSoloPoints: number
  soloCorrectGuesses: number
  soloBestStreak: number
  multiplayerGames: number
  bestMultiplayerPoints: number
  multiplayerCorrectGuesses: number
  multiplayerBestStreak: number
  recentGames: RecentGame[]
  soloCorrectPercentage: number
  multiplayerCorrectPercentage: number
  multiplayerWinPercentage: number
}

function UserPage({ onBack, onNavigate }: UserPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUserId = localStorage.getItem('characterQuizUserId')

    if (!storedUserId) {
      setError('Log in to view your player profile.')
      setIsLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(
             `${API_URL}api/profile/${storedUserId}`,
        )

        if (!response.ok) {
          throw new Error(
            await response.text() || 'Could not load your profile.',
          )
        }

        setProfile((await response.json()) as UserProfile)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Could not load your profile.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [])

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <>
      <Navbar onNavigate={onNavigate} />

      <main className="game game-screen user-page">
        <header className="game-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
          <p className="eyebrow">Player profile</p>
        </header>

        {isLoading && (
          <p className="profile-status">Loading profile...</p>
        )}

        {error && (
          <p className="profile-status profile-error">{error}</p>
        )}

        {profile && (
          <>
            <section className="profile-card">
              <p className="card-kicker">Account</p>
              <h1>{profile.username}</h1>
              <p>Member since {formatDate(profile.createdAt)}</p>
            </section>

            <section className="profile-mode-section" aria-labelledby="solo-stats-title">
  <h2 id="solo-stats-title">Solo</h2>

  <div className="profile-stats">
    <article>
      <strong>{profile.soloGames}</strong>
      <span>Games played</span>
    </article>

    <article>
      <strong>{profile.bestSoloPoints}</strong>
      <span>Best score</span>
    </article>

    <article>
      <strong>{profile.soloCorrectGuesses}</strong>
      <span>Correct guesses</span>
    </article>

    <article>
      <strong>{profile.soloBestStreak}</strong>
      <span>Best streak</span>
    </article>

    <article>
      <strong>{profile.soloCorrectPercentage}%</strong>
      <span>Accuracy</span>
    </article>
  </div>
</section>

            <section className="profile-mode-section" aria-labelledby="multiplayer-stats-title">
  <h2 id="multiplayer-stats-title">Multiplayer</h2>

  <div className="profile-stats">
    <article>
      <strong>{profile.multiplayerGames}</strong>
      <span>Games played</span>
    </article>

    <article>
      <strong>{profile.bestMultiplayerPoints}</strong>
      <span>Best score</span>
    </article>

    <article>
      <strong>{profile.multiplayerCorrectGuesses}</strong>
      <span>Correct guesses</span>
    </article>

    <article>
      <strong>{profile.multiplayerBestStreak}</strong>
      <span>Best streak</span>
    </article>

    <article>
      <strong>{profile.multiplayerCorrectPercentage}%</strong>
      <span>Accuracy</span>
    </article>
  </div>

  <article className="profile-win-rate">
    <strong>{profile.multiplayerWinPercentage}%</strong>
    <span>Win rate</span>
  </article>
</section>

              

            <section className="profile-history">
              <p className="card-kicker">Recent activity</p>
              <h2>Game history</h2>

              {profile.recentGames.length === 0 ? (
                <p className="profile-status">No games saved yet.</p>
              ) : (
                <div className="profile-game-list">
                  {profile.recentGames.map((game) => (
                    <article key={game.gameId}>
                      <div>
                        <strong>{game.gameMode}</strong>
                        <span>
                          {formatDate(game.endedAt ?? game.startedAt)}
                        </span>
                      </div>

                      <div>
                        <strong>{game.points} pts</strong>
                        <span>
                          {game.correctGuesses} correct ·
                          Best streak {game.bestStreak}
                        </span>
                      </div>

                      {game.placement && (
                        <strong className="profile-placement">
                          #{game.placement}
                        </strong>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}

export default UserPage