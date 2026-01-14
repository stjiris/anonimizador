import { AUTO_ANONIMIZE, DONT_ANONIMIZE } from "@/core/anonimizeFunctions"

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
    "X-PES": { name: "X-PES", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    DAT: { name: "DAT", color: "#b7ff63", functionIndex: AUTO_ANONIMIZE },
    "X-DAT": { name: "X-DAT", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    ORG: { name: "ORG", color: "#00dbc6", functionIndex: AUTO_ANONIMIZE },
    "X-ORG": { name: "X-ORG", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    PART: { name: "PART", color:"#4d4a35", functionIndex: AUTO_ANONIMIZE},
    LOC: { name: "LOC", color: "#e238ff", functionIndex: AUTO_ANONIMIZE },
    "X-LOC": { name: "X-LOC", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    MOR: { name: "MOR", color: "#ffc0cb", functionIndex: AUTO_ANONIMIZE },
    PRO: { name: "PRO", color: "#ff9800", functionIndex: AUTO_ANONIMIZE },
    "X-PRO": { name: "X-PRO", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    MAT: { name: "MAT", color: "#526cff", functionIndex: AUTO_ANONIMIZE },
    "X-MAT": { name: "X-MAT", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    CEP: { name: "CEP", color: "#ff4133", functionIndex: AUTO_ANONIMIZE },
    "X-CEP": { name: "X-CEP", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    TEL: { name: "TEL", color: "#ff5f95", functionIndex: AUTO_ANONIMIZE },
    "X-TEL": { name: "X-TEL", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    "E-MAIL": { name: "E-MAIL", color: "#ffeb3b", functionIndex: AUTO_ANONIMIZE },
    "X-E-MAIL": { name: "X-E-MAIL", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    RED : { name: "RED", color: "#b59379ff", functionIndex: AUTO_ANONIMIZE },
    IDP: { name: "IDP", color: "#69bcff", functionIndex: AUTO_ANONIMIZE },
    "X-IDP": { name: "X-IDP", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    INST: { name: "INST", color: "#71ff77", functionIndex: AUTO_ANONIMIZE },
    "X-INST": { name: "X-INST", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    PROF: { name: "PROF", color: "#F7C4D8", functionIndex: AUTO_ANONIMIZE },
    "X-PROF": { name: "X-PROF", color: "#DCDCDC", functionIndex: DONT_ANONIMIZE },
    "Marca": { name: "Marca", color: "#2f4f4f", functionIndex: DONT_ANONIMIZE },
}


