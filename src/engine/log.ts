declare let window: any;


export const logLevels = {
    NONE:    0,
    WARNING: 1,
    INFO:    2,
    DEBUG:   3,
    VERBOSE: 4
};


class Logger {
    
    private level: number;
    private static instance: Logger;

    private constructor() {
        this.level = logLevels.WARNING;
        if ( window.localStorage ) {
            const tmp = window.localStorage.getItem( 'FOSFENO_LOG_LEVEL' );
            if ( tmp && Number.isInteger(tmp) ) {
                this.level = tmp;
            }
        }
    }

    public static getInstance() {
        if ( Logger.instance === undefined ) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLevel(level: number) {
        this.level = level;
    }

    public warning(...args: any[]) {
        if ( this.level >= logLevels.WARNING ) {
            console.log(...args);
        }
    }

    public info(...args: any[]) {
        if ( this.level >= logLevels.INFO ) {
            console.log(...args);
        }
    }

    public debug(...args: any[]) {
        if ( this.level >= logLevels.DEBUG ) {
            console.log(...args);
        }
    }

    public verbose(...args: any[]) {
        if ( this.level >= logLevels.VERBOSE ) {
            console.log(...args);
        }
    }
}


export const log = Logger.getInstance();