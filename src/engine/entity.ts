
import { GameProperties } from './gameprops';
import { EventQueue } from './events';
import { Component, ComponentClassName } from './component';


export class Entity {

    readonly id: number;

    constructor(id: number) {
        this.id = id;
    }

    toString(): string {
        return 'entity#' + this.id;
    }

}


export class EntitySignature {
    
    private entityManager: EntityManager;
    private callbackContext: any;
    requiredComponents: ComponentClassName<Component>[];
    optionalComponents: ComponentClassName<Component>[];

    constructor(entityManager: EntityManager, requiredComponents: ComponentClassName<Component>[], optionalComponents?: ComponentClassName<Component>[], callbackContext?: any) {
        this.entityManager = entityManager;
        this.requiredComponents = requiredComponents;
        this.optionalComponents = optionalComponents ? optionalComponents : [];
        this.callbackContext = callbackContext;
    }

    forEach(callback: (entity: Entity, ...args: Component[]) => void, context?: any) {
        let entities = this.entityManager.getEntitiesWithComponentOfClass(this.requiredComponents[0]);

        entities.forEach((entity: Entity) => {
            const fetchComponent = (componentClass: ComponentClassName<Component>) => { return this.entityManager.getEntityComponentOfClass(componentClass, entity) };
            const required = this.requiredComponents.map(fetchComponent).filter(component => { return component !== undefined });
            if ( required.length != this.requiredComponents.length ) return;
            const optional = this.optionalComponents.map(fetchComponent);
            const args = ([entity] as any[]).concat(required).concat(optional);
            const ctx = context ? context : this.callbackContext;
            callback.apply( ctx, args );
        });
    }

}


export class EntityManager {

    private entities: number[];
    private componentsByClass: Map<string, Component[]>;
    private lowestUnassignedId: number;
    private properties: GameProperties;
    private eventQueue: EventQueue;

    constructor(properties: GameProperties, eventQueue: EventQueue) {
        this.entities = [];
        this.componentsByClass = new Map<string, Component[]>();
        this.lowestUnassignedId = 1;
        this.properties = properties;
        this.eventQueue = eventQueue;
    }

    private generateNewId(): number {
        if (this.lowestUnassignedId < Number.MAX_SAFE_INTEGER) {
            return this.lowestUnassignedId++;
        } else {
            for(let i=1; i<Number.MAX_SAFE_INTEGER; i++) {
                if (this.entities.indexOf(i) >= 0) {
                    return i;
                }
            }
            throw Error(`Reached max number of Entities (${Number.MAX_SAFE_INTEGER})`);
        }
    }

    createNewEntity(): Entity {
        let id = this.generateNewId();
        let entity = new Entity(id);
        this.entities.push( id );
        return entity;
    }

    addComponent(component: Component, toEntity: Entity) {
        let components: Component[];
        this.componentsByClass.keys()
        if ( this.componentsByClass.has( component.constructor.name ) ) {
            components = this.componentsByClass.get( component.constructor.name );
        } else {
            components = [];
            this.componentsByClass.set( component.constructor.name, components );
        }
        components[toEntity.id] = component;
    }

    getEntityComponentOfClass<C>(className: ComponentClassName<C>, forEntity: Entity): Component {
        return this.componentsByClass.get( className.name )[forEntity.id];
    }

    getEntityComponents(forEntity: Entity): Component[] {
        let result: Component[] = [];
        for (let components of this.componentsByClass.values()) {
            if (components[forEntity.id]) {
                result.push(components[forEntity.id]);
            }
        }
        return result;
    }

    getComponentsOfClass<C>(className: ComponentClassName<C>): Component[] {
        return this.componentsByClass.get( className.name );
    }

    removeEntity(entity: Entity) {
        for ( let className of this.componentsByClass.keys() ) {
            let components = this.componentsByClass.get(className);
            if (components[entity.id]) {
                delete components[entity.id];
            }
        }
        this.entities = this.entities.filter((id => { return id != entity.id }));
        console.log(`removed ${entity} from entityManager`);
    }

    removeAllEntities() {
        this.entities = [];
        this.lowestUnassignedId = 1;
        this.componentsByClass = new Map<string, Component[]>();
    }

    getEntitiesWithComponentOfClass<C>(className: ComponentClassName<C>): Entity[] {
        let entities: Entity[] = [];
        let components: Component[];

        if ( this.componentsByClass.has( className.name ) ) {
            components = this.componentsByClass.get( className.name );
        } else {
            components = [];
        }

        let keys = Object.keys( components );
        for ( let key of keys ) {
            entities.push(new Entity( parseInt(key) ));
        }

        return entities;
    }

}