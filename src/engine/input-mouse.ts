import { Engine } from "./engine";


export type MouseEventType
    = 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'mousedown'
    | 'mouseenter'
    | 'mouseleave'
    | 'mousemove'
    | 'mouseover'
    | 'mouseout'
    | 'mouseup'
    | 'pointerlockchange'
    | 'pointerlockerror'
    | 'select'
    | 'wheel';


interface MouseEventRegisterOptions {
    eventType: MouseEventType,
    target?: HTMLElement,
    callback?: (event: MouseEvent) => void,
    preventDefault?: boolean,
    stopPropagation?: boolean,
    fireGameEvent?: boolean,
    gameEventType?: string,
    throttle?: number
}


interface BasicMouseStatus {
    x: number,
    y: number,
    buttonDown: boolean[];
    mouseoverTarget: boolean,
}


const defaultGameEvents = {
    'click':             'MouseClick',
    'contextmenu':       'ContextMenu',
    'dblclick':          'DblClick',
    'mousedown':         'MouseDown',
    'mouseenter':        'MouseEnter',
    'mouseleave':        'MouseLeave',
    'mousemove':         'MouseMove',
    'mouseover':         'MouseOver',
    'mouseout':          'MouseOut',
    'mouseup':           'MouseUp',
    'pointerlockchange': 'PointerLockChange',
    'pointerlockerror':  'PointerLockError',
    'select':            'Select',
    'wheel':             'Wheel'
};


export class MouseInputManager {
    
    private engine: Engine;
    private userHandlers: Map<string, Handler>;
    private statusHandler: (event: MouseEvent)=>void;
    private statusTarget: HTMLElement;

    readonly mouseStatus: BasicMouseStatus;

    constructor(engine: Engine ) {
        this.engine = engine;
        this.userHandlers = new Map<string, Handler>();
        this.mouseStatus = {
            x: 0,
            y: 0,
            buttonDown: [],
            mouseoverTarget: false
        };
    }

    listenBasicStatus(target?: HTMLElement) {
        this.registerStatusEvents( target ? target : this.engine.pixiApp.view );
    }

    stopListeningingBasicStatus() {
        this.unregisterStatusEvents();
    }

    registerMouseEvent(options: MouseEventRegisterOptions) {
        const opts = this.mergeDefaultOptions(options);
        const handler = new Handler( this.engine, opts );
        this.userHandlers.set( opts.eventType, handler );
        handler.suscribe();
    }

    unregisterMouseEvent(eventType: MouseEventType) {
        if ( this.userHandlers.get( eventType ) ) {
            const handler = this.userHandlers.get( eventType );
            handler.unsuscribe();
            this.userHandlers.delete( eventType );
        }
    }

    unregisterAll() {
        const eventTypes = this.userHandlers.keys();
        for ( let eventType of eventTypes ) {
            this.unregisterMouseEvent( eventType as MouseEventType );
        };
    }

    private mergeDefaultOptions(userOptions: MouseEventRegisterOptions) {
        const defaults = {
            eventType: userOptions.eventType,
            target: this.engine.pixiApp.view,
            preventDefault: false,
            stopPropagation: false,
            fireGameEvent: false,
            gameEventType: defaultGameEvents[userOptions.eventType],
            throttle: 0
        };

        return {
            ...defaults,
            ...userOptions
        };
    }

    private registerStatusEvents(target: HTMLElement) {
        this.statusTarget = target;
        this.statusHandler = ((event: MouseEvent) => {
            if ( event.type === 'mousedown' ) {
                this.mouseStatus.buttonDown[ event.button ] = true;
            } else if ( event.type === 'mouseup' ) {
                this.mouseStatus.buttonDown[ event.button ] = false;
            } else if ( event.type === 'mouseenter' ) {
                this.mouseStatus.mouseoverTarget = true;
            } else if ( event.type === 'mouseleave' ) {
                this.mouseStatus.mouseoverTarget = false;
            }

            this.mouseStatus.x = event.clientX;
            this.mouseStatus.y = event.clientY;
        }).bind(this);

        this.statusTarget.addEventListener( 'mousedown', this.statusHandler );
        this.statusTarget.addEventListener( 'mouseup', this.statusHandler );
        this.statusTarget.addEventListener( 'mouseenter', this.statusHandler );
        this.statusTarget.addEventListener( 'mouseleave', this.statusHandler );
        this.statusTarget.addEventListener( 'mousemove', this.statusHandler );
    }

    private unregisterStatusEvents() {
        this.statusTarget.removeEventListener( 'mousedown', this.statusHandler );
        this.statusTarget.removeEventListener( 'mouseup', this.statusHandler );
        this.statusTarget.removeEventListener( 'mouseenter', this.statusHandler );
        this.statusTarget.removeEventListener( 'mouseleave', this.statusHandler );
        this.statusTarget.removeEventListener( 'mousemove', this.statusHandler );
    }
}


class Handler {

    private engine: Engine;
    private options: MouseEventRegisterOptions;
    private timestamp: number;

    private handler: (event: MouseEvent) => void;

    constructor(engine: Engine, options: MouseEventRegisterOptions) {
        this.engine = engine;
        this.options = options;
    }

    suscribe() {
        this.handler = this.getHandler();
        this.options.target.addEventListener( this.options.eventType, this.handler );
    }

    unsuscribe() {
        this.options.target.removeEventListener( this.options.eventType, this.handler );
    }

    private getHandler() {
        const handler = (event: MouseEvent) => {
            const now = Date.now();
            if ( !this.timestamp ) this.timestamp = now;
            const last = this.timestamp;

            if ( now - last < this.options.throttle ) return;
            this.timestamp = now;
            
            if ( this.options.preventDefault ) {
                event.preventDefault();
            }
            if ( this.options.stopPropagation ) {
                event.stopPropagation();
            }
    
            if ( this.options.fireGameEvent ) {
                this.engine.eventQueue.publish({
                    type: this.options.gameEventType,
                    msg: {
                        mouseEvent: event
                    }
                });
            }
    
            if ( this.options.callback !== undefined ) {
                setTimeout( () => this.options.callback( event ), 0 );
            }
        };

        return handler.bind( this );
    }
}