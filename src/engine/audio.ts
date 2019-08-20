import { Howl } from 'howler';

export class AudioManager {

    readonly sounds: any;

    constructor() {
        this.sounds = {};
    }
    
    async loadSounds(filenames: string[], progressCallback: (()=>void)) {
        let loaders:any = [];
        
        for ( let i=0; i<filenames.length; i++ ) {
            let s = filenames[i];
            let name = s.substring(s.lastIndexOf('/')+1, s.lastIndexOf('.'));
            const asyncLoad = (resolve: any, reject: any) => {
                let howlOpts = {
                    src: s,
                    preload: true,
                    onload: () => { console.log(`loading: ${s}`); progressCallback(); resolve(); },
                    onloaderror: (id: number, err: string) => reject( new Error(`Failed loading ${s}: ${err}`) )
                };
                this.sounds[name] = new Howl(howlOpts);
            };
            loaders.push( new Promise(asyncLoad) );
        }

        return Promise.all(loaders);
    }

    play(name: string) {
        this.sounds[name].play();
    }
}