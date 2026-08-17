import LightRays from './LightRays'

// Blank black stage for the see-work scene, revealed after the fade-to-black
// transition (see App.tsx) so no other scene is ever glimpsed mid-transition.
export default function WorkScene() {
  return (
    <div className="work-scene">
      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.6}
        lightSpread={1.8}
        rayLength={1.4}
        followMouse
        mouseInfluence={0.1}
        noiseAmount={0.25}
        distortion={0.05}
        fadeDistance={1.2}
        saturation={2}
      />
    </div>
  )
}
