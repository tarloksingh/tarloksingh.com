import { Center, RoundedBox } from '@react-three/drei'

const CARD_PROPS = { color: '#fafafa', roughness: 0.25, metalness: 0.04 }

const HEIGHT = 1.05
const WIDTH = HEIGHT * 0.62
const DEPTH = 0.02

export interface WyteCardProps {
  scale?: number
}

/** Wyte Card, literally: a plain white card, portrait side up. */
export default function WyteCard({ scale = 1 }: WyteCardProps) {
  return (
    <Center>
      <RoundedBox args={[WIDTH, HEIGHT, DEPTH]} radius={0.045} scale={scale}>
        <meshStandardMaterial {...CARD_PROPS} />
      </RoundedBox>
    </Center>
  )
}
