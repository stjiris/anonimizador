import { Entity, EntityI } from "./Entity";


export interface SavedUserFile {
    name: string
    html_contents: string
    ents: EntityI[]
    imported: string
    modified: string
}

export interface UserFile {
    name: string
    html_contents: string
    ents: Entity[]
    imported: Date
    modified: Date
}


export function isOldSavedUserFile(obj: any): boolean {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string" &&
            !("imported" in obj) && !("modified" in obj);
}

export function isSavedUserFile(obj: any): obj is SavedUserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string" &&
            "imported" in obj && typeof obj.imported === "string" &&
            "modified" in obj && typeof obj.modified === "string";
}

export function isUserFile(obj: any): obj is UserFile{
    return isSavedUserFile(obj) && obj.ents.every( e => e instanceof Entity )
}

export function loadSavedUserFile(obj: SavedUserFile): UserFile {
    return {
        name: obj.name,
        html_contents: obj.html_contents,
        ents: obj.ents.map( (e,i) => Entity.makeEntity(e,i+1)),
        imported: new Date(obj.imported),
        modified: new Date(obj.modified)
    }
}