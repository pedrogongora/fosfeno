import { Engine } from './engine';
import { System } from './system';
import { ResourceLoader } from './resources';

export abstract class GameState {

    protected engine: Engine;
    protected resourceLoader: ResourceLoader;
    private useResourceLoader: boolean;
    private imageResourcesUrls: string[];
    private soundResourcesUrls: string[];

    constructor(engine: Engine, useResourceLoader: boolean) {
        this.engine = engine;
        this.useResourceLoader = useResourceLoader;
    }
    
    abstract init(): void;
    
    abstract stage(): void;
    
    abstract unstage(): void;

    abstract destroy(): void;
    
    abstract getSystems(): System[];

    setResourceUrls(imageResourcesUrls: string[], soundResourcesUrls: string[]) {
        this.imageResourcesUrls = imageResourcesUrls;
        this.soundResourcesUrls = soundResourcesUrls;
    }

    start(callback: () => void) {
        const next = () => {
            this.stage();
            this.stageSystems();
            callback();
        }

        if (this.useResourceLoader) {
            this.useResourceLoader = false;
            this.resourceLoader = new ResourceLoader(this.imageResourcesUrls, this.soundResourcesUrls, this.engine.pixiApp);
            this.resourceLoader.downloadResources(() => { this.init(); next(); });
        } else {
            next();
        }
    }

    stageSystems() {
        this.getSystems().forEach(system => { system.stage() });
    }

    unstageSystems() {
        this.getSystems().forEach(system => { system.unstage() });
    }

    destroySystems() {
        this.getSystems().forEach(system => { system.destroy() });
    }

}