export interface EraObject {
  id: string
  component: string // key into the object component registry
  title: string
  years: string
  text: string
  workId?: string // maps to a future case-study route
  position: [number, number, number]
  media?: { type: 'video' | 'image'; src: string }
}

export interface Era {
  id: string
  label: string
  years: string
  color: string
  objects: EraObject[]
}

export const eras: Era[] = [
  {
    id: 'now',
    label: 'Now',
    years: '2026 — Present',
    color: '#ff3b30',
    objects: [
      {
        id: 'printer',
        component: 'Printer3D',
        title: '3D Printing',
        years: '2026',
        text: 'Prototyping enclosures and parts in Blender, printed at home — the same pipeline that produced the Capsule hardware.',
        position: [-3, -0.27, 0]
      },
      {
        id: 'visa',
        component: 'VisaKiosk3D',
        title: 'Staff Designer, Visa',
        years: 'Jan – Jul 2026',
        text: 'Replaced Visa’s external agency pipeline with a 114,000-line in-house platform. Killed ~€120K in agency spend, taught three orgs to run it without him.',
        workId: 'visa',
        position: [-1, -0.13, 0]
      },
      {
        id: 'camera',
        component: 'Camera3D',
        title: 'Home Camera System',
        years: '2026',
        text: 'Multi-camera H.265 → HLS pipeline in Python, self-healing LaunchDaemons, Telegram alerting, Tailscale remote access.',
        position: [1, -0.52, 0]
      },
      {
        id: 'solomon',
        component: 'Motorcycle3D',
        title: 'SOLOMON',
        years: '2026',
        text: 'A Three.js / WebGL 3D game built entirely in code — custom post-processing stack, live FX editor, Blender-authored rider and bike.',
        position: [3, -0.15, 0]
      }
    ]
  },
  {
    id: 'openup',
    label: 'OpenUp',
    years: '2018 — Present',
    color: '#ff6a3d',
    objects: [
      {
        id: 'mecha-station',
        component: 'POSTerminal3D',
        title: 'Mecha Station',
        years: '2022 – Present',
        text: 'Cross-platform point-of-sale system deployed to 3 retail locations. Revenue $800K → $1.5M, employee task time cut 83%.',
        workId: 'mecha-station',
        position: [-3, -0.41, 0],
        media: { type: 'video', src: 'mecha-station/hero.mp4' }
      },
      {
        id: 'capsule',
        component: 'CapsulePuck3D',
        title: 'Capsule',
        years: '2022 – Present',
        text: 'TV-to-TV video calling hardware. Peer-to-peer WebRTC in HEVC, Vision-based auto-framing, on-device captions. Live in 5 homes.',
        workId: 'capsule-c1',
        position: [-1, -0.41, 0],
        media: { type: 'video', src: 'capsule-c1/hero.mp4' }
      },
      {
        id: 'slider-engine',
        component: 'SliderPanel3D',
        title: 'Slider Engine',
        years: '2022 – Present',
        text: 'Event-driven visual programming IDE. 112 sign-ups in 2 hours pre-validated the idea; shipped to 200+ users.',
        workId: 'slider-engine',
        position: [1, -0.41, 0],
        media: { type: 'video', src: 'slider-engine/hero.mp4' }
      },
      {
        id: 'mr-takahashi',
        component: 'TutorBot3D',
        title: 'Mr. Takahashi',
        years: '2022 – Present',
        text: '3D AI language tutor for iOS and Android. First-week retention 2% → 30% after applying research-backed game mechanics.',
        workId: 'mr-takahashi',
        position: [3, -0.305, 0],
        media: { type: 'video', src: 'mr-takahashi/hero.mp4' }
      }
    ]
  }
]
