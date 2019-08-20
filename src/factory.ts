import * as PIXI from 'pixi.js';
import { Entity,Component, Game } from './engine';
import { CollisionComponent,DestroyDeadEntityComponent,FollowComponent,HealthComponent,InputComponent,PositionComponent,SpriteComponent } from './components';


export class EntityFactory {

    private debug = false;

    constructor(
        readonly game: Game
    ) {}

    createPlayer(unavailableCells: number[]): Entity {
        let player = this.game.entityManager.createNewEntity();
        let deltaX = this.game.pixiApp.renderer.width / this.game.properties.boardWidth;
        let deltaY = this.game.pixiApp.renderer.height / this.game.properties.boardHeight;
        let numCells = this.game.properties.boardWidth * this.game.properties.boardHeight;
        
        let cellX = Math.floor( this.game.properties.boardWidth / 2 );
        let cellY = Math.floor( this.game.properties.boardHeight / 2 - 1 );
        let playerCell = cellY * this.game.properties.boardHeight + cellX;
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
            new InputComponent(false, false, false, false, false, false)
        ];
        components.forEach( (component: Component) => this.game.entityManager.addComponent(component, player));
        (<SpriteComponent>components[0]).sprites.forEach( s => this.game.pixiApp.stage.addChild(s) );
        return player;
    }

    createEnemies(player: Entity, unavailableCells: number[]): Entity[] {
        let enemies: Entity[] = [];
        let deltaX = this.game.pixiApp.renderer.width / this.game.properties.boardWidth;
        let deltaY = this.game.pixiApp.renderer.height / this.game.properties.boardHeight;
        let numCells = this.game.properties.boardWidth * this.game.properties.boardHeight;
        
        for (let i=0; i<this.game.properties.enemies; i++) {
            let enemy = this.game.entityManager.createNewEntity();

            let enemyCell = Math.floor( Math.random() * numCells );
            while ( unavailableCells.indexOf(enemyCell) != -1 ) {
                enemyCell = Math.floor( Math.random() * numCells );
            }
            unavailableCells.push( enemyCell );

            let cellX = enemyCell % this.game.properties.boardWidth;
            let cellY = Math.floor( enemyCell / this.game.properties.boardWidth );
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
            components.forEach( (component: Component) => this.game.entityManager.addComponent(component, enemy));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.game.pixiApp.stage.addChild(s) );
            enemies.push(enemy);
        }
        return enemies;
    }

    createBlocks(unavailableCells: number[]): Entity[] {
        let blocks: Entity[] = [];
        let deltaX = this.game.pixiApp.renderer.width / this.game.properties.boardWidth;
        let deltaY = this.game.pixiApp.renderer.height / this.game.properties.boardHeight;
        let numCells = this.game.properties.boardWidth * this.game.properties.boardHeight;
        
        for (let i=0; i<this.game.properties.blocks; i++) {
            let block = this.game.entityManager.createNewEntity();

            let blockCell = Math.floor( Math.random() * numCells );
            while ( unavailableCells.indexOf(blockCell) != -1 ) {
                blockCell = Math.floor( Math.random() * numCells );
            }
            unavailableCells.push( blockCell );

            let cellX = blockCell % this.game.properties.boardWidth;
            let cellY = Math.floor( blockCell / this.game.properties.boardWidth );
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
            components.forEach( (component: Component) => this.game.entityManager.addComponent(component, block));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.game.pixiApp.stage.addChild(s) );
            blocks.push(block);
        }
        return blocks;
    }

    createBoardCells(): Entity[] {
        let cells: Entity[] = [];
        let numCells = this.game.properties.boardWidth * this.game.properties.boardHeight;
        let deltaX = this.game.pixiApp.renderer.width / this.game.properties.boardWidth;
        let deltaY = this.game.pixiApp.renderer.height / this.game.properties.boardHeight;
        
        for (let i=0; i<numCells; i++) {
            let cell = this.game.entityManager.createNewEntity();
            let cellX = i % this.game.properties.boardWidth;
            let cellY = Math.floor( i / this.game.properties.boardWidth );
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
            components.forEach( (component: Component) => this.game.entityManager.addComponent(component, cell));
            (<SpriteComponent>components[0]).sprites.forEach( s => this.game.pixiApp.stage.addChild(s) );
            cells.push( cell );
        }
        return cells;
    }

    createSplat(boardX: number, boardY: number, abovePlayer: boolean = false) {
        let splat = this.game.entityManager.createNewEntity();
        let deltaX = this.game.pixiApp.renderer.width / this.game.properties.boardWidth;
        let deltaY = this.game.pixiApp.renderer.height / this.game.properties.boardHeight;
        let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/splat.png'].texture );
        pSprite.width = deltaX;
        pSprite.height = deltaY;
        pSprite.zIndex = abovePlayer ? 5 : 1;
        this.game.pixiApp.stage.addChild(pSprite);
        let components: Component[] = [
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(boardX, boardY, 0, 0)
        ];
        components.forEach( (component: Component) => this.game.entityManager.addComponent(component, splat));
        return splat;
    }
}