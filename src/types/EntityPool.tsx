import { Entity, EntityI, normalizeEntityString } from "./Entity";
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
                if( (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) ){
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
                curr.offsetsLength = curr.offsets.length
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

    addEntityDryRun(startOffset: number, endOffset: number, text: string): [AddEntityDryRun, number]{
        let affected = 0;
        // Loop to remove "colisions"
        for( let curr of this.entities ){
            for( let off of curr.offsets ){
                if( (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) ){
                    // Entity colides with existing
                    affected++;
                }
            }
        }
        if( affected > 0 ){
            return [AddEntityDryRun.CHANGE_TYPE, affected]
        }

        // Loop to check similarities
        for( let curr of this.entities ){
            if( normalizeEntityString(curr.previewText) == normalizeEntityString(text) ){
                affected++;
            }
        }
        if( affected > 0 ){
            return [AddEntityDryRun.CHANGE_OFFSET, affected];
        }

        return [AddEntityDryRun.CHANGE_ARRAY, affected];
    }

    addEntity(startOffset: number, endOffset: number, text: string, label: string){
        let used = false;
        // Loop to remove "colisions"
        for( let curr of this.entities ){
            for( let off of curr.offsets ){
                if( (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) ){
                    // Entity colides with existing
                    curr.type = label as TypeNames;
                    used = true;
                }
            }
        }

        if( used ) return;

        // Loop to check similarities
        for( let curr of this.entities ){
            if( curr.id == (normalizeEntityString(text) + label) ){
                curr.addOffset([{start: startOffset, end: endOffset}])
                used = true
                break;
            }
        }

        // Add entity to end
        if( !used ){
            let ent = new Entity(text, label);
            ent.addOffset([{start: startOffset, end: endOffset}])
            this.entities.push(ent)
        }

        // sort by start offset
        this.updateOrder();
    }

}