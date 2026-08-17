import { useEffect, useMemo, useState } from 'react'
import { Center } from '@react-three/drei'
import { ExtrudeGeometry } from 'three'
import type { Shape } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

const VISA_BLUE = '#1434cb'
const LOGO_URL = '/logos/visa.svg'

function useSvgShapes(url: string) {
  const [shapes, setShapes] = useState<Shape[] | null>(null)

  useEffect(() => {
    let cancelled = false
    new SVGLoader().load(url, (data) => {
      if (cancelled) return
      setShapes(data.paths.flatMap((path) => path.toShapes(true)))
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return shapes
}

export interface VisaLogo3DProps {
  /** World-unit width the logo is scaled to fit. */
  width?: number
  color?: string
}

/**
 * The Visa wordmark, extruded from the source SVG rather than drawn flat —
 * no glTF exists for it, so this reads the vector paths directly and gives
 * them depth. Not wrapped in Suspense: it resolves via state once the SVG
 * loads rather than throwing a promise, so it just renders nothing for the
 * one frame before that.
 */
export default function VisaLogo3D({ width = 0.5, color = VISA_BLUE }: VisaLogo3DProps) {
  const shapes = useSvgShapes(LOGO_URL)

  const built = useMemo(() => {
    if (!shapes || shapes.length === 0) return null

    // Depth and bevel are sized relative to the logo's own SVG-space width
    // so the whole thing scales together below — no separate unit
    // conversion between extrude depth and the final world-unit width.
    const probe = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 8 })
    probe.computeBoundingBox()
    const svgWidth = probe.boundingBox ? probe.boundingBox.max.x - probe.boundingBox.min.x : 1
    probe.dispose()

    const geometry = new ExtrudeGeometry(shapes, {
      depth: svgWidth * 0.09,
      bevelEnabled: true,
      bevelThickness: svgWidth * 0.012,
      bevelSize: svgWidth * 0.01,
      bevelSegments: 2,
      curveSegments: 8
    })

    return { geometry, scale: width / svgWidth }
  }, [shapes, width])

  if (!built) return null

  return (
    <Center>
      {/* SVGLoader's Y axis runs opposite three's (SVG grows downward) —
          the negative Y scale corrects the flip rather than leaving the
          wordmark upside down. */}
      <group scale={[built.scale, -built.scale, built.scale]}>
        <mesh geometry={built.geometry}>
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
        </mesh>
      </group>
    </Center>
  )
}
