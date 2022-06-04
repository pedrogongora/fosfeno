import * as PIXI from 'pixi.js'
import { Entity, Engine, EntitySignature, Subsystem } from '../core'
import {
  SpriteComponent,
  SpriteAnimation,
  AnimationsComponent,
} from '../components'
import { EasingFunction } from './easing'
import { log } from '../core'

export class AnimationSubsystem implements Subsystem {
  private engine: Engine
  private logger: (...args: any) => void
  private time: number
  private numLogs = 0

  constructor(engine: Engine, logger?: (...args: any) => void) {
    this.engine = engine
    this.logger = (...args: any) => {
      /* const theLogger = logger ? logger : log.debug;
            const now = Date.now();
            theLogger('['+now+','+(this.numLogs)+']: ',...args); */
      /* if ( this.time === undefined || now - this.time > 500 ) {
                theLogger('['+now+','+(this.numLogs)+']: ',...args);
                if ( this.time === undefined || now - this.time > 500 ) {
                    this.time = now;
                }
            } */
    }
  }

  public readonly update = ((delta: number) => {
    this.updateAnimations()
  }).bind(this)

  private updateAnimations() {
    const now = Date.now()
    this.numLogs++

    const animations = new EntitySignature(
      this.engine,
      [AnimationsComponent, SpriteComponent],
      [],
      this
    )
    animations.forEach(
      (
        entity: Entity,
        animations: AnimationsComponent,
        sprite: SpriteComponent
      ) => {
        animations.animations.forEach((animation: SpriteAnimation) => {
          if (!animation.off) {
            this.logger('------------> update anim:\n', animation)
            this.initIfNew(now, animation)
            this.updateCurrentStep(now, animation, sprite)
            this.applyStep(now, animation, sprite)
          }
        })
      }
    )
  }

  private initIfNew(now: number, animation: SpriteAnimation) {
    if (animation.off) return
    if (
      animation.iterationsLeft === undefined ||
      animation.totalDuration === undefined ||
      animation.startTime === undefined ||
      animation.currentStep === undefined
    ) {
      this.logger('init anim')
      animation.iterations = animation.iterations ? animation.iterations : 1
      animation.iterationsLeft = animation.iterationsLeft
        ? animation.iterationsLeft
        : animation.iterations
      const totalDuration = animation.steps
        .map((a) => {
          return a.duration
        })
        .reduce((prev, curr) => {
          return prev + curr
        }, 0)
      animation.totalDuration = totalDuration
      animation.startTime = now
      animation.currentStep = 0
      if (animation.off === undefined) {
        animation.off = false
      }
    }
  }

  private computeDT(now: number, animation: SpriteAnimation) {
    let completedTime = 0
    for (let i = 0; i < animation.currentStep; i++) {
      completedTime += animation.steps[i].duration
    }
    const dt = now - animation.startTime - completedTime
    return dt
  }

  private updateCurrentStep(
    now: number,
    animation: SpriteAnimation,
    sprite: SpriteComponent
  ) {
    if (animation.off) return
    const dt = this.computeDT(now, animation)
    let step = animation.steps[animation.currentStep]
    // did we missed finishing the previous step?
    if (dt >= step.duration) {
      this.logger('finishing the previous step')
      if (typeof sprite[step.property] === 'number') {
        ;(sprite[step.property] as number) = <number>step.to
      } else {
        //(sprite[step.property] as {x: number, y: number}).x = (step.to as {x: number, y: number}).x;
        //(sprite[step.property] as {x: number, y: number}).y = (step.to as {x: number, y: number}).y;
        ;(sprite[step.property] as { x: number; y: number }) = step.to as {
          x: number
          y: number
        }
      }
      animation.currentStep += 1
      // if finished last step, restart or reset
      if (animation.currentStep >= animation.steps.length) {
        animation.startTime = now
        animation.currentStep = 0
        if (animation.iterationsLeft > 1) {
          animation.iterationsLeft -= 1
        } else if (animation.loop) {
          animation.iterationsLeft = animation.iterations
        } else {
          animation.startTime = undefined
          animation.iterationsLeft = undefined
          animation.totalDuration = undefined
          animation.currentStep = undefined
          animation.off = true
          if (animation.onFinishMessage !== undefined) {
            this.engine.eventQueue.publish(animation.onFinishMessage)
          }
        }
      }
    }
  }

  private applyStep(
    now: number,
    animation: SpriteAnimation,
    sprite: SpriteComponent
  ) {
    if (animation.off) return
    const step = animation.steps[animation.currentStep]
    this.logger('step: ', animation.currentStep, step)
    const dt = this.computeDT(now, animation)
    if (step.property === 'current') {
      ;(sprite['current'] as number) = <number>step.from
    } else if (step.property === 'tint') {
      const r1 = ((step.from as number) as number) >>> 16,
        g1 = ((step.from as number) << 16) >>> 24,
        b1 = ((step.from as number) << 24) >>> 24,
        r2 = (step.to as number) >>> 16,
        g2 = ((step.to as number) << 16) >>> 24,
        b2 = ((step.to as number) << 24) >>> 24
      let r3 =
        r1 < r2
          ? EasingFunction.functions[step.easing](
              dt,
              r1,
              r2 - r1,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -r1,
              r1 - r2,
              step.duration
            )
      let g3 =
        g1 < g2
          ? EasingFunction.functions[step.easing](
              dt,
              g1,
              g2 - g1,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -g1,
              g1 - g2,
              step.duration
            )
      let b3 =
        b1 < b2
          ? EasingFunction.functions[step.easing](
              dt,
              b1,
              b2 - b1,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -b1,
              b1 - b2,
              step.duration
            )
      r3 = Math.floor(r1 < r2 ? r3 : -r3)
      g3 = Math.floor(g1 < g2 ? g3 : -g3)
      b3 = Math.floor(b1 < b2 ? b3 : -b3)
      const value = (r3 << 16) + (g3 << 8) + b3
      sprite[step.property] = value
      this.logger(
        dt,
        ' (',
        r1,
        g1,
        b1,
        ') -- (',
        r2,
        g2,
        b2,
        ') == (',
        r3,
        g3,
        b3,
        ') = ',
        value.toString(16)
      )
    } else if (step.property === 'skew' || step.property === 'scale') {
      let fromX = (<{ x: number; y: number }>step.from).x,
        fromY = (<{ x: number; y: number }>step.from).y,
        toX = (<{ x: number; y: number }>step.to).x,
        toY = (<{ x: number; y: number }>step.to).y
      let valueX =
        fromX < toX
          ? EasingFunction.functions[step.easing](
              dt,
              fromX,
              toX - fromX,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -fromX,
              fromX - toX,
              step.duration
            )
      valueX = fromX < toX ? valueX : -valueX
      let valueY =
        fromY < toY
          ? EasingFunction.functions[step.easing](
              dt,
              fromY,
              toY - fromY,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -fromY,
              fromY - toY,
              step.duration
            )
      valueY = fromY < toY ? valueY : -valueY
      //this.logger('applying anim (dt,from,to,duration. property,values):', dt, step.from, step.to, step.duration, step.property, valueX, valueY);
      this.logger(
        'applying anim (dt,from,to,duration. property,values):',
        dt,
        `(${fromX}, ${fromY})`,
        `(${toX}, ${toY})`,
        step.duration,
        step.property,
        valueX,
        valueY
      )
      ;(sprite[step.property] as { x: number; y: number }) = {
        x: valueX,
        y: valueY,
      }
      this.logger('applied anim, value(s):', sprite[step.property])
      //(sprite[step.property] as {x: number, y: number}).x = valueX;
      //(sprite[step.property] as {x: number, y: number}).y = valueY;
    } else {
      let from = <number>step.from,
        to = <number>step.to
      let value =
        step.from < step.to
          ? EasingFunction.functions[step.easing](
              dt,
              from,
              to - from,
              step.duration
            )
          : EasingFunction.functions[step.easing](
              dt,
              -from,
              from - to,
              step.duration
            )
      value = step.from < step.to ? value : -value
      this.logger(
        'applying anim (dt,from,to,duration,value):',
        dt,
        step.from,
        step.to,
        step.duration,
        value
      )
      ;(sprite[step.property] as number) = value
    }
  }
}
