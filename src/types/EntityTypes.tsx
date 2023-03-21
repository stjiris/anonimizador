import { AUTO_ANONIMIZE, isAnonimizeFunctionIndex } from "../util/anonimizeFunctions";

// If changes on interface change this string
const EntityTypesVersion = "EntityTypesStored.v2.0";

export interface EntityTypeI {
    name: string,
    color: string,
    subtype?: string,
    functionIndex: number
}

export const EntityTypesDefaults: {[key: string] : EntityTypeI} = {
    PER: {name: "PER", color: "#00e2ff", functionIndex: AUTO_ANONIMIZE},
    DAT: {name: "DAT", color: "#b7ff63", functionIndex: AUTO_ANONIMIZE},
    ORG: {name: "ORG", color: "#00dbc6", functionIndex: AUTO_ANONIMIZE},
    LOC: {name: "LOC", color: "#e238ff", functionIndex: AUTO_ANONIMIZE},
    PRO: {name: "PRO", color: "#ff9800", functionIndex: AUTO_ANONIMIZE},
    MAT: {name: "MAT", color: "#526cff", functionIndex: AUTO_ANONIMIZE},
    CEP: {name: "CEP", color: "#ff4133", functionIndex: AUTO_ANONIMIZE},
    TEL: {name: "TEL", color: "#ff5f95", functionIndex: AUTO_ANONIMIZE},
    ["E-MAIL"]: {name: "E-MAIL", color: "#ffeb3b", functionIndex: AUTO_ANONIMIZE},
    IDP: {name: "IDP", color: "#69bcff", functionIndex: AUTO_ANONIMIZE},
    INST: {name: "INST", color: "#71ff77", functionIndex: AUTO_ANONIMIZE}
}

const cache: {[key: string]: EntityTypeI | undefined } = {}

export function getEntityType(label: string): EntityTypeI{
    if( cache[label] ){
        return cache[label]!;
    }
    let types = getEntityTypes();
    for( let t of types ){
        cache[t.name] = t;
    }

    if( cache[label] ) return cache[label]!;

    return {name: `${label}*`, color: "#f5d142", functionIndex: AUTO_ANONIMIZE}
}

export function getEntityTypes(): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesDefaults))
        return Object.values(EntityTypesDefaults);
    }

    for( let key in EntityTypesDefaults ){
        if( !(key in EntityTypesStored) ){
            EntityTypesStored[key] = {
                name: key,
                color: EntityTypesDefaults[key].color,
                functionName: EntityTypesDefaults[key].functionIndex
            }
        }
        else{
            EntityTypesStored[key].name = key
            EntityTypesStored[key].color = isColor( EntityTypesStored[key].color, EntityTypesDefaults[key].color )
            EntityTypesStored[key].functionIndex = isAnonimizeFunctionIndex( EntityTypesStored[key].functionIndex, EntityTypesDefaults[key].functionIndex )
        }
    }

    return Object.values(EntityTypesStored);
}

export function addEntityType(key: string, color: string, functionIndex: number): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypesDefaults));
    }
    
    EntityTypesStored[key] = {
        name: key,
        color: color,
        functionIndex: functionIndex
    }

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);   
}

export function updateEntityType(key: string, color: string, functionIndex: number): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypesDefaults));
    }
    
    EntityTypesStored[key].color = color
    EntityTypesStored[key].functionIndex = functionIndex
    delete cache[key];

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function deleteEntityType(key: string): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypesDefaults));
    }
    
    delete EntityTypesStored[key];
    delete cache[key];

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function restoreEntityTypes(): EntityTypeI[]{
    localStorage.removeItem(EntityTypesVersion);
    for(let key in cache){
        delete cache[key]
    }
    return getEntityTypes();
}

// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string){
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}