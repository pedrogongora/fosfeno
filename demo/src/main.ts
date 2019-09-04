import { Engine, StateTransitionDescription } from '../../src';
import * as states from './chase-state';

window.addEventListener('load', function () {
    let engine = new Engine({
        boardWidth: 40,
        boardHeight: 22,
        enemies: 20,
        blocks: 10
    });
    document.getElementById( 'content' ).appendChild( engine.pixiApp.view );

    const sts: StateTransitionDescription = {
        start: 'ChaseDefaultState',
        transitions: [
            {
                current:        'ChaseDefaultState',
                event:          'Reset',
                next:           'ChaseDefaultState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
            {
                current:        'ChaseDefaultState',
                event:          'Pause',
                next:           'ChasePauseState',
                destroyCurrent: false,
                forceNewNext:   true,
                resetEngine:    false,
                loadResources:  false
            },
            {
                current:        'ChasePauseState',
                event:          'Reset',
                next:           'ChaseDefaultState',
                destroyCurrent: true,
                forceNewNext:   true,
                resetEngine:    true,
                loadResources:  true
            },
            {
                current:        'ChasePauseState',
                event:          'Pause',
                next:           'ChaseDefaultState',
                destroyCurrent: true,
                forceNewNext:   false,
                resetEngine:    false,
                loadResources:  false
            },
        ],
        startLoadResources: true
    };
    engine.setTransitionSystem( sts, states );
    engine.start();
});