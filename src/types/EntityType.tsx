import { AnonimizeFunction, AnonimizeFunctionDescription, AUTO_ANONIMIZE, DONT_ANONIMIZE, functionsWithDescriptionArray } from "@/core/anonimizeFunctions"

export interface EntityTypeI extends EntityTypeColor, EntityTypeFunction { }

export interface EntityTypeFunction {
    name: string
    functionIndex: number
}

export interface EntityTypeColor {
    name: string
    color: string
}

export const EntityTypeIVersion = "EntityTypeI.v0.1"

export const EntityTypeIDefaults: { [key: string]: EntityTypeI } = {
    PES: { name: "PES", color: "#00e2ff", functionIndex: AUTO_ANONIMIZE },
    "X-PES": { name: "X-PES", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    DAT: { name: "DAT", color: "#b7ff63", functionIndex: AUTO_ANONIMIZE },
    "X-DAT": { name: "X-DAT", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    ORG: { name: "ORG", color: "#00dbc6", functionIndex: AUTO_ANONIMIZE },
    "X-ORG": { name: "X-ORG", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    PART: { name: "PART", color: "#4d4a35", functionIndex: AUTO_ANONIMIZE },
    LOC: { name: "LOC", color: "#e238ff", functionIndex: AUTO_ANONIMIZE },
    "X-LOC": { name: "X-LOC", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    MOR: { name: "MOR", color: "#ffc0cb", functionIndex: AUTO_ANONIMIZE },
    PRO: { name: "PRO", color: "#ff9800", functionIndex: AUTO_ANONIMIZE },
    "X-PRO": { name: "X-PRO", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    MAT: { name: "MAT", color: "#526cff", functionIndex: AUTO_ANONIMIZE },
    "X-MAT": { name: "X-MAT", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    CEP: { name: "CEP", color: "#ff4133", functionIndex: AUTO_ANONIMIZE },
    "X-CEP": { name: "X-CEP", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    TEL: { name: "TEL", color: "#ff5f95", functionIndex: AUTO_ANONIMIZE },
    "X-TEL": { name: "X-TEL", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    "E-MAIL": { name: "E-MAIL", color: "#ffeb3b", functionIndex: AUTO_ANONIMIZE },
    "X-E-MAIL": { name: "X-E-MAIL", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    RED: { name: "RED", color: "#b59379ff", functionIndex: AUTO_ANONIMIZE },
    IDP: { name: "IDP", color: "#69bcff", functionIndex: AUTO_ANONIMIZE },
    "X-IDP": { name: "X-IDP", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    INST: { name: "INST", color: "#71ff77", functionIndex: AUTO_ANONIMIZE },
    "X-INST": { name: "X-INST", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    PROF: { name: "PROF", color: "#F7C4D8", functionIndex: AUTO_ANONIMIZE },
    "X-PROF": { name: "X-PROF", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    "Marca": { name: "Marca", color: "#2f4f4f", functionIndex: DONT_ANONIMIZE },
}


export const normalizeEntityString = (str: string): string => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "");

export interface OffsetRange {
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

    constructor(label: string) {
        this.type = label
        this.offsets = [];
        this.offsetsLength = 0;
        this.index = -1
        this.typeIndex = -1
        this.funcIndex = -1
    }

    addOffset(offset: OffsetRange[]) {
        // TODO: improve this by inlining insert?
        this.offsets.push(...offset);
        this.offsets.sort((a, b) => a.start - b.start)
        this.offsetsLength = this.offsets.length;
    }

    anonimizingFunction(entityType: EntityTypeFunction): AnonimizeFunction {
        return this.anonimizingFunctionDescription(entityType).fun;
    }

    anonimizingFunctionDescription(entityType: EntityTypeFunction): AnonimizeFunctionDescription {
        return this.overwriteAnonimization ?
            { name: "Valor exato", description: "", fun: () => this.overwriteAnonimization! } :
            functionsWithDescriptionArray[entityType.functionIndex];
    }

    toStub(): EntityI {
        return {
            type: this.type,
            offsets: [...this.offsets.map(o => ({ ...o }))],
            offsetsLength: this.offsetsLength,
            overwriteAnonimization: this.overwriteAnonimization
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