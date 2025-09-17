declare module '@barba/core' {
  const barba: any
  export default barba
}

declare module '@barba/css' {
  const barbaCss: any
  export default barbaCss
}

declare module 'cursor-effects' {
  export class followingDotCursor {
    constructor(options: any)
  }
}

declare module 'locomotive-scroll' {
  export default class LocomotiveScroll {
    constructor(options: {
      el: HTMLElement
      smooth?: boolean
      lerp?: number
      multiplier?: number
      smartphone?: {
        smooth?: boolean
        multiplier?: number
      }
      tablet?: {
        smooth?: boolean
        multiplier?: number
      }
    })
    destroy(): void
    update(): void
  }
}
