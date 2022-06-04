import { Engine } from './engine'
import { Entity, EntitySignature } from './entity'
import { Component, ComponentClassName } from './component'
import { GameEvent } from './events'

export interface Subsystem {
  stage?: () => void
  unstage?: () => void
  update?: (delta: number) => void
  render?: () => void
  cleanup?: () => void
  destroy?: () => void
}

export abstract class System {
  protected engine: Engine
  protected subsystems: Subsystem[]

  private stageList: (() => void)[]
  private unstageList: (() => void)[]
  private updateList: ((delta: number) => void)[]
  private cleanupList: (() => void)[]
  private destroyList: (() => void)[]

  constructor(engine: Engine) {
    this.engine = engine
    this.subsystems = []
    this.stageList = []
    this.unstageList = []
    this.updateList = []
    this.cleanupList = []
    this.destroyList = []
  }

  protected abstract stage(): void

  protected abstract update(delta: number): void

  protected abstract cleanup(): void

  protected abstract unstage(): void

  protected abstract destroy(): void

  public addSubsystem(subsystem: Subsystem) {
    this.subsystems.push(subsystem)
    if (subsystem.cleanup) this.cleanupList.push(subsystem.cleanup)
    if (subsystem.destroy) this.destroyList.push(subsystem.destroy)
    if (subsystem.stage) this.stageList.push(subsystem.stage)
    if (subsystem.unstage) this.unstageList.push(subsystem.unstage)
    if (subsystem.update) this.updateList.push(subsystem.update)
  }

  public doStage() {
    for (let i = 0; i < this.stageList.length; i++) {
      this.stageList[i]()
    }
    this.stage()
  }

  public doUnstage() {
    for (let i = 0; i < this.unstageList.length; i++) {
      this.unstageList[i]()
    }
    this.unstage()
  }

  public doUpdate(delta: number) {
    for (let i = 0; i < this.updateList.length; i++) {
      this.updateList[i](delta)
    }
    this.update(delta)
  }

  public doCleanup() {
    for (let i = 0; i < this.cleanupList.length; i++) {
      this.cleanupList[i]()
    }
    this.cleanup()
  }

  public doDestroy() {
    for (let i = 0; i < this.destroyList.length; i++) {
      this.destroyList[i]()
    }
    this.destroy()
  }

  protected getEntityComponentOfClass<C>(
    className: ComponentClassName<C>,
    forEntity: Entity
  ): Component {
    return this.engine.entityManager.getEntityComponentOfClass(
      className,
      forEntity
    )
  }

  protected getEntityComponents(forEntity: Entity): Component[] {
    return this.engine.entityManager.getEntityComponents(forEntity)
  }

  protected getComponentsOfClass<C>(
    className: ComponentClassName<C>
  ): Component[] {
    return this.engine.entityManager.getComponentsOfClass(className)
  }

  protected getEntitiesWithComponentOfClass<C>(
    className: ComponentClassName<C>
  ): IterableIterator<number> {
    return this.engine.entityManager.getEntitiesWithComponentOfClass(className)
  }

  protected subscribeToEvents(
    subscriptions: [string, (event: GameEvent) => void][]
  ) {
    subscriptions.forEach(([eventType, callback]) => {
      this.engine.eventQueue.subscribe(eventType, callback)
    })
  }

  protected subscribeToEventForImmediateAttendance(
    subscriptions: [string, (event: GameEvent) => void][]
  ) {
    subscriptions.forEach(([eventType, callback]) => {
      this.engine.eventQueue.subscribeForImmediateAttendance(
        eventType,
        callback
      )
    })
  }

  protected unsubscribeToEvent(
    eventType: string,
    callback: (event: GameEvent) => void
  ) {
    this.engine.eventQueue.unsubscribe(eventType, callback)
  }

  protected unsubscribeToEvents(
    subscriptions: [string, (event: GameEvent) => void][]
  ) {
    subscriptions.forEach((subscription) => {
      this.unsubscribeToEvent(subscription[0], subscription[1])
    })
  }

  protected publishEvent(event: GameEvent) {
    this.engine.eventQueue.publish(event)
  }

  protected getEntitiesBySignature(
    requiredComponents: ComponentClassName<Component>[],
    optionalComponents?: ComponentClassName<Component>[]
  ) {
    return new EntitySignature(
      this.engine,
      requiredComponents,
      optionalComponents,
      this
    )
  }
}

export abstract class RenderableSystem extends System {
  private renderList: (() => void)[]

  constructor(engine: Engine) {
    super(engine)
    this.renderList = []
  }

  protected abstract render(): void

  public addSubsystem(subsystem: Subsystem) {
    super.addSubsystem(subsystem)
    if (subsystem.render) this.renderList.push(subsystem.render)
  }

  public doRender() {
    for (let i = 0; i < this.renderList.length; i++) {
      this.renderList[i]()
    }
    this.render()
  }
}
