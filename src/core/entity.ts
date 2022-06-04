import { GameProperties } from './gameprops'
import { EventQueue } from './events'
import { Component, ComponentClassName } from './component'
import { log } from './log'
import { Engine } from './engine'

export class Entity {
  readonly id: number

  private engine: Engine

  constructor(engine: Engine, id: number) {
    this.engine = engine
    this.id = id
  }

  addComponent(component: Component) {
    this.engine.entityManager.addComponent(component, this)
  }

  getComponentOfClass<C>(componentClass: ComponentClassName<C>): Component {
    return this.engine.entityManager.getEntityComponentOfClass(
      componentClass,
      this
    )
  }

  getComponents(): Component[] {
    return this.engine.entityManager.getEntityComponents(this)
  }

  toString(): string {
    return 'entity#' + this.id
  }
}

export class EntitySignature {
  public requiredComponents: ComponentClassName<Component>[]
  public optionalComponents: ComponentClassName<Component>[]

  private engine: Engine
  private entityManager: EntityManager
  private callbackContext: any

  constructor(
    engine: Engine,
    requiredComponents: ComponentClassName<Component>[],
    optionalComponents?: ComponentClassName<Component>[],
    callbackContext?: any
  ) {
    this.engine = engine
    this.entityManager = engine.entityManager
    this.requiredComponents = requiredComponents
    this.optionalComponents = optionalComponents ? optionalComponents : []
    this.callbackContext = callbackContext
  }

  forEach(
    callback: (entity: Entity, ...args: Component[]) => void,
    context?: any
  ) {
    let entities = this.entityManager.getEntitiesWithComponentOfClass(
      this.requiredComponents[0]
    )
    if (!entities) return

    for (let id of entities) {
      //if ( !this.entityManager.isEntityActive( id )) return;
      const required: Component[] = []
      for (let i = 0; i < this.requiredComponents.length; i++) {
        const component = this.entityManager.getEntityComponentOfClass(
          this.requiredComponents[i],
          id
        )
        if (component != undefined) required.push(component)
        else return
      }
      const optional: Component[] = []
      for (let i = 0; i < this.optionalComponents.length; i++) {
        const component = this.entityManager.getEntityComponentOfClass(
          this.optionalComponents[i],
          id
        )
        optional.push(component)
      }
      const entity = new Entity(this.engine, id)
      const args = ([entity] as any[]).concat(required).concat(optional)
      const ctx = context ? context : this.callbackContext
      callback.apply(ctx, args)
    }
  }
}

export class EntityManager {
  private engine: Engine
  private entities: Set<number>
  private inactivePool: Map<string, Set<number>>
  private componentsByClass: Map<string, Map<number, Component>>
  private componentPool: Map<string, Map<number, Component>>
  private lowestUnassignedId: number
  private properties: GameProperties
  private eventQueue: EventQueue

  constructor(
    engine: Engine,
    properties: GameProperties,
    eventQueue: EventQueue
  ) {
    this.engine = engine
    this.entities = new Set<number>()
    this.inactivePool = new Map<string, Set<number>>()
    this.componentsByClass = new Map<string, Map<number, Component>>()
    this.componentPool = new Map<string, Map<number, Component>>()
    this.lowestUnassignedId = 1
    this.properties = properties
    this.eventQueue = eventQueue
  }

  private generateNewId(): number {
    if (this.lowestUnassignedId < Number.MAX_SAFE_INTEGER) {
      return this.lowestUnassignedId++
    } else {
      for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
        if (!this.entities.has(i)) {
          return i
        }
      }
      throw Error(`Reached max number of Entities (${Number.MAX_SAFE_INTEGER})`)
    }
  }

  createNewEntity(): Entity {
    const id = this.generateNewId()
    const entity = new Entity(this.engine, id)
    this.entities.add(id)
    return entity
  }

  addComponent(component: Component, toEntity: Entity | number) {
    const id = toEntity instanceof Entity ? toEntity.id : toEntity
    let components: Map<number, Component>
    if (this.componentsByClass.has(component.constructor.name)) {
      components = this.componentsByClass.get(component.constructor.name)
    } else {
      components = new Map<number, Component>()
      this.componentsByClass.set(component.constructor.name, components)
    }
    components.set(id, component)
  }

  getEntityComponentOfClass<C>(
    className: ComponentClassName<C> | string,
    forEntity: Entity | number
  ): Component {
    const id = forEntity instanceof Entity ? forEntity.id : forEntity
    const theClassName =
      typeof className === 'string' ? className : className.name
    const classComponents = this.componentsByClass.get(theClassName)
    if (classComponents) {
      return classComponents.get(id)
    }
  }

  getEntityComponents(forEntity: Entity | number): Component[] {
    const id = forEntity instanceof Entity ? forEntity.id : forEntity
    const result: Component[] = []
    for (let components of this.componentsByClass.values()) {
      if (components.has(id)) {
        result.push(components.get(id))
      }
    }
    return result
  }

  getComponentsOfClass<C>(
    className: ComponentClassName<C> | string
  ): Component[] {
    const theClassName =
      typeof className === 'string' ? className : className.name
    const components = this.componentsByClass.get(theClassName)
    const result: Component[] = []
    if (components) {
      const keys = components.keys()
      for (let entityId of keys) {
        /* if ( this.entities.has( entityId) ) {
                    result.push( components.get( entityId ));
                } */
        result.push(components.get(entityId))
      }
    }
    return result
  }

  getEntitiesWithComponentOfClass<C>(
    className: ComponentClassName<C> | string
  ): IterableIterator<number> {
    const theClassName =
      typeof className === 'string' ? className : className.name
    const components = this.componentsByClass.get(theClassName)
    if (components) {
      return components.keys()
    }
    return undefined
  }

  removeEntity(entity: Entity | number) {
    const id = entity instanceof Entity ? entity.id : entity
    for (let className of this.componentsByClass.keys()) {
      const components = this.componentsByClass.get(className)
      if (components) components.delete(id)
    }
    for (let className of this.componentPool.keys()) {
      const components = this.componentPool.get(className)
      if (components) components.delete(id)
    }
    this.entities.delete(id)
    for (let pool of this.inactivePool.values()) {
      pool.delete(id)
    }
    log.debug(`removed ${entity} from entityManager`)
  }

  removeAllEntities() {
    this.entities.clear()
    this.inactivePool.clear()
    this.lowestUnassignedId = 1
    this.componentsByClass.clear()
    this.componentPool.clear()
    log.debug(`removed all entities from entityManager`)
  }

  entityToInactivePool(entity: Entity | number, poolCategory: string) {
    const id = entity instanceof Entity ? entity.id : entity

    let pool = this.inactivePool.get(poolCategory)
    pool = pool ? pool : new Set<number>()
    pool.add(id)
    this.inactivePool.set(poolCategory, pool)

    const componentClasses = this.componentsByClass.keys()
    for (let componentClass of componentClasses) {
      const components = this.componentsByClass.get(componentClass)
      if (components.has(id)) {
        const component = components.get(id)
        let componentClassPool = this.componentPool.get(componentClass)
        if (!componentClassPool) {
          componentClassPool = new Map<number, Component>()
          this.componentPool.set(componentClass, componentClassPool)
        }
        componentClassPool.set(id, component)
      }
    }
    log.debug(
      `disposed ${entity} into inactive pool with category \'${poolCategory}\'`
    )
  }

  getEntityFromInactivePool(poolCategory: string): Entity {
    const pool = this.inactivePool.get(poolCategory)
    const id = pool.values().next().value
    pool.delete(id)
    this.entities.add(id)

    const componentClasses = this.componentPool.keys()
    for (let componentClass of componentClasses) {
      const components = this.componentPool.get(componentClass)
      if (components.has(id)) {
        const component = components.get(id)
        this.componentsByClass.get(componentClass).set(id, component)
      }
    }

    const entity = new Entity(this.engine, id)
    log.debug(
      `recovered ${entity} from inactive pool with category \'${poolCategory}\'`
    )
    return entity
  }

  getInactivePoolCount(poolCategory: string): number {
    if (this.inactivePool.get(poolCategory)) {
      return this.inactivePool.get(poolCategory).size
    } else {
      return 0
    }
  }

  isEntityActive(entity: Entity | number): boolean {
    if (entity instanceof Entity) return this.entities.has(entity.id)
    else return this.entities.has(entity)
  }
}
