import { Engine } from './engine'

export type MouseEventType =
  | 'click'
  | 'contextmenu'
  | 'dblclick'
  | 'mousedown'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousemove'
  | 'mouseover'
  | 'mouseout'
  | 'mouseup'
  | 'pointerlockchange'
  | 'pointerlockerror'
  | 'select'
  | 'wheel'

interface MouseEventRegisterOptions {
  eventType: MouseEventType
  target?: HTMLElement
  callback?: (event: MouseEvent) => void
  preventDefault?: boolean
  stopPropagation?: boolean
  passive?: boolean
  publishGameEvents?: boolean
  gameEventType?: string
  throttle?: number
}

interface BasicMouseStatus {
  clientX: number
  clientY: number
  canvasX: number
  canvasY: number
  buttons: boolean[]
  mouseoverTarget: boolean
}

const defaultGameEvents = {
  click: 'MouseClick',
  contextmenu: 'ContextMenu',
  dblclick: 'DblClick',
  mousedown: 'MouseDown',
  mouseenter: 'MouseEnter',
  mouseleave: 'MouseLeave',
  mousemove: 'MouseMove',
  mouseover: 'MouseOver',
  mouseout: 'MouseOut',
  mouseup: 'MouseUp',
  pointerlockchange: 'PointerLockChange',
  pointerlockerror: 'PointerLockError',
  select: 'Select',
  wheel: 'Wheel',
}

const fetchMousePosition = (engine: Engine, event: MouseEvent) => {
  const canvas = engine.pixiApp.view
  const canvasDim = canvas.getBoundingClientRect()
  const resolution = engine.pixiApp.renderer.resolution
  const screenWidth = engine.pixiApp.renderer.width / resolution
  const screenHeight = engine.pixiApp.renderer.height / resolution
  const scaleWidth = canvasDim.height / screenHeight
  const scaleHeight = canvasDim.width / screenWidth
  const scale = scaleWidth < scaleHeight ? scaleWidth : scaleHeight
  const clientX = event.clientX
  const clientY = event.clientY

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

export class MouseInputManager {
  readonly mouseStatus: BasicMouseStatus

  private engine: Engine
  private userHandlers: Map<string, Handler>
  private statusHandler: (event: MouseEvent) => void
  private statusTarget: HTMLElement

  constructor(engine: Engine) {
    this.engine = engine
    this.userHandlers = new Map<string, Handler>()
    this.mouseStatus = {
      clientX: 0,
      clientY: 0,
      canvasX: 0,
      canvasY: 0,
      buttons: [],
      mouseoverTarget: false,
    }
  }

  listenBasicStatus(target?: HTMLElement) {
    this.registerStatusEvents(target ? target : this.engine.pixiApp.view)
  }

  stopListeningingBasicStatus() {
    this.unregisterStatusEvents()
  }

  registerMouseEvent(options: MouseEventRegisterOptions) {
    const opts = this.mergeDefaultOptions(options)
    const handler = new Handler(this.engine, opts)
    this.userHandlers.set(opts.eventType, handler)
    handler.suscribe()
  }

  unregisterMouseEvent(eventType: MouseEventType) {
    if (this.userHandlers.get(eventType)) {
      const handler = this.userHandlers.get(eventType)
      handler.unsuscribe()
      this.userHandlers.delete(eventType)
    }
  }

  unregisterAll() {
    const eventTypes = this.userHandlers.keys()
    for (let eventType of eventTypes) {
      this.unregisterMouseEvent(eventType as MouseEventType)
    }
  }

  private mergeDefaultOptions(userOptions: MouseEventRegisterOptions) {
    const defaults: MouseEventRegisterOptions = {
      eventType: userOptions.eventType,
      target: this.engine.pixiApp.view,
      preventDefault: false,
      stopPropagation: false,
      passive: true,
      publishGameEvents: false,
      gameEventType: defaultGameEvents[userOptions.eventType],
      throttle: 0,
    }

    return {
      ...defaults,
      ...userOptions,
    }
  }

  private registerStatusEvents(target: HTMLElement) {
    this.statusTarget = target
    this.statusHandler = ((event: MouseEvent) => {
      // mouse position
      const { clientX, clientY, canvasX, canvasY } = fetchMousePosition(
        this.engine,
        event
      )
      this.mouseStatus.clientX = clientX
      this.mouseStatus.clientY = clientY
      this.mouseStatus.canvasX = canvasX
      this.mouseStatus.canvasY = canvasY

      // button status & mouseover
      if (event.type === 'mousedown') {
        this.mouseStatus.buttons[event.button] = true
      } else if (event.type === 'mouseup') {
        this.mouseStatus.buttons[event.button] = false
      } else if (event.type === 'mouseenter') {
        this.mouseStatus.mouseoverTarget = true
      } else if (event.type === 'mouseleave') {
        this.mouseStatus.mouseoverTarget = false
      }
    }).bind(this)

    this.statusTarget.addEventListener('mousedown', this.statusHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('mouseup', this.statusHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('mouseenter', this.statusHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('mouseleave', this.statusHandler, {
      passive: true,
    })
    this.statusTarget.addEventListener('mousemove', this.statusHandler, {
      passive: true,
    })
  }

  private unregisterStatusEvents() {
    this.statusTarget.removeEventListener('mousedown', this.statusHandler)
    this.statusTarget.removeEventListener('mouseup', this.statusHandler)
    this.statusTarget.removeEventListener('mouseenter', this.statusHandler)
    this.statusTarget.removeEventListener('mouseleave', this.statusHandler)
    this.statusTarget.removeEventListener('mousemove', this.statusHandler)
  }
}

class Handler {
  private engine: Engine
  private options: MouseEventRegisterOptions
  private timestamp: number
  private handler: (event: MouseEvent) => void

  constructor(engine: Engine, options: MouseEventRegisterOptions) {
    this.engine = engine
    this.options = options
  }

  suscribe() {
    this.handler = this.getHandler()
    this.options.target.addEventListener(this.options.eventType, this.handler, {
      passive: this.options.passive,
    })
  }

  unsuscribe() {
    this.options.target.removeEventListener(
      this.options.eventType,
      this.handler
    )
  }

  private getHandler() {
    const handler = (event: MouseEvent) => {
      const now = Date.now()
      if (!this.timestamp) this.timestamp = now
      const last = this.timestamp

      if (now - last < this.options.throttle) return
      this.timestamp = now

      if (this.options.preventDefault) {
        event.preventDefault()
      }
      if (this.options.stopPropagation) {
        event.stopPropagation()
      }

      if (this.options.publishGameEvents) {
        const { clientX, clientY, canvasX, canvasY } = fetchMousePosition(
          this.engine,
          event
        )
        const buttons: boolean[] = []
        for (let i = 0; i < 10; i++) {
          if (event.buttons & (0b1 << i)) buttons[i] = true
        }
        this.engine.eventQueue.publish({
          type: this.options.gameEventType,
          msg: {
            clientX: clientX,
            clientY: clientY,
            canvasX: canvasX,
            canvasY: canvasY,
            buttons: buttons,
            mouseEvent: event,
          },
        })
      }

      if (this.options.callback !== undefined) {
        setTimeout(() => this.options.callback(event), 0)
      }
    }

    return handler.bind(this)
  }
}
