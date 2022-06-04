import * as PIXI from 'pixi.js'
import * as Matter from 'matter-js'
import { Entity, Engine, EntitySignature, log, Subsystem } from '../core'
import { Scene } from '../scene'
import {
  SpriteComponent,
  PositionComponent,
  TextFromProperty,
  RemoveWhenNotVisibleComponent,
  FixtureComponent,
  RenderPhysicsAngle,
} from '../components'
import { Camera } from './camera'
import { TiledTilemapManager } from '../tiled'

export class BasicRenderSubsystem implements Subsystem {
  private engine: Engine
  private debugCamera: Camera
  private debugGraphics: PIXI.Graphics
  private _debugMode: number = 0

  private minFPS: number = Number.MAX_SAFE_INTEGER
  private maxIte: number = 0
  private maxRender: number = 0
  private maxUpdate: number = 0
  private maxCleanup: number = 0
  private iterationTimestamp: number

  constructor(engine: Engine, debugCameraId: number = 0) {
    this.engine = engine
    this.debugCamera = engine.scene.cameras[debugCameraId]
    this.debugGraphics = new PIXI.Graphics()
    this.debugGraphics.zIndex = Number.MAX_SAFE_INTEGER
    this.debugCamera.container.addChild(this.debugGraphics)
  }

  public update = ((delta: number) => {
    this.updateTexts()
  }).bind(this)

  public render = (() => {
    const numCameras = this.engine.scene.cameras.length
    for (let i = 0; i < numCameras; i++) {
      this.renderAll(this.engine.scene.cameras[i])
    }
    if (this._debugMode) this.renderDebug()
  }).bind(this)

  public cleanup = (() => {
    const numCameras = this.engine.scene.cameras.length
    for (let i = 0; i < numCameras; i++) {
      this.deleteNonVisible(this.engine.scene.cameras[i])
    }
  }).bind(this)

  public destroy = (() => {
    this.destroySpritesAndBodies()
  }).bind(this)

  public get debugMode() {
    return this._debugMode
  }

  public set debugMode(mode: number) {
    this._debugMode = mode
    if (mode === 0) {
      for (var i = this.debugGraphics.children.length - 1; i >= 0; i--) {
        const child = this.debugGraphics.children[i]
        this.debugGraphics.removeChild(child)
        child.destroy()
      }
      this.debugGraphics.clear()
    }
    console.log('set _debugMode:', this._debugMode)
  }

  private renderAll(camera: Camera) {
    const renderEntities = new EntitySignature(
      this.engine,
      [SpriteComponent, PositionComponent],
      [FixtureComponent, RenderPhysicsAngle],
      this
    )
    renderEntities.forEach(
      (
        entity: Entity,
        sprite: SpriteComponent,
        position: PositionComponent,
        fixture: FixtureComponent,
        renderAngle: RenderPhysicsAngle
      ) => {
        sprite.sprites.forEach((s) => {
          s.visible = false
          if (sprite.anchor !== undefined)
            s.anchor.set(sprite.anchor.x, sprite.anchor.y)
          if (sprite.alpha !== undefined) s.alpha = sprite.alpha
          if (sprite.width !== undefined) s.width = sprite.width
          if (sprite.height !== undefined) s.height = sprite.height
          if (sprite.scale !== undefined)
            s.scale.set(sprite.scale.x, sprite.scale.y)
          if (sprite.skew !== undefined)
            s.skew.set(sprite.skew.x, sprite.skew.y)
          if (sprite.tint !== undefined) s.tint = sprite.tint
          if (fixture && renderAngle) {
            s.rotation = fixture.physicsObject.angle
          }
          if (sprite.rotation) s.rotation = sprite.rotation
        })
        const { x, y } = camera.toScreen(position)
        sprite.sprites[sprite.current].x = x
        sprite.sprites[sprite.current].y = y
        sprite.sprites[sprite.current].visible = sprite.visible
      }
    )
  }

  private updateTexts() {
    const now = Date.now()
    const texts = new EntitySignature(
      this.engine,
      [TextFromProperty, SpriteComponent],
      [],
      this
    )
    texts.forEach(
      (entity: Entity, text: TextFromProperty, sprite: SpriteComponent) => {
        if (
          !text.intervalTimestamp ||
          now - text.intervalTimestamp > text.updateInterval
        ) {
          const formattedText = text.format
            ? text.format(text.object[text.property])
            : text.object[text.property]
          text.text.text = text.prefix + formattedText + text.suffix
          text.intervalTimestamp = now
        }
      }
    )
  }

  private deleteNonVisible(camera: Camera) {
    const entities = new EntitySignature(
      this.engine,
      [RemoveWhenNotVisibleComponent, PositionComponent],
      [SpriteComponent, FixtureComponent],
      this
    )
    entities.forEach(
      (
        entity: Entity,
        pool: RemoveWhenNotVisibleComponent,
        position: PositionComponent,
        sprite: SpriteComponent,
        fixture: FixtureComponent
      ) => {
        const layer = this.engine.scene.layers[position.layer]
        const width = sprite
          ? sprite.width
          : fixture
          ? fixture.physicsObject.bounds.max.x -
            fixture.physicsObject.bounds.min.x
          : 0
        const height = sprite
          ? sprite.height
          : fixture
          ? fixture.physicsObject.bounds.max.y -
            fixture.physicsObject.bounds.min.y
          : 0
        const offsetx = layer.offsetx
        const offsety = layer.offsety
        const pos = camera.toScreen(position)
        if (
          pos.x + width <= offsetx ||
          pos.x >= camera.width ||
          pos.y + height <= offsety ||
          pos.y >= camera.height
        ) {
          // remove sprites from container
          if (sprite) {
            sprite.sprites.forEach((s) => {
              sprite.container.removeChild(s)
              if (!pool.poolCategory) {
                s.destroy()
              }
            })
          }
          // remove matter body
          if (fixture) {
            Matter.World.remove(
              this.engine.scene.physicsEngine.world,
              fixture.physicsObject
            )
          }
          // remove entity
          this.engine.scene.remove(entity, pool.poolCategory)
        }
      }
    )
  }

  private destroySpritesAndBodies() {
    const sprites = this.engine.entityManager.getComponentsOfClass(
      SpriteComponent
    )
    sprites.forEach((component) => {
      ;(component as SpriteComponent).sprites.forEach((sprite) => {
        sprite.destroy({
          children: true,
          texture: true,
          baseTexture: true,
        })
      })
    })

    const fixtures = this.engine.entityManager.getComponentsOfClass(
      FixtureComponent
    )
    fixtures.forEach((component) => {
      Matter.World.remove(
        this.engine.scene.physicsEngine.world,
        (component as FixtureComponent).physicsObject
      )
    })
  }

  private renderDebug() {
    if (this._debugMode === 0) return
    const scene: Scene = this.engine.scene
    const tilemap: TiledTilemapManager = this.engine.stateProperties.get(
      'tilemap'
    )
    const matterEngine = scene.physicsEngine
    const bodies = Matter.Composite.allBodies(matterEngine.world)

    const dashedLineTo = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      dash: number = 5
    ) => {
      let down = true,
        x0 = x1,
        y0 = y1
      const angle = Math.atan2(y2 - y0, x2 - x0)
      let dest_mag = Math.round(Math.hypot(x2 - x0, y2 - y0))
      let x_dest: number, y_dest: number
      this.debugGraphics.moveTo(x0, y0)
      while (dest_mag > 0) {
        if (dest_mag > dash) dest_mag = dash
        x_dest = x0 + dest_mag * Math.cos(angle)
        y_dest = y0 + dest_mag * Math.sin(angle)
        if (down) {
          this.debugGraphics.lineTo(x_dest, y_dest)
        }
        this.debugGraphics.moveTo(x_dest, y_dest)
        x0 = x_dest
        y0 = y_dest
        down = !down
        dest_mag = Math.round(Math.hypot(x2 - x0, y2 - y0))
      }
    }

    const renderStatistics = this._debugMode >= 1
    const renderBodies = this._debugMode >= 2
    const renderGridNumbers = tilemap && this._debugMode >= 3

    for (var i = this.debugGraphics.children.length - 1; i >= 0; i--) {
      const child = this.debugGraphics.children[i]
      this.debugGraphics.removeChild(child)
      child.destroy()
    }
    this.debugGraphics.clear()
    this.debugGraphics.x = -this.debugCamera.layers[scene.mainLayer].x
    this.debugGraphics.y = -this.debugCamera.layers[scene.mainLayer].y
    this.debugGraphics.lineStyle(3, 0xffff00, 0.9)

    //dashedLineTo(100, 100, 200, 200);

    // render matter bodies
    if (renderBodies) {
      for (let i = 0; i < bodies.length; i++) {
        let vertices = bodies[i].vertices
        let x1 = vertices[0].x,
          y1 = vertices[0].y
        this.debugGraphics.moveTo(x1, y1)
        for (var j = 1; j < vertices.length; j += 1) {
          let angle = -(
            Math.atan2(vertices[j].y - y1, vertices[j].x - x1) -
            Math.PI / 2
          )
          this.debugGraphics.lineTo(vertices[j].x, vertices[j].y)
          //dashedLineTo(x1, y1, vertices[j].x, vertices[j].y);
          x1 = vertices[j].x
          y1 = vertices[j].y
        }
        this.debugGraphics.lineTo(vertices[0].x, vertices[0].y)
        //dashedLineTo(x1, y1, vertices[0].x, vertices[0].y);
      }
    }

    // render tile numbers
    if (renderGridNumbers) {
      const col_0 = Math.floor(
        this.debugCamera.layers[scene.mainLayer].x / tilemap.tilesize
      )
      const row_0 = Math.floor(
        this.debugCamera.layers[scene.mainLayer].y / tilemap.tilesize
      )
      const col_1 = Math.ceil(
        (this.debugCamera.layers[scene.mainLayer].x + this.debugCamera.width) /
          tilemap.tilesize
      )
      const row_1 = Math.ceil(
        (this.debugCamera.layers[scene.mainLayer].y + this.debugCamera.height) /
          tilemap.tilesize
      )
      const offsetx = tilemap.layers[scene.mainLayer].offsetx
      const offsety = tilemap.layers[scene.mainLayer].offsety
      for (let i = row_0; i <= row_1; i++) {
        const text = new PIXI.BitmapText('' + i, {
          fontName: 'Oxygen-Sans',
          fontSize: 26,
        })
        text.x = offsetx + 1 + this.debugCamera.layers[scene.mainLayer].x
        text.y = offsety + i * tilemap.tilesize
        this.debugGraphics.addChild(text)
      }
      for (let i = col_0; i < col_1; i++) {
        const text = new PIXI.BitmapText('' + i, {
          fontName: 'Oxygen-Sans',
          fontSize: 26,
        })
        text.x = offsetx + i * tilemap.tilesize + tilemap.tilesize - text.width
        text.y = offsety + this.debugCamera.layers[scene.mainLayer].y
        this.debugGraphics.addChild(text)
      }
    }

    // render statistics
    if (renderStatistics) {
      const stats = this.engine.statistics
      const text = new PIXI.BitmapText('' + i, {
        fontName: 'Oxygen-Sans',
        fontSize: 26,
      })
      let s = ''
      s = s + 'fps: ' + new Number(stats.fps).toFixed(2)
      s = s + ', ite: ' + new Number(stats.loopIterationAverageTime).toFixed(2)
      s =
        s + ', update: ' + new Number(stats.systemsUpdateAverageTime).toFixed(2)
      s =
        s + ', render: ' + new Number(stats.systemsRenderAverageTime).toFixed(2)
      s =
        s +
        ', cleanup: ' +
        new Number(stats.systemsCleanupAverageTime).toFixed(2)
      text.text = s
      text.x =
        this.debugCamera.layers[scene.mainLayer].x +
        0.5 * (this.debugCamera.width - text.width)
      text.y =
        this.debugCamera.layers[scene.mainLayer].y +
        this.debugCamera.height -
        30
      this.debugGraphics.addChild(text)
      this.iterationTimestamp = Date.now()
      if (this.minFPS > stats.fps) {
        this.minFPS = stats.fps
        console.log('[' + this.iterationTimestamp + '] minFPS:', this.minFPS)
      }
      if (this.maxIte < stats.loopIterationAverageTime) {
        this.maxIte = stats.loopIterationAverageTime
        console.log('[' + this.iterationTimestamp + '] maxIte:', this.maxIte)
      }
      if (this.maxUpdate < stats.systemsUpdateAverageTime) {
        this.maxUpdate = stats.systemsUpdateAverageTime
        console.log(
          '[' + this.iterationTimestamp + '] maxUpdate:',
          this.maxUpdate
        )
      }
      if (this.maxRender < stats.systemsRenderAverageTime) {
        this.maxRender = stats.systemsRenderAverageTime
        console.log(
          '[' + this.iterationTimestamp + '] maxRender:',
          this.maxRender
        )
      }
      if (this.maxCleanup < stats.systemsCleanupAverageTime) {
        this.maxCleanup = stats.systemsCleanupAverageTime
        console.log(
          '[' + this.iterationTimestamp + '] maxCleanup:',
          this.maxCleanup
        )
      }
    }
  }
}
