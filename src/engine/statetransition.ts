import { GameState } from "./state";
import { Engine } from "./engine";
import { GameEvent } from "./events";


export interface StateTransitionDescription {

    start: string;

    startLoadResources: boolean;

    transitions: Transition[];

}


interface Transition {
    current: string,
    event: string,
    next: string,
    destroyCurrent: boolean,
    forceNewNext: boolean,
    resetEngine: boolean,
    loadResources: boolean
}


export class StateTransitionSystem {

    readonly engine: Engine;
    readonly description: StateTransitionDescription;
    readonly stateClassStore: any;

    private stateInstances: Map<string, GameState>;
    private transitionRules: Map<string, Map<string,Transition>>;
    private events: Set<string>;
    private current: string;

    constructor(engine: Engine, description: StateTransitionDescription, stateClassStore: any) {
        this.engine = engine;
        this.description = description;
        this.stateClassStore = stateClassStore;
        this.stateInstances = new Map<string, GameState>();
        this.transitionRules = new Map<string, Map<string,Transition>>();
        this.events = new Set<string>();

        this.description.transitions.forEach(transition => {
            if ( !this.transitionRules.get( transition.current ) ) this.transitionRules.set( transition.current, new Map<string, Transition>() );
            if ( !this.transitionRules.get( transition.next ) )    this.transitionRules.set( transition.next, new Map<string, Transition>() );
            this.events.add( transition.event );
            const rules = this.transitionRules.get( transition.current );
            rules.set( transition.event, transition );
            this.transitionRules.set( transition.current, rules );
        });
    }

    init() {
        const state = this.createStateInstance( this.description.start, this.description.startLoadResources );
        this.stateInstances.set( this.description.start, state );
        this.subscribeToEvents();
        this.engine.setState( state );
        this.current = this.description.start;
    }

    private createStateInstance(name: string, loadResources: boolean): GameState {
        return <GameState> new this.stateClassStore[name]( this.engine, loadResources );
    }

    private subscribeToEvents() {
        this.events.forEach(ev => {
            this.engine.eventQueue.subscribe( ev, this.eventCallback.bind(this) );
        });
    }

    private unsubscribeToEvents() {
        this.events.forEach(ev => {
            this.engine.eventQueue.unsubscribe( ev, this.eventCallback.bind(this) );
        });
    }

    private getNextInstance(event: GameEvent): [string, GameState, boolean, boolean] {
        const transition = this.transitionRules.get( this.current ).get( event.type );
        console.log('applying transition: ', transition);
        let next: GameState;
        if ( transition.forceNewNext || !this.stateInstances.get( transition.next ) ) {
            //console.log('creating new instance of ' + transition.next);
            next = this.createStateInstance( transition.next, transition.loadResources );
        } else {
            //console.log('using existing instance of ' + transition.next + ', instance: '+ this.stateInstances.get( transition.next ));
            next = this.stateInstances.get( transition.next );
        }
        return [transition.next, next, transition.destroyCurrent, transition.resetEngine];
    }

    private hasNext( event:GameEvent ) {
        const transition = this.transitionRules.get( this.current ).get( event.type );
        return transition !== null && transition !== undefined;
    }

    private eventCallback(event: GameEvent) {
        if ( this.hasNext(event) ) {
            new Promise(resolve => { this.engine.stop(resolve) })
            .then(() => {
                const [name, instance, destroyCurrent, resetEngine] = this.getNextInstance( event );
                this.unsubscribeToEvents();
                if ( destroyCurrent ) {
                    //console.log('destroying current state')
                    const currentInstance = this.stateInstances.get( this.current );
                    currentInstance.destroySystems();
                    currentInstance.destroy();
                    this.stateInstances.delete( this.current );
                }
                //console.log('setting state instance: ', instance)
                this.engine.setState( instance, resetEngine );
                this.subscribeToEvents();
                this.current = name;
                this.stateInstances.set( name, instance );
                this.engine.start();
            });
        }
    }

}