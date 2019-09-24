import * as PIXI from 'pixi.js';
import { Entity,Component, Engine } from '../../src';
import { CollisionComponent,DestroyDeadEntityComponent,FollowComponent,HealthComponent,InputComponent,PositionComponent,SpriteComponent } from './components';


export class EntityFactory {

    private debug = false;

    constructor(
        readonly engine: Engine
    ) {}

    createPlayer(unavailableCells: number[]): Entity {
        let player = this.engine.entityManager.createNewEntity();
        let deltaX = this.engine.pixiApp.renderer.width / this.engine.properties.boardWidth;
        let deltaY = this.engine.pixiApp.renderer.height / this.engine.properties.boardHeight;
        let numCells = this.engine.properties.boardWidth * this.engine.properties.boardHeight;
        
        let cellX = Math.floor( this.engine.properties.boardWidth / 2 );
        let cellY = Math.floor( this.engine.properties.boardHeight / 2 - 1 );
        let playerCell = cellY * this.engine.properties.boardHeight + cellX;
        unavailableCells.push( playerCell );
        let x = cellX * deltaX;
        let y = cellY * deltaY;
        let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/cat.png'].texture );
        pSprite.width = deltaX;
        pSprite.height = deltaY;
        pSprite.zIndex = 4;
        if (this.debug) {
            let text = new PIXI.Text(`${cellX},${cellY}`, { fontSize: 15 });
            pSprite.addChild(text);
        }
        
        let components: Component[] = [
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(cellX, cellY, x, y),
            new HealthComponent(true),
            new CollisionComponent(),
            new InputComponent(false, false, false, false, false)
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, player));
        (<SpriteComponent>components[0]).sprites.forEach( s => this.engine.pixiApp.stage.addChild(s) );
        return player;
    }

    createEnemies(player: Entity, unavailableCells: number[]): Entity[] {
        let enemies: Entity[] = [];
        let deltaX = this.engine.pixiApp.renderer.width / this.engine.properties.boardWidth;
        let deltaY = this.engine.pixiApp.renderer.height / this.engine.properties.boardHeight;
        let numCells = this.engine.properties.boardWidth * this.engine.properties.boardHeight;
        
        for (let i=0; i<this.engine.properties.enemies; i++) {
            let enemy = this.engine.entityManager.createNewEntity();

            let enemyCell = Math.floor( Math.random() * numCells );
            while ( unavailableCells.indexOf(enemyCell) != -1 ) {
                enemyCell = Math.floor( Math.random() * numCells );
            }
            unavailableCells.push( enemyCell );

            let cellX = enemyCell % this.engine.properties.boardWidth;
            let cellY = Math.floor( enemyCell / this.engine.properties.boardWidth );
            let x = cellX * deltaX;
            let y = cellY * deltaY;
            let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/zombie.png'].texture );
            pSprite.width = deltaX;
            pSprite.height = deltaY;
            pSprite.zIndex = 3;
            if (this.debug) {
                let text = new PIXI.Text(`${i}:\n${cellX},${cellY}`, { fontSize: 15 });
                pSprite.addChild(text);
            }
            let components: Component[] = [
                new SpriteComponent([pSprite], 0, true),
                new PositionComponent(cellX, cellY, x, y),
                new HealthComponent(true),
                new DestroyDeadEntityComponent(true),
                new CollisionComponent(),
                new FollowComponent(player),
            ];
            components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, enemy));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.engine.pixiApp.stage.addChild(s) );
            enemies.push(enemy);
        }
        return enemies;
    }

    createBlocks(unavailableCells: number[]): Entity[] {
        let blocks: Entity[] = [];
        let deltaX = this.engine.pixiApp.renderer.width / this.engine.properties.boardWidth;
        let deltaY = this.engine.pixiApp.renderer.height / this.engine.properties.boardHeight;
        let numCells = this.engine.properties.boardWidth * this.engine.properties.boardHeight;
        
        for (let i=0; i<this.engine.properties.blocks; i++) {
            let block = this.engine.entityManager.createNewEntity();

            let blockCell = Math.floor( Math.random() * numCells );
            while ( unavailableCells.indexOf(blockCell) != -1 ) {
                blockCell = Math.floor( Math.random() * numCells );
            }
            unavailableCells.push( blockCell );

            let cellX = blockCell % this.engine.properties.boardWidth;
            let cellY = Math.floor( blockCell / this.engine.properties.boardWidth );
            let x = cellX * deltaX;
            let y = cellY * deltaY;
            let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/block.png'].texture );
            pSprite.width = deltaX;
            pSprite.height = deltaY;
            pSprite.zIndex = 1;
            if (this.debug) {
                let text = new PIXI.Text(`${i}:\n${cellX},${cellY}`, { fontSize: 15 });
                pSprite.addChild(text);
            }
            let components: Component[] = [
                new SpriteComponent([pSprite], 0, true),
                new PositionComponent(cellX, cellY, x, y),
                new CollisionComponent(),
            ];
            components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, block));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.engine.pixiApp.stage.addChild(s) );
            blocks.push(block);
        }
        return blocks;
    }

    createBoardCells(): Entity[] {
        let cells: Entity[] = [];
        let numCells = this.engine.properties.boardWidth * this.engine.properties.boardHeight;
        let deltaX = this.engine.pixiApp.renderer.width / this.engine.properties.boardWidth;
        let deltaY = this.engine.pixiApp.renderer.height / this.engine.properties.boardHeight;
        
        for (let i=0; i<numCells; i++) {
            let cell = this.engine.entityManager.createNewEntity();
            let cellX = i % this.engine.properties.boardWidth;
            let cellY = Math.floor( i / this.engine.properties.boardWidth );
            let x = cellX * deltaX;
            let y = cellY * deltaY;
            let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/square.png'].texture );
            pSprite.width = deltaX;
            pSprite.height = deltaY;
            pSprite.zIndex = 0;
            if (this.debug) {
                let text = new PIXI.Text(`${i}:\n${cellX},${cellY}`, { fontSize: 15 });
                pSprite.addChild(text);
            }

            let components: Component[] = [
                new SpriteComponent([pSprite], 0, true),
                new PositionComponent(cellX, cellY, x, y),
            ];
            components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, cell));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.engine.pixiApp.stage.addChild(s) );
            cells.push( cell );
        }
        return cells;
    }

    createSplat(boardX: number, boardY: number, abovePlayer: boolean = false) {
        let splat = this.engine.entityManager.createNewEntity();
        let deltaX = this.engine.pixiApp.renderer.width / this.engine.properties.boardWidth;
        let deltaY = this.engine.pixiApp.renderer.height / this.engine.properties.boardHeight;
        let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/splat.png'].texture );
        pSprite.width = deltaX;
        pSprite.height = deltaY;
        pSprite.zIndex = abovePlayer ? 5 : 1;
        this.engine.pixiApp.stage.addChild(pSprite);
        let components: Component[] = [
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(boardX, boardY, 0, 0)
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, splat));
        return splat;
    }

    createPauseScreen() {
        const pause = this.engine.entityManager.createNewEntity();
        const width = this.engine.pixiApp.renderer.width;
        const height = this.engine.pixiApp.renderer.height;
        const size = width < height ? width : height;
        const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/pause.png'].texture );
        pSprite.width = size;
        pSprite.height = size;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.x = width/2;
        pSprite.y = height/2;
        pSprite.zIndex = 100;
        pSprite.visible = true;
        this.engine.pixiApp.stage.addChild(pSprite);
        const component = new SpriteComponent([pSprite], 0, true);
        this.engine.entityManager.addComponent(component, pause);
        return pause;
    }
}