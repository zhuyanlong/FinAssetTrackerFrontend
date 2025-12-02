import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import AssetTracker from './components/AssetTracker';

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header></header>
      <main>
        <AssetTracker />
      </main>

      <footer></footer>
    </div>
  )
}

export default App
