import * as PIXI from 'pixi.js';
import { Entity,System,RenderableSystem,Game,GameEvent,KeyboardManager,AudioManager } from './engine';
import { FollowComponent, HealthComponent, PositionComponent, SpriteComponent, InputComponent, DestroyDeadEntityComponent, CollisionComponent } from './components';
import { ChaseDefaultState } from './chase-state';
import { EntityFactory } from './factory';


export class ChaseRenderSystem extends System implements RenderableSystem {

    private player: Entity;

    constructor(game: Game, player: Entity) {
        super(game);
        this.player = player;
        this.subscribeToEventForImmediateAttendance([['DeleteEntity', this.onDeleteEntity.bind(this)]]);
        this.subscribeToEvents([['Collision', this.onCollision.bind(this)]]);

        document.addEventListener('fullscreenchange', (event) => {
            this.game.pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
        });
    }

    render(): void {
        let renderEntities = this.getEntitiesBySignature( [SpriteComponent, PositionComponent] );
        renderEntities.forEach((entity: Entity, sprite: SpriteComponent, position: PositionComponent) => {
            let screenWidth= this.game.pixiApp.renderer.width;
            let screenHeight = this.game.pixiApp.renderer.height;
            let isPortrait = screenWidth < screenHeight;
            let cellSide = isPortrait ? Math.floor(screenHeight / this.game.properties.boardHeight) : Math.floor(screenWidth / this.game.properties.boardWidth);
            if (isPortrait && cellSide * this.game.properties.boardWidth > screenWidth) {
                cellSide = Math.floor(screenWidth / this.game.properties.boardWidth);
            } else if (cellSide * this.game.properties.boardHeight > screenHeight) {
                cellSide = Math.floor(screenHeight / this.game.properties.boardHeight);
            }
            let offsetX = Math.floor( (screenWidth - cellSide * this.game.properties.boardWidth) / 2 );
            let offsetY = Math.floor( (screenHeight - cellSide * this.game.properties.boardHeight) / 2 );

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

    onCollision(event: GameEvent) {
        const playerPosition: PositionComponent = <PositionComponent> this.getEntityComponentOfClass(PositionComponent, this.player);
        const isPlayer = event.msg.x === playerPosition.boardX && event.msg.y === playerPosition.boardY;
        let factory = new EntityFactory(this.game);
        factory.createSplat(event.msg.x, event.msg.y, isPlayer);
    }

    onDeleteEntity(event: GameEvent) {
        let entity: Entity = event.msg;
        let sprite = <SpriteComponent> this.getEntityComponentOfClass(SpriteComponent, entity);
        if (sprite) {
            sprite.visible = false;
            sprite.sprites.forEach(s => { s.destroy() });
        }
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
}


export class MotionSystem extends System {

    constructor(game: Game, player: Entity) {
        super(game);
    }

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
                    if (position.boardY < this.game.properties.boardHeight - 1) {
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
                    if (position.boardX < this.game.properties.boardWidth - 1) {
                        position.boardX++;
                    }
                }
                if ( input.teleport ) {
                    updated.add(entity.id);
                    input.teleport = false;
                    position.boardX = Math.floor( Math.random() * (this.game.properties.boardWidth - 1) );
                    position.boardY = Math.floor( Math.random() * (this.game.properties.boardHeight - 1) );
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

    private keyboardManager: KeyboardManager;

    constructor(game: Game) {
        super(game);

        this.keyboardManager = new KeyboardManager();

        let inputComponents = () => { return this.game.entityManager.getComponentsOfClass(InputComponent) };

        const uppress = () => { inputComponents().forEach((component: InputComponent) => component.up = true) };
        const uprelease = () => { inputComponents().forEach((component: InputComponent) => component.up = false) };

        const downpress = () => { inputComponents().forEach((component: InputComponent) => component.down = true) };
        const downrelease = () => { inputComponents().forEach((component: InputComponent) => component.down = false) };

        const leftpress = () => { inputComponents().forEach((component: InputComponent) => component.left = true); };
        const leftrelease = () => { inputComponents().forEach((component: InputComponent) => component.left = false) };

        const rightpress = () => { inputComponents().forEach((component: InputComponent) => component.right = true) };
        const rightrelease = () => { inputComponents().forEach((component: InputComponent) => component.right = false) };

        const tpress = () => { inputComponents().forEach((component: InputComponent) => component.teleport = true) };
        const trelease = () => { inputComponents().forEach((component: InputComponent) => component.teleport = false) };

        const rpress = () => {};
        const rrelease = () => { game.setState( new ChaseDefaultState(game) ) };

        const fpress = () => { };
        const frelease = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                this.game.pixiApp.view.requestFullscreen();
            }
        };

        this.keyboardManager.registerKeyEventHandler('ArrowUp', uppress, uprelease);
        this.keyboardManager.registerKeyEventHandler('ArrowDown', downpress, downrelease);
        this.keyboardManager.registerKeyEventHandler('ArrowLeft', leftpress, leftrelease);
        this.keyboardManager.registerKeyEventHandler('ArrowRight', rightpress, rightrelease);
        this.keyboardManager.registerKeyEventHandler('t', tpress, trelease);
        this.keyboardManager.registerKeyEventHandler('r', rpress, rrelease);
        this.keyboardManager.registerKeyEventHandler('f', fpress, frelease);
    }

    update(delta: number) {}

    cleanup() {}

    destroy() {
        this.keyboardManager.unregisterKeyEventHandler('ArrowUp');
        this.keyboardManager.unregisterKeyEventHandler('ArrowDown');
        this.keyboardManager.unregisterKeyEventHandler('ArrowLeft');
        this.keyboardManager.unregisterKeyEventHandler('ArrowRight');
        this.keyboardManager.unregisterKeyEventHandler('t');
        this.keyboardManager.unregisterKeyEventHandler('r');
    }
}


export class HealthSystem extends System {

    private player: Entity;

    constructor(game: Game, player: Entity) {
        super(game);
        this.player = player;
        this.subscribeToEvents([['Collision', this.onCollision.bind(this)]]);
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

    constructor(game: Game) {
        super(game);
    }

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

    constructor(game: Game, audio: AudioManager, player: Entity) {
        super(game);
        this.audio = audio;
        this.player = player;
        this.subscribeToEvents([
            ['PlayerDied', this.onPlayerDied.bind(this)],
            ['EnemyDied', this.onEnemyDied.bind(this)],
            ['Teleport', this.onTeleport.bind(this)]
        ]);
    }

    onPlayerDied(event: GameEvent) {
        this.audio.sounds['splat'].once('end', ()=>{ this.audio.sounds['meow'].play() }).play();
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

    constructor(game: Game) {
        super(game);
    }

    update(delta: number) {
        let entities = this.getEntitiesBySignature( [DestroyDeadEntityComponent, HealthComponent] );
        entities.forEach((entity: Entity, destroy: DestroyDeadEntityComponent, health: HealthComponent) => {
            if (destroy.destroyWhenDead && !health.alive) {
                this.publishEvent({ type: 'DeleteEntity', msg: entity});
                this.game.entityManager.removeEntity(entity);
            }
        });
    }

    cleanup() {}

    destroy() {}
}