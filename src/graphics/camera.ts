import * as PIXI from 'pixi.js'
import { Engine, Entity, Subsystem } from '../core'
import { PositionComponent } from '../components'
import { Scene } from '../scene'

interface LayerPosition {
  id: number
  x: number
  y: number
}

export class Camera {
  private engine: Engine
  private scene: Scene
  private clipping: boolean

  public width: number
  public height: number

  readonly id: number
  readonly container: PIXI.Container
  readonly layers: LayerPosition[]

  constructor(
    engine: Engine,
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    clipping: boolean
  ) {
    this.engine = engine
    this.scene = engine.scene
    this.id = id
    this.width = width
    this.height = height
    this.layers = []
    this.scene.layers.forEach((layer) => {
      this.layers[layer.id] = {
        id: layer.id,
        x: 0,
        y: 0,
      }
    })
    //this.container = new PIXI.Container();
    this.container = new PIXI.Sprite()
    this.container.x = x
    this.container.y = y
    this.container.zIndex = id
    this.container.sortableChildren = true
    this.clipping = clipping
    if (clipping) {
      const mask = new PIXI.Graphics()
      mask.beginFill(0xffffff)
      mask.drawRect(x, y, width, height)
      mask.endFill()
      this.container.mask = mask
    }
  }

  setScenePosition(x: number, y: number) {
    const scene = this.scene
    this.layers.forEach((layer) => {
      layer.x =
        scene.layers[layer.id].paralaxHRatio === 1
          ? x
          : x * (1 - scene.layers[layer.id].paralaxHRatio)
      layer.y =
        scene.layers[layer.id].paralaxVRatio === 1
          ? y
          : y * (1 - scene.layers[layer.id].paralaxVRatio)
    })
  }

  toScreen(position: PositionComponent): PositionComponent {
    //const resolution = this.engine.properties.resolution;
    //const screenWidth  = this.engine.properties.pixiProperties.width / resolution;
    //const screenHeight = this.engine.properties.pixiProperties.height / resolution;
    const cameraX = this.layers[position.layer].x
    const cameraY = this.layers[position.layer].y

    if (position.type === 'scene') {
      return {
        x: position.x - cameraX,
        y: position.y - cameraY,
        //x: position.x,
        //y: position.y,
        type: 'screen',
        layer: position.layer,
      }
    } else if (position.type === 'screen') {
      return {
        x: position.x < 0 ? this.width + position.x : position.x,
        y: position.y < 0 ? this.height + position.y : position.y,
        type: 'screen',
        layer: position.layer,
      }
    } else if (position.type === 'screen-ratio') {
      return {
        x:
          Math.floor(position.x) === position.x
            ? position.x
            : position.x * this.width,
        y:
          Math.floor(position.y) === position.y
            ? position.y
            : position.y * this.height,
        type: 'screen',
        layer: position.layer,
      }
    }
  }
}

export class CameraFollowSubsystem implements Subsystem {
  constructor(
    private engine: Engine,
    private camera: Camera,
    private entity: Entity,
    private horizontalBorder: number,
    private verticalBorder: number,
    private sceneWidth: number,
    private sceneHeight: number,
    private offsetx: number = 0,
    private offsety: number = 0
  ) {}

  public update = (() => {
    this.updateCameraPosition()
  }).bind(this)

  private updateCameraPosition() {
    const pos_w = <PositionComponent>(
      this.entity.getComponentOfClass(PositionComponent)
    )
    const pos_s = this.camera.toScreen(pos_w)
    const maxX = this.sceneWidth - this.camera.width + this.offsetx
    const maxY = this.sceneHeight - this.camera.height + this.offsety
    let x = this.camera.layers[this.engine.scene.mainLayer].x
    let y = this.camera.layers[this.engine.scene.mainLayer].y

    if (pos_s.x - this.offsetx < this.horizontalBorder) {
      x = x + pos_s.x - this.offsetx - this.horizontalBorder
    } else if (pos_s.x > this.camera.width - this.horizontalBorder) {
      x = x + pos_s.x - this.camera.width + this.horizontalBorder
    }
    if (pos_s.y - this.offsety < this.verticalBorder) {
      y = y + pos_s.y - this.offsety - this.verticalBorder
    } else if (pos_s.y > this.camera.height - this.verticalBorder) {
      y = y + pos_s.y - this.camera.height + this.verticalBorder
    }

    if (x < 0) x = 0
    if (x > maxX) x = maxX
    if (y < 0) y = 0
    if (y > maxY) y = maxY
    this.camera.setScenePosition(x, y)
  }
}
