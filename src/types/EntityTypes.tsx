import { AnonimizeFunctionName, isAnonimizeFunctionName } from "../util/anonimizeFunctions";

// If changes on interface change this string
const EntityTypesVersion = "EntityTypesStored.v1.0";

export interface EntityTypeI {
    name: string,
    color: string,
    subtype?: string,
    functionName: AnonimizeFunctionName
}

export type TypeNames = "PER" | "ORG" | "DAT" | "LOC" | "PRO" | "MAT" | "CEP" | "TEL" | "EMA" | "E-MAIL" | "IDP";

export const EntityTypesDefaults: {[key in TypeNames] : EntityTypeI} = {
    PER: {name: "PER", color: "#84d2ff", functionName: "Letras incremental"},
    DAT: {name: "DAT", color: "#66fc03", functionName: "Manter Ano"},
    ORG: {name: "ORG", color: "#00ffa2", functionName: "Ofuscação total"},
    LOC: {name: "LOC", color: "#fc03c2", functionName: "Ofuscação total"},
    PRO: {name: "PRO", color: "#eb8634", functionName: "Ofuscação processo"},
    MAT: {name: "MAT", color: "#007eff", functionName: "Ofuscação total"},
    CEP: {name: "CEP", color: "#eb3434", functionName: "Ofuscação total"},
    TEL: {name: "TEL", color: "#ce42f5", functionName: "Ofuscação tel"},
    ["E-MAIL"]: {name: "E-MAIL", color: "#f5d142", functionName: "Ofuscação total"},
    EMA: {name: "EMA", color: "#f5d142", functionName: "Ofuscação total"},
    IDP: {name: "IDP", color: "#f5d142", functionName: "Ofuscação tel"}
}

const cache: {[key in TypeNames]?: EntityTypeI} = {}

export function getEntityType(label: TypeNames): EntityTypeI{
    if( cache[label] !== undefined){
        return cache[label] as EntityTypeI;
    }
    let types = getEntityTypes();
    for( let t of types ){
        cache[t.name as TypeNames] = t;
    }

    // TODO: if label doesn't exist create a stub type?
    if( cache[label] ) return cache[label]!;

    return {name: `ERRO (${label})`, color: `red`, functionName: "Não anonimizar"}
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
                color: EntityTypesDefaults[key as TypeNames].color,
                functionName: EntityTypesDefaults[key as TypeNames].functionName
            }
        }
        else{
            EntityTypesStored[key].name = key
            EntityTypesStored[key].color = isColor( EntityTypesStored[key].color, EntityTypesDefaults[key as TypeNames].color )
            EntityTypesStored[key].functionName = isAnonimizeFunctionName( EntityTypesStored[key].functionName, EntityTypesDefaults[key as TypeNames].functionName )
        }
    }

    return Object.values(EntityTypesStored);
}

export function addEntityType(key: string, color: string, functionName: AnonimizeFunctionName): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypesDefaults));
    }
    
    EntityTypesStored[key] = {
        name: key,
        color: color,
        functionName: functionName
    }

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);   
}

export function updateEntityType(key: TypeNames, color: string, functionName: AnonimizeFunctionName): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypesDefaults));
    }
    
    EntityTypesStored[key].color = color
    EntityTypesStored[key].functionName = functionName
    delete cache[key];

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function deleteEntityType(key: TypeNames): EntityTypeI[]{
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
        delete cache[key as TypeNames]
    }
    return getEntityTypes();
}

// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string){
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}