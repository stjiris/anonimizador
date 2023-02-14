import { EntityTypeI, getEntityType, TypeNames } from "./EntityTypes";
import { AnonimizeFunction, AnonimizeFunctionName, functions } from "../util/anonimizeFunctions";

export const normalizeEntityString = (str: string): string => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "");

export interface OffsetRange{
    start: number
    end: number
}

export interface EntityI {
    id: string, // internal use
    type: TypeNames
    offsets: OffsetRange[]
    offsetsLength: number // helper for Material-react-table
    previewText: string
    anonimizeFunctionName?: AnonimizeFunctionName // use this if exists else use type
}

export class Entity implements EntityI {
    id: string;
    type: TypeNames;
    offsets: OffsetRange[];
    offsetsLength: number;
    previewText: string;
    anonimizeFunctionName?: AnonimizeFunctionName;
    index: number;
    typeIndex: number;
    
    constructor(txt: string, label: string){
        this.id = normalizeEntityString(txt) + label
        this.type = label as TypeNames
        this.offsets = [];
        this.offsetsLength = 0;
        this.previewText = txt
        this.index = -1
        this.typeIndex = -1
    }

    addOffset(offset: OffsetRange[]){
        // TODO: improve this by inlining insert?
        this.offsets.push(...offset);
        this.offsets.sort( (a, b) => a.start - b.start)
        this.offsetsLength = this.offsets.length;
    }

    anonimizingFunction(): AnonimizeFunction{
        if( this.anonimizeFunctionName ){
            return functions[this.anonimizeFunctionName];
        }
        else{
            let type = getEntityType(this.type);
            return functions[type.functionName];
        }
    }

    static makeEntity(obj: EntityI, index: number): Entity {
        let e = new Entity(obj.previewText,obj.type);
        e.id = obj.id
        e.offsets = obj.offsets
        e.offsetsLength = obj.offsets.length;
        e.previewText = obj.previewText
        e.anonimizeFunctionName = obj.anonimizeFunctionName
        e.index = index
        return e;
    }
}