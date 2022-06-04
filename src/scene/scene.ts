import * as PIXI from 'pixi.js'
import * as Matter from 'matter-js'
import { Engine, Entity, GameEvent } from '../core'
import { FixtureShape, CoordinateType } from '../components'
import { Camera } from '../graphics'
import {
  EntityFactory,
  SpriteEntityFactory,
  BodyEntityFactory,
  TriggerEntityFactory,
} from './factory'

interface SceneLayer {
  id: number
  offsetx: number
  offsety: number
  paralaxHRatio: number
  paralaxVRatio: number
}

export class Scene {
  public mainLayer: number

  readonly physicsEngine: Matter.Engine
  readonly cameras: Camera[]
  readonly layers: SceneLayer[]

  private engine: Engine

  constructor(engine: Engine) {
    this.engine = engine
    this.physicsEngine = Matter.Engine.create()
    const camId = 0
    this.mainLayer = 0
    this.layers = [
      {
        id: camId,
        offsetx: 0,
        offsety: 0,
        paralaxHRatio: 1.0,
        paralaxVRatio: 1.0,
      },
    ]
    this.cameras = []
  }

  add(factory: EntityFactory): Entity {
    return factory.getEntity()
  }

  addSprite(
    x: number,
    y: number,
    z: number,
    layer: number,
    coords: CoordinateType,
    images: string[],
    camera: Camera
  ): Entity {
    const factory = new SpriteEntityFactory(
      this.engine,
      camera,
      x,
      y,
      z,
      layer,
      coords,
      images
    )
    return this.add(factory)
  }

  addBody(
    x: number,
    y: number,
    z: number,
    layer: number,
    images: string[],
    camera: Camera,
    shape: FixtureShape,
    options: Matter.IBodyDefinition
  ): Entity {
    const factory = new BodyEntityFactory(
      this.engine,
      camera,
      x,
      y,
      z,
      layer,
      images,
      shape,
      options
    )
    return this.add(factory)
  }

  addTrigger(
    x: number,
    y: number,
    layerId: number,
    shape: FixtureShape,
    enterEvent: GameEvent,
    activeEvent: GameEvent,
    leaveEvent: GameEvent
  ): Entity {
    const factory = new TriggerEntityFactory(
      this.engine,
      x,
      y,
      layerId,
      shape,
      enterEvent,
      activeEvent,
      leaveEvent
    )
    return this.add(factory)
  }

  remove(entity: Entity, poolCategory: string = '') {
    if (poolCategory) {
      this.engine.entityManager.entityToInactivePool(entity, poolCategory)
    } else {
      this.engine.entityManager.removeEntity(entity)
    }
  }

  addCamera(
    x: number,
    y: number,
    width: number,
    height: number,
    clipping: boolean
  ): Camera {
    let lastCamId = -1
    this.cameras.forEach((cam) => {
      if (cam.id > lastCamId) lastCamId = cam.id
    })
    const id = lastCamId + 1
    const cam = new Camera(this.engine, id, x, y, width, height, clipping)
    this.cameras[id] = cam
    this.engine.pixiApp.stage.addChild(cam.container)
    return cam
  }

  addLayer(layer: SceneLayer) {
    const firstCam: Camera = this.cameras.values().next().value
    const x = firstCam.layers[this.mainLayer].x
    const y = firstCam.layers[this.mainLayer].y
    this.layers[layer.id] = layer
    this.cameras.forEach((cam) => {
      cam.layers[layer.id] = {
        id: layer.id,
        x: 0,
        y: 0,
      }
      cam.setScenePosition(x, y)
    })
  }
}
