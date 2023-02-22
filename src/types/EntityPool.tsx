import { AnonimizeFunctionName } from "../util/anonimizeFunctions";
import { Entity, EntityI, normalizeEntityString, OffsetRange } from "./Entity";
import { TypeNames } from "./EntityTypes";

export enum AddEntityDryRun {
    CHANGE_TYPE,
    CHANGE_OFFSET,
    CHANGE_ARRAY
}

export class EntityPool {
    entities: Entity[]
    originalText: string
    listeners: (() => void)[]
    
    constructor(text:string, initial?: EntityI[]){
        this.entities = initial?.map( (e, i) => Entity.makeEntity(e, i) ) || [];
        this.listeners = [];
        this.originalText = text;
        this.updateOrder()
    }

    onChange(cb: () => void){
        this.listeners.push(cb);
    }

    offChange( cb: () => void ){
        let idx = this.listeners.findIndex((fn) => fn === cb);
        if( idx >= 0 ){
            this.listeners.splice(idx, 1)
        }
    }

    joinEntities(indexes: number[]) {
        if( indexes.length <= 1 ) return;
        indexes.sort((a,b) => a-b) // indexes are sorted

        let first: Entity = this.entities[indexes.shift()!];
        let removed: OffsetRange[] = []
        indexes.reverse().forEach( i => {
            let cEnt = this.entities.splice(i, 1)[0];
            removed.push( ...cEnt.offsets )
        })

        first.addOffset(removed);
        first.offsetsLength = first.offsets.length;
        this.updateOrder();
    }

    splitEntities(indexes: number[]) {
        if( indexes.length === 0 ) return;
        let newEnt: Entity[] = [];
        this.entities.forEach( (ent, i) => {
            if( indexes.indexOf(i) === -1 || ent.offsets.length <= 1 ) return newEnt.push(ent);

            let otherOffs = ent.offsets.splice(1); // Changes current ent
            for( let off of otherOffs ){
                let nent = new Entity(ent.type);
                nent.addOffset([off]);
                newEnt.push(nent);
            }
            ent.offsetsLength = ent.offsets.length;
            newEnt.push(ent);
        });

        this.entities = newEnt;
        this.updateOrder();
    }

    removeEntities(indexes: number[]) {
        if( indexes.length === 0 ) return;
        indexes.sort((a,b) => a-b).reverse().forEach( i => {
            this.entities.splice(i, 1);
        }) // indexes are sorted

        this.updateOrder();
    }


    notify(){
        for( let l of this.listeners ){
            l();
        }
    }

    updateOrder(){
        let typeCounts: {[key in TypeNames]?: number } = {}
        let funcCounts: {[key in AnonimizeFunctionName]?: number } = {}

        this.entities.sort( (a,b) => a.offsets[0].start - b.offsets[0].start ).forEach( (e, i) => {
            e.index = i+1;
            if( !typeCounts[e.type] ){
                typeCounts[e.type] = 0;
            }
            e.typeIndex = ++typeCounts[e.type]!;
            let name = e.anonimizingFunctionName();
            if( !funcCounts[name] ){
                funcCounts[name] = 0;
            }
            e.funcIndex = funcCounts[name]!++;
        });
        this.notify()
    }

    expandCollapse(startOffset: number, endOffset: number, text: string) {
        let update = false;
        for( let e of this.entities ){
            let i = e.offsets.findIndex( off => (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) );
            if( i >= 0 ){
                e.offsets[i] = {start: startOffset, end: endOffset, preview: text};
                update = true;
                break;
            }
        }
        if( update ) this.notify()
    }

    splitOffset(startOffset: number, endOffset: number) {
        let newEnt: Entity[] = [];
        this.entities.forEach( (ent) => {
            let toSplit = []
            let i = 0;
            console.log(ent);
            for( let off of ent.offsets ){
                if( (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) ){
                    toSplit.push(i);
                }
                i++;
            }
            let splitted: OffsetRange[] = [];
            toSplit.reverse().forEach(j => {
                splitted.push(...ent.offsets.splice(j,1));
                ent.offsetsLength--;
            })
            if( ent.offsets.length > 0 ){
                newEnt.push(ent);
            }
            for( let sp of splitted ){
                let nent = new Entity(ent.type);
                nent.addOffset([sp]);
                newEnt.push(nent);
            }
        });
        this.entities = newEnt;
        this.updateOrder();
    }

    removeOffset(startOffset: number, endOffset: number){
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
            if( toDel.length === curr.offsets.length ){
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

    entitiesAt(startOffset: number, endOffset: number): Entity[]{
        let r = []
        for( let curr of this.entities ){
            for( let off of curr.offsets ){
                if( (off.start >= startOffset && off.end < endOffset) || (off.start < endOffset && off.end >= startOffset) ){
                    // Entity colides with existing
                    r.push(curr);
                    break; // Next entity
                }
                if( off.end > startOffset ){
                    break;
                }
            }
        }
        return r;
    }

    addEntityDryRun(startOffset: number, endOffset: number, text: string): [AddEntityDryRun, number]{
        let affected = this.entitiesAt(startOffset, endOffset).length;
        if( affected > 0 ){
            return [AddEntityDryRun.CHANGE_TYPE, affected]
        }

        let normed = normalizeEntityString(text)
        // Loop to check similarities
        for( let curr of this.entities ){
            if( curr.offsets.some( off => normalizeEntityString(off.preview) === normalizeEntityString(text) ) ){
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
        for(let ent of this.entitiesAt(startOffset, endOffset)){
            ent.type = label as TypeNames;
            used = true;
        }

        if( used ) return this.notify();

        let normed = normalizeEntityString(text)+label
        // Loop to check similarities
        for( let curr of this.entities ){
            if( curr.offsets.some( off => normalizeEntityString(off.preview)+curr.type === normed ) ){
                curr.addOffset([{start: startOffset, end: endOffset, preview: text}])
                used = true
            }
        }

        // Add entity to end
        if( !used ){
            let ent = new Entity(label);
            ent.addOffset([{start: startOffset, end: endOffset, preview: text}])
            this.entities.push(ent)
        }

        // sort by start offset
        this.updateOrder();
    }

}