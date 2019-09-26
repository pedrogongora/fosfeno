import * as PIXI from 'pixi.js';
import { EntityManager } from './entity';
import { System, RenderableSystem } from './system';
import { EventQueue } from './events';
import { GameProperties } from './gameprops';
import { GameState } from './state';
import { StateTransitionDescription, StateTransitionSystem } from './statetransition';
import { KeyboardInputManager } from './input-keyboard';
import { MouseInputManager } from './input-mouse';
import { MobileInputManager } from './input-mobile';
import { log } from './log';


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
    readonly input: {
        keyboard: KeyboardInputManager,
        mouse: MouseInputManager,
        mobile: MobileInputManager
    };

    private stateTransitions: StateTransitionDescription;
    private stateTransitionSystem: StateTransitionSystem;
    private currentState: GameState;
    private running: boolean;
    private pendingActions: (()=>void)[];

    readonly statistics: {
        systemsUpdateAverageTime: number,
        systemsRenderAverageTime: number,
        systemsCleanupAverageTime: number,
        loopIterationAverageTime: number,
        loopIntervalAverageTime: number,
    };
    
    private lastLoopIterationTimestamp: number

    constructor(properties: GameProperties) {
        this.eventQueue = new EventQueue();
        this.properties = properties,
        this.entityManager = new EntityManager(properties, this.eventQueue),
        this.pixiApp = new PIXI.Application({...this.pixiDefaultProperties, ...properties.pixiProperties});
        this.pixiApp.stage.sortableChildren = true;
        this.input = {
            keyboard: new KeyboardInputManager( this ),
            mouse: new MouseInputManager( this ),
            mobile: new MobileInputManager( this )
        }
        this.running = false;
        this.pendingActions = [];
    }

    setTransitionSystem(stateTransitions: StateTransitionDescription, stateClassStore: any) {
        this.stateTransitions = stateTransitions;
        this.stateTransitionSystem = new StateTransitionSystem(this, stateTransitions, stateClassStore);
        this.stateTransitionSystem.init();
    }

    setState(state: GameState, reset: boolean = false) {
        if ( this.currentState && reset ) {
            PIXI.Loader.shared.removeAllListeners();
            PIXI.utils.destroyTextureCache();
            PIXI.Loader.shared.reset();
            this.entityManager.removeAllEntities();
            this.eventQueue.reset();
        }
        this.currentState = state;
    }

    start() {
        if ( !this.currentState ) {
            throw new Error('There is no current state, try setState(...) or setTransitionSystem(...) before calling start()');
        }

        if ( !this.running ) {
            this.running = true;
            this.currentState.start( this.runGameLoop.bind(this) );
        }
    }

    stop(callback: () => void) {
        const doStop = () => {
            this.pixiApp.ticker.remove( this.gameLoop, this );
            if ( this.currentState ) {
                this.currentState.unstageSystems();
                this.currentState.unstage();
            }
            if ( callback ) {
                callback();
            }
        };

        if ( this.running ) {
            this.pendingActions.push( doStop );
        } else {
            doStop();
        }
    }

    private runGameLoop() {
        this.pixiApp.ticker.add( this.gameLoop, this );
    }

    private gameLoop = (delta: number) => {
        const timestamps: number[] = [];
        this.running = true;
        timestamps.push( Date.now() ); // [0]
        const isRenderSystem = function (system: System): system is RenderableSystem {
            return (system as RenderableSystem).render !== undefined;
        }
        timestamps.push( Date.now() ); // [1]
        this.currentState.getSystems().forEach( s => { s.update(delta); this.eventQueue.dispatchEvents(); } );
        timestamps.push( Date.now() ); // [2]
        this.currentState.getSystems().forEach( s => isRenderSystem(s) ? (() => { s.render(); this.eventQueue.dispatchEvents(); })() : {} );
        timestamps.push( Date.now() ); // [3]
        this.currentState.getSystems().forEach( s => s.cleanup() );
        timestamps.push( Date.now() ); // [4]
        this.running = false;
        while ( this.pendingActions.length > 0 ) {
            const action = this.pendingActions.shift();
            action();
        }
        timestamps.push( Date.now() ); // [5]
        this.updateStatistics(timestamps);
    }

    private updateStatistics(timestamps: number[]) {
        if ( this.statistics.systemsUpdateAverageTime ) {
            this.statistics.systemsUpdateAverageTime = (this.statistics.systemsUpdateAverageTime + timestamps[2] - timestamps[1]) / 2;
        } else {
            this.statistics.systemsUpdateAverageTime = timestamps[2] - timestamps[1];
        }
 
        if ( this.statistics.systemsRenderAverageTime ) {
            this.statistics.systemsRenderAverageTime = (this.statistics.systemsRenderAverageTime + timestamps[3] - timestamps[2]) / 2;
        } else {
            this.statistics.systemsRenderAverageTime = timestamps[3] - timestamps[2];
        }
 
        if ( this.statistics.systemsCleanupAverageTime ) {
            this.statistics.systemsCleanupAverageTime = (this.statistics.systemsCleanupAverageTime + timestamps[4] - timestamps[3]) / 2;
        } else {
            this.statistics.systemsCleanupAverageTime = timestamps[4] - timestamps[3];
        }
 
        if ( this.statistics.loopIterationAverageTime ) {
            this.statistics.loopIterationAverageTime = (this.statistics.loopIterationAverageTime + timestamps[5] - timestamps[0]) / 2;
        } else {
            this.statistics.loopIterationAverageTime = timestamps[5] - timestamps[0];
        }

        if ( this.statistics.loopIntervalAverageTime && this.lastLoopIterationTimestamp ) {
            this.statistics.loopIntervalAverageTime = (this.statistics.loopIntervalAverageTime + (timestamps[0] - this.lastLoopIterationTimestamp)) / 2;
        } else {
            this.statistics.loopIntervalAverageTime = timestamps[0];
        }
        
        this.lastLoopIterationTimestamp = timestamps[0];
    };


}