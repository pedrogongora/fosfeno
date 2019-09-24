import { Engine } from './engine';


interface Vec3 {
    x: number,
    y: number,
    z: number,
}


interface GreekVec3 {
    alpha: number;
    beta: number;
    gamma: number;
}


export type MobileEventType
    = 'touchstart'
    | 'touchmove'
    | 'touchend'
    | 'touchcancel'
    | 'devicemotion'
    | 'deviceorientation'
    | 'orientationchange';


interface MobileEventRegisterOptions {
    eventType: MobileEventType,
    target?: EventTarget,
    callback?: (event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event) => void,
    preventDefault?: boolean,
    stopPropagation?: boolean,
    fireGameEvent?: boolean,
    gameEventType?: string,
    throttle?: number
}


interface BasicMobileStatus {
    x: number;
    y: number;
    touchDown: boolean;
    orientationAbsolute: boolean;
    orientation: GreekVec3;
    motion: {
        acceleration: Vec3;
        accelerationWithGravity: Vec3;
        rate: GreekVec3;
        interval: number;
    };
}


const defaultGameEvents = {
    'touchstart':        'TouchStart',
    'touchmove':         'TouchMove',
    'touchend':          'TouchEnd',
    'touchcancel':       'TouchCancel',
    'devicemotion':      'DeviceMotion',
    'deviceorientation': 'DeviceOrientation',
    'orientationchange': 'OrientationChange'
};



export class MobileInputManager {

    private engine: Engine;
    private userOptions: Map<string,MobileEventRegisterOptions>;
    private userHandlers: Map<string, (event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event) => void>;
    private timestamps: Map<string, number>;
    private statusTarget: EventTarget;
    private statusTouchHandler: (event: TouchEvent) => void;
    private statusOrientationHandler: (event: DeviceOrientationEvent) => void;
    private statusMotionHandler: (event: DeviceMotionEvent) => void;

    readonly mobileStatus: BasicMobileStatus;

    constructor( engine: Engine ) {
        this.engine = engine;
        this.userOptions = new Map<MobileEventType, MobileEventRegisterOptions>();
        this.userHandlers = new Map<string, (event: TouchEvent | DeviceMotionEvent | DeviceOrientationEvent | Event)=>void>();
        this.timestamps = new Map<string, number>();
        this.mobileStatus = {
            x: 0,
            y: 0,
            touchDown: false,
            orientationAbsolute: false,
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            motion: {
                acceleration: { x:0, y: 0, z: 0},
                accelerationWithGravity: { x:0, y: 0, z: 0},
                rate: { alpha: 0, beta: 0, gamma: 0 },
                interval: 0
            }
        };
    }

    listenBasicStatus(target?: EventTarget) {
        this.registerStatusEvents( target ? target : this.engine.pixiApp.view );
    }

    stopListeningBasicStatus() {
        this.unregisterStatusEvents();
    }

    registerMobileEvent(options: MobileEventRegisterOptions) {
        const opts = this.mergeDefaultOptions(options);
        this.userOptions.set( opts.eventType, opts );

        const handler = this.getHandler();
        this.userHandlers.set( opts.eventType, handler );

        opts.target.addEventListener( opts.eventType, handler );
    }

    unregisterMobileEvent( eventType: MobileEventType ) {
        const opts = this.userOptions.get( eventType );
        const handler = this.userHandlers.get( eventType );

        opts.target.removeEventListener( opts.eventType, handler );

        this.userOptions.delete( eventType );
        this.userHandlers.delete( eventType );
    }

    unregisterAll() {
        const types = this.userOptions.keys();
        for ( let type of types ) {
            this.unregisterMobileEvent( type as MobileEventType );
        }
    }

    private mergeDefaultOptions(userOptions: MobileEventRegisterOptions) {
        const defaults: MobileEventRegisterOptions = {
            eventType: userOptions.eventType,
            target: userOptions.eventType === 'deviceorientation' || userOptions.eventType === 'devicemotion' || userOptions.eventType === 'orientationchange'
                ? window
                : this.engine.pixiApp.view,
            preventDefault: false,
            stopPropagation: false,
            fireGameEvent: false,
            gameEventType: defaultGameEvents[userOptions.eventType],
            throttle: userOptions.eventType === 'deviceorientation' || userOptions.eventType === 'devicemotion'
                ? 100
                : 0
        };

        return {
            ...defaults,
            ...userOptions
        };
    }

    private getHandler() {
        const handler = (event: Event) => {
            const opts = this.userOptions.get( event.type as MobileEventType );

            if ( !opts ) return;

            if ( opts.preventDefault ) {
                event.preventDefault();
            }
            if ( opts.stopPropagation ) {
                event.stopPropagation();
            }

            const now = Date.now();
            const last = this.timestamps.get( opts.eventType )
                ? this.timestamps.get( opts.eventType )
                : now;

            if ( now - last < opts.throttle ) return;
            this.timestamps.set( opts.eventType, now );
    
            if ( opts.fireGameEvent ) {
                const gameEventType = opts.gameEventType
                    ? opts.gameEventType
                    : defaultGameEvents[opts.eventType];
                this.engine.eventQueue.publish({
                    type: gameEventType,
                    msg: {
                        mobileEvent: event
                    }
                });
            }
    
            if ( opts.callback !== undefined ) {
                setTimeout( () => opts.callback( event ), 0 );
            }
        };

        return handler.bind( this );
    }

    private registerStatusEvents(target: EventTarget) {
        this.statusTarget = target;

        this.statusTouchHandler = ((event: TouchEvent) => {
            if ( event.type === 'touchstart' ) {
                this.mobileStatus.touchDown = true;
            } else if ( event.type === 'touchend' ) {
                this.mobileStatus.touchDown = false;
            } else if ( event.type === 'touchcancel' ) {
                this.mobileStatus.touchDown = false;
            }

            this.mobileStatus.x = event.changedTouches[0].clientX;
            this.mobileStatus.y = event.changedTouches[0].clientY;
        }).bind(this);

        this.statusOrientationHandler = ((event: DeviceOrientationEvent) => {
            this.mobileStatus.orientationAbsolute = event.absolute;
            this.mobileStatus.orientation.alpha   = event.alpha;
            this.mobileStatus.orientation.beta    = event.beta;
            this.mobileStatus.orientation.gamma   = event.gamma;
        }).bind(this);

        this.statusMotionHandler = ((event: DeviceMotionEvent) => {
            this.mobileStatus.motion.acceleration.x = event.acceleration.x;
            this.mobileStatus.motion.acceleration.y = event.acceleration.y;
            this.mobileStatus.motion.acceleration.z = event.acceleration.z;

            this.mobileStatus.motion.accelerationWithGravity.x = event.accelerationIncludingGravity.x;
            this.mobileStatus.motion.accelerationWithGravity.y = event.accelerationIncludingGravity.y;
            this.mobileStatus.motion.accelerationWithGravity.z = event.accelerationIncludingGravity.z;

            this.mobileStatus.motion.rate.alpha = event.rotationRate.alpha;
            this.mobileStatus.motion.rate.beta  = event.rotationRate.beta;
            this.mobileStatus.motion.rate.gamma = event.rotationRate.gamma;

            this.mobileStatus.motion.interval = event.interval;
        }).bind(this);

        this.statusTarget.addEventListener( 'touchstart', this.statusTouchHandler );
        this.statusTarget.addEventListener( 'touchmove', this.statusTouchHandler );
        this.statusTarget.addEventListener( 'touchend', this.statusTouchHandler );
        this.statusTarget.addEventListener( 'touchcancel', this.statusTouchHandler );
        window.addEventListener( 'deviceorientation', this.statusOrientationHandler );
        window.addEventListener( 'devicemotion', this.statusMotionHandler );
    }

    private unregisterStatusEvents() {
        this.statusTarget.removeEventListener( 'touchstart', this.statusTouchHandler );
        this.statusTarget.removeEventListener( 'touchmove', this.statusTouchHandler );
        this.statusTarget.removeEventListener( 'touchend', this.statusTouchHandler );
        this.statusTarget.removeEventListener( 'touchcancel', this.statusTouchHandler );
        window.removeEventListener( 'deviceorientation', this.statusOrientationHandler );
        window.removeEventListener( 'devicemotion', this.statusMotionHandler );
    }
}