import * as PIXI from 'pixi.js'
import { Engine, Component, Entity, Subsystem } from '../core'
import { Scene } from '../scene/scene'
import {
  FixtureShape,
  PolygonShape,
  CirceShape,
  RectangleShape,
  RemoveWhenNotVisibleComponent,
  FixtureComponent,
  AnimationsComponent,
  SpriteAnimation,
  SpriteAnimationStep,
  SpriteComponent,
  PositionComponent,
} from '../components'
import {
  TriggerEntityFactory,
  shapeToBody,
  EntityFactory,
} from '../scene/factory'
import * as Matter from 'matter-js'
import { Camera } from '../graphics'

/* **************************************************************************
 *                          Tiled JSON map interfaces
 * **************************************************************************/

export interface TiledTilemap {
  backgroundcolor: string
  height: number
  infinite: boolean
  layers: TiledTilemapLayer[]
  nextlayerid: number
  nextobjectid: number
  orientation: string
  properties?: { name: string; type: string; value: any }[]
  renderorder: string
  tiledversion: string
  tileheight: string
  tilesets: any
  tilewidth: number
  type: string
  version: string
  width: number
}

export interface TiledTilemapLayer {
  data: number[]
  height: number
  id: number
  name: string
  objects?: TiledObject[]
  opacity: number
  offsetx: number
  offsety: number
  properties?: { name: string; type: string; value: any }[]
  type: string
  visible: boolean
  width: number
  x: number
  y: number
}

export interface TiledTileset {
  columns: number
  grid: { height: number; orientation: string; width: number }
  margin: number
  name: string
  spacing: number
  tilecount: number
  tiledversion: string
  tileheight: number
  tiles: TiledTile[]
  tilewidth: number
  type: string
  version: string
}

export interface TiledTile {
  animation?: { duration: number; tileid: number }[]
  id: number
  image: string
  imageheight: number
  imagewidth: number
  objectgroup: TiledObjectGroup
  properties?: { name: string; type: string; value: any }[]
}

export interface TiledObjectGroup {
  draworder: string
  name: string
  objects: TiledObject[]
  opacity: 1
  type: string
  visible: boolean
  x: number
  y: number
}

export interface TiledObject {
  ellipse?: boolean
  height: number
  id: number
  name: string
  polygon?: { x: number; y: number }[]
  properties?: { name: string; type: string; value: any }[]
  rotation: number
  type: string
  visible: boolean
  width: number
  x: number
  y: number
}

export interface TiledLayer {
  id: number
  type: string
  width: number
  height: number
  opacity: number
  visible: boolean
  solids: boolean
  horizontalParalaxRatio: number
  verticalParalaxRatio: number
  zIndex: number
  offsetx: number
  offsety: number
  useScreenCoordinates: boolean
}

/* **************************************************************************
 *                    Tiled map factory & creation classes
 * **************************************************************************/

export class TiledTilesetManager {
  readonly tileset: TiledTileset

  constructor(tilesetFilename: string) {
    this.tileset = PIXI.Loader.shared.resources[tilesetFilename].data
  }

  getTile(id: number) {
    const tileCount = this.tileset.tiles.length
    for (let i = 0; i < tileCount; i++) {
      if (this.tileset.tiles[i].id == id) return this.tileset.tiles[i]
    }
  }

  getTileName(id: number) {
    const tile = this.getTile(id)
    if (tile) return tile.image
  }

  shapeFromTileObject(object: TiledObject) {
    let shape: FixtureShape
    if (object.ellipse) {
      // circle
      if (object.width != object.height) {
        throw new Error('only circular ellipses supported')
      }
      shape = new CirceShape(
        object.x + object.width / 2,
        object.y + object.width / 2,
        object.width / 2
      )
    } else if (object.polygon) {
      // polygon
      if (object.polygon.length !== 3) {
        throw new Error('only triangles supported')
      }
      shape = new PolygonShape(
        object.x,
        object.y,
        object.polygon.map((p) => {
          return {
            x: p.x ? p.x - 1 : 0,
            y: p.y ? p.y - 1 : 0,
          }
        })
      )
    } else {
      // rectangle
      shape = new RectangleShape(
        object.x,
        object.y,
        object.width,
        object.height
      )
    }
    return shape
  }

  getTileProp(tile: TiledTile | TiledObject, prop: string) {
    if (tile.properties) {
      for (let i = 0; i < tile.properties.length; i++) {
        if (tile.properties[i].name === prop) {
          return tile.properties[i].value
        }
      }
    }
    return undefined
  }

  fetchMatterOptsFromTileOpts(tile: TiledTile): Matter.IBodyDefinition {
    let options: Matter.IBodyDefinition = {}
    if (tile.properties) {
      tile.properties.forEach((p) => {
        if (p.name === 'angle') {
          options.angle = p.value
        } else if (p.name === 'density') {
          options.density = p.value
        } else if (p.name === 'friction') {
          options.friction = p.value
        } else if (p.name === 'frictionStatic') {
          options.frictionStatic = p.value
        } else if (p.name === 'frictionAir') {
          options.frictionAir = p.value
        } else if (p.name === 'isStatic') {
          options.isStatic = p.value
        } else if (p.name === 'restitution') {
          options.restitution = p.value
        }
      })
      return options
    }
  }

  fetchMatterOptsFromObject(object: TiledObject): Matter.IBodyDefinition {
    let options: Matter.IBodyDefinition = {}
    if (object.properties) {
      object.properties.forEach((p) => {
        if (p.name === 'angle') {
          options.angle = p.value
        } else if (p.name === 'density') {
          options.density = p.value
        } else if (p.name === 'friction') {
          options.friction = p.value
        } else if (p.name === 'frictionStatic') {
          options.frictionStatic = p.value
        } else if (p.name === 'frictionAir') {
          options.frictionAir = p.value
        } else if (p.name === 'isStatic') {
          options.isStatic = p.value
        } else if (p.name === 'restitution') {
          options.restitution = p.value
        }
      })
      return options
    }
  }
}

export class TiledTilemapManager {
  public tilesize: number
  public layerZIndexRange: number

  readonly backgroundColor: number
  readonly layers: TiledLayer[]
  readonly mainLayer: number
  readonly tileset: TiledTilesetManager

  private engine: Engine
  private scene: Scene
  private tilemap: TiledTilemap
  private layerIndexes: number[]
  private tileIndexes: number[]

  constructor(
    engine: Engine,
    tilemapFilename: string,
    tilesetFilename: string
  ) {
    this.engine = engine
    this.scene = engine.scene
    this.tilemap = PIXI.Loader.shared.resources[tilemapFilename].data
    this.tileset = new TiledTilesetManager(tilesetFilename)
    this.layers = []
    this.backgroundColor = Number.parseInt(
      this.tilemap.backgroundcolor.slice(1),
      16
    )
    this.layerIndexes = []
    this.tilesize = this.tilemap.tilewidth
    this.layerZIndexRange = 100
    //this.tileIndexes = [];

    this.tilemap.layers.forEach((layer, index) => {
      this.layerIndexes[layer.id] = index

      let hRatio = 1
      let vRatio = 1
      let solids = false
      let screenCoords = false

      if (layer.properties !== undefined) {
        layer.properties.forEach((p) => {
          if (p.name === 'solids') solids = p.value
          else if (p.name === 'horizontal-paralax-ratio') hRatio = p.value
          else if (p.name === 'vertical-paralax-ratio') vRatio = p.value
          else if (p.name === 'use-screen-coordinates') screenCoords = p.value
        })
      }

      this.layers[layer.id] = {
        id: layer.id,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        type: layer.type,
        visible: layer.visible,
        offsetx: layer.offsetx ? layer.offsetx : 0,
        offsety: layer.offsety ? layer.offsety : 0,
        solids: solids,
        horizontalParalaxRatio: hRatio,
        verticalParalaxRatio: vRatio,
        zIndex: this.layerZIndexRange + this.layerZIndexRange * index,
        useScreenCoordinates: screenCoords,
      }

      this.engine.scene.addLayer({
        id: layer.id,
        offsetx: layer.offsetx ? layer.offsetx : 0,
        offsety: layer.offsety ? layer.offsety : 0,
        paralaxHRatio: hRatio,
        paralaxVRatio: vRatio,
      })
    })

    if (this.tilemap.properties) {
      this.tilemap.properties.forEach((p) => {
        if (p.name === 'camera-layer') this.scene.mainLayer = p.value
        else if (p.name === 'zindex-range') this.layerZIndexRange = p.value
      })
    }

    /* for ( let i=0; i<this.tileset.tiles.length; i++ ) {
            if ( this.tileset.tiles[i] !== undefined ) {
                this.tileIndexes[this.tileset.tiles[i].id] = i;
            }
        } */
  }

  get width() {
    return this.tilemap.width
  }

  get height() {
    return this.tilemap.height
  }

  get tileSize() {
    return this.tilemap.tilewidth
  }

  get layerNumber() {
    return this.tilemap.layers.length
  }

  getRow(row: number, layerId: number): number[] {
    return this.tilemap.layers[this.layerIndexes[layerId]].data.slice(
      this.width * row,
      this.width * row + this.width
    )
  }

  readLayerTile(x: number, y: number, layerId: number): number {
    const layer = this.tilemap.layers[this.layerIndexes[layerId]]
    if (layer.type === 'tilelayer') {
      return this.tilemap.layers[this.layerIndexes[layerId]].data[
        y * this.width + x
      ]
    } else {
      return 0
    }
  }

  getTile(tile: number): TiledTile {
    //return this.tileset.tiles[ this.tileIndexes[tile - 1] ];
    return this.tileset.getTile(tile - 1)
  }

  getTileName(tile: number): string {
    //return this.tileset.tiles[ this.tileIndexes[tile - 1] ].image;
    return this.tileset.getTileName(tile - 1)
  }

  getLayerDescription(layerId: number): TiledTilemapLayer {
    return this.tilemap.layers[this.layerIndexes[layerId]]
  }
}

export class TileEntityFactory extends EntityFactory {
  private camera: Camera
  private x: number
  private y: number
  private z: number
  private layer: number
  private images: string[]
  private imageIdIndexes: number[]
  private opacity: number
  private visible: boolean
  private offsetx: number
  private offsety: number
  private useScreenCoords: boolean
  private tile: TiledTile
  private fromPool: boolean
  private tileset: TiledTilesetManager

  constructor(
    engine: Engine,
    camera: Camera,
    x: number,
    y: number,
    z: number,
    layer: number,
    images: string[],
    imageIdIndexes: number[],
    opacity: number,
    visible: boolean,
    offsetx: number,
    offsety: number,
    useScreenCoords: boolean,
    tile: TiledTile,
    tileset: TiledTilesetManager
  ) {
    super(engine)
    this.camera = camera
    this.x = x
    this.y = y
    this.z = z
    this.layer = layer
    this.images = images
    this.imageIdIndexes = imageIdIndexes
    this.opacity = opacity
    this.visible = visible
    this.offsetx = offsetx
    this.offsety = offsety
    this.useScreenCoords = useScreenCoords
    this.tile = tile
    this.tileset = tileset
  }

  protected createEntity() {
    const pooled = this.tileset.getTileProp(this.tile, 'pooled')
    const poolCategory = this.images && this.images[0] ? this.images[0] : ''
    if (
      pooled &&
      poolCategory &&
      this.engine.entityManager.getInactivePoolCount(poolCategory) > 0
    ) {
      this.entity = this.engine.entityManager.getEntityFromInactivePool(
        poolCategory
      )
      this.fromPool = true
    } else {
      this.fromPool = false
      super.createEntity()
    }
  }

  protected createComponents(): Component[] {
    if (this.fromPool) {
      this.restorePooledEntityComponents()
      return []
    } else {
      return this.getFreshComponents()
    }
  }

  private restorePooledEntityComponents() {
    // restore position
    const position = <PositionComponent>(
      this.entity.getComponentOfClass(PositionComponent)
    )
    if (position) {
      position.x = this.x + this.offsetx
      position.y = this.y + this.offsety
      position.type = this.useScreenCoords ? 'screen' : 'scene'
      position.layer = this.layer
    }

    // restore sprites into camera container
    const sprite = <SpriteComponent>(
      this.entity.getComponentOfClass(SpriteComponent)
    )
    if (sprite) {
      const container = this.camera.container //sprite.container;
      sprite.container = container
      sprite.visible = this.visible
      sprite.alpha = this.opacity
      sprite.current = 0
      sprite.sprites.forEach((s) => {
        s.zIndex = this.z
        s.visible = false
        container.addChild(s)
      })
      sprite.sprites[0].visible = sprite.visible
    }

    // restore animations
    const animations = <AnimationsComponent>(
      this.entity.getComponentOfClass(AnimationsComponent)
    )
    if (animations) {
      animations.animations.forEach((animation) => {
        animation.currentStep = undefined
        animation.iterationsLeft = undefined
        animation.startTime = undefined
        animation.totalDuration = undefined
      })
    }

    // restore body into matter world
    const fixture = <FixtureComponent>(
      this.entity.getComponentOfClass(FixtureComponent)
    )
    if (fixture && fixture.physicsObject) {
      const body = fixture.physicsObject
      let x: number, y: number
      if (fixture.shape instanceof CirceShape) {
        x = position.x + fixture.shape.x
        y = position.y + fixture.shape.y
      } else if (fixture.shape instanceof RectangleShape) {
        x = position.x + fixture.shape.x + fixture.shape.width / 2
        y = position.y + fixture.shape.y + fixture.shape.height / 2
      } else if (fixture.shape instanceof PolygonShape) {
        const p_acc = fixture.shape.points.reduce((acc, cur) => {
          return { x: acc.x + cur.x, y: acc.y + cur.y }
        })
        x = position.x + fixture.shape.x + p_acc.x / 3
        y = position.y + fixture.shape.y + p_acc.y / 3
      }
      Matter.Body.setPosition(body, Matter.Vector.create(x, y))
      //console.log('restoring body:', body)
      Matter.World.add(this.engine.scene.physicsEngine.world, body)
    }
  }

  private getFreshComponents(): Component[] {
    const components: Component[] = []

    // init position
    const x = this.x + this.offsetx
    const y = this.y + this.offsety
    const coords = this.useScreenCoords ? 'screen' : 'scene'
    const position = new PositionComponent(x, y, coords, this.layer)
    components.push(position)

    // init sprites
    const pSprites: PIXI.Sprite[] = []
    this.images.forEach((img) => {
      const s = new PIXI.Sprite(PIXI.utils.TextureCache[img])
      s.zIndex = this.z
      s.visible = false
      //s.blendMode=PIXI.BLEND_MODES.MULTIPLY;
      this.camera.container.addChild(s)
      pSprites.push(s)
    })
    pSprites[0].visible = this.visible
    const sprite = new SpriteComponent(pSprites, 0, this.visible)
    sprite.visible = this.visible
    sprite.alpha = this.opacity
    sprite.container = this.camera.container
    components.push(sprite)

    // init animations
    if (this.tile.animation && this.tile.animation.length >= 2) {
      const steps: SpriteAnimationStep[] = []
      let currentIndex = this.images.length - 1
      const stepNum = this.tile.animation.length
      //let from = this.imageIdIndexes[this.tileDescription.animation[0].tileid];
      for (let i = 0; i < stepNum; i++) {
        const step = this.tile.animation[i]
        const next = this.tile.animation[i + 1]
        const from = this.imageIdIndexes[step.tileid]
        const to = next ? this.imageIdIndexes[next.tileid] : 0
        const s: SpriteAnimationStep = {
          property: 'current',
          from: from,
          to: to,
          duration: step.duration,
          easing: 'linear',
        }
        steps.push(s)
      }
      const spriteAnimation = new SpriteAnimation()
      spriteAnimation.loop = true
      spriteAnimation.off = false
      spriteAnimation.visibleWhenOff = true
      spriteAnimation.steps = steps
      const animations = new AnimationsComponent([spriteAnimation])
      components.push(animations)
    }

    // init fixture
    if (this.tile.objectgroup) {
      let shape: FixtureShape

      // fetch fixture from tile description
      this.tile.objectgroup.objects.forEach((object) => {
        if (object.type === 'fixture') {
          shape = this.tileset.shapeFromTileObject(object)
        }
      })
      // if tile has a fixture, then create a body
      if (shape) {
        const fixture = new FixtureComponent()
        let options: Matter.IBodyDefinition = this.tileset.fetchMatterOptsFromTileOpts(
          this.tile
        )
        let body: Matter.Body = shapeToBody(position, shape, options)
        Matter.World.add(this.engine.scene.physicsEngine.world, body)
        fixture.shape = shape
        fixture.physicsObject = body
        components.push(fixture)
      }
    }

    // init pooling/deleting
    const category = this.tileset.getTileProp(this.tile, 'pooled')
      ? this.tile.image
      : ''
    components.push(new RemoveWhenNotVisibleComponent(category))

    return components
  }
}

export class TileObjectEntityFactory extends TriggerEntityFactory {
  private offsetx: number
  private offsety: number
  private tileObject: TiledObject
  private tilset: TiledTilesetManager

  constructor(
    engine: Engine,
    x: number,
    y: number,
    layer: number,
    offsetx: number,
    offsety: number,
    tileObject: TiledObject,
    tileset: TiledTilesetManager
  ) {
    if (tileObject.type !== 'trigger')
      throw new Error('Only objects with type="trigger" supported')
    const eventsJSON = tileset.getTileProp(tileObject, 'events')
    const events = eventsJSON
      ? JSON.parse(eventsJSON)
      : {
          enter: { type: 'TriggerEnter', msg: {} },
          active: { type: 'TriggerActive', msg: {} },
          leave: { type: 'TriggerLeave', msg: {} },
        }
    const shape = tileset.shapeFromTileObject(tileObject)
    shape.x = 0 // shape coords are local to tile coords
    shape.y = 0
    super(
      engine,
      x + offsetx,
      y + offsety,
      layer,
      shape,
      events.enter,
      events.active,
      events.leave
    )
    this.offsetx = offsetx
    this.offsety = offsety
    this.tileObject = tileObject
    this.tilset = tileset
  }
}

/* **************************************************************************
 *                    Tiled render subsystem
 * **************************************************************************/

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function range2grid(range: Box, tilesize: number): Box {
  return {
    x: range.x / tilesize,
    y: range.y / tilesize,
    width: range.width / tilesize,
    height: range.height / tilesize,
  }
}

function boxIntersect(box1: Box, box2: Box): boolean {
  const intersect_x =
    box1.x < box2.x
      ? box1.x + box1.width > box2.x
      : box2.x + box2.width > box1.x
  const intersect_y =
    box1.y < box2.y
      ? box1.y + box1.height > box2.y
      : box2.y + box2.height > box1.y
  return intersect_x && intersect_y
}

function tileInRange(
  row: number,
  col: number,
  pixelRange: Box,
  tilesize: number
) {
  return (
    row * tilesize + tilesize > pixelRange.y &&
    row * tilesize < pixelRange.y + pixelRange.height &&
    col * tilesize + tilesize > pixelRange.x &&
    col * tilesize < pixelRange.x + pixelRange.width
  )
}

export class TiledSubsystem implements Subsystem {
  public width: number
  public height: number
  public tilesize: number

  private engine: Engine
  private scene: Scene
  private camera: Camera
  private tilemap: TiledTilemapManager
  private visibleRanges: Box[]

  constructor(engine: Engine, camera: Camera, tilemap: TiledTilemapManager) {
    this.engine = engine
    this.scene = engine.scene
    this.camera = camera
    this.tilemap = tilemap
    this.width = this.tilemap.tileSize * this.tilemap.width
    this.height = this.tilemap.tileSize * this.tilemap.height
    this.tilesize = this.tilesize = this.tilemap.tileSize
    this.visibleRanges = []
    this.scene.layers.forEach((layer) => {
      this.visibleRanges[layer.id] = {
        x: -2,
        y: -2,
        width: 1,
        height: 1,
      }
    })
    this.init()
  }

  public update = ((delta: number) => {
    this.updateVisibleObjects()
  }).bind(this)

  private init() {
    this.engine.pixiApp.renderer.backgroundColor = this.tilemap.backgroundColor
  }

  private updateVisibleObjects() {
    const camera: Camera = this.camera
    camera.layers.forEach((layer) => {
      if (this.tilemap.layers[layer.id]) {
        const prevRange = this.visibleRanges[layer.id]
        const nextRange = {
          x: layer.x,
          y: layer.y,
          width: camera.width - this.tilemap.layers[layer.id].offsetx,
          height: camera.height - this.tilemap.layers[layer.id].offsety,
        }
        if (prevRange.x != nextRange.x || prevRange.y != nextRange.y) {
          if (this.tilemap.layers[layer.id].type === 'tilelayer') {
            this.updateTileLayerVisibleRange(prevRange, nextRange, layer.id)
          } else if (this.tilemap.layers[layer.id].type === 'objectgroup') {
            this.updateObjectLayerVisibleRange(prevRange, nextRange, layer.id)
          }
          this.visibleRanges[layer.id] = nextRange
        }
      }
    })
  }

  private updateTileLayerVisibleRange(
    previousRange: Box,
    nextRange: Box,
    layerId: number
  ) {
    const tilesize = this.tilemap.tileSize
    const next = range2grid(nextRange, tilesize)

    const startRow = Math.floor(next.y)
    const startCol = Math.floor(next.x)
    const finishRow = Math.ceil(next.y + next.height - 1)
    const finishCol = Math.ceil(next.x + next.width - 1)

    let row = startRow
    const updates = []
    while (row <= finishRow && row < this.width) {
      let col = startCol
      while (col <= finishCol && col < this.height) {
        if (
          tileInRange(row, col, nextRange, tilesize) &&
          !tileInRange(row, col, previousRange, tilesize)
        ) {
          const entity = this.addTile(row, col, layerId)
          if (entity && layerId === 1)
            updates.push(
              `updated row: ${row}, col: ${col}, layer: ${layerId}, ${entity}`
            )
        }
        col++
      }
      row++
    }
  }

  private updateObjectLayerVisibleRange(
    previousRange: Box,
    nextRange: Box,
    layerId: number
  ) {
    const layer = this.tilemap.getLayerDescription(layerId)
    if (layer.objects) {
      layer.objects.forEach((obj) => {
        const objBox = {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
        }
        if (
          obj.type === 'trigger' &&
          boxIntersect(objBox, nextRange) &&
          !boxIntersect(objBox, previousRange)
        ) {
          const props = this.tilemap.layers[layerId]
          const entity = this.scene.add(
            new TileObjectEntityFactory(
              this.engine,
              obj.x,
              obj.y,
              layerId,
              props.offsetx,
              props.offsety,
              obj,
              this.tilemap.tileset
            )
          )
        }
      })
    }
  }

  private addTile(row: number, col: number, layerId: number): Entity {
    const tilesize = this.tilemap.tileSize
    const props = this.tilemap.layers[layerId]
    const tileRef = this.tilemap.readLayerTile(col, row, layerId)
    const images: string[] = []
    const imageIdIndexes: number[] = []
    let currentImageIndex = 0
    if (tileRef) {
      const tile = this.tilemap.getTile(tileRef)
      if (tile.animation) {
        for (let i = 0; i < tile.animation.length; i++) {
          const frameTile = this.tilemap.getTile(tile.animation[i].tileid + 1)
          if (!imageIdIndexes[frameTile.id]) {
            images.push(frameTile.image)
            imageIdIndexes[frameTile.id] = currentImageIndex
            currentImageIndex++
          }
        }
      } else {
        images.push(tile.image)
        imageIdIndexes[tile.id] = 0
      }
      const factory = new TileEntityFactory(
        this.engine,
        this.camera,
        tilesize * col,
        tilesize * row,
        props.zIndex,
        layerId,
        images,
        imageIdIndexes,
        props.opacity,
        props.visible,
        props.offsetx,
        props.offsety,
        props.useScreenCoordinates,
        tile,
        this.tilemap.tileset
      )
      return this.scene.add(factory)
    }
  }
}
