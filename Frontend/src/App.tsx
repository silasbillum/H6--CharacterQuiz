function App() {
  return (
    <main className="game">
      <header className="game-header">
        <p className="eyebrow">Character quiz</p>
        <h1>Guess the character</h1>
        <p className="intro">How well do you know your favourite characters?</p>
      </header>

      <section className="game-card" aria-labelledby="question-title">
        <p className="question-number">Question 1</p>
        <h2 id="question-title">Who is this character?</h2>
        <div className="character-placeholder" aria-label="Character image placeholder">
          Character image
        </div>
        <div className="answers" aria-label="Answer choices">
          <button type="button">Sumbit Answer</button>
        </div>
      </section>
    </main>
  )
}

export default App
