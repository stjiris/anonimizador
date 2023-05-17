import { useEffect, useState } from "react";
import { updateUserFile } from "../util/UserFileCRUDL";
import { Entity, EntityI } from "./Entity";
import { EntityPool } from "./EntityPool";
import { EntityTypeFunction, EntityTypeI, getEntityTypeColor } from "./EntityTypes";


export interface SavedUserFile {
    name: string
    html_contents: string
    functions: EntityTypeFunction[]
    ents: EntityI[]
    imported: string
    modified: string
}

export class UserFile {
    name: string
    html_contents: string
    types: EntityTypeI[]
    pool: EntityPool
    imported: Date
    modified: Date
    
    typesListeners: ((types: EntityTypeI[]) => void)[]

    savedListeners: ((saved: boolean) => void)[]
    
    saved: boolean
    doc: HTMLElement;

    constructor(obj: SavedUserFile){
        this.name = obj.name
        this.html_contents = obj.html_contents
        this.types = obj.functions.map( f => ({color: getEntityTypeColor(f.name).color, name: f.name, functionIndex: f.functionIndex}) )
        this.imported = new Date(obj.imported)
        this.modified = new Date(obj.modified)

        this.doc = new DOMParser().parseFromString(this.html_contents, "text/html").body;

        const text = this.doc.textContent?.normalize("NFKC");
        this.pool = new EntityPool(text || "", obj.ents.map((e,i) => Entity.makeEntity(e, i)))
        this.pool.onChange(() => this.save());

        this.savedListeners = []
        this.saved = false
        this.save()

        this.typesListeners = []
    }

    save(): boolean{
        this.modified = new Date();

        const saved = updateUserFile({
            name: this.name,
            html_contents: this.html_contents,
            functions: this.types.map( t => ({name: t.name, functionIndex: t.functionIndex})),
            ents: this.pool.entities.map(e => e.toStub()),
            imported: this.imported.toString(),
            modified: this.modified.toString()
        } as SavedUserFile)

        for( let cb of this.savedListeners ){
            cb(saved)
        }

        return this.saved = saved
    }
    
    onSave(cb: (saved: boolean) => void){
        this.savedListeners.push(cb);
    }

    offSave( cb: (saved: boolean) => void ){
        let idx = this.savedListeners.findIndex((fn) => fn === cb);
        if( idx >= 0 ){
            this.savedListeners.splice(idx, 1)
        }
    }

    useSave(){
        return () => {
            const [saved, setSaved] = useState<boolean>(this.saved)
            const update = () => setSaved(this.saved)
            useEffect(() => {
                this.onSave(update);
                return () => {
                    this.offSave(update);
                }
            }, [this.saved])
            return saved;  
        }
    }

    onTypes( cb: (types: EntityTypeI[]) => void ){
        this.typesListeners.push(cb);
    }

    offTypes( cb: (types: EntityTypeI[]) => void ){
        let idx = this.typesListeners.findIndex((fn) => fn === cb);
        if( idx >= 0 ){
            this.savedListeners.splice(idx, 1)
        }

    }

    useTypes(){
        return () => {
            const [types, setTypes] = useState<EntityTypeI[]>([...this.types])
            const update = () => setTypes([...this.types])
            useEffect(() => {
                this.onTypes(update)
                return () => {
                    this.offTypes(update)
                }
            })
            return types
        }
    }
}

export function isSavedUserFile(obj: any): obj is SavedUserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string" &&
            "imported" in obj && typeof obj.imported === "string" &&
            "modified" in obj && typeof obj.modified === "string" &&
            "ents" in obj && Array.isArray(obj.ents) &&
            "functions" in obj && Array.isArray(obj.functions);
}

export function isUserFile(obj: any): obj is UserFile{
    return obj instanceof UserFile
}
