import Site from './site/Site'

// Everything the site is lives under `src/site/`. `src/archive/` holds the
// previous versions, unmounted but intact — see its README.
export default function App() {
  return <Site />
}
