import * as PIXI from 'pixi.js';
import { Entity,Game,GameState,System } from './engine';
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

    constructor(game: Game) {
        super(game, true);
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
        let factory = new EntityFactory(this.game);
        this.cells = factory.createBoardCells();
        let unavailableCells: number[] = [];
        this.player = factory.createPlayer(unavailableCells);
        this.enemies = factory.createEnemies(this.player, unavailableCells);
        this.blocks = factory.createBlocks(unavailableCells);
    }

    private createSystems() {
        this.systems = [
            new InputSystem(this.game),
            new MotionSystem( this.game, this.player ),
            new CollisionSystem( this.game ),
            new HealthSystem( this.game, this.player ),
            new ChaseRenderSystem( this.game, this.player ),
            new SoundSystem( this.game, this.resourceLoader.audio, this.player ),
            new EntityDeleteSystem( this.game ),
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