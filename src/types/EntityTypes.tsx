import { AUTO_ANONIMIZE, isAnonimizeFunctionIndex } from "../util/anonimizeFunctions"
import { isProfileI } from "./Profile"

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
    DAT: { name: "DAT", color: "#b7ff63", functionIndex: AUTO_ANONIMIZE },
    ORG: { name: "ORG", color: "#00dbc6", functionIndex: AUTO_ANONIMIZE },
    LOC: { name: "LOC", color: "#e238ff", functionIndex: AUTO_ANONIMIZE },
    PRO: { name: "PRO", color: "#ff9800", functionIndex: AUTO_ANONIMIZE },
    MAT: { name: "MAT", color: "#526cff", functionIndex: AUTO_ANONIMIZE },
    CEP: { name: "CEP", color: "#ff4133", functionIndex: AUTO_ANONIMIZE },
    TEL: { name: "TEL", color: "#ff5f95", functionIndex: AUTO_ANONIMIZE },
    "E-MAIL": { name: "E-MAIL", color: "#ffeb3b", functionIndex: AUTO_ANONIMIZE },
    IDP: { name: "IDP", color: "#69bcff", functionIndex: AUTO_ANONIMIZE },
    INST: { name: "INST", color: "#71ff77", functionIndex: AUTO_ANONIMIZE },
    PROF: { name: "PROF", color: "#F7C4D8", functionIndex: AUTO_ANONIMIZE }
}

const _type_color_cache: { [key: string]: EntityTypeI | undefined } = {}

export function getEntityTypeI(label: string): EntityTypeI {
    if (_type_color_cache[label]) {
        return _type_color_cache[label]!;
    }
    let types = getEntityTypeIs();
    console.log(types)
    for (let t of types) {
        _type_color_cache[t.name] = t;
    }

    if (_type_color_cache[label]) return _type_color_cache[label]!;

    const color = randBrightColor();
    const functionIndex = AUTO_ANONIMIZE;
    addEntityTypeI(label, color, functionIndex)
    return { name: `${label}`, color, functionIndex }
}

// https://stackoverflow.com/a/43195379/2573422
function randBrightColor() {
    let c = "hsl(" + 360 * Math.random() + ',' +
        (25 + 70 * Math.random()) + '%,' +
        (85 + 10 * Math.random()) + '%)'
    let div = document.createElement("div");
    div.style.backgroundColor = c;
    let rgb = div.style.backgroundColor;
    let [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) || [127, 127, 127]) as string[];
    return `#${parseFloat(r).toString(16).padStart(2, "0")}${parseFloat(g).toString(16).padStart(2, "0")}${parseFloat(b).toString(16).padStart(2, "0")}`;
}

export function getEntityTypeIs(): EntityTypeI[] {
    let EntityTypesStored = JSON.parse(localStorage.getItem(EntityTypeIVersion) || "null");
    if (!EntityTypesStored) {
        let profile = JSON.parse(localStorage.getItem("ProfileI.v0.1") || "null");
        if (isProfileI(profile)) {
            let ents = Object.entries(profile.defaultEntityTypes).map(([key, value]) => ({ name: key, color: value.color, functionIndex: value.functionIndex }))
            let stored = Object.fromEntries(ents.map(e => [e.name, e]))
            localStorage.setItem(EntityTypeIVersion, JSON.stringify(stored))
            return ents;
        }
        localStorage.setItem(EntityTypeIVersion, JSON.stringify(EntityTypeIDefaults))
        return Object.values(EntityTypeIDefaults);
    }

    for (let key in EntityTypeIDefaults) {
        if (!(key in EntityTypesStored)) {
            EntityTypesStored[key] = {
                name: key,
                color: EntityTypeIDefaults[key].color,
                functionIndex: EntityTypeIDefaults[key].functionIndex
            }
        }
        else {
            EntityTypesStored[key].name = key
            EntityTypesStored[key].color = isColor(EntityTypesStored[key].color, EntityTypeIDefaults[key].color)
            EntityTypesStored[key].functionIndex = isAnonimizeFunctionIndex(EntityTypesStored[key].functionIndex, EntityTypeIDefaults[key].functionIndex)
        }
    }

    return Object.values(EntityTypesStored);
}

export function addEntityTypeI(key: string, color: string, functionIndex: number): EntityTypeI[] {
    let EntityTypesStored = JSON.parse(localStorage.getItem(EntityTypeIVersion) || "null");
    if (!EntityTypesStored) {
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeIDefaults));
    }

    EntityTypesStored[key] = {
        name: key,
        color: color,
        functionIndex: functionIndex
    }

    localStorage.setItem(EntityTypeIVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function updateEntityTypeI(key: string, color: string, functionIndex: number): EntityTypeI[] {
    let EntityTypesStored = JSON.parse(localStorage.getItem(EntityTypeIVersion) || "null");
    if (!EntityTypesStored) {
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeIDefaults));
    }

    if(!(key in EntityTypesStored)){
        EntityTypesStored[key] = {name: key, color: color, functionIndex: functionIndex}
    }
    else{
        EntityTypesStored[key].name = key
        EntityTypesStored[key].color = color
        EntityTypesStored[key].functionIndex = functionIndex
        delete _type_color_cache[key];
    }

    localStorage.setItem(EntityTypeIVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function deleteEntityTypeI(key: string): EntityTypeI[] {
    let EntityTypesStored = JSON.parse(localStorage.getItem(EntityTypeIVersion) || "null");
    if (!EntityTypesStored) {
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeIDefaults));
    }

    delete EntityTypesStored[key];
    delete _type_color_cache[key];

    localStorage.setItem(EntityTypeIVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function restoreEntityTypesColors(): EntityTypeI[] {
    localStorage.removeItem(EntityTypeIVersion);
    for (let key in _type_color_cache) {
        delete _type_color_cache[key]
    }
    return getEntityTypeIs();
}

// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}