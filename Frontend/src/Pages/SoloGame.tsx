import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Navbar from '../Components/Navbar'

export type Difficulty = 'Easy' | 'Normal' | 'Hard'

type Character = {
  id?: number
  characterName: string
  showName: string
  imageUrl: string
  suggestionType?: 'Character' | 'AnimeTitle'
}

type SoloGameProps = {
  onBack: () => void
  onNavigate: (path: string) => void
  difficulty?: Difficulty
}

const Rounds_Seconds = 30
const Max_Speed_Bonus = 100
const Streak_Bonus_Percent = 10
const Max_Streak_Multiplier_Percent = 200

function calculatePoints(
  answerType: 'character' | 'anime',
  currentStreak: number,
  questionsStartedAt: number,
){
  const basePoints = answerType === 'character' ? 100 : 50
  const elapsedSeconds = Math.max(0, (Date.now() - questionsStartedAt) / 1000,)
 const secondsRemaining = Math.max(
    0,
    Math.min(Rounds_Seconds, Rounds_Seconds - elapsedSeconds),
  )

  const speedBonus = Math.floor(
    Max_Speed_Bonus * secondsRemaining / Rounds_Seconds,
  )

  const streakMultiplier = Math.min(
    100 + (currentStreak - 1) * Streak_Bonus_Percent,
    Max_Streak_Multiplier_Percent,
  )

  return Math.floor(
    (basePoints + speedBonus) * streakMultiplier / 100,
  )
  
}



function SoloGame({ onBack, onNavigate, difficulty }: SoloGameProps) {
  // Solo play keeps its own question and streak because it does not need to
  // coordinate state with another browser.
  const [answer, setAnswer] = useState('')
  const [character, setCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<Character[]>([])
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [correctGuesses, setCorrectGuesses] = useState(0)
  const [totalGuesses, setTotalGuesses] = useState(0)
  const [gameStartedAt, setGameStartedAt] = useState(Date.now())
  const [maxStreak, setMaxStreak] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now())
  const [secondsLeft, setSecondsLeft] = useState(Rounds_Seconds)
  const [gameOverReason, setGameOverReason] = useState<'wrong' | 'timeout' | null>(null)
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const hasSavedGame = useRef(false)
    const fetchCharacter = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch(`http://localhost:5002/api/character/random?difficulty=${difficulty}`)

      if (!response.ok) {
        throw new Error('The character could not be loaded.')
      }

      const nextCharacter = (await response.json()) as Character
      setCharacter(nextCharacter)
      setQuestionStartedAt(Date.now())
      setSecondsLeft(Rounds_Seconds)
    } catch {
      setError('Could not load a character. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [difficulty])

  useEffect(() => {
    void fetchCharacter()
  }, [fetchCharacter])

  useEffect(() => {
  if (isLoading || isGameOver) {
    return
  }

  const updateTimer = () => {
    const elapsedSeconds = (Date.now() - questionStartedAt) / 1000
    const remainingSeconds = Math.max(
      0,
      Math.ceil(Rounds_Seconds - elapsedSeconds),
    )

    setSecondsLeft(remainingSeconds)

    if (remainingSeconds === 0) {
      setGameOverReason('timeout')
      setAnswer('')
      setSuggestions([])
      setIsGameOver(true)
      void saveGame()
    }
  }

  updateTimer()

  const intervalId = window.setInterval(updateTimer, 250)

  return () => window.clearInterval(intervalId)
}, [questionStartedAt, isLoading, isGameOver])

  useEffect(() => {
    // A short delay keeps typing from sending a request for every key press.
    if (answer.trim().length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const searchCharacters = async () => {
      try {
        const response = await fetch(
          `http://localhost:5002/api/character/search?query=${encodeURIComponent(answer)}`,
          { signal: controller.signal },
        )

        if (response.ok) {
          setSuggestions((await response.json()) as Character[])
        }
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === 'AbortError') {
          return
        }
        setSuggestions([])
      }
    }

    const timeoutId = window.setTimeout(() => {
      void searchCharacters()
    }, 150)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [answer])

  const selectSuggestion = (suggestion: Character) => {
    setAnswer(suggestion.characterName)
    setSuggestions([])
  }

  const saveGame = async (finalTotalGuesses = totalGuesses) => {
    if (hasSavedGame.current) {
      return
    }

    hasSavedGame.current = true

    const storedUserId = localStorage.getItem("characterQuizUserId")
    const userId = storedUserId ? Number(storedUserId) : null

    try {
      const response = await fetch('http://localhost:5002/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameMode: 'Solo',
          difficulty,
          points: score,
          streak,
          bestStreak: maxStreak,
          correctGuesses,
          totalGuesses: finalTotalGuesses,
          startedAt: new Date(gameStartedAt).toISOString(),
          endedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save game.')
      }
    } catch (saveError) {
    hasSavedGame.current = false
    setError(
      saveError instanceof Error
        ? saveError.message
        : 'Could not save your game result.',
    )
    }
  }

  const retryGame = () => {
    setStreak(0)
    setScore(0)
    setMaxStreak(0)
    setPointsAwarded(null)
    setFeedback(null)
    setAnswer('')
    setSuggestions([])
    setIsGameOver(false)
    setGameOverReason(null)
    setCorrectGuesses(0)
    setTotalGuesses(0)
    setGameStartedAt(Date.now())
    hasSavedGame.current = false

    void fetchCharacter()
  }

    const recordCharacterAnswer = async (isCorrect: boolean) => {
    if (!character) {
      return
    }

    const response = await fetch(
      'http://localhost:5002/api/game/character-answer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: character.id,
          characterName: character.characterName,
          showName: character.showName,
          isCorrect,
        }),
      },
    )

    if (!response.ok) {
      throw new Error('Could not save character statistics.')
    }
  }

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!character || !answer.trim() || isLoading) {
      return
    }

    const normalizeAnswer = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedAnswer = normalizeAnswer(answer)
    const answerType =
  normalizedAnswer === normalizeAnswer(character.characterName)
    ? 'character'
    : normalizedAnswer === normalizeAnswer(character.showName)
      ? 'anime'
      : null

    setSuggestions([])

    await recordCharacterAnswer(answerType !== null)

    if (!answerType) {
      setTotalGuesses((currentTotalGuesses) => currentTotalGuesses + 1)
    setPointsAwarded(null)
    setFeedback('incorrect')
    setAnswer('')
    setSuggestions([])
    setGameOverReason('wrong')
    setIsGameOver(true)
    void saveGame(totalGuesses + 1)
    return
    }

    const nextStreak = streak + 1
    const points = calculatePoints(answerType, nextStreak, questionStartedAt)

    setStreak(nextStreak)
    setMaxStreak((currentMax) => Math.max(currentMax, nextStreak))
    setScore((currentScore) => currentScore + points)
    setCorrectGuesses((currentCorrectGuesses) => currentCorrectGuesses + 1)
    setTotalGuesses((currentTotalGuesses) => currentTotalGuesses + 1)
    setPointsAwarded(points)
    setFeedback('correct')
    setAnswer('')
    await fetchCharacter()
    }

  return (
    <>
      <Navbar onNavigate={onNavigate} />
      <main className="game game-screen">
        <header className="game-topbar">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
          <p className="eyebrow">Solo play <span aria-hidden="true">✦</span></p>
          <span className="score-pill">
          Time <strong>{secondsLeft}s</strong> · Score <strong>{score}</strong> · Streak{' '}
          <strong>{streak}</strong> · Best <strong>{maxStreak}</strong>
        </span>
        </header>

      <section className="quiz-panel" aria-labelledby="quiz-title">
        <div className="quiz-heading">
          <div>
            <p className="card-kicker">Can you guess this character?</p>
            <h1 id="quiz-title">Who is this character?</h1>
          </div>
          
        </div>

        <div className="character-frame">
          {isLoading && <span className="character-status">Finding a character...</span>}
          {!isLoading && error && <span className="character-status character-error">{error}</span>}
          {!isLoading && !error && (
            <>
              {character?.imageUrl ? (
                <img
                  src={character.imageUrl}
                  alt="Mystery character"
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                />
              ) : (
                <span className="character-status">No character artwork found</span>
              )}
            {/*  <span className="mystery-label">{character?.showName}</span>*/}
            </>
          )}
        </div>

        <form className="answer-form" onSubmit={submitAnswer}>
          <label htmlFor="character-answer">Type a character or anime name</label>
          <div className="answer-bar">
            <input
              id="character-answer"
              type="text"
              value={answer}
              onChange={(event) => {
              setAnswer(event.target.value)
              setFeedback(null)
              }}
              disabled={isGameOver}
              placeholder="Enter character or anime name..."
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading || isGameOver}>
              Submit answer <span aria-hidden="true">→</span>
            </button>
          </div>
          {feedback === 'correct' && (
           <p className="answer-feedback correct-feedback">
            Correct! +{pointsAwarded} points. New character loading...
          </p>
          )}
          {feedback === 'incorrect' && (
            <p className="answer-feedback incorrect-feedback">
              Not quite. The streak was reset—try again!
            </p>
          )}
          {suggestions.length > 0 && (
            <section className="answer-suggestions" aria-label="Character suggestions">
              <p>Suggestions</p>
              <ul>
                {suggestions.map((suggestion) => (
                  <li key={`${suggestion.characterName}-${suggestion.showName}`}>
                    <button type="button" onClick={() => selectSuggestion(suggestion)}>
                      <strong>
                        {suggestion.suggestionType === 'AnimeTitle'
                          ? `Anime: ${suggestion.showName}`
                          : suggestion.characterName}
                      </strong>
                      <span>
                        {suggestion.suggestionType === 'AnimeTitle'
                          ? 'Answer with anime name'
                          : suggestion.showName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </form>
      </section>
          {isGameOver && (
      <div className="game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <section className="game-over-card">
          <p className="card-kicker">Game over</p>
          <h2 id="game-over-title">That was a good run!</h2>
          <p>
            {gameOverReason === 'timeout'
              ? 'Time ran out, but here is how you did:'
              : 'You guessed incorrectly, but here is how you did:'}
          </p>

          <div className="game-over-stats">
            <div>
              <strong>{score}</strong>
              <span>Points</span>
            </div>
            <div>
              <strong>{maxStreak}</strong>
              <span>Best streak</span>
            </div>
            <div>
              <strong>{streak}</strong>
              <span>Final streak</span>
            </div>
          </div>

          <div className="game-over-actions">
            <button type="button" className="game-over-button retry-button" onClick={retryGame}>
              Retry
            </button>
            <button type="button" className="game-over-button stop-button" onClick={onBack}>
              Stop game
            </button>
          </div>
        </section>
      </div>
      )}
      </main>
    </>
  )
}

export default SoloGame