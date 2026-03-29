import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const storedTheme = localStorage.getItem('theme')
if (storedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light')
else if (storedTheme === 'extra-dark') document.documentElement.setAttribute('data-theme', 'extra-dark')
else document.documentElement.removeAttribute('data-theme')

createRoot(document.getElementById('root')!).render(<App />)
