import * as PIXI from 'pixi.js';
import { Entity,System,RenderableSystem,Engine,GameEvent,AudioManager } from '../../src';
import { FollowComponent, HealthComponent, PositionComponent, SpriteComponent, InputComponent, DestroyDeadEntityComponent, CollisionComponent } from './components';
import { EntityFactory } from './factory';


export class ChaseRenderSystem extends System implements RenderableSystem {

    private player: Entity;
    private subscriptions: [string, (ev: GameEvent) => void][];

    constructor(engine: Engine, player: Entity) {
        super(engine);
        this.player = player;
        this.subscriptions = [
            ['Collision',  this.onCollision.bind(this)],
            ['Fullscreen', this.onFullscreen.bind(this)],
        ];
    }

    stage() {
        this.subscribeToEventForImmediateAttendance([['DeleteEntity', this.onDeleteEntity.bind(this)]]);
        this.subscribeToEvents( this.subscriptions );
    }

    unstage() {
        this.unsubscribeToEvent( 'DeleteEntity', this.onDeleteEntity.bind(this) );
        this.unsubscribeToEvents( this.subscriptions );
    }

    render(): void {
        let renderEntities = this.getEntitiesBySignature( [SpriteComponent, PositionComponent] );
        renderEntities.forEach((entity: Entity, sprite: SpriteComponent, position: PositionComponent) => {
            let screenWidth= this.engine.pixiApp.renderer.width;
            let screenHeight = this.engine.pixiApp.renderer.height;
            let isPortrait = screenWidth < screenHeight;
            let cellSide = isPortrait ? Math.floor(screenHeight / this.engine.properties.boardHeight) : Math.floor(screenWidth / this.engine.properties.boardWidth);
            if (isPortrait && cellSide * this.engine.properties.boardWidth > screenWidth) {
                cellSide = Math.floor(screenWidth / this.engine.properties.boardWidth);
            } else if (cellSide * this.engine.properties.boardHeight > screenHeight) {
                cellSide = Math.floor(screenHeight / this.engine.properties.boardHeight);
            }
            let offsetX = Math.floor( (screenWidth - cellSide * this.engine.properties.boardWidth) / 2 );
            let offsetY = Math.floor( (screenHeight - cellSide * this.engine.properties.boardHeight) / 2 );

            if ( position ) {
                position.canvasX = position.boardX * cellSide + offsetX;
                position.canvasY = position.boardY * cellSide + offsetY;
                sprite.sprites[sprite.current].width = cellSide;
                sprite.sprites[sprite.current].height = cellSide;
                sprite.sprites[sprite.current].x = position.canvasX;
                sprite.sprites[sprite.current].y = position.canvasY;
                sprite.sprites[sprite.current].visible = sprite.visible;
            }
        });
    }

    update(delta: number) {}

    cleanup() {}

    destroy() {
        let components = this.getComponentsOfClass(SpriteComponent);
        components.forEach(component => {
            (component as SpriteComponent).sprites.forEach(sprite => {
                sprite.destroy({
                    children: true,
                    texture: true,
                    baseTexture: true
                });
            });
        });
    }

    private onCollision(event: GameEvent) {
        const playerPosition: PositionComponent = <PositionComponent> this.getEntityComponentOfClass(PositionComponent, this.player);
        const isPlayer = event.msg.x === playerPosition.boardX && event.msg.y === playerPosition.boardY;
        let factory = new EntityFactory(this.engine);
        factory.createSplat(event.msg.x, event.msg.y, isPlayer);
    }

    private onFullscreen(event: GameEvent) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.engine.pixiApp.view.requestFullscreen();
        }
    }

    private onDeleteEntity(event: GameEvent) {
        let entity: Entity = event.msg;
        let sprite = <SpriteComponent> this.getEntityComponentOfClass(SpriteComponent, entity);
        if (sprite) {
            sprite.visible = false;
            sprite.sprites.forEach(s => { s.destroy() });
        }
    }
}


export class PauseRenderSystem extends System implements RenderableSystem {

    private pauseScreen: Entity;
    private subscriptions: [string, (ev: GameEvent) => void][];

    constructor(engine: Engine, pauseScreen: Entity) {
        super(engine);
        this.pauseScreen = pauseScreen;
        this.subscriptions = [
            ['Fullscreen', this.onFullscreen.bind(this)],
        ];
    }

    stage() {
        this.subscribeToEvents( this.subscriptions );
    }

    unstage() {
        this.unsubscribeToEvents( this.subscriptions );
    }

    render(): void {}

    update(delta: number) {}

    cleanup() {}

    destroy() {
        let component = <SpriteComponent> this.getEntityComponentOfClass(SpriteComponent, this.pauseScreen);
        component.sprites.forEach(sprite => {
            sprite.destroy({
                children: false,
                texture: false,
                baseTexture: false
            });
        });
        this.engine.entityManager.removeEntity( this.pauseScreen );
    }

    private onFullscreen(event: GameEvent) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.engine.pixiApp.view.requestFullscreen();
        }
    }
}


export class MotionSystem extends System {

    constructor(engine: Engine, player: Entity) {
        super(engine);
    }

    stage() {}

    unstage() {}

    update(delta: number) {
        let inputEntities = this.getEntitiesBySignature( [InputComponent, PositionComponent], [HealthComponent] );
        let updated = new Set<number>();
        inputEntities.forEach((entity: Entity, input: InputComponent, position: PositionComponent, health: HealthComponent) => {
            if (!health || (health && health.alive)) {
                if ( input.up ) {
                    updated.add(entity.id);
                    input.up = false;
                    if (position.boardY > 0) {
                        position.boardY--;
                    }
                }
                if ( input.down ) {
                    updated.add(entity.id);
                    input.down = false;
                    if (position.boardY < this.engine.properties.boardHeight - 1) {
                        position.boardY++;
                    }
                }
                if ( input.left ) {
                    updated.add(entity.id);
                    input.left = false;
                    if (position.boardX > 0) {
                        position.boardX--;
                    }
                }
                if ( input.right ) {
                    updated.add(entity.id);
                    input.right = false;
                    if (position.boardX < this.engine.properties.boardWidth - 1) {
                        position.boardX++;
                    }
                }
                if ( input.teleport ) {
                    updated.add(entity.id);
                    input.teleport = false;
                    position.boardX = Math.floor( Math.random() * (this.engine.properties.boardWidth - 1) );
                    position.boardY = Math.floor( Math.random() * (this.engine.properties.boardHeight - 1) );
                    this.publishEvent({ type: 'Teleport', msg: entity });
                }
            }
        });

        let followEntities = this.getEntitiesWithComponentOfClass(FollowComponent);
        followEntities.forEach(entity => {
            let follow = <FollowComponent> this.getEntityComponentOfClass(FollowComponent, entity);
            if (updated.has(follow.entity.id)) {
                let follower = <PositionComponent> this.getEntityComponentOfClass(PositionComponent, entity);
                let followed = <PositionComponent> this.getEntityComponentOfClass(PositionComponent, { id: follow.entity.id });
                if (followed.boardX < follower.boardX) {
                    follower.boardX--;
                } else if (followed.boardX > follower.boardX) {
                    follower.boardX++;
                }
                if (followed.boardY < follower.boardY) {
                    follower.boardY--;
                } else if (followed.boardY > follower.boardY) {
                    follower.boardY++;
                }
            }
        });
    }

    cleanup() {}

    destroy() {}
}


export class InputSystem extends System {

    constructor(engine: Engine) {
        super(engine);
    }

    stage() {
        let inputComponents = () => { return this.engine.entityManager.getComponentsOfClass(InputComponent) };

        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'ArrowUp',
            keydownCallback: () => { inputComponents().forEach((component: InputComponent) => component.up = true) },
            keyupCallback: () => { inputComponents().forEach((component: InputComponent) => component.up = false) }
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'ArrowDown',
            keydownCallback: () => { inputComponents().forEach((component: InputComponent) => component.down = true) },
            keyupCallback: () => { inputComponents().forEach((component: InputComponent) => component.down = false) }
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'ArrowLeft',
            keydownCallback: () => { inputComponents().forEach((component: InputComponent) => component.left = true); },
            keyupCallback: () => { inputComponents().forEach((component: InputComponent) => component.left = false) }
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'ArrowRight',
            keydownCallback: () => { inputComponents().forEach((component: InputComponent) => component.right = true) },
            keyupCallback: () => { inputComponents().forEach((component: InputComponent) => component.right = false) }
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 't',
            keydownCallback: () => { inputComponents().forEach((component: InputComponent) => component.teleport = true) },
            keyupCallback: () => { inputComponents().forEach((component: InputComponent) => component.teleport = false) }
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'p',
            fireGameEvents: true,
            keyupGameEventType: 'Pause'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'r',
            fireGameEvents: true,
            keyupGameEventType: 'Reset'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'f',
            fireGameEvents: true,
            keyupGameEventType: 'Fullscreen'
        });
    }

    unstage() {
        this.engine.input.keyboard.unregisterAll();
    }

    update(delta: number) {
    }

    cleanup() {}

    destroy() {}
}


export class PauseInputSystem extends System {

    constructor(engine: Engine) {
        super(engine);
    }

    stage() {
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'p',
            fireGameEvents: true,
            keyupGameEventType: 'Pause'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'r',
            fireGameEvents: true,
            keyupGameEventType: 'Reset'
        });
        this.engine.input.keyboard.registerKeyEventHandler({
            key: 'f',
            fireGameEvents: true,
            keyupGameEventType: 'Fullscreen'
        });
    }

    unstage() {
        this.engine.input.keyboard.unregisterAll();
    }

    update(delta: number) {}

    cleanup() {}

    destroy() {}
}


export class HealthSystem extends System {

    private player: Entity;
    private subscriptions: [string, (ev: GameEvent) => void][];

    constructor(engine: Engine, player: Entity) {
        super(engine);
        this.player = player;
        this.subscriptions = [
            ['Collision', this.onCollision.bind(this)]
        ];
    }

    stage() {
        this.subscribeToEvents( this.subscriptions );
    }

    unstage() {
        this.unsubscribeToEvents( this.subscriptions );
    }

    update(delta: number) {}

    cleanup() {}

    destroy() {}

    onCollision(event: GameEvent) {
        let playerDied = false;
        let enemyDied = false;
        event.msg.entities.forEach((entity: Entity) => {
            let health = <HealthComponent> this.getEntityComponentOfClass(HealthComponent, entity);
            if (health && health.alive) {
                health.alive = false;
                if (this.player.id === entity.id) {
                    playerDied = true;
                } else {
                    enemyDied = true;
                }
            }
        });
        if (playerDied) {
            this.publishEvent({ type: 'PlayerDied', msg: {} });
        } else if (enemyDied) {
            this.publishEvent({ type: 'EnemyDied', msg: {} });
        }
    }
}


export class CollisionSystem extends System {

    constructor(engine: Engine) {
        super(engine);
    }

    stage() {}

    unstage() {}

    update(delta: number) {
        let hash = new Map<string, Set<Entity>>();
        
        let collisionEntities = this.getEntitiesBySignature( [CollisionComponent, PositionComponent] );
        collisionEntities.forEach((entity: Entity, collision: CollisionComponent, position: PositionComponent) => {
            const key = `${position.boardX},${position.boardY}`;
            let collisions = hash.has(key) ? hash.get(key) : new Set<Entity>();
            collisions.add(entity);
            hash.set(key, collisions);
        });

        for (let key of hash.keys()) {
            if (hash.get(key).size > 1) {
                let coords = key.split(',');
                const data = {
                    x: parseInt(coords[0]),
                    y: parseInt(coords[1]),
                    entities: hash.get(key)
                };
                this.publishEvent({ type: 'Collision', msg: data });
            }
        }
    }

    cleanup() {}

    destroy() {}
}


export class SoundSystem extends System {

    private audio: AudioManager;
    private player: Entity;
    private subscriptions: [string, (ev: GameEvent) => void][];

    constructor(engine: Engine, audio: AudioManager, player: Entity) {
        super(engine);
        this.audio = audio;
        this.player = player;
        this.subscriptions = [
            [ 'PlayerDied', this.onPlayerDied.bind(this) ],
            [ 'EnemyDied', this.onEnemyDied.bind(this) ],
            [ 'Teleport', this.onTeleport.bind(this) ]
        ];
    }

    stage() {
        this.subscribeToEvents(this.subscriptions);
    }

    unstage() {
        this.unsubscribeToEvents( this.subscriptions );
    }

    onPlayerDied(event: GameEvent) {
        this.audio.sounds.get('splat').once('end', ()=>{ this.audio.sounds.get('meow').play() }).play();
    }

    onEnemyDied(event: GameEvent) {
        this.audio.play('splat');
    }

    onTeleport(event: GameEvent) {
        this.audio.play('beep');
    }

    update(delta: number) {}

    cleanup() {}

    destroy() {}
}


export class EntityDeleteSystem extends System {

    constructor(engine: Engine) {
        super(engine);
    }

    stage() {}

    unstage() {}

    update(delta: number) {
        let entities = this.getEntitiesBySignature( [DestroyDeadEntityComponent, HealthComponent] );
        entities.forEach((entity: Entity, destroy: DestroyDeadEntityComponent, health: HealthComponent) => {
            if (destroy.destroyWhenDead && !health.alive) {
                this.publishEvent({ type: 'DeleteEntity', msg: entity});
                this.engine.entityManager.removeEntity(entity);
            }
        });
    }

    cleanup() {}

    destroy() {}
}