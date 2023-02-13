import { AnonimizeFunction, AnonimizeFunctionName, functions } from "../util/anonimizeFunctions";
import { EntityTypeI, _EntityType } from "./EntityType"

export const normalizeEntityString = (str: string): string => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "");

export interface OffsetRange{
    start: number
    end: number
}

export interface EntityI {
    id: string, // internal use
    type: EntityTypeI
    offsets: OffsetRange[]
    previewText: string
    anonimize: boolean
    anonimizeFunctionName: AnonimizeFunctionName
}

export interface AnonimizedEntityI extends EntityI{
    anonimize: true
    anonimizeFunctionName: AnonimizeFunctionName
}

export interface ExposedEntityI extends EntityI{
    anonimize: false
    anonimizeFunctionName: "Não anonimizar"
}

export class Entity implements EntityI {
    id: string;
    type: EntityTypeI;
    offsets: OffsetRange[];
    previewText: string;
    anonimize: boolean = true
    anonimizeFunctionName = "Tipo incremental" as AnonimizeFunctionName
    index: number;
    
    constructor(txt: string, label: string){
        this.id = normalizeEntityString(txt) + label
        this.type = {type: label as _EntityType, subtype: ""}
        this.offsets = [];
        this.previewText = txt
        this.index = -1
    }

    addOffset(offset: OffsetRange[]){
        // TODO: improve this by inlining insert?
        this.offsets.push(...offset);
        this.offsets.sort( (a, b) => a.start - b.start)
    }

    anonimizingFunction(): AnonimizeFunction{
        return functions[this.anonimizeFunctionName]
    }

    static makeEntity(obj: EntityI, index: number): Entity {
        let e = new Entity("","");
        e.id = obj.id
        e.type = obj.type
        e.offsets = obj.offsets
        e.previewText = obj.previewText
        e.anonimize = obj.anonimize
        e.anonimizeFunctionName = obj.anonimizeFunctionName
        e.index = index
        return e;
    }
}