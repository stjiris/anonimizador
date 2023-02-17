import { TypeNames } from "../types/EntityTypes";

export type AnonimizeFunction = (str:string, type: TypeNames,idx:number, typeIdx: number, funIdx: number) => string;

export const identity: AnonimizeFunction = (str) => str
export const increment: AnonimizeFunction = (_str, type, _idx,  tidx) => type.toString()+tidx.toString().padStart(4, '0')
export const ofuscate: AnonimizeFunction = (str, _type, _idx) => str[0] + str.slice(1).replace(/\S/g,".")

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const leter: AnonimizeFunction = (_str, _type, _idx, _tidx, fidx) => {
    
    let leter = alphabet[fidx % alphabet.length];
    let s = leter;
    for( let i = -1; i < Math.floor(fidx / alphabet.length); i++ ){
        s+=leter;
    }

    return s
}

export type AnonimizeFunctionName = "Não anonimizar" | "Tipo incremental" | "Ofuscação parcial" | "Letras incremental";

export const functions: { [key in AnonimizeFunctionName]: AnonimizeFunction } = {
    "Não anonimizar": identity,
    "Tipo incremental": increment,
    "Letras incremental": leter,
    "Ofuscação parcial": ofuscate
}

export function isAnonimizeFunctionName(str: string, defaultName: AnonimizeFunctionName): AnonimizeFunctionName {
    return typeof( str ) === "string" && str in functions ? str as AnonimizeFunctionName : defaultName;
}