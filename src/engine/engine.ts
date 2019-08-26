import * as PIXI from 'pixi.js';
import { EntityManager, System, RenderableSystem } from './entity';
import { EventQueue } from './events';
import { GameProperties } from './gameprops';
import { GameState } from './state';


export class Engine {

    readonly entityManager: EntityManager;
    readonly eventQueue: EventQueue;
    readonly properties: GameProperties;
    readonly pixiApp: PIXI.Application;
    readonly pixiDefaultProperties = {
        resizeTo: window,
        antialias: false,
        transparent: false,
        resolution: window.devicePixelRatio
    };
    private currentState: GameState;

    constructor(properties: GameProperties) {
        this.eventQueue = new EventQueue();
        this.properties = properties,
        this.entityManager = new EntityManager(properties, this.eventQueue),
        this.pixiApp = new PIXI.Application({...this.pixiDefaultProperties, ...properties.pixiProperties});
        this.pixiApp.stage.sortableChildren = true;
    }

    setState(state: GameState) {
        this.pixiApp.ticker.remove( this.gameLoop, this );
        if (this.currentState) {
            this.currentState.destroySystems();
            this.currentState.destroy();
            this.entityManager.removeAllEntities();
            this.eventQueue.reset();
        }
        this.start( state );
    }

    private gameLoop = (delta: number) => {
        const isRenderSystem = function (system: System): system is RenderableSystem {
            return (system as RenderableSystem).render !== undefined;
        }
        this.currentState.getSystems().forEach( s => { s.update(delta); this.eventQueue.dispatchEvents(); } );
        this.currentState.getSystems().forEach( s => isRenderSystem(s) ? (() => { s.render(); this.eventQueue.dispatchEvents(); })() : {} );
        this.currentState.getSystems().forEach( s => s.cleanup() );
    };

    runGame() {        
        this.pixiApp.ticker.add( this.gameLoop, this );
    }

    start(state: GameState) {
        this.currentState = state;
        this.currentState.start( this.runGame.bind(this) );
    }

}