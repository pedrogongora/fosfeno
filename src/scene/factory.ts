declare let window: any

import * as PIXI from 'pixi.js'
import * as Matter from 'matter-js'
import * as decomp from 'poly-decomp'
import { Entity, Component, Engine, GameEvent } from '../core'
import {
  PositionComponent,
  SpriteComponent,
  RemoveWhenNotVisibleComponent,
  FixtureShape,
  RectangleShape,
  CirceShape,
  PolygonShape,
  FixtureComponent,
  TriggerComponent,
  CoordinateType,
} from '../components'
import { Camera } from '../graphics/camera'

window.decomp = decomp // fixes https://github.com/liabru/matter-js/issues/559

export const shapeToBody = (
  position: PositionComponent,
  shape: FixtureShape,
  options: Matter.IBodyDefinition
) => {
  let body: Matter.Body = undefined

  if (shape instanceof CirceShape) {
    body = Matter.Bodies.circle(
      position.x + shape.x,
      position.y + shape.y,
      shape.radius,
      options
    )
    shape.offsetx = -shape.x
    shape.offsety = -shape.y
  } else if (shape instanceof RectangleShape) {
    body = Matter.Bodies.rectangle(
      position.x + shape.x + shape.width / 2,
      position.y + shape.y + shape.height / 2,
      shape.width,
      shape.height,
      options
    )
    shape.offsetx = -(shape.width / 2 + shape.x)
    shape.offsety = -(shape.height / 2 + shape.y)
  } else if (shape instanceof PolygonShape) {
    let p_acc = shape.points.reduce((acc, cur) => {
        return { x: acc.x + cur.x, y: acc.y + cur.y }
      }),
      x = position.x + shape.x + p_acc.x / 3,
      y = position.y + shape.y + p_acc.y / 3,
      path = shape.points
        .map((p) => {
          return p.x + ' ' + p.y
        })
        .reduce((acc, cur) => {
          return acc + ' ' + cur
        }),
      vertices = Matter.Vertices.fromPath(path, undefined)
    body = Matter.Bodies.fromVertices(x, y, [vertices], options)
    shape.offsetx = -(p_acc.x / 3 + shape.x)
    shape.offsety = -(p_acc.y / 3 + shape.y)
  } else {
    //console.dir('shape incorrecto: ',shape)
    throw new Error('Shape not supported ' + shape)
  }

  return body
}

export class EntityFactory {
  protected engine: Engine
  protected entity: Entity

  constructor(engine: Engine) {
    this.engine = engine
  }

  protected createEntity() {
    this.entity = this.engine.entityManager.createNewEntity()
  }

  protected createComponents(): Component[] {
    return []
  }

  public getEntity(): Entity {
    this.createEntity()

    let components = this.createComponents()
    components.forEach((component) => {
      this.entity.addComponent(component)
    })

    return this.entity
  }
}

export class SpriteEntityFactory extends EntityFactory {
  private camera: Camera
  private x: number
  private y: number
  private z: number
  private layer: number
  private coords: CoordinateType
  private images: string[]

  constructor(
    engine: Engine,
    camera: Camera,
    x: number,
    y: number,
    z: number,
    layer: number,
    coords: CoordinateType,
    images: string[]
  ) {
    super(engine)
    this.camera = camera
    this.x = x
    this.y = y
    this.z = z
    this.layer = layer
    this.coords = coords
    this.images = images
  }

  protected createComponents(): Component[] {
    const pSprites: PIXI.Sprite[] = []
    this.images.forEach((img) => {
      const s = new PIXI.Sprite(PIXI.utils.TextureCache[img])
      s.zIndex = this.z
      this.camera.container.addChild(s)
      pSprites.push(s)
    })

    const position = new PositionComponent(
      this.x,
      this.y,
      this.coords,
      this.layer
    )
    const sprite = new SpriteComponent(pSprites, 0, true)
    sprite.container = this.camera.container

    return super.createComponents().concat([position, sprite])
  }
}

export class BodyEntityFactory extends SpriteEntityFactory {
  private shape: FixtureShape
  private options: Matter.IBodyDefinition

  constructor(
    engine: Engine,
    camera: Camera,
    x: number,
    y: number,
    z: number,
    layer: number,
    images: string[],
    shape: FixtureShape,
    options: Matter.IBodyDefinition
  ) {
    super(engine, camera, x, y, z, layer, 'scene', images)
    this.shape = shape
    this.options = options
  }

  protected createComponents(): Component[] {
    const components = super.createComponents()
    let position: PositionComponent = undefined
    components.forEach((c) => {
      if (c instanceof PositionComponent) position = c
    })
    const body = shapeToBody(position, this.shape, this.options)
    Matter.World.add(this.engine.scene.physicsEngine.world, body)
    const fixture = new FixtureComponent()
    fixture.shape = this.shape
    fixture.physicsObject = body
    Matter.World.add(this.engine.scene.physicsEngine.world, body)
    components.push(fixture)

    return components
  }
}

export class TriggerEntityFactory extends EntityFactory {
  private x: number
  private y: number
  private layerId: number
  private shape: FixtureShape
  private enterEvent: GameEvent
  private activeEvent: GameEvent
  private leaveEvent: GameEvent

  constructor(
    engine: Engine,
    x: number,
    y: number,
    layerId: number,
    shape: FixtureShape,
    enterEvent: GameEvent,
    activeEvent: GameEvent,
    leaveEvent: GameEvent
  ) {
    super(engine)
    this.x = x
    this.y = y
    this.layerId = layerId
    this.shape = shape
    this.enterEvent = enterEvent
    this.activeEvent = activeEvent
    this.leaveEvent = leaveEvent
  }

  protected createComponents(): Component[] {
    const components: Component[] = []

    // init position
    const position = new PositionComponent(
      this.x,
      this.y,
      'scene',
      this.layerId
    )

    // init body
    const fixture = new FixtureComponent()
    const body = shapeToBody(position, this.shape, {
      isSensor: true,
      isStatic: true,
    })
    fixture.shape = this.shape
    fixture.physicsObject = body

    // init events
    Matter.Events.on(this.engine.scene.physicsEngine, 'collisionStart', (e) => {
      for (let i = 0; i < e.pairs.length; i++) {
        const pair = e.pairs[i]
        if (pair.bodyA === body || pair.bodyB === body) {
          this.engine.eventQueue.publish(this.enterEvent)
        }
      }
    })

    Matter.Events.on(
      this.engine.scene.physicsEngine,
      'collisionActive',
      (e) => {
        for (let i = 0; i < e.pairs.length; i++) {
          const pair = e.pairs[i]
          if (pair.bodyA === body || pair.bodyB === body) {
            this.engine.eventQueue.publish(this.activeEvent)
          }
        }
      }
    )

    Matter.Events.on(this.engine.scene.physicsEngine, 'collisionEnd', (e) => {
      for (let i = 0; i < e.pairs.length; i++) {
        const pair = e.pairs[i]
        if (pair.bodyA === body || pair.bodyB === body) {
          this.engine.eventQueue.publish(this.leaveEvent)
        }
      }
    })
    // add body
    Matter.World.add(this.engine.scene.physicsEngine.world, body)

    // init pooling/deleting
    const pool = new RemoveWhenNotVisibleComponent()

    components.push(position)
    components.push(fixture)
    components.push(
      new TriggerComponent(this.enterEvent, this.activeEvent, this.leaveEvent)
    )
    components.push(pool)

    return components
  }
}
