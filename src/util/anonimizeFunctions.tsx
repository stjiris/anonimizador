import { TypeNames } from "../types/EntityTypes";

export type AnonimizeFunction = (str:string, type: TypeNames,idx:number, typeIdx: number, funIdx: number) => string;

export const identity: AnonimizeFunction = (str) => str
export const increment: AnonimizeFunction = (_str, type, _idx,  tidx) => type.toString()+tidx.toString().padStart(4, '0')
export const ofuscate: AnonimizeFunction = (str) => str[0] + str.slice(1).replace(/\S/g,".")

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const leter: AnonimizeFunction = (_str, _type, _idx, _tidx, fidx) => {
    
    let leter = alphabet[fidx % alphabet.length];
    let s = leter;
    for( let i = -1; i < Math.floor(fidx / alphabet.length); i++ ){
        s+=leter;
    }

    return s
}

export const year: AnonimizeFunction = (str: string,...args) => {
    let ddmmyyyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{4})/);
    if( ddmmyyyy ){
        return "..."+ddmmyyyy[1]+"..."+ddmmyyyy[2]+ddmmyyyy[3];
    }
    let ddmmyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{1,2})/);
    if(ddmmyy){
        return "..."+ddmmyy[1]+"..."+ddmmyy[2]+ddmmyy[3];
    }

    let diaDeMesDeyyyy = str.match(/\d* de .* de (\d{4})/)
    if( diaDeMesDeyyyy ){
        return "... de ... de "+diaDeMesDeyyyy[1];
    }

    return ofuscate(str,...args);
}

export const reticiencias = () => "..."

export const processo: AnonimizeFunction = (str) => str.replace(/(.*)(\/\w)(.*)/, "$1$2...")

export const tel: AnonimizeFunction = (str) => str.replace(/.*(\d)$/,"...$1")

export type AnonimizeFunctionName = string;

export function isAnonimizeFunctionName(str: string, defaultName: AnonimizeFunctionName): AnonimizeFunctionName {
    return typeof( str ) === "string" && str in functionsWithDescription ? str as AnonimizeFunctionName : defaultName;
}


export const functionsWithDescription: { [key: string]: {fun: AnonimizeFunction, description: string}} = {
    "Não anonimizar": {
        fun: identity,
        description: ""
    },
    "Tipo incremental": {
        fun: increment,
        description: "(<tipo>0001, <tipo>0002, ...)"
    },
    "Letras incremental": {
        fun: leter,
        description: "(AA, BB, CC, ...)"
    },
    "Ofuscação parcial": {
        fun: ofuscate,
        description: "Manter 1.ª Letra e substuir restantes por ."
    },
    "Manter Ano": {
        fun: year,
        description: "(../../2023, ..-..-2023, .. de ... de 2023)"
    },
    "Ofuscação total": {
        fun: reticiencias,
        description: "..."
    },
    "Ofuscação processo": {
        fun: processo,
        description: "(134/3.6...)"
    },
    "Ofuscação tel": {
        fun: tel,
        description: "(...9)"
    }
}