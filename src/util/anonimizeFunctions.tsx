import { EntityTypeI } from "../types/EntityType";

export type AnonimizeFunction = (str:string, type:EntityTypeI,idx:number) => string;

export const identity: AnonimizeFunction = (str) => str
export const increment: AnonimizeFunction = (_str, type, idx) => type.type+idx.toString().padStart(4, '0')
export const ofuscate: AnonimizeFunction = (str, _type, _idx) => str[0] + str.slice(1).replace(/./g,".")

export type AnonimizeFunctionName = "Não anonimizar" | "Tipo incremental" | "Ofuscação parcial"

export const functions: { [key in AnonimizeFunctionName]: AnonimizeFunction } = {
    "Não anonimizar": identity,
    "Tipo incremental": increment,
    "Ofuscação parcial": ofuscate
}