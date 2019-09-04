import { Howl } from 'howler';

export class AudioManager {

    readonly sounds: Map<string, any>;
    public filenames: string[];
    private onLoadCallback: ()=>void;
    private downloadedFiles: number;

    constructor() {
        this.sounds = new Map<string, any>();
    }
    
    loadSounds(filenames: string[], progressCallback: (()=>void), callback: (()=>void)) {
        this.filenames = filenames;
        this.onLoadCallback = callback;
        this.downloadedFiles = 0;
        if (filenames.length > 0) {
            for ( let i=0; i<filenames.length; i++ ) {
                const s = filenames[i];
                const name = s.substring(s.lastIndexOf('/')+1, s.lastIndexOf('.'));
                const howlOpts = {
                    src: s,
                    preload: true,
                    onload: () => { /* console.log(`loading: ${s}`); */ progressCallback(); this.fileLoaded(); },
                    onloaderror: (id: number, err: string) => { throw new Error(`Failed loading ${s}: ${err}`) }
                };
                this.sounds.set(name, new Howl(howlOpts));
            }
        } else {
            callback();
        }
    }

    private fileLoaded() {
        this.downloadedFiles += 1;
        if (this.downloadedFiles === this.filenames.length) {
            this.onLoadCallback();
        }
    }

    play(name: string) {
        this.sounds.get(name).play();
    }
}