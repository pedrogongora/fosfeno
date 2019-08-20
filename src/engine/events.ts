export interface GameEvent {

    readonly type: string;
    readonly msg: any;
    
}

export class EventQueue {

    private queue: GameEvent[];
    private subscriptions: Map<string, ((event: GameEvent) => void)[]>;
    private immediateSubscriptions: Map<string, ((event: GameEvent) => void)[]>;

    constructor() {
        this.queue = [];
        this.subscriptions = new Map<string, ((event: GameEvent) => void)[]>();
        this.immediateSubscriptions = new Map<string, ((event: GameEvent) => void)[]>();
    }

    subscribe(eventType: string, callback: (event: GameEvent) => void) {
        if (this.subscriptions.has(eventType)) {
            this.subscriptions.get(eventType).push(callback);
        } else {
            this.subscriptions.set(eventType, [callback]);
        }
    }

    subscribeForImmediateAttendance(eventType: string, callback: (event: GameEvent) => void) {
        if (this.immediateSubscriptions.has(eventType)) {
            this.immediateSubscriptions.get(eventType).push(callback);
        } else {
            this.immediateSubscriptions.set(eventType, [callback]);
        }
    }

    publish(event: GameEvent) {
        this.queue.push(event);
        if (this.immediateSubscriptions.has(event.type)) {
            this.immediateSubscriptions.get(event.type).forEach(callback => { callback(event) });
        }
    }

    publishForImmediateAttendance(event: GameEvent) {
        this.dispatch(event);
    }

    dispatchEvents() {
        while (this.queue.length > 0) {
            let event = this.queue.shift();
            this.dispatch(event);
        }
    }

    reset() {
        this.queue = [];
        this.subscriptions = new Map<string, ((event: GameEvent) => void)[]>();
        this.immediateSubscriptions = new Map<string, ((event: GameEvent) => void)[]>();
    }

    private dispatch(event: GameEvent) {
        if (this.subscriptions.has(event.type)) {
            this.subscriptions.get(event.type).forEach(callback => {
                callback(event);
            });
        }
    }
}