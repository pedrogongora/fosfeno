import { Game } from './engine';
import { ChaseDefaultState } from './chase-state';

window.addEventListener('load', function () {
    let game = new Game({
        boardWidth: 40,
        boardHeight: 22,
        enemies: 20,
        blocks: 10
    });
    document.getElementById( 'content' ).appendChild( game.pixiApp.view );
    game.start( new ChaseDefaultState(game) );
});