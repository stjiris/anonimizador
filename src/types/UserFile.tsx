import { Entity, EntityI } from "./Entity";


export interface SavedUserFile {
    name: string
    html_contents: string
    size: number
    ents: EntityI[]
}

export interface UserFile {
    name: string
    html_contents: string
    size: number
    ents: Entity[]
}

export function isSavedUserFile(obj: any): obj is SavedUserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string";
}

export function isUserFile(obj: any): obj is UserFile{
    return isSavedUserFile(obj) && obj.ents.every( e => e instanceof Entity )
}

export function loadSavedUserFile(obj: SavedUserFile): UserFile {
    return {
        name: obj.name,
        html_contents: obj.html_contents,
        size: obj.size,
        ents: obj.ents.map( (e,i) => Entity.makeEntity(e,i+1))
    }
}