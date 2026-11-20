import { useState } from 'react'
import type { FormEvent } from 'react'
import { API_URL } from '../config'

type AuthPageProps = {
  mode: 'login' | 'register'
  onNavigate: (path: string) => void
}

function AuthPage({ mode, onNavigate }: AuthPageProps) {
  // Both account pages use the same form. The mode only changes the text and
  // which API endpoint receives the request.
  const isLogin = mode === 'login'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      // The API intentionally uses query parameters for these existing auth
      // endpoints; encode both values so special characters remain intact.
      const endpoint = isLogin ? 'login' : 'register'
      const response = await fetch(
        `${API_URL}api/user/${endpoint}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: 'POST' },
      )

      if (!response.ok) {
        const responseMessage = await response.text()
        throw new Error(responseMessage || 'Something went wrong. Please try again.')
      }

      const user = (await response.json()) as {
        id: number
        username: string
        createdAt: string
      }

      localStorage.setItem("characterQuizUserId" , String(user.id))
      localStorage.setItem("characterQuizUsername" , user.username)
      localStorage.setItem("characterQuizUserCreatedAt" , user.createdAt)
      window.dispatchEvent(new Event('characterQuiz-auth-changed'))

      setMessage(isLogin ? 'Welcome back! You are now logged in.' : 'Account created successfully.')
      setPassword('')

      if (isLogin) {
        onNavigate('/')
      }
      
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">{isLogin ? 'Welcome back' : 'Join the quiz'} <span aria-hidden="true">✦</span></p>
        <h1 id="auth-title">{isLogin ? 'Log in to play' : 'Create your account'}</h1>
        <p className="auth-intro">
          {isLogin ? 'Keep track of your scores and keep playing.' : 'Save your progress and challenge yourself.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        {message && <p className="form-message success-message" role="status">{message}</p>}
        {error && <p className="form-message error-message" role="alert">{error}</p>}

        <p className="auth-switch">
          {isLogin ? 'New here?' : 'Already have an account?'}{' '}
          <button type="button" onClick={() => onNavigate(isLogin ? '/register' : '/login')}>
            {isLogin ? 'Register' : 'Log in'}
          </button>
        </p>
      </section>
    </main>
  )
}

export default AuthPage
