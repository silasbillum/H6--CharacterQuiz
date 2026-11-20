import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Navbar from '../Components/Navbar'
import { API_URL } from '../config'

type MultiplayerGameProps = {
  lobbyCode: string
  playerId: string
  players: MultiplayerPlayer[]
  currentQuestion: Character | null
  roundEndsAt: string
  startedAt: string
  gameOver: boolean
  onLobbyUpdate: (lobby: MultiplayerLobby) => void
  onBack: () => void
  onNavigate: (path: string) => void
}

type MultiplayerPlayer = {
  id: string
  userId: number | null
  name: string
  isHost: boolean
  isReady: boolean
  score: number
  currentStreak: number
  maxStreak: number
  correctGuesses: number
  totalGuesses: number
}

type MultiplayerLobby = {
  code: string
  started: boolean
  gameOver: boolean
  startedAt: string
  currentQuestion: Character | null
  roundEndsAt: string
  answeredPlayers: number
  players: MultiplayerPlayer[]
}

type Character = {
  characterName: string
  showName: string
  imageUrl: string
  suggestionType?: 'Character' | 'AnimeTitle'
}

const LOBBY_API_URL = `${API_URL}/api/lobby`

function MultiplayerGame({
  lobbyCode,
  playerId,
  players,
  currentQuestion,
  roundEndsAt,
  startedAt,
  gameOver,
  onLobbyUpdate,
  onBack,
  onNavigate,
}: MultiplayerGameProps) {
  // The server owns the shared question, scores, and timer. This page displays
  // that state and submits only the current player's answer.
  const [character, setCharacter] = useState<Character | null>(currentQuestion)
  const [answer, setAnswer] = useState('')
  const [suggestions, setSuggestions] = useState<Character[]>([])
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [isGameOver, setIsGameOver] = useState(gameOver)
  const hasSavedGame = useRef(false)

  useEffect(() => {
    setCharacter(currentQuestion)
  }, [currentQuestion])

  useEffect(() => {
  setIsGameOver(gameOver)
}, [gameOver])

useEffect(() => {
  const currentPlayer = players.find((player) => player.id === playerId)

  if (!gameOver || !currentPlayer?.isHost || hasSavedGame.current) {
    return
  }

  hasSavedGame.current = true

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  const saveGame = async () => {
    try {

      const payload = {
  difficulty: 'Normal',
  startedAt,
  endedAt: new Date().toISOString(),
  players: sortedPlayers.map((player, index) => ({
    userId: player.userId,
    points: player.score,
    streak: player.currentStreak,
    maxStreak: player.maxStreak,
    correctGuesses: player.correctGuesses,
    totalGuesses: player.totalGuesses,
    placement: index + 1,
  })),
}
  
      console.log('Saving multiplayer game:', payload)

const response = await fetch(`${API_URL}api/game/save-multiplayer`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

if (!response.ok) {
  const responseMessage = await response.text()

  console.error('Multiplayer save failed:', {
    status: response.status,
    responseMessage,
    payload,
  })

  throw new Error(
    responseMessage || 'Could not save the multiplayer game.',
  )
}

      if (!response.ok) {
        const responseMessage = await response.text()

        throw new Error(
          responseMessage || 'Could not save the multiplayer game.',
        )
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the multiplayer game.',
      )
    }
  }

  void saveGame()
}, [gameOver, playerId, players, startedAt])

  useEffect(() => {
    // Refresh scores and round state while the game is open.
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${LOBBY_API_URL}/${lobbyCode}`)
        if (response.ok) {
          const nextLobby = (await response.json()) as MultiplayerLobby
          onLobbyUpdate(nextLobby)
          setCharacter(nextLobby.currentQuestion)
          setIsGameOver(nextLobby.gameOver)
        }
      } catch {
      }
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [lobbyCode, onLobbyUpdate])

  useEffect(() => {
    const updateTimer = () => {
      const end = new Date(roundEndsAt).getTime()
      if (Number.isFinite(end)) {
        setSecondsLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
      }
    }
    updateTimer()
    const intervalId = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(intervalId)
  }, [roundEndsAt])

  useEffect(() => {
    if (answer.trim().length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${LOBBY_API_URL}/api/character/search?query=${encodeURIComponent(answer)}`,
          { signal: controller.signal },
        )
        if (response.ok) setSuggestions((await response.json()) as Character[])
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === 'AbortError')) {
          setSuggestions([])
        }
      }
    }, 150)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [answer])

  const restartGame = async () => {
  const currentPlayer = players.find((player) => player.id === playerId)

  if (!currentPlayer?.isHost) {
    return
  }

  try {
    const response = await fetch(`${LOBBY_API_URL}/${lobbyCode}/restart`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })

    if (!response.ok) {
      throw new Error('Could not restart the game.')
    }

    const nextLobby = (await response.json()) as MultiplayerLobby

    hasSavedGame.current = false

    onLobbyUpdate(nextLobby)
    setCharacter(nextLobby.currentQuestion)
    setIsGameOver(nextLobby.gameOver)
    setSecondsLeft(30)
    setFeedback('')
    setError('')
  } catch (requestError) {
    setError(
      requestError instanceof Error
        ? requestError.message
        : 'Could not restart the game.',
    )
  }
}

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!character || !answer.trim() || secondsLeft === 0) return

    setAnswer('')
    setSuggestions([])

    try {
      const response = await fetch(`${LOBBY_API_URL}/${lobbyCode}/players/${playerId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      if (!response.ok) throw new Error('Could not submit your answer.')
      const nextLobby = (await response.json()) as MultiplayerLobby
      onLobbyUpdate(nextLobby)
      setCharacter(nextLobby.currentQuestion)
      setIsGameOver(nextLobby.gameOver)

      setFeedback(
        nextLobby.gameOver
          ? 'Game over.'
          : `Answer submitted. Waiting for ${Math.max(
              0,
              players.length - nextLobby.answeredPlayers,
            )} player(s).`,
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update your score.')
    }
  }

  const currentPlayer = players.find((player) => player.id === playerId)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <>
      <Navbar onNavigate={onNavigate} />
      <main className="game game-screen multiplayer-game-screen">
        <header className="game-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Lobby
          </button>
          <p className="eyebrow">Multiplayer <span aria-hidden="true">✦</span></p>
          <span className="score-pill">Time <strong>{secondsLeft}s</strong></span>
        </header>

      <section className="multiplayer-layout">
        <section className="quiz-panel" aria-labelledby="multiplayer-title">
          <div className="quiz-heading">
            <div>
              <p className="card-kicker">Lobby {lobbyCode}</p>
              <h1 id="multiplayer-title">Who is this character?</h1>
            </div>
          </div>
          <div className="character-frame">
            {!character && <span className="character-status">Finding a character...</span>}
            {character && (
              <>
                <img src={character.imageUrl} alt="Mystery character" />
               {/*  <span className="mystery-label">{character.showName}</span> */}
              </>
            )}
          </div>
          <form className="answer-form" onSubmit={submitAnswer}>
            <label htmlFor="multiplayer-answer">Type a character or anime name</label>
            <div className="answer-bar">
              <input
                id="multiplayer-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Enter your answer..."
                autoComplete="off"
              />
              <button type="submit" disabled={!character || secondsLeft === 0}>Submit answer</button>
            </div>
            {suggestions.length > 0 && (
              <section className="answer-suggestions" aria-label="Character suggestions">
                <p>Suggestions</p>
                <ul>
                  {suggestions.map((suggestion) => (
                    <li key={`${suggestion.characterName}-${suggestion.showName}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setAnswer(suggestion.suggestionType === 'AnimeTitle'
                            ? suggestion.showName
                            : suggestion.characterName)
                          setSuggestions([])
                        }}
                      >
                        <strong>
                          {suggestion.suggestionType === 'AnimeTitle'
                            ? `Anime: ${suggestion.showName}`
                            : suggestion.characterName}
                        </strong>
                        <span>{suggestion.showName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {feedback && <p className="answer-feedback">{feedback}</p>}
            {error && <p className="answer-feedback incorrect-feedback">{error}</p>}
          </form>
        </section>

        <aside className="scoreboard" aria-label="Player scores">
          <div className="scoreboard-heading">
            <p className="card-kicker">Live leaderboard</p>
            <h2>Scores</h2>
          </div>
          <ol>
            {sortedPlayers.map((player) => (
              <li key={player.id} className={player.id === playerId ? 'current-player' : ''}>
                <span className="player-rank">{sortedPlayers.indexOf(player) + 1}</span>
                <span className="player-score-name">
                <strong>{player.name}</strong>
                {player.id === playerId && <small>You</small>}
                <span className="player-streaks">
                  Streak {player.currentStreak} · Best {player.maxStreak}
                </span>
              </span>
                <strong className="player-score">{player.score}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </section>

            {isGameOver && (
            <div
              className="game-over-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="multiplayer-game-over-title"
            >
              <section className="game-over-card">
                <p className="card-kicker">Game over</p>
                <h2 id="multiplayer-game-over-title">That was a good match!</h2>
                <p>
                  Everyone missed the round or time ran out. Here are your results:
                </p>

                <div className="game-over-stats">
                  <div>
                    <strong>{currentPlayer?.score ?? 0}</strong>
                    <span>Points</span>
                  </div>
                  <div>
                    <strong>{currentPlayer?.maxStreak ?? 0}</strong>
                    <span>Best streak</span>
                  </div>
                  <div>
                    <strong>{currentPlayer?.correctGuesses ?? 0}</strong>
                    <span>Correct guesses</span>
                  </div>
                  <div>
                    <strong>{currentPlayer?.currentStreak ?? 0}</strong>
                    <span>Final streak</span>
                  </div>
                </div>

                <div className="game-over-actions">
                  {currentPlayer?.isHost ? (
                    <button
                      type="button"
                      className="game-over-button retry-button"
                      onClick={() => void restartGame()}
                    >
                      Retry
                    </button>
                  ) : (
                    <p>Waiting for the host to restart the game.</p>
                  )}

                  <button
                    type="button"
                    className="game-over-button stop-button"
                    onClick={() => onNavigate('/')}
                  >
                    Leave game
                  </button>
                </div>
              </section>
            </div>
          )}

      </main>
    </>
  )
}

export default MultiplayerGame
