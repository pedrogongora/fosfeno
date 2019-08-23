import * as PIXI from 'pixi.js';
import { Entity,Engine,GameState,System } from '../../src';
import { CollisionSystem,HealthSystem,MotionSystem,ChaseRenderSystem,EntityDeleteSystem,InputSystem,SoundSystem } from './systems';
import { EntityFactory } from './factory';


export class ChaseDefaultState extends GameState {

    private systems: System[];
    private player: Entity;
    private cells: Entity[];
    private enemies: Entity[];
    private blocks: Entity[];
    readonly imageResources: string[];
    readonly soundResources: string[];

    constructor(engine: Engine) {
        super(engine, true);
        this.imageResources = [
            'img/cat.png',
            'img/zombie.png',
            'img/square.png',
            'img/block.png',
            'img/splat.png',
        ];
        this.soundResources = [
            'sound/beep.wav',
            'sound/meow.wav',
            'sound/splat.wav'
        ];
        this.setResourceUrls(this.imageResources, this.soundResources);
    }

    private createMainEntities() {
        let factory = new EntityFactory(this.engine);
        this.cells = factory.createBoardCells();
        let unavailableCells: number[] = [];
        this.player = factory.createPlayer(unavailableCells);
        this.enemies = factory.createEnemies(this.player, unavailableCells);
        this.blocks = factory.createBlocks(unavailableCells);
    }

    private createSystems() {
        this.systems = [
            new InputSystem(this.engine),
            new MotionSystem( this.engine, this.player ),
            new CollisionSystem( this.engine ),
            new HealthSystem( this.engine, this.player ),
            new ChaseRenderSystem( this.engine, this.player ),
            new SoundSystem( this.engine, this.resourceLoader.audio, this.player ),
            new EntityDeleteSystem( this.engine ),
        ];
    }

    init() {
        this.createMainEntities();
        this.createSystems();
        console.log(`player: ${this.player}`)
    }

    destroy() {
        PIXI.Loader.shared.reset();
    }

    getSystems() {
        return this.systems;
    }
}