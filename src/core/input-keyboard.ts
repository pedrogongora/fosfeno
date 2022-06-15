import { Engine } from './engine'

export type KeyboardEventType = 'keyup' | 'keydown' | 'keypress'

interface KeyboardBasicStatus {
  keys: {
    [code: string]: { down: boolean; timestamp: number }
  }
}

interface KeyboardEventRegisterOptions {
  key: string
  keyupCallback?: (event: KeyboardEvent) => void
  keydownCallback?: (event: KeyboardEvent) => void
  preventDefault?: boolean
  stopPropagation?: boolean
  publishGameEvents?: boolean
  keyupGameEventType?: string
  keydownGameEventType?: string
}

export class KeyboardInputManager {
  readonly keyboardStatus: KeyboardBasicStatus

  private engine: Engine
  private userHandlers: Map<string, Handler>
  private statusUpHandler: (event: KeyboardEvent) => void
  private statusDownHandler: (event: KeyboardEvent) => void
  private keyDownStatus: KeyboardBasicStatus

  constructor(engine: Engine) {
    this.engine = engine
    this.userHandlers = new Map<string, Handler>()
    this.keyboardStatus = {
      keys: {},
    }
    this.keyDownStatus = {
      keys: {},
    }
  }

  listenBasicStatus() {
    this.registerStatusEvents()
  }

  stopListeningingBasicStatus() {
    this.unregisterStatusEvents()
  }

  registerKeyEventHandler(options: KeyboardEventRegisterOptions) {
    const opts = this.mergeDefaultOptions(options)
    const handler = new Handler(this.engine, opts)
    this.userHandlers.set(opts.key, handler)
    handler.suscribe()
  }

  unregisterKeyEventHandler(key: string) {
    if (this.userHandlers.get(key)) {
      const handler = this.userHandlers.get(key)
      handler.unsuscribe()
      this.userHandlers.delete(key)
    }
  }

  unregisterAll() {
    const keyNames = this.userHandlers.keys()
    for (let key of keyNames) {
      this.unregisterKeyEventHandler(key)
    }
  }

  private mergeDefaultOptions(userOptions: KeyboardEventRegisterOptions) {
    const defaults: KeyboardEventRegisterOptions = {
      key: userOptions.key,
      preventDefault: true,
      stopPropagation: false,
      publishGameEvents: false,
      keyupGameEventType: 'KeyUp-' + userOptions.key,
      keydownGameEventType: 'KeyDown-' + userOptions.key,
    }

    return {
      ...defaults,
      ...userOptions,
    }
  }

  private registerStatusEvents() {
    this.statusDownHandler = ((event: KeyboardEvent) => {
      const timestamp = Date.now()
      if (!this.keyDownStatus.keys[event.code]) {
        this.keyboardStatus.keys[event.code] = {
          down: true,
          timestamp: timestamp,
        }
        this.keyDownStatus.keys[event.code] = {
          down: true,
          timestamp: timestamp,
        }
      } else {
        this.keyboardStatus.keys[event.code].down = true
        this.keyboardStatus.keys[event.code].timestamp = timestamp
        this.keyDownStatus.keys[event.code].down = true
        this.keyDownStatus.keys[event.code].timestamp = timestamp
      }
    }).bind(this)

    this.statusUpHandler = ((event: KeyboardEvent) => {
      const timestamp = Date.now()
      this.keyboardStatus.keys[event.code] = {
        down: false,
        timestamp: timestamp,
      }
      this.keyDownStatus.keys[event.code] = {
        down: false,
        timestamp: timestamp,
      }
    }).bind(this)

    window.addEventListener('keydown', this.statusDownHandler)
    window.addEventListener('keyup', this.statusUpHandler)
  }

  private unregisterStatusEvents() {
    window.removeEventListener('keydown', this.statusDownHandler)
    window.removeEventListener('keyup', this.statusUpHandler)
  }
}

class Handler {
  private engine: Engine
  private options: KeyboardEventRegisterOptions

  private downHandler: (event: KeyboardEvent) => void
  private upHandler: (event: KeyboardEvent) => void

  private isDown: boolean

  constructor(engine: Engine, options: KeyboardEventRegisterOptions) {
    this.engine = engine
    this.options = options
  }

  suscribe() {
    this.downHandler = this.getKeydownHandler()
    this.upHandler = this.getKeyupHandler()

    window.addEventListener('keydown', this.downHandler)
    window.addEventListener('keyup', this.upHandler)
  }

  unsuscribe() {
    window.removeEventListener('keydown', this.downHandler)
    window.removeEventListener('keyup', this.upHandler)
  }

  private getKeydownHandler() {
    const handler = (event: KeyboardEvent) => {
      if (this.options.key !== event.key) return

      if (this.options.preventDefault) {
        event.preventDefault()
      }
      if (this.options.stopPropagation) {
        event.stopPropagation()
      }

      if (this.isDown) {
        return
      } else {
        this.isDown = true
      }

      if (this.options.publishGameEvents) {
        this.engine.eventQueue.publish({
          type: this.options.keydownGameEventType,
          msg: {
            keyboardEvent: event,
          },
        })
      }

      if (this.options.keydownCallback !== undefined) {
        setTimeout(() => this.options.keydownCallback(event), 0)
      }
    }

    return handler.bind(this)
  }

  private getKeyupHandler() {
    const handler = (event: KeyboardEvent) => {
      if (this.options.key !== event.key) return

      if (this.options.preventDefault) {
        event.preventDefault()
      }
      if (this.options.stopPropagation) {
        event.stopPropagation()
      }

      this.isDown = false

      if (this.options.publishGameEvents) {
        this.engine.eventQueue.publish({
          type: this.options.keyupGameEventType,
          msg: {
            keyboardEvent: event,
          },
        })
      }
      if (this.options.keyupCallback !== undefined) {
        setTimeout(() => this.options.keyupCallback(event), 0)
      }
    }

    return handler.bind(this)
  }
}
