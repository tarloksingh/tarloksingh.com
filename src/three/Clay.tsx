// Shared material defaults so every object in every era reads as one system: gunmetal bodies, red emissive accents.
export const CLAY_BODY = '#5a5d64'
export const CLAY_DARK = '#232529'

export function clayProps(color: string = CLAY_BODY) {
  return {
    color,
    roughness: 0.4,
    metalness: 0.45
  }
}

export function accentProps(color: string, hovered: boolean) {
  return {
    color,
    emissive: color,
    emissiveIntensity: hovered ? 2.2 : 1.1,
    roughness: 0.25,
    metalness: 0.4
  }
}
