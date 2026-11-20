import { useEffect, useState } from 'react'
import AuthPage from './Pages/AuthPage'
import MultiplayerLobby from './Pages/MultiplayerLobby'
import SoloGame, { type Difficulty} from './Pages/SoloGame'
import Navbar from './Components/Navbar'
import UserPage from './Pages/UserPage'
import SoloLeaderboard from './Pages/SoloLeaderboard'

type Screen = 'home' | 'solo' | 'lobby' | 'login' | 'register' | 'profile' | 'leaderboard'

// The app keeps the navigation state in one place instead of adding a routing
// package for only a few screens. Login and register use real browser paths so
// they can be opened directly, while the game screens stay in memory because
// leaving a running game should not create a bookmarkable game state.
const getScreen = (): Screen => {
  const path = window.location.pathname

  // Only authentication pages need to be restored from the URL. Any unknown
  // path falls back to the home screen rather than rendering a blank page.
  if (path === '/login') return 'login'
  if (path === '/register') return 'register'
  if (path === '/profile') return 'profile'
  if (path === '/leaderboard') return 'leaderboard'
  return 'home'
}

function App() {
  // Passing getScreen directly lets React calculate the initial value once
  // during startup instead of calling it again on every render.
  const [screen, setScreen] = useState<Screen>(getScreen)

  const [soloDifficulty, setSoloDifficulty] = useState<Difficulty>('Normal')
  const [soloDifficultyOpen, setSoloDifficultyOpen] = useState(false)

  useEffect(() => {
    // Browser back and forward buttons change the URL without notifying React.
    // Listening for popstate keeps the visible screen in sync with that URL.
    const handlePopState = () => setScreen(getScreen())
    window.addEventListener('popstate', handlePopState)

    // The listener must be removed when the app is unmounted so it does not
    // keep updating an old component instance after a hot reload.
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: string) => {
    // pushState changes the address bar without a full reload, which keeps the
    // current React state and makes navigation feel instant.
    window.history.pushState({}, '', path)
    setScreen(getScreen())
  }

  const changeScreen = (nextScreen: Screen) => {
    // Solo and multiplayer are active game views rather than separate routes.
    // Keeping them in component state means returning home does not require a
    // page reload or any special server fallback configuration.
    if (nextScreen === 'solo' || nextScreen === 'lobby') {
      setScreen(nextScreen)
      return
    }

    // Home, login, and register are URL-based screens, so use the same helper
    // for them instead of changing state and the browser URL separately.
    navigate('/')
  }

  // Authentication pages share the same navbar and form component. The mode
  // tells AuthPage whether it should call the login or registration endpoint.
  if (screen === 'login' || screen === 'register') {
    return (
      <>
        <Navbar onNavigate={navigate} />
        <AuthPage mode={screen} onNavigate={navigate} />
      </>
    )
  }

  // SoloGame owns the question, answer, and streak state. App only decides
  // which screen is visible and supplies the navigation callbacks it needs.
  if (screen === 'solo') {
    return <SoloGame onBack={() => changeScreen('home')} onNavigate={navigate} difficulty={soloDifficulty} />
  }

  // MultiplayerLobby owns the lobby connection and player state. Keeping that
  // state inside the page prevents the home screen from becoming responsible
  // for polling and game-session details.
  if (screen === 'lobby') {
    return <MultiplayerLobby onBack={() => changeScreen('home')} onNavigate={navigate} />
  }

  if (screen === 'leaderboard') {
    return <SoloLeaderboard onBack={() => changeScreen('home')} onNavigate={navigate} />
  }

  if (screen === 'profile') {
  return (
    <UserPage
      onBack={() => changeScreen('home')}
      onNavigate={navigate}
    />
  )
}

  // The home screen is the default view and therefore also acts as the
  // fallback for unsupported browser paths.
  return (
    <>
      <Navbar onNavigate={navigate} />
      <main className="game">
        <header className="game-header">
          <p className="eyebrow">Character quiz <span aria-hidden="true">✦</span></p>
          <h1 >How do you want to play?</h1>
          <p className="intro">Challenge yourself or invite your friends for a battle of character knowledge.</p>
        </header>

          

        <section className="mode-grid" aria-label="Game modes">
          <button className="mode-card solo-card" type="button" onClick={() => setSoloDifficultyOpen(true)}>
           
              <img src="/monkey.avif"  />
              
            <span className="card-content">
              <span className="card-kicker">Beat your high score</span>
              <strong>Solo play</strong>
              <span>Put your knowledge to the test and beat your high score.</span>
              <span className="card-link">Play solo <span aria-hidden="true">→</span></span>
            </span>
          </button>

          <button className="mode-card friends-card" type="button" onClick={() => changeScreen('lobby')}>
            
              <img src="/animeChars.jpg" alt="" />
              
           
            <span className="card-content">
              <span className="card-kicker">More is more</span>
              <strong>Play with friends</strong>
              <span>Invite your crew and find out who knows the most characters.</span>
              <span className="card-link">Create a game <span aria-hidden="true">→</span></span>
            </span>
          </button>
        </section>

        {soloDifficultyOpen && (
          <div
            className="difficulty-modal-backdrop"
            role="presentation"
            onClick={() => setSoloDifficultyOpen(false)}
          >
            <section
              className="difficulty-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="difficulty-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="difficulty-modal-close"
                type="button"
                aria-label="Close difficulty selection"
                onClick={() => setSoloDifficultyOpen(false)}
              >
                ×
              </button>

              <p className="card-kicker">Solo play</p>

              <h2 id="difficulty-modal-title">
                Choose your difficulty
              </h2>

              <p>
                The harder the characters, the more points you can earn.
              </p>

              <label className="difficulty-modal-label" htmlFor="solo-difficulty">
                Difficulty
              </label>

              <select
                id="solo-difficulty"
                className="difficulty-modal-select"
                value={soloDifficulty}
                onChange={(event) =>
                  setSoloDifficulty(event.target.value as Difficulty)
                }
              >
                <option value="Easy">Easy</option>
                <option value="Normal">Normal</option>
                <option value="Hard">Hard</option>
              </select>

              <button
                className="difficulty-start-button"
                type="button"
                onClick={() => {
                  setSoloDifficultyOpen(false)
                  changeScreen('solo')
                }}
              >
                Start solo game
              </button>
            </section>
          </div>
        )}

        <p className="footer-note">Pick a mode to get started</p>
      </main>
    </>
  )
}

export default App
