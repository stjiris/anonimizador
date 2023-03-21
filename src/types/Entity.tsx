import { identity } from "lodash";
import { AnonimizeFunction, AnonimizeFunctionDescription, functionsWithDescriptionArray } from "../util/anonimizeFunctions";
import { getEntityType } from "./EntityTypes";

export const normalizeEntityString = (str: string): string => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "");

export interface OffsetRange{
    start: number
    end: number
    preview: string
}

export interface EntityI {
    type: string
    offsets: OffsetRange[]
    offsetsLength: number // helper for Material-react-table
    overwriteAnonimization?: string // use this if exists else use type
}

export class Entity implements EntityI {
    type: string;
    offsets: OffsetRange[];
    offsetsLength: number;
    overwriteAnonimization?: string;
    index: number;
    typeIndex: number;
    funcIndex: number;
    
    constructor(label: string){
        this.type = label
        this.offsets = [];
        this.offsetsLength = 0;
        this.index = -1
        this.typeIndex = -1
        this.funcIndex = -1
    }

    addOffset(offset: OffsetRange[]){
        // TODO: improve this by inlining insert?
        this.offsets.push(...offset);
        this.offsets.sort( (a, b) => a.start - b.start)
        this.offsetsLength = this.offsets.length;
    }

    anonimizingFunction(): AnonimizeFunction{
        if( this.overwriteAnonimization ){
            return () => this.overwriteAnonimization!;
        }
        else{
            let type = getEntityType(this.type);
            if( !type ) return identity;
            return functionsWithDescriptionArray[type.functionIndex].fun;
        }
    }

    anonimizingFunctionDescription(): AnonimizeFunctionDescription{
        if( this.overwriteAnonimization ){
            return {name: "Valor exato", description:"", fun: () => this.overwriteAnonimization! };
        }
        else{
            let type = getEntityType(this.type);
            return functionsWithDescriptionArray[type.functionIndex];
        }
    }

    static makeEntity(obj: EntityI, index: number): Entity {
        let e = new Entity(obj.type);
        e.offsets = obj.offsets
        e.offsetsLength = obj.offsets.length;
        e.overwriteAnonimization = obj.overwriteAnonimization
        e.index = index
        return e;
    }
}