import { Center, RoundedBox, useTexture } from '@react-three/drei'

const SHELL_PROPS = { color: '#161719', roughness: 0.45, metalness: 0.1 }

// Real PS5 case proportions (135mm × 170mm) — close enough to matter once a
// cover is dropped in, since a wrong aspect ratio stretches the art.
const HEIGHT = 1
const WIDTH = HEIGHT * (135 / 170)
const DEPTH = 0.06
const COVER_MARGIN = 0.025

function CoverArt({ url, width, height }: { url: string; width: number; height: number }) {
  const texture = useTexture(url)
  return (
    <mesh position={[0, 0, DEPTH / 2 + 0.001]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.35} metalness={0.05} />
    </mesh>
  )
}

// No cover yet — a quiet inset panel rather than a wrong or placeholder
// image, so the case doesn't lie about what it's holding until real art
// lands in `coverUrl`.
function CoverPending({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, 0, DEPTH / 2 + 0.001]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color="#232427" roughness={0.7} metalness={0.02} />
    </mesh>
  )
}

export interface DiscHolderProps {
  /** Front cover art — swap in once the real image exists. */
  coverUrl?: string
  scale?: number
}

/**
 * A PS5 game case: the physical "disc holder" the cover art actually goes
 * on. Built from primitives rather than a glTF since there's no scanned
 * asset — the case shell doubles as the mount for whatever cover texture
 * gets passed in.
 */
export default function DiscHolder({ coverUrl, scale = 1 }: DiscHolderProps) {
  const coverWidth = WIDTH - COVER_MARGIN * 2
  const coverHeight = HEIGHT - COVER_MARGIN * 2

  return (
    <Center>
      <group scale={scale}>
        <RoundedBox args={[WIDTH, HEIGHT, DEPTH]} radius={0.02}>
          <meshStandardMaterial {...SHELL_PROPS} />
        </RoundedBox>
        {coverUrl ? (
          <CoverArt url={coverUrl} width={coverWidth} height={coverHeight} />
        ) : (
          <CoverPending width={coverWidth} height={coverHeight} />
        )}
      </group>
    </Center>
  )
}
