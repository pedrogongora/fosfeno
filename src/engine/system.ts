import { Engine } from './engine';
import { Entity, EntitySignature } from './entity';
import { Component, ComponentClassName } from './component';
import { GameEvent } from './events';


export interface RenderableSystem extends System {
    render(): void;
}


export abstract class System {
    protected engine: Engine;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    abstract stage(): void;

    abstract update(delta: number): void;

    abstract cleanup(): void;

    abstract unstage(): void;

    abstract destroy(): void;

    protected getEntityComponentOfClass<C>(className: ComponentClassName<C>, forEntity: Entity): Component {
        return this.engine.entityManager.getEntityComponentOfClass(className, forEntity);
    }

    protected getEntityComponents(forEntity: Entity): Component[] {
        return this.engine.entityManager.getEntityComponents(forEntity);
    }

    protected getComponentsOfClass<C>(className: ComponentClassName<C>): Component[] {
        return this.engine.entityManager.getComponentsOfClass(className);
    }

    protected getEntitiesWithComponentOfClass<C>(className: ComponentClassName<C>): Entity[] {
        return this.engine.entityManager.getEntitiesWithComponentOfClass(className);
    }

    protected subscribeToEvents(subscriptions: [string,((event: GameEvent) => void)][]) {
        subscriptions.forEach(([eventType, callback]) => { this.engine.eventQueue.subscribe(eventType, callback) });
    }

    protected subscribeToEventForImmediateAttendance(subscriptions: [string,((event: GameEvent) => void)][]) {
        subscriptions.forEach(([eventType, callback]) => { this.engine.eventQueue.subscribeForImmediateAttendance(eventType, callback) });
    }

    protected unsubscribeToEvent(eventType: string, callback: (event: GameEvent) => void) {
        this.engine.eventQueue.unsubscribe( eventType, callback );
    }

    protected publishEvent(event: GameEvent) {
        this.engine.eventQueue.publish(event);
    }

    protected getEntitiesBySignature(requiredComponents: ComponentClassName<Component>[], optionalComponents?: ComponentClassName<Component>[]) {
        return new EntitySignature(this.engine.entityManager, requiredComponents, optionalComponents, this);
    }
}