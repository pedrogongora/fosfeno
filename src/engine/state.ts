import { Engine } from './engine';
import { System } from './entity';
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

    setResourceUrls(imageResourcesUrls: string[], soundResourcesUrls: string[]) {
        this.imageResourcesUrls = imageResourcesUrls;
        this.soundResourcesUrls = soundResourcesUrls;
    }

    abstract getSystems(): System[];
    
    abstract init(): void;

    start(callback: () => void) {
        const next = () => {
            this.init();
            callback();
        }

        if (this.useResourceLoader) {
            this.resourceLoader = new ResourceLoader(this.imageResourcesUrls, this.soundResourcesUrls, this.engine.pixiApp);
            this.resourceLoader.downloadResources(next);
        } else {
            next();
        }
    }

    abstract destroy(): void;

    destroySystems() {
        this.getSystems().forEach(system => { system.destroy() });
    }

}