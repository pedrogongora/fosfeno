import * as PIXI from 'pixi.js'
import { EntityManager } from './entity'
import { System, RenderableSystem } from './system'
import { EventQueue } from './events'
import { GameProperties } from './gameprops'
import { GameState } from './state'
import {
  StateTransitionDescription,
  StateTransitionSystem,
} from './statetransition'
import { KeyboardInputManager } from './input-keyboard'
import { MouseInputManager } from './input-mouse'
import { MobileInputManager } from './input-mobile'
import { log } from './log'
import { Scene } from '../scene'

export class Engine {
  readonly entityManager: EntityManager
  readonly eventQueue: EventQueue
  readonly properties: GameProperties
  readonly pixiApp: PIXI.Application
  readonly scene: Scene

  readonly pixiDefaultProperties = {
    resizeTo: window,
    antialias: false,
    transparent: false,
    resolution: window.devicePixelRatio,
  }
  readonly input: {
    keyboard: KeyboardInputManager
    mouse: MouseInputManager
    mobile: MobileInputManager
  }
  readonly statistics: {
    systemsUpdateAverageTime: number
    systemsRenderAverageTime: number
    systemsCleanupAverageTime: number
    loopIterationAverageTime: number
    loopIntervalAverageTime: number
    fps: number
  }

  private stateTransitions: StateTransitionDescription
  private stateTransitionSystem: StateTransitionSystem
  private currentState: GameState
  private running: boolean
  private pendingActions: (() => void)[]
  private lastLoopIterationTimestamp: number

  constructor(properties: GameProperties) {
    this.eventQueue = new EventQueue()
    this.properties = properties
    this.entityManager = new EntityManager(this, properties, this.eventQueue)
    this.pixiApp = new PIXI.Application({
      ...this.pixiDefaultProperties,
      ...properties.pixiProperties,
    })
    this.pixiApp.stage.sortableChildren = true
    this.scene = new Scene(this)
    const w = this.pixiApp.renderer.width / this.pixiApp.renderer.resolution
    const h = this.pixiApp.renderer.height / this.pixiApp.renderer.resolution
    this.scene.addCamera(0, 0, w, h, false)

    this.input = {
      keyboard: new KeyboardInputManager(this),
      mouse: new MouseInputManager(this),
      mobile: new MobileInputManager(this),
    }

    this.statistics = {
      systemsUpdateAverageTime: undefined,
      systemsRenderAverageTime: undefined,
      systemsCleanupAverageTime: undefined,
      loopIterationAverageTime: undefined,
      loopIntervalAverageTime: undefined,
      fps: undefined,
    }

    this.running = false
    this.pendingActions = []
  }

  get stateProperties(): Map<string, any> {
    return this.currentState.properties
  }

  setTransitionSystem(
    stateTransitions: StateTransitionDescription,
    stateClassStore: any
  ) {
    this.stateTransitions = stateTransitions
    this.stateTransitionSystem = new StateTransitionSystem(
      this,
      stateTransitions,
      stateClassStore
    )
    this.stateTransitionSystem.init()
  }

  setState(state: GameState, reset: boolean = false) {
    if (this.currentState && reset) {
      //PIXI.Loader.shared.removeAllListeners()
      PIXI.utils.destroyTextureCache()
      PIXI.Loader.shared.reset()
      this.entityManager.removeAllEntities()
      this.eventQueue.reset()
    }
    this.currentState = state
  }

  start() {
    if (!this.currentState) {
      throw new Error(
        'There is no current state, try setState(...) or setTransitionSystem(...) before calling start()'
      )
    }

    if (!this.running) {
      this.running = true
      this.currentState.start(this.runGameLoop.bind(this))
    }
  }

  stop(callback: () => void) {
    const doStop = () => {
      this.pixiApp.ticker.remove(this.gameLoop, this)
      if (this.currentState) {
        this.currentState.unstageSystems()
        this.currentState.unstage()
      }
      if (callback) {
        callback()
      }
    }

    if (this.running) {
      this.pendingActions.push(doStop)
    } else {
      doStop()
    }
  }

  private runGameLoop() {
    this.pixiApp.ticker.add(this.gameLoop, this)
  }

  private gameLoop = (delta: number) => {
    const timestamps: number[] = []
    this.running = true
    timestamps.push(Date.now()) // [0]
    const isRenderSystem = function (
      system: System
    ): system is RenderableSystem {
      return (system as RenderableSystem).doRender !== undefined
    }

    timestamps.push(Date.now()) // [1]
    const systems = this.currentState.getSystems(),
      numSystems = systems.length
    for (let i = 0; i < numSystems; i++) {
      systems[i].doUpdate(delta)
      this.eventQueue.dispatchEvents()
    }

    timestamps.push(Date.now()) // [2]
    for (let i = 0; i < numSystems; i++) {
      if (isRenderSystem(systems[i])) {
        ;(systems[i] as RenderableSystem).doRender()
        this.eventQueue.dispatchEvents()
      }
    }

    timestamps.push(Date.now()) // [3]
    for (let i = 0; i < numSystems; i++) {
      systems[i].doCleanup()
      this.eventQueue.dispatchEvents()
    }

    timestamps.push(Date.now()) // [4]
    this.running = false
    while (this.pendingActions.length > 0) {
      const action = this.pendingActions.shift()
      action()
    }

    timestamps.push(Date.now()) // [5]
    this.updateStatistics(timestamps)
  }

  private updateStatistics(timestamps: number[]) {
    let {
      systemsCleanupAverageTime,
      systemsRenderAverageTime,
      systemsUpdateAverageTime,
      loopIntervalAverageTime,
      loopIterationAverageTime,
    } = this.statistics

    if (systemsUpdateAverageTime) {
      this.statistics.systemsUpdateAverageTime =
        (systemsUpdateAverageTime + timestamps[2] - timestamps[1]) / 2
    } else {
      this.statistics.systemsUpdateAverageTime = timestamps[2] - timestamps[1]
    }

    if (systemsRenderAverageTime) {
      this.statistics.systemsRenderAverageTime =
        (systemsRenderAverageTime + timestamps[3] - timestamps[2]) / 2
    } else {
      this.statistics.systemsRenderAverageTime = timestamps[3] - timestamps[2]
    }

    if (systemsCleanupAverageTime) {
      this.statistics.systemsCleanupAverageTime =
        (systemsCleanupAverageTime + timestamps[4] - timestamps[3]) / 2
    } else {
      this.statistics.systemsCleanupAverageTime = timestamps[4] - timestamps[3]
    }

    if (loopIterationAverageTime) {
      this.statistics.loopIterationAverageTime =
        (loopIterationAverageTime + timestamps[5] - timestamps[0]) / 2
    } else {
      this.statistics.loopIterationAverageTime = timestamps[5] - timestamps[0]
    }

    if (loopIntervalAverageTime && this.lastLoopIterationTimestamp) {
      this.statistics.loopIntervalAverageTime =
        (loopIntervalAverageTime +
          (timestamps[0] - this.lastLoopIterationTimestamp)) /
        2
    } else {
      this.statistics.loopIntervalAverageTime = timestamps[0]
    }

    this.statistics.fps = this.pixiApp.ticker.FPS

    this.lastLoopIterationTimestamp = timestamps[0]
  }
}
