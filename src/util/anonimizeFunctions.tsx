import { TypeNames } from "../types/EntityTypes";

export type AnonimizeFunction = (str:string, type: TypeNames,idx:number) => string;

export const identity: AnonimizeFunction = (str) => str
export const increment: AnonimizeFunction = (_str, type, idx) => type.toString()+idx.toString().padStart(4, '0')
export const ofuscate: AnonimizeFunction = (str, _type, _idx) => str[0] + str.slice(1).replace(/\S/g,".")

export type AnonimizeFunctionName = "Não anonimizar" | "Tipo incremental" | "Ofuscação parcial"

export const functions: { [key in AnonimizeFunctionName]: AnonimizeFunction } = {
    "Não anonimizar": identity,
    "Tipo incremental": increment,
    "Ofuscação parcial": ofuscate
}

export function isAnonimizeFunctionName(str: string, defaultName: AnonimizeFunctionName): AnonimizeFunctionName {
    return typeof( str ) === "string" && str in functions ? str as AnonimizeFunctionName : defaultName;
}