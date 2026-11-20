import { useEffect, useState } from 'react'
import MultiplayerGame from './MultiplayerGame'
import Navbar from '../Components/Navbar'
import { API_URL } from '../config'

type MultiplayerLobbyProps = {
  onBack: () => void
  onNavigate: (path: string) => void
}

type LobbyPlayer = {
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

type Lobby = {
  code: string
  started: boolean
  gameOver: boolean
  startedAt: string
  currentQuestion: {
    characterName: string
    showName: string
    imageUrl: string
  } | null
  roundEndsAt: string
  answeredPlayers: number
  players: LobbyPlayer[]
}

const LOBBY_API_URL = `${API_URL}api/lobby`

function MultiplayerLobby({ onBack, onNavigate }: MultiplayerLobbyProps) {
  // This page owns the lobby connection until the host starts the match. The
  // same server snapshot is then passed into the multiplayer game.
  const [joinCode, setJoinCode] = useState('')
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [playerId, setPlayerId] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [playerName] = useState(() => {
  const username = localStorage.getItem('characterQuizUsername')?.trim()

  if (username) {
    return username
  }

  return `Guest${Math.floor(1000 + Math.random() * 9000)}`
})

  const updateLobby = async (response: Response) => {
    if (!response.ok) {
      throw new Error(await response.text() || 'The lobby request failed.')
    }

    const nextLobby = (await response.json()) as Lobby
    setLobby(nextLobby)
    const currentPlayer = nextLobby.players.find((player) => player.id === playerId)
    if (!playerId && currentPlayer) {
      setPlayerId(currentPlayer.id)
    }
    return nextLobby
  }

  const createLobby = async () => {
    const storedUserId = localStorage.getItem("characterQuizUserId");
    const userId = storedUserId ? Number(storedUserId) : null;
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(LOBBY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, userId }),
      })
      const nextLobby = await updateLobby(response)
      const currentPlayer = nextLobby.players[0]
      setPlayerId(currentPlayer.id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create lobby.')
    } finally {
      setIsLoading(false)
    }
  }

  const joinLobby = async () => {
    const normalizedCode = joinCode.trim().toUpperCase()
    if (normalizedCode.length !== 6) {
      setError('Enter a six-character lobby code.')
      return
    }
    const storedUserId = localStorage.getItem("characterQuizUserId");
    const userId = storedUserId ? Number(storedUserId) : null;
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`${LOBBY_API_URL}${normalizedCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, userId }),
      })
      const nextLobby = await updateLobby(response)
      const currentPlayer = nextLobby.players[nextLobby.players.length - 1]
      setPlayerId(currentPlayer.id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not join lobby.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!lobby) return

    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${LOBBY_API_URL}${lobby.code}`)
        await updateLobby(response)
      } catch {
      }
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [lobby?.code])

  const toggleReady = async () => {
    if (!lobby || !playerId) return

    const currentPlayer = lobby.players.find((player) => player.id === playerId)
    if (!currentPlayer) return

    try {
      const response = await fetch(`${LOBBY_API_URL}${lobby.code}/players/${playerId}/ready`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReady: !currentPlayer.isReady }),
      })
      await updateLobby(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update ready status.')
    }
  }

  const startGame = async () => {
    if (!lobby || !playerId) return

    setIsLoading(true)
    setError('')
    try {
      // The server checks the host again; the browser button is not trusted.
      const response = await fetch(`${LOBBY_API_URL}${lobby.code}/start`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      await updateLobby(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start the game.')
    } finally {
      setIsLoading(false)
    }
  }

  if (lobby?.started) {
    return (
      <MultiplayerGame
        lobbyCode={lobby.code}
        playerId={playerId}
        players={lobby.players}
        currentQuestion={lobby.currentQuestion}
        roundEndsAt={lobby.roundEndsAt}
        startedAt={lobby.startedAt}
        gameOver={lobby.gameOver}
        onLobbyUpdate={setLobby}
        onBack={() => setLobby({ ...lobby, started: false })}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <>
      <Navbar onNavigate={onNavigate} />
      <main className="game game-screen lobby-screen">
        <header className="game-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
          <p className="eyebrow">Multiplayer <span aria-hidden="true">✦</span></p>
          <span className="score-pill">Lobby</span>
        </header>

      <section className="lobby-panel" aria-labelledby="lobby-title">
        <p className="card-kicker">Play with friends</p>
        <h1 id="lobby-title">Create a lobby</h1>
        <p className="intro">
          Share the lobby code with your friends, ready up, and start the match
          when everyone is here.
        </p>

        {!lobby ? (
          <div className="lobby-actions">
            <button className="primary-button lobby-create-button" type="button" onClick={() => void createLobby()} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create lobby'}
            </button>
            <div className="lobby-divider"><span>or join one</span></div>
            <form
              className="join-lobby-form"
              onSubmit={(event) => {
                event.preventDefault()
                void joinLobby()
              }}
            >
              <label htmlFor="lobby-code">Lobby code</label>
              <div className="join-lobby-controls">
                <input
                  id="lobby-code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="ABC123"
                  maxLength={6}
                  autoComplete="off"
                />
                <button className="secondary-button" type="submit" disabled={isLoading}>Join</button>
              </div>
            </form>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
          </div>
        ) : (
          <div className="active-lobby">
            <div className="lobby-code-card">
              <span className="card-kicker">Share this code</span>
              <strong>{lobby.code}</strong>
              <span>Your friends can use this code to join.</span>
            </div>

            <div className="player-list">
              <div className="player-list-heading">
                <h2>Players</h2>
                <span>{lobby.players.length}/4</span>
              </div>
              <ul>
                {lobby.players.map((player) => (
                  <li key={player.id}>
                    <span>{player.name}{player.isHost && <small>Host</small>}</span>
                    <strong className={player.isReady ? 'ready-label' : ''}>
                      {player.isReady ? 'Ready' : 'Not ready'}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>

            <button className="primary-button lobby-ready-button" type="button" onClick={() => void toggleReady()}>
              {lobby.players.find((player) => player.id === playerId)?.isReady ? 'Not ready' : 'Ready up'}
            </button>
            {lobby.players.find((player) => player.id === playerId)?.isHost ? (
              <button
                className="secondary-button lobby-start-button"
                type="button"
                onClick={() => void startGame()}
                disabled={isLoading || lobby.players.length < 2}
              >
                {isLoading ? 'Starting...' : 'Start game'}
              </button>
            ) : (
              <p className="lobby-status">Waiting for the host to start the game...</p>
            )}
            {error && <p className="form-message error-message" role="alert">{error}</p>}
          </div>
        )}
      </section>
      </main>
    </>
  )
}

export default MultiplayerLobby
