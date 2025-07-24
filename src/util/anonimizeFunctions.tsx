export type AnonimizeFunction = (str: string, type: string, idx: number, typeIdx: number, funIdx: number) => string;

export const identity: AnonimizeFunction = (str) => str
export const increment: AnonimizeFunction = (_str, type, _idx, tidx) => type.toString() + tidx.toString().padStart(4, '0')

export const reticiencias: AnonimizeFunction = () => "..."
export const ofuscateFirst: AnonimizeFunction = (str) => str[0] + str.slice(1).replace(/\S/g, ".")
export const ofuscateFirstTwo: AnonimizeFunction = (str) => str[0] + (str[1] || "") + str.slice(2).replace(/\S/g, ".")
export const ofuscateLast: AnonimizeFunction = (str) => str.slice(0, -1).replace(/\S/g, ".") + str[str.length - 1]
export const ofuscateLastTwo: AnonimizeFunction = (str) => str.slice(0, -2).replace(/\S/g, ".") + (str[str.length - 2] || "") + str[str.length - 1]
export const firstWord: AnonimizeFunction = (str) => str.replace(/([A-Za-zÀ-ÖØ-öø-ÿ0-9]+( d.\b)?).*/, "$1 ...")
export const matriculaLeter: AnonimizeFunction = (str) => str.replace(/[0-9]/g, '.');
export const matriculaNumber: AnonimizeFunction = (str) => str.replace(/[A-Za-z]/g, '.');

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const leter: AnonimizeFunction = (_str, _type, _idx, _tidx, fidx) => {
    let leter = alphabet[fidx % alphabet.length];
    let s = leter;
    for (let i = -1; i < Math.floor(fidx / alphabet.length); i++) {
        s += leter;
    }

    return s
}

export const year: AnonimizeFunction = (str: string, ...args) => {
    let ddmmyyyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{4})/);
    if (ddmmyyyy) {
        return "..." + ddmmyyyy[1] + "..." + ddmmyyyy[2] + ddmmyyyy[3];
    }
    let ddmmyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{1,2})/);
    if (ddmmyy) {
        return "..." + ddmmyy[1] + "..." + ddmmyy[2] + ddmmyy[3];
    }

    let diaDeMesDeyyyy = str.match(/\d* de .* de (\d{4})/)
    if (diaDeMesDeyyyy) {
        return "... de ... de " + diaDeMesDeyyyy[1];
    }

    return reticiencias(str, ...args);
}

//Anonymization technique for dates that uses "D" and "M" as placeholders for "Dia" and "Mês" respectively,
//instead of "...", leading dates to be returned in the following formats: "D/M/0000", "D-M-0000" or "D de M de 0000";
export const year2: AnonimizeFunction = (str: string, ...args) => {
    let ddmmyyyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{4})/);
    if (ddmmyyyy) {
        return "D" + ddmmyyyy[1] + "M" + ddmmyyyy[2] + ddmmyyyy[3];
    }
    let ddmmyy = str.match(/\d{1,2}(.)\d{1,2}(.)(\d{1,2})/);
    if (ddmmyy) {
        return "D" + ddmmyy[1] + "M" + ddmmyy[2] + ddmmyy[3];
    }

    let diaDeMesDeyyyy = str.match(/\d* de .* de (\d{4})/)
    if (diaDeMesDeyyyy) {
        return "D de M de " + diaDeMesDeyyyy[1];
    }

    return str;
}

export const processo: AnonimizeFunction = (str, ...args) => {
    if (str.match(/([^/]*\/[^.]*)\.(.).*/)) {
        return str.replace(/([^/]*\/[^.]*)\.(.).*/, "$1.$2...")
    }
    return reticiencias(str, ...args)
}

//Anonymization technique that uses the leters "AA" coupled with a numerical increment;
export const AA_inc: AnonimizeFunction = (_str, type, _idx, tidx) => "AA" + tidx.toString()

const moradasTypes = ['Rua', 'Avenida', 'Largo', 'Praça', 'Travessa', 'Estrada', 'Calçada', 'Alameda', 'Rotunda', 'Praceta', 'Beco', 'Viela']

export const moradas_inc: AnonimizeFunction = (str, type, _idx, tidx, funIdx) => {

    let strLow = str

    for (let morType of moradasTypes) {
        if(strLow.includes(morType) || str.includes(morType.toLowerCase())) {
            return morType.toString() + " " + tidx.toString();
        }
    }

    return "Localização " + tidx.toString();
}

export const automatic: AnonimizeFunction = (str, type, idx, typeIdx, funIdx) => {
    if (type === "PES")
        return leter(str, type, idx, typeIdx, typeIdx - 1) // overwrite funIdx, automatically only we should call it.
    if (type === "DAT")
        return year(str, type, idx, typeIdx, funIdx)
    if (type === "PRO")
        return processo(str, type, idx, typeIdx, funIdx)
    if (type === "MAT")
        return matriculaLeter(str, type, idx, typeIdx, funIdx)
    if (type === "INST")
        return firstWord(str, type, idx, typeIdx, funIdx)
    if (type === "MOR")
        return moradas_inc(str, type, idx, typeIdx, funIdx)
    console.log("Automatic function not implemented for type: " + type)
    return reticiencias(str, type, idx, typeIdx, funIdx)
}


export interface AnonimizeFunctionDescription {
    name: string,
    description: string,
    fun: AnonimizeFunction
}

export const DONT_ANONIMIZE = 0
export const AUTO_ANONIMIZE = 1
export const FULL_ANONIMIZE = 4

//To add functions and keep compability this array should only be appended
export const functionsWithDescriptionArray: AnonimizeFunctionDescription[] = [
    {
        "name": "Não anonimizar",
        "description": "Mantem a ocorrência original sem a modificar.",
        "fun": identity
    },
    {
        "name": "Automático",
        "description": "Utiliza alguma das restantes funções consoante o tipo de entidade.",
        "fun": automatic
    },
    {
        "name": "Incremental - Tipo",
        "description": "Substitui ocorrência com TIPO e o número da ocurrência. Ex: TIPO0001, TIPO0002, etc.",
        "fun": increment
    },
    {
        "name": "Incremental - Letra",
        "description": "Substitui ocorrência com duas ou mais letras. Ex: AA, BB, etc.",
        "fun": leter
    },
    {
        "name": "Ofuscação total",
        "description": "Substitui ocorrência com reticências. Ex: ...",
        "fun": reticiencias
    },
    {
        "name": "Ofuscação parcial - 1.ª Letra",
        "description": "Substitui ocorrência por ponto, mantendo a 1.ª letra. Ex: INESC => I....",
        "fun": ofuscateFirst
    },
    {
        "name": "Ofuscação parcial - 2 Letras",
        "description": "Substitui ocorrência por ponto, mantendo as primeiras 2 letras. Ex: INESC => IN...",
        "fun": ofuscateFirstTwo
    },
    {
        "name": "Ofuscação parcial - 1.ª Palavra",
        "description": "Substitui ocorrência por reticências, mantendo a 1.ª palavra. Ex: Universidade de Lisboa => Universidade de ...",
        "fun": firstWord
    },
    {
        "name": "Ofuscação parcial - Última Letra",
        "description": "Substitui ocorrência por ponto, mantendo a última letra. Ex: INESC => ....C",
        "fun": ofuscateLast
    },
    {
        "name": "Ofuscação parcial - Últimas 2 Letras",
        "description": "Substitui ocorrência por ponto, mantendo as últimas 2 letras. Ex: INESC => ...SC",
        "fun": ofuscateLastTwo
    },
    {
        "name": "Ofuscação data - Manter Ano",
        "description": "Substitui ocorrência por reticências, mantendo o ano visível. Ex: 06/06/1997 => .../.../1997",
        "fun": year
    },
    {
        "name": "Ofuscação processo - Manter início",
        "description": "Substitui ocorrência por reticências, mantendo parte inicial do processo. Ex: 27871/19.4T8LSB.L1.S1 => 27871/19.4...",
        "fun": processo
    },
    {
        "name": "Ofuscação matrícula - Manter letras",
        "description": "Substitui ocorrência por reticências, mantendo as letras da matrícula. Ex: ..-OO-..",
        "fun": matriculaLeter
    },
    {
        "name": "Ofuscação matrícula - Manter números",
        "description": "Substitui ocorrência por reticências, mantendo os números da matrícula. Ex: 00-..-..",
        "fun": matriculaNumber
    },
    //Adding the new AA increment function to the list of functions with index 14;
    {
        "name": "Incremental - AA",
        "description": "Substitui ocorrência pelas letras AA incrementadas numericamente. Ex: AA1, AA2, AA3, etc.",
        "fun": AA_inc
    },
    //Adding the new incremental function for addresses, "moradas", to the list of functions with index 15;
    {
        "name": "Incremental - Tipo de morada",
        "description": "Substitui ocorrência por tipo de morada com incremento. Ex: Rua 1, Praça 2, etc.",
        "fun": moradas_inc
    },
    //Adding the new anonymization function for dates to the list of functions with index 16;
    {
        "name": "Ofuscação data - Manter Ano (sem reticências)",
        "description": "Substitui ocorrência por D/M/YYYY, mantendo o ano visível. Ex: 06/06/1997 => D/M/1997",
        "fun": year2
    }
]

export function isAnonimizeFunctionIndex(index: number, defaultIndex: number) {
    if (index >= 0 && index < functionsWithDescriptionArray.length) return index;
    return defaultIndex;
}