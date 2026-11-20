import {useEffect, useState } from 'react'

type NavbarProps = {
  onNavigate: (path: string) => void
}

function Navbar({ onNavigate }: NavbarProps) {
  const [username, setUsername] = useState<string | null>(() =>
  localStorage.getItem("characterQuizUsername"),
)

useEffect(() => {
  const updateUsername = () => {
    setUsername(localStorage.getItem("characterQuizUsername"))
  }

  window.addEventListener('characterQuiz-auth-changed', updateUsername)

  return () => {
    window.removeEventListener('characterQuiz-auth-changed', updateUsername)
  }
}, [])

const logout = () => {
  localStorage.removeItem("characterQuizUserId")
  localStorage.removeItem("characterQuizUsername")
  localStorage.removeItem("characterQuizUserCreatedAt")

  setUsername(null)
  window.dispatchEvent(new Event('characterQuiz-auth-changed'))
  onNavigate('/')
}

  return (
    <nav className="navbar nav-links " aria-label="Main navigation">
      <button className="brand" type="button" onClick={() => onNavigate('/')}>
        <span className="brand-mark" aria-hidden="true">✦</span>
        Character Quiz
          </button>
          <button
              className="nav-action"
              type="button"
              onClick={() => onNavigate('/leaderboard')}
            >
              Leaderboard
            </button>
          <div className="nav-links">
            {username ? (
              <>
         <button
            className="nav-user"
            type="button"
            onClick={() => onNavigate('/profile')}
          >
            Hi, {username}
          </button>
          
            <button className="nav-logout" type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className="nav-action" type="button" onClick={() => onNavigate('/login')}>
              Log in
            </button>
            <button className="nav-register" type="button" onClick={() => onNavigate('/register')}>
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
