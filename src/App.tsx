import Home from './components/Home'
import CapsuleHome from './components/CapsuleHome'

// Two home pages live side by side while the direction is being settled.
// `?v=cards` brings back the shuffling card cluster; anything else gets the
// product-on-a-stage version.
const variant = new URLSearchParams(window.location.search).get('v')

export default function App() {
  return variant === 'cards' ? <Home /> : <CapsuleHome />
}
