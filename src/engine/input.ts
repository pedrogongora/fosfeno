export class KeyboardManager {

    private handlers: Map<string,KeyEventHandler>;

    constructor() {
        this.handlers = new Map<string,KeyEventHandler>();
    }

    registerKeyEventHandler(keyName: string, pressCallback: () => void, releaseCallback: () => void) {
        let handler = new KeyEventHandler(keyName);
        handler.press = pressCallback;
        handler.release = releaseCallback;
        this.handlers.set(keyName, handler);
    }

    unregisterKeyEventHandler(keyName: string) {
        let handler = this.handlers.get(keyName);
        handler.unsubscribe();
        this.handlers.delete(keyName);
    }
}


class KeyEventHandler {

    readonly keyValue: string;
    isDown: boolean;
    isUp: boolean;
    downListener: EventListener;
    upListener: EventListener;
    press: () => void;
    release: () => void;

    constructor(keyValue: string) {
        this.keyValue = keyValue;
        this.isDown = false;
        this.isUp = true;
        this.press = undefined;
        this.release = undefined;

        //Attach event listeners
        this.downListener = this.downHandler.bind(this);
        this.upListener = this.upHandler.bind(this);
        
        window.addEventListener(
          "keydown", this.downListener, false
        );
        window.addEventListener(
          "keyup", this.upListener, false
        );
    }

    downHandler(event: KeyboardEvent) {
        if (event.key === this.keyValue) {
            //console.log('press key: '+this.keyValue);
            if (this.isUp && this.press) this.press();
            this.isDown = true;
            this.isUp = false;
            event.preventDefault();
        }
    }
      
    upHandler(event: KeyboardEvent) {
        if (event.key === this.keyValue) {
            //console.log('release key: '+this.keyValue);
            if (this.isDown && this.release) this.release();
            this.isDown = false;
            this.isUp = true;
            event.preventDefault();
        }
    }
      
    unsubscribe() {
        window.removeEventListener("keydown", this.downListener);
        window.removeEventListener("keyup", this.upListener);
    }
}