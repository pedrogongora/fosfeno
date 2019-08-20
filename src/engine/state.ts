import { Game } from './game';
import { System } from './entity';
import { ResourceLoader } from './resources';


export abstract class GameState {

    protected game: Game;
    protected resourceLoader: ResourceLoader;
    private useResourceLoader: boolean;
    private imageResourcesUrls: string[];
    private soundResourcesUrls: string[];

    constructor(game: Game, useResourceLoader: boolean) {
        this.game = game;
        this.useResourceLoader = useResourceLoader;
    }

    setResourceUrls(imageResourcesUrls: string[], soundResourcesUrls: string[]) {
        this.imageResourcesUrls = imageResourcesUrls;
        this.soundResourcesUrls = soundResourcesUrls;
    }

    abstract getSystems(): System[];
    
    abstract init(): void;

    async start(callback: () => void) {
        const next = async () => {
            this.init();
            callback();
        }

        if (this.useResourceLoader) {
            this.resourceLoader = new ResourceLoader(this.imageResourcesUrls, this.soundResourcesUrls, this.game.pixiApp);
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