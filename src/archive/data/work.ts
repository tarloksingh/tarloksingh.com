export interface WorkProject {
  id: string
  title: string
  description: string
}

// Lifted verbatim from the previous site's `allWorkProjects` (src/App.vue at
// commit ded65a6), so the two stay in the same order.
export const workProjects: WorkProject[] = [
  { id: 'capsule-c1', title: 'Capsule C1', description: 'Teleportation Calling' },
  { id: 'mr-takahashi', title: 'Mr. Takahashi', description: 'AI Japanese Language Teacher' },
  { id: 'slider-engine', title: 'Slider Engine', description: 'Zero Code Game Engine' },
  { id: 'openup', title: 'OpenUp', description: 'Make New Friends' },
  { id: 'mecha-station', title: 'Mecha Station', description: 'Point of Sale' },
  { id: 'stitchfam', title: 'Stitchfam', description: 'Build a Family Tree Together' },
  { id: 'red-dead-redemption-2', title: 'Red Dead Redemption 2', description: 'Action-Adventure Game' },
  { id: 'wyte-card', title: 'Wyte Card', description: 'Digital Business Card' },
  { id: 'grand-theft-auto-v', title: 'Grand Theft Auto V', description: 'Action-Adventure Game' },
  { id: 'block-builder', title: 'Block Builder', description: 'LEGO Style IPad Game' }
]
