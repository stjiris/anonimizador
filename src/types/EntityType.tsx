export const EntityTypes = ["PER","ORG","DAT","LOC","PRO","MAT","CEP","TEL","EMA"] as const;
export type _EntityType = typeof EntityTypes[number];


export interface EntityTypeI {
    type: _EntityType,
    subtype?: string
}

export interface EntityTypePerI extends EntityTypeI {
    type: "PER",
    subtype: "TESTEMUNHA" | "VITIMA" | ""
}

export function isPer(obj: EntityTypeI): obj is EntityTypePerI {
    return obj.type == "PER" && "subtype" in obj && typeof(obj.subtype) == "string" && (obj.subtype == "TESTEMUNHA" || obj.subtype == "VITIMA" || obj.subtype == "")
}
