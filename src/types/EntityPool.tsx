import { Entity, EntityI } from "./Entity";
import { TypeNames } from "./EntityTypes";

export enum AddEntityDryRun {
    CHANGE_TYPE,
    CHANGE_OFFSET,
    CHANGE_ARRAY
}

export class EntityPool {
    entities: Entity[]
    listeners: (() => void)[]

    constructor(initial?: EntityI[]){
        this.entities = initial?.map( (e, i) => Entity.makeEntity(e, i) ) || [];
        this.listeners = [];
        this.updateOrder()
    }

    onChange(cb: () => void){
        this.listeners.push(cb);
    }

    offChange( cb: () => void ){
        let idx = this.listeners.findIndex((fn) => fn == cb);
        if( idx >= 0 ){
            this.listeners.splice(idx)
        }
    }

    updateOrder(){
        console.log("update pool")
        let counts: {[key in TypeNames]?: number } = {}

        this.entities.sort( (a,b) => a.offsets[0].start - b.offsets[0].start ).forEach( (e, i) => {
            e.index = i+1;
            if( !counts[e.type] ){
                counts[e.type] = 0;
            }
            e.typeIndex = ++counts[e.type]!;
        });
        for( let l of this.listeners ){
            console.log(l)
            l();
        }
    }

    removeEntity(startOffset: number, endOffset: number){
        let deleted = 0;
        let entsToDel = [];
        let j=0;
        for( let curr of this.entities ){
            let i = 0;
            let toDel = []
            for( let off of curr.offsets ){
                if( (off.start >= startOffset && off.start < endOffset) || (off.end >= startOffset && off.end < endOffset ) ){
                    toDel.push(i);
                }
                i++;
            }
            deleted+=toDel.length;
            if( toDel.length == curr.offsets.length ){
                entsToDel.push( j );
            }
            else{
                for( let i of toDel.reverse() ){
                    curr.offsets.splice(i, 1);
                }
            }
            j++;
        }
        for( let i of entsToDel.reverse() ){
            this.entities.splice(i, 1);
        }
        if( deleted > 0 || entsToDel.length > 0 ){
            this.updateOrder();
        }
    }

    addEntityDryRun(entity: Entity): AddEntityDryRun{
        // Loop to remove "colisions"
        for( let curr of this.entities ){
            for( let off of curr.offsets ){
                if( (entity.offsets[0].start >= off.start && entity.offsets[0].start < off.end) || (entity.offsets[0].end > off.start && entity.offsets[0].end <= off.end) ){
                    // Entity colides with existing
                    return AddEntityDryRun.CHANGE_TYPE;
                }
            }
        }

        // Loop to check similarities
        for( let curr of this.entities ){
            if( curr.id == entity.id ){
                return AddEntityDryRun.CHANGE_OFFSET;
            }
        }

        return AddEntityDryRun.CHANGE_ARRAY;
    }

    addEntity(entity: Entity){
        // Loop to remove "colisions"
        for( let curr of this.entities ){
            for( let off of curr.offsets ){
                if( (entity.offsets[0].start >= off.start && entity.offsets[0].start < off.end) || (entity.offsets[0].end > off.start && entity.offsets[0].end <= off.end) ){
                    // Entity colides with existing
                    curr.type = entity.type;
                    return;
                }
            }
        }

        let used = false;

        // Loop to check similarities
        for( let curr of this.entities ){
            if( curr.id == entity.id ){
                curr.addOffset(entity.offsets)
                used = true
            }
        }

        // Add entity to end
        if( !used ){
            this.entities.push(entity)
        }

        // sort by start offset
        this.updateOrder();
    }

}