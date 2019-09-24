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
        this.running = true;
        const isRenderSystem = function (system: System): system is RenderableSystem {
            return (system as RenderableSystem).render !== undefined;
        }
        this.currentState.getSystems().forEach( s => { s.update(delta); this.eventQueue.dispatchEvents(); } );
        this.currentState.getSystems().forEach( s => isRenderSystem(s) ? (() => { s.render(); this.eventQueue.dispatchEvents(); })() : {} );
        this.currentState.getSystems().forEach( s => s.cleanup() );
        this.running = false;
        while ( this.pendingActions.length > 0 ) {
            const action = this.pendingActions.shift();
            action();
        }
    }

}