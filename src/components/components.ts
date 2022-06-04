import * as PIXI from 'pixi.js'
import * as Matter from 'matter-js'
import { Component, Entity, GameEvent } from '../core'

export class TypeComponent implements Component {
  constructor(public type: string) {}
}

export class SpriteComponent implements Component {
  readonly sprites: PIXI.Sprite[]
  public anchor: { x: number; y: number }
  public alpha: number
  public current: number
  public height: number
  public rotation: number
  public scale: { x: number; y: number }
  public skew: { x: number; y: number }
  public tint: number
  public visible: boolean
  public width: number
  public container: PIXI.Container

  constructor(sprites: PIXI.Sprite[], current: number, visible: boolean) {
    this.sprites = sprites
    this.current = current
    this.visible = visible
    this.width = sprites[current].width
    this.height = sprites[current].height
    sprites.forEach((s: PIXI.Sprite) => (s.visible = false))
    sprites[current].visible = visible
  }

  toString(): string {
    return `Sprite{a:${this.alpha}, c:${this.current}, h:${this.height}, r:${this.rotation}, s:${this.scale}, t:${this.tint}, v:${this.visible}, w:${this.width},s.l:${this.sprites.length}}`
  }
}

export class AnimationsComponent implements Component {
  constructor(public animations: SpriteAnimation[]) {}
}

export interface SpriteAnimationStep {
  property:
    | 'alpha'
    | 'rotation'
    | 'width'
    | 'height'
    | 'scale'
    | 'skew'
    | 'tint'
    | 'current'
  from: number | { x: number; y: number }
  to: number | { x: number; y: number }
  duration: number
  easing:
    | 'linear'
    | 'in-out-cubic'
    | 'in-cubic'
    | 'out-cubic'
    | 'in-elastic'
    | 'out-elastic'
    | 'out-in-quartic'
}

export class SpriteAnimation {
  public steps: SpriteAnimationStep[]

  public startTime: number
  public totalDuration: number
  public iterations: number
  public iterationsLeft: number
  public currentStep: number
  public loop: boolean
  public visibleWhenOff: boolean
  public onFinishMessage: GameEvent
  public off: boolean

  toString(): string {
    return `Anim{o:${this.off},st:${this.startTime},td:${this.totalDuration},it:${this.iterations},itl:${this.iterationsLeft},l:${this.loop},vo:${this.visibleWhenOff},cs:${this.currentStep}}`
  }
}

export class TextFromProperty implements Component {
  public intervalTimestamp: number

  constructor(
    public object: any,
    public property: string,
    public text: PIXI.Text,
    public prefix: string,
    public suffix: string,
    public updateInterval: number,
    public format?: (p: any) => string
  ) {}
}

export class ButtonComponent implements Component {
  public touchStarted: boolean
  public width: number
  public height: number
  public event: GameEvent

  constructor(width: number, height: number, event: GameEvent) {
    this.width = width
    this.height = height
    this.event = event
  }
}

export class CounterComponent implements Component {
  constructor(public counter: number) {}
}

export type CoordinateType = 'scene' | 'screen' | 'screen-ratio'

export class PositionComponent implements Component {
  public x: number
  public y: number
  public type: CoordinateType
  public layer: number

  constructor(x: number, y: number, type: CoordinateType, layer: number) {
    this.x = x
    this.y = y
    this.type = type
    this.layer = layer
  }
}

export abstract class FixtureShape {
  public kind: string
  public x: number
  public y: number
  public offsetx: number = 0
  public offsety: number = 0

  constructor(kind: string) {
    this.kind = kind
  }
}

export class RectangleShape extends FixtureShape {
  public width: number
  public height: number

  constructor(x: number, y: number, width: number, height: number) {
    super('Rectangle')
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.offsetx = -width / 2
    this.offsety = -height / 2
  }
}

export class CirceShape extends FixtureShape {
  public radius: number

  constructor(x: number, y: number, radius: number) {
    super('Circle')
    this.x = x
    this.y = y
    this.radius = radius
    this.offsetx = -radius / 2
    this.offsety = -radius / 2
  }
}

export class PolygonShape extends FixtureShape {
  public points: { x: number; y: number }[]

  constructor(x: number, y: number, points: { x: number; y: number }[]) {
    super('Polygon')
    this.x = x
    this.y = y
    this.points = points
  }
}

export class FixtureComponent implements Component {
  public shape: FixtureShape
  public physicsObject: Matter.Body
}

export class RenderPhysicsAngle implements Component {}

export class FollowComponent implements Component {
  public entity: Entity
  public timestamp: number

  constructor(entity: Entity) {
    this.entity = entity
  }
}

export class CopyPositionComponent implements Component {
  constructor(public entity: Entity) {}
}

export class TriggerComponent implements Component {
  constructor(
    private enterEvent: GameEvent,
    private activeEvent: GameEvent,
    private leaveEvent: GameEvent
  ) {}
}

export class DestroyWhenAnimationOffComponent implements Component {}

export class DestroyWhenNotOnScreenComponent implements Component {}

export class RemoveWhenNotVisibleComponent implements Component {
  constructor(public poolCategory: string = '') {}
}

export class InputComponent implements Component {
  public up: boolean
  public down: boolean
  public left: boolean
  public right: boolean
  public space: boolean

  public touch: boolean
  public alpha: number
  public beta: number
  public gamma: number

  public mouseLeft: boolean
  public mouseRight: boolean
  public mouseMiddle: boolean
  public mouseX: number
  public mouseY: number
}
