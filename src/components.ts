import * as PIXI from 'pixi.js';
import { Component, Entity } from './engine';


export class SpriteComponent implements Component {
    
    readonly sprites: PIXI.Sprite[];
    public current: number;
    public visible: boolean;

    constructor(sprites: PIXI.Sprite[], current: number, visible: boolean) {
        this.sprites = sprites;
        this.current = current;
        this.visible = visible;
        sprites.forEach((s: PIXI.Sprite) => s.visible = false);
        sprites[current].visible = visible;
    }

}


export class PositionComponent implements Component {

    constructor(
        public boardX: number,
        public boardY: number,
        public canvasX: number,
        public canvasY: number
    ) {}

}


export class MotionComponent implements Component {

    constructor(
        public velocityX: number,
        public velocityY: number
    ) {}

}


export class FollowComponent implements Component {

    constructor(
        public entity: Entity
    ) {}

}


export class HealthComponent implements Component {

    constructor(
        public alive: boolean
    ) {}

}


export class DestroyDeadEntityComponent implements Component {

    constructor(
        public destroyWhenDead: boolean
    ) {}

}


export class InputComponent implements Component {

    constructor(
        public up: boolean,
        public down: boolean,
        public left: boolean,
        public right: boolean,
        public teleport: boolean,
        public reset: boolean
    ) {}

}


export class CollisionComponent implements Component {
}
