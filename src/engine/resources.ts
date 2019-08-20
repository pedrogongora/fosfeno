import * as PIXI from 'pixi.js';
import { AudioManager } from './audio'


export class ResourceLoader {

    private imageFilenames: string[];
    private soundFilenames: string[];
    private numResources: number;
    private numDownloadedResources = 0;
    
    private background: PIXI.Graphics;
    private progressBackground: PIXI.Graphics;
    private progressContent: PIXI.Graphics;

    readonly pixiApp: PIXI.Application;

    audio: AudioManager;

    constructor(imageFilenames: string[], soundFilenames: string[], pixiApp: PIXI.Application) {
        this.imageFilenames = imageFilenames;
        this.soundFilenames = soundFilenames;
        this.pixiApp = pixiApp;
        this.audio = new AudioManager();
        this.numResources = imageFilenames.length + soundFilenames.length;
    }

    private downloadSprites(progressCallback: (()=>void)) {
        let loader = PIXI.Loader.shared;
        return new Promise((resolve, reject) => {
            loader.add(this.imageFilenames)
            .on('load', (loader, resource) => {
                progressCallback();
                console.log(`loading: ${resource.url}`);
            })
            .on('error', (err) => {
                reject( new Error('On loading sprite: ' + err ) );
            })
            .load( () => resolve() );
        });
    }

    private async downloadSounds(progressCallback: (()=>void)) {
        let filenames = this.soundFilenames;
        return this.audio.loadSounds(filenames, progressCallback.bind(this));
    }

    async downloadResources(callback: (()=>void)) {
        const width = this.pixiApp.renderer.width;
        const height = this.pixiApp.renderer.height;
        const radius = 1;
        
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000);
        this.background.drawRect(0,0,width-1,height-1);
        this.background.endFill();
        this.background.x = 0;
        this.background.y = 0;

        this.progressBackground = new PIXI.Graphics();
        this.progressBackground.beginFill(0x000000);
        this.progressBackground.lineStyle(1, 0x66BB66);
        this.progressBackground.drawRoundedRect(0,0,102,22,radius);
        this.progressBackground.endFill();

        this.progressContent = new PIXI.Graphics();
        this.progressContent.beginFill(0x00FF00);
        this.progressContent.drawRoundedRect(0,0,0,20,radius);
        this.progressContent.endFill();
        this.progressContent.position.set(1,1);

        this.progressBackground.x = width / 2 - 51;
        this.progressBackground.y = height / 2 - 11;
        
        this.progressBackground.addChild(this.progressContent);

        this.pixiApp.stage.addChild(this.background);
        this.pixiApp.stage.addChild(this.progressBackground);

        const progressCallback = () => {
            this.numDownloadedResources += 1;
            let width = Math.floor(this.numDownloadedResources * 100 / this.numResources);
            this.progressContent.beginFill(0x00FF00);
            this.progressContent.drawRoundedRect(0,0,width,20,radius);
            this.progressContent.endFill();
        };

        this.downloadSprites.bind(this)(progressCallback)
        .then(this.downloadSounds.bind(this)(progressCallback))
        .then(() => {
            this.pixiApp.stage.removeChildren();
            callback();
        });
    }
}