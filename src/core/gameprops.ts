export interface GameProperties {
  pixiProperties?: {
    autoStart?: boolean
    width?: number
    height?: number
    view?: HTMLCanvasElement
    transparent?: boolean
    autoDensity?: boolean
    antialias?: boolean
    preserveDrawingBuffer?: boolean
    resolution?: number
    resizeTo?: Window | HTMLElement
    forceCanvas?: boolean
    backgroundColor?: number
    clearBeforeRender?: boolean
    forceFXAA?: boolean
    powerPreference?: string
    sharedTicker?: boolean
    sharedLoader?: boolean
  }
  [propertyName: string]: any
}
