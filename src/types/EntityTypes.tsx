
export interface EntityTypeI extends EntityTypeColor, EntityTypeFunction{}

export interface EntityTypeFunction {
    name: string
    functionIndex: number
}

export interface EntityTypeColor{
    name: string
    color: string
}

const EntityTypeColorVersion = "EntityTypeColor.v0.1"

export const EntityTypeColorDefaults: {[key: string]: EntityTypeColor} = {
    PES: {name: "PES", color: "#00e2ff"},
    DAT: {name: "DAT", color: "#b7ff63"},
    ORG: {name: "ORG", color: "#00dbc6"},
    LOC: {name: "LOC", color: "#e238ff"},
    PRO: {name: "PRO", color: "#ff9800"},
    MAT: {name: "MAT", color: "#526cff"},
    CEP: {name: "CEP", color: "#ff4133"},
    TEL: {name: "TEL", color: "#ff5f95"},
    ["E-MAIL"]: {name: "E-MAIL", color: "#ffeb3b"},
    IDP: {name: "IDP", color: "#69bcff"},
    INST: {name: "INST", color: "#71ff77"},
    PROF: {name: "PROF", color: "#F7C4D8"}
}

const _type_color_cache: {[key: string]: EntityTypeColor | undefined } = {}

export function getEntityTypeColor(label: string): EntityTypeColor{
    if( _type_color_cache[label] ){
        return _type_color_cache[label]!;
    }
    let types = getEntityTypeColors();
    for( let t of types ){
        _type_color_cache[t.name] = t;
    }

    if( _type_color_cache[label] ) return _type_color_cache[label]!;

    const color = randBrightColor()
    addEntityTypeColor(label, color)
    return {name: `${label}`, color: color}
}

// https://stackoverflow.com/a/43195379/2573422
function randBrightColor(){ 
    let c = "hsl(" + 360 * Math.random() + ',' +
               (25 + 70 * Math.random()) + '%,' + 
               (85 + 10 * Math.random()) + '%)'
    let div = document.createElement("div");
    div.style.backgroundColor = c;
    let rgb = div.style.backgroundColor;
    let [r,g,b] = (rgb.match(/\d+(\.\d+)?/g) || [127,127,127]) as string[];
    return `#${parseFloat(r).toString(16).padStart(2,"0")}${parseFloat(g).toString(16).padStart(2,"0")}${parseFloat(b).toString(16).padStart(2,"0")}`;
}

export function getEntityTypeColors(): EntityTypeColor[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypeColorVersion) || "null" );
    if( !EntityTypesStored ){
        localStorage.setItem(EntityTypeColorVersion, JSON.stringify(EntityTypeColorDefaults))
        return Object.values(EntityTypeColorDefaults);
    }

    for( let key in EntityTypeColorDefaults ){
        if( !(key in EntityTypesStored) ){
            EntityTypesStored[key] = {
                name: key,
                color: EntityTypeColorDefaults[key].color
            }
        }
        else{
            EntityTypesStored[key].name = key
            EntityTypesStored[key].color = isColor( EntityTypesStored[key].color, EntityTypeColorDefaults[key].color )
        }
    }

    return Object.values(EntityTypesStored);
}

export function addEntityTypeColor(key: string, color: string): EntityTypeColor[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypeColorVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeColorDefaults));
    }
    
    EntityTypesStored[key] = {
        name: key,
        color: color
    }

    localStorage.setItem(EntityTypeColorVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);   
}

export function updateEntityTypeColor(key: string, color: string): EntityTypeColor[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypeColorVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeColorDefaults));
    }
    
    EntityTypesStored[key].color = color
    delete _type_color_cache[key];

    localStorage.setItem(EntityTypeColorVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function deleteEntityTypeColor(key: string): EntityTypeColor[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypeColorVersion) || "null" );
    if( !EntityTypesStored ){
        EntityTypesStored = JSON.parse(JSON.stringify(EntityTypeColorDefaults));
    }
    
    delete EntityTypesStored[key];
    delete _type_color_cache[key];

    localStorage.setItem(EntityTypeColorVersion, JSON.stringify(EntityTypesStored));
    return Object.values(EntityTypesStored);
}

export function restoreEntityTypesColors(): EntityTypeColor[]{
    localStorage.removeItem(EntityTypeColorVersion);
    for(let key in _type_color_cache){
        delete _type_color_cache[key]
    }
    return getEntityTypeColors();
}

// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string){
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}