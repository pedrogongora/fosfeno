import { Engine } from '../../src';
import { ChaseDefaultState } from './chase-state';

window.addEventListener('load', function () {
    let engine = new Engine({
        boardWidth: 40,
        boardHeight: 22,
        enemies: 20,
        blocks: 10
    });
    document.getElementById( 'content' ).appendChild( engine.pixiApp.view );
    engine.start( new ChaseDefaultState(engine) );
});