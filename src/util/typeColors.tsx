import { _EntityType } from "../types/EntityType";

// defaults
// to add an entity go to ../types/EntityType.tsx
export const typeColors: { [key in _EntityType]: string} = {
    PER: "#84d2ff",
    CEP: "red",
    DAT: "yellow",
    EMA: "green",
    LOC: "blue",
    MAT: "orange",
    ORG: "black",
    PRO: "cyan",
    TEL: "magenta"
}

let storedColors = JSON.parse( localStorage.getItem("typeColors") || "null" );

if( storedColors ){
    for( let key in typeColors ){
        if( key in typeColors ){
            typeColors[key as _EntityType] = isColor( storedColors[key], typeColors[key as _EntityType] );
        }
    }
}

localStorage.setItem("typeColors", JSON.stringify(typeColors));


// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string){
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}

export function updateColor(key: _EntityType, color: string){
    typeColors[key] = isColor( color, typeColors[key] );
    localStorage.setItem("typeColors", JSON.stringify(typeColors));
}