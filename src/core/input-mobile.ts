import { Engine } from './engine'

interface Vec3 {
  x: number
  y: number
  z: number
}

interface GreekVec3 {
  alpha: number
  beta: number
  gamma: number
}

export type MobileEventType =
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'touchcancel'
  | 'devicemotion'
  | 'deviceorientation'
  | 'orientationchange'

interface MobileEventRegisterOptions {
  eventType: MobileEventType
  target?: EventTarget
  callback?: (
    event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event
  ) => void
  preventDefault?: boolean
  stopPropagation?: boolean
  passive?: boolean
  publishGameEvents?: boolean
  gameEventType?: string
  throttle?: number
}

interface BasicMobileStatus {
  touchDown: boolean
  touches: TouchPoint[]
  orientationAbsolute: boolean
  orientation: GreekVec3
  motion: {
    acceleration: Vec3
    accelerationWithGravity: Vec3
    rate: GreekVec3
    interval: number
  }
}

interface TouchPoint {
  id: number
  clientX: number
  clientY: number
  canvasX: number
  canvasY: number
}

const defaultGameEvents = {
  touchstart: 'TouchStart',
  touchmove: 'TouchMove',
  touchend: 'TouchEnd',
  touchcancel: 'TouchCancel',
  devicemotion: 'DeviceMotion',
  deviceorientation: 'DeviceOrientation',
  orientationchange: 'OrientationChange',
}

const fetchTouchPosition = (engine: Engine, touch: Touch) => {
  const canvas = engine.pixiApp.view
  const canvasDim = canvas.getBoundingClientRect()
  const resolution = engine.pixiApp.renderer.resolution
  const screenWidth = engine.pixiApp.renderer.width / resolution
  const screenHeight = engine.pixiApp.renderer.height / resolution
  const scaleWidth = canvasDim.height / screenHeight
  const scaleHeight = canvasDim.width / screenWidth
  const scale = scaleWidth < scaleHeight ? scaleWidth : scaleHeight
  const clientX = touch.clientX
  const clientY = touch.clientY

  // remove canvas dim
  let canvasX = clientX - canvasDim.left - window.pageXOffset
  let canvasY = clientY - canvasDim.top - window.pageYOffset

  // scale
  const offsetLeft = Math.abs(canvasDim.width - screenWidth * scale) / scale / 2
  const offsetTop =
    Math.abs(canvasDim.height - screenHeight * scale) / scale / 2
  canvasX = canvasX / scale - offsetLeft
  canvasY = canvasY / scale - offsetTop

  return {
    clientX: clientX,
    clientY: clientY,
    canvasX: canvasX,
    canvasY: canvasY,
  }
}

export class MobileInputManager {
  readonly mobileStatus: BasicMobileStatus

  private engine: Engine
  private userOptions: Map<string, MobileEventRegisterOptions>
  private userHandlers: Map<
    string,
    (
      event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event
    ) => void
  >
  private timestamps: Map<string, number>
  private statusTarget: EventTarget
  private statusTouchHandler: (event: TouchEvent) => void
  private statusOrientationHandler: (event: DeviceOrientationEvent) => void
  private statusMotionHandler: (event: DeviceMotionEvent) => void

  constructor(engine: Engine) {
    this.engine = engine
    this.userOptions = new Map<MobileEventType, MobileEventRegisterOptions>()
    this.userHandlers = new Map<
      string,
      (
        event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event
      ) => void
    >()
    this.timestamps = new Map<string, number>()
    this.mobileStatus = {
      touches: [],
      touchDown: false,
      orientationAbsolute: false,
      orientation: { alpha: 0, beta: 0, gamma: 0 },
      motion: {
        acceleration: { x: 0, y: 0, z: 0 },
        accelerationWithGravity: { x: 0, y: 0, z: 0 },
        rate: { alpha: 0, beta: 0, gamma: 0 },
        interval: 0,
      },
    }
  }

  listenBasicStatus(target?: EventTarget) {
    this.registerStatusEvents(target ? target : this.engine.pixiApp.view)
  }

  stopListeningBasicStatus() {
    this.unregisterStatusEvents()
  }

  registerMobileEvent(options: MobileEventRegisterOptions) {
    const opts = this.mergeDefaultOptions(options)
    this.userOptions.set(opts.eventType, opts)

    const handler = this.getHandler()
    this.userHandlers.set(opts.eventType, handler)

    opts.target.addEventListener(opts.eventType, handler, {
      passive: opts.passive,
    })
  }

  unregisterMobileEvent(eventType: MobileEventType) {
    const opts = this.userOptions.get(eventType)
    const handler = this.userHandlers.get(eventType)

    opts.target.removeEventListener(opts.eventType, handler)

    this.userOptions.delete(eventType)
    this.userHandlers.delete(eventType)
  }

  unregisterAll() {
    const types = this.userOptions.keys()
    for (let type of types) {
      this.unregisterMobileEvent(type as MobileEventType)
    }
  }

  private mergeDefaultOptions(userOptions: MobileEventRegisterOptions) {
    const defaults: MobileEventRegisterOptions = {
      eventType: userOptions.eventType,
      target:
        userOptions.eventType === 'deviceorientation' ||
        userOptions.eventType === 'devicemotion' ||
        userOptions.eventType === 'orientationchange'
          ? window
          : this.engine.pixiApp.view,
      preventDefault: false,
      stopPropagation: false,
      passive: true,
      publishGameEvents: false,
      gameEventType: defaultGameEvents[userOptions.eventType],
      throttle:
        userOptions.eventType === 'deviceorientation' ||
        userOptions.eventType === 'devicemotion'
          ? 100
          : 0,
    }

    return {
      ...defaults,
      ...userOptions,
    }
  }

  private getHandler() {
    const handler = (event: Event) => {
      const now = Date.now()
      const opts = this.userOptions.get(event.type as MobileEventType)
      if (!this.timestamps.get(opts.eventType))
        this.timestamps.set(opts.eventType, now)
      const last = this.timestamps.get(opts.eventType)

      if (!opts) return
      if (now - last < opts.throttle) return
      this.timestamps.set(opts.eventType, now)

      if (opts.preventDefault) {
        event.preventDefault()
      }
      if (opts.stopPropagation) {
        event.stopPropagation()
      }

      if (opts.publishGameEvents) {
        const gameEventType = opts.gameEventType
          ? opts.gameEventType
          : defaultGameEvents[opts.eventType]
        this.engine.eventQueue.publish({
          type: gameEventType,
          msg: {
            mobileEvent: event,
          },
        })
      }

      if (opts.callback) {
        opts.callback(event)
      }
    }

    return handler.bind(this)
  }

  private registerStatusEvents(target: EventTarget) {
    this.statusTarget = target

    this.statusTouchHandler = ((event: TouchEvent) => {
      this.mobileStatus.touchDown = event.touches.length > 0
      /* if ( event.type === 'touchstart' ) {
                this.mobileStatus.touchDown = true;
            } else if ( event.type === 'touchend' ) {
                this.mobileStatus.touchDown = false;
            } else if ( event.type === 'touchcancel' ) {
                this.mobileStatus.touchDown = false;
            } */

      this.mobileStatus.touches = []
      const touchesLen = event.touches.length
      for (let i = 0; i < touchesLen; i++) {
        const { clientX, clientY, canvasX, canvasY } = fetchTouchPosition(
          this.engine,
          event.touches.item(i)
        )
        this.mobileStatus.touches[event.touches.item(i).identifier] = {
          id: event.touches.item(i).identifier,
          clientX: clientX,
          clientY: clientY,
          canvasX: canvasX,
          canvasY: canvasY,
        }
      }
      /* this.mobileStatus.x = event.changedTouches[0].clientX;
            this.mobileStatus.y = event.changedTouches[0].clientY; */
    }).bind(this)

    this.statusOrientationHandler = ((event: DeviceOrientationEvent) => {
      this.mobileStatus.orientationAbsolute = event.absolute
      this.mobileStatus.orientation.alpha = event.alpha
      this.mobileStatus.orientation.beta = event.beta
      this.mobileStatus.orientation.gamma = event.gamma
    }).bind(this)

    this.statusMotionHandler = ((event: DeviceMotionEvent) => {
      this.mobileStatus.motion.acceleration.x = event.acceleration.x
      this.mobileStatus.motion.acceleration.y = event.acceleration.y
      this.mobileStatus.motion.acceleration.z = event.acceleration.z

      this.mobileStatus.motion.accelerationWithGravity.x =
        event.accelerationIncludingGravity.x
      this.mobileStatus.motion.accelerationWithGravity.y =
        event.accelerationIncludingGravity.y
      this.mobileStatus.motion.accelerationWithGravity.z =
        event.accelerationIncludingGravity.z

      this.mobileStatus.motion.rate.alpha = event.rotationRate.alpha
      this.mobileStatus.motion.rate.beta = event.rotationRate.beta
      this.mobileStatus.motion.rate.gamma = event.rotationRate.gamma

      this.mobileStatus.motion.interval = event.interval
    }).bind(this)

    this.statusTarget.addEventListener('touchstart', this.statusTouchHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('touchmove', this.statusTouchHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('touchend', this.statusTouchHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('touchcancel', this.statusTouchHandler, {
      passive: true,
    })
    window.addEventListener(
      'deviceorientation',
      this.statusOrientationHandler,
      { passive: true }
    )
    window.addEventListener('devicemotion', this.statusMotionHandler, {
      passive: true,
    })
  }

  private unregisterStatusEvents() {
    this.statusTarget.removeEventListener('touchstart', this.statusTouchHandler)
    this.statusTarget.removeEventListener('touchmove', this.statusTouchHandler)
    this.statusTarget.removeEventListener('touchend', this.statusTouchHandler)
    this.statusTarget.removeEventListener(
      'touchcancel',
      this.statusTouchHandler
    )
    window.removeEventListener(
      'deviceorientation',
      this.statusOrientationHandler
    )
    window.removeEventListener('devicemotion', this.statusMotionHandler)
  }
}
