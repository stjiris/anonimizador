import { useEffect, useState } from "react";
import { AUTO_ANONIMIZE } from "../util/anonimizeFunctions";
import { updateUserFile } from "../util/UserFileCRUDL";
import { AnonimizeImage, SaveAnonimizeImage } from "./AnonimizeImage";
import { Entity, EntityI } from "./Entity";
import { EntityPool } from "./EntityPool";
import { addEntityTypeColor, EntityTypeFunction, EntityTypeI, getEntityTypeColor, restoreEntityTypesColors, updateEntityTypeColor } from "./EntityTypes";


export interface SavedUserFile {
    name: string
    html_contents: string
    functions: EntityTypeFunction[]
    ents: EntityI[]
    imported: string
    modified: string
    images: Record<number,SaveAnonimizeImage>
}

export class UserFile {
    name: string
    html_contents: string
    types: EntityTypeI[]
    pool: EntityPool
    images: Record<number,AnonimizeImage>
    imported: Date
    modified: Date
    
    typesListeners: ((types: EntityTypeI[]) => void)[]

    savedListeners: ((saved: boolean) => void)[]

    imagesListeners: ((images: Record<number,AnonimizeImage>) => void)[]
    
    saved: boolean
    doc: HTMLElement;

    constructor(obj: SavedUserFile){
        this.name = obj.name
        this.html_contents = obj.html_contents
        this.types = obj.functions.map( f => ({color: getEntityTypeColor(f.name).color, name: f.name, functionIndex: f.functionIndex}) )
        this.imported = new Date(obj.imported)
        this.modified = new Date(obj.modified)

        let dom = new DOMParser().parseFromString(this.html_contents, "text/html");
        this.doc = dom.body; 

        const text = this.doc.textContent?.normalize("NFKC");
        this.pool = new EntityPool(text || "", obj.ents.map((e,i) => Entity.makeEntity(e, i)))
        this.pool.onChange(() => this.save());

        this.typesListeners = []

        let images = Array.from(dom.getElementsByTagName("img") as HTMLCollectionOf<HTMLImageElement>)

        this.images = {};
        images.forEach((img, i) => {
            this.images[i] = {originalSrc: img.src, anonimizedSrc: obj.images[i]?obj.images[i].anonimizedSrc:undefined}
        })

        this.imagesListeners = []

        this.savedListeners = []
        this.saved = false
        this.save()
    }

    toSavedFile(): SavedUserFile{
        let savedImages = {} as Record<number, SaveAnonimizeImage>;
        Object.entries(this.images).forEach(([key, img]) => savedImages[parseInt(key)] = {anonimizedSrc: img.anonimizedSrc});
        return {
            name: this.name,
            html_contents: this.html_contents,
            functions: this.types.map( t => ({name: t.name, functionIndex: t.functionIndex})),
            ents: this.pool.entities.map(e => e.toStub()),
            imported: this.imported.toString(),
            modified: this.modified.toString(),
            images: savedImages
        }
    }

    save(): boolean{
        this.modified = new Date();

        const saved = updateUserFile(this.toSavedFile())

        this.notifySave(saved);

        return this.saved = saved
    }
    
    notifySave(saved: boolean) {
        for (let cb of this.savedListeners) {
            cb(saved);
        }
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

    addType(key: string, color: string, funcIndex: number){
        if( this.types.some( t => t.name === key ) ){
            return this.updateType(key, color, funcIndex)
        }

        addEntityTypeColor(key, color)
        this.types.push({name: key,color: color,functionIndex: funcIndex})
        this.notifyType()
        this.save()
    }

    updateType(key: string, color: string, funcIndex: number){
        let updated = false;
        for( let t of this.types ){
            if( t.name == key ){
                updated = color !== t.color || t.functionIndex !== funcIndex
                t.color = color;
                t.functionIndex = funcIndex;
                break;
            }
        }
        if( updated ){
            updateEntityTypeColor(key, color)
            this.notifyType()
            this.save()
        }
    }

    deleteType(key: string){
        if( this.pool.entities.some( e => e.type == key ) ){
            return alert("Não foi possível remover o tipo. Existem entidades com este tipo.");
        }
        this.types = this.types.filter( t => t.name !== key )
        this.notifyType();
        this.save()
    }

    resetTypes(){
        let colors = restoreEntityTypesColors();
        const types = {} as Record<string, true>;
        for( let e of this.pool.entities ){
            types[e.type] = true;
        }
        for( let c of colors ){
            types[c.name] = true
        }
        this.types = Object.keys(types).map(k => ({color: getEntityTypeColor(k).color, name: k, functionIndex: AUTO_ANONIMIZE}))
        this.notifyType()
        this.save()
    }

    notifyType(){
        for (let cb of this.typesListeners) {
            cb([...this.types]);
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

    onImages( cb: (images: Record<number,AnonimizeImage>) => void ){
        this.imagesListeners.push(cb);
    }

    offImages( cb: (images: Record<number,AnonimizeImage>) => void ){
        let idx = this.imagesListeners.findIndex((fn) => fn === cb);
        if( idx >= 0 ){
            this.savedListeners.splice(idx, 1)
        }

    }

    notifyImages(){
        for (let cb of this.imagesListeners) {
            cb({...this.images});
        }
    }

    useImages(){
        return () => {
            const [Images, setImages] = useState<Record<number,AnonimizeImage>>({...this.images})
            const update = () => setImages({...this.images})
            useEffect(() => {
                this.onImages(update)
                return () => {
                    this.offImages(update)
                }
            })
            return Images
        }
    }
}

export function isSavedUserFile(obj: any): obj is SavedUserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string" &&
            "imported" in obj && typeof obj.imported === "string" &&
            "modified" in obj && typeof obj.modified === "string" &&
            "ents" in obj && Array.isArray(obj.ents) &&
            "images" in obj &&
            "functions" in obj && Array.isArray(obj.functions);
}

export function isUserFile(obj: any): obj is UserFile{
    return obj instanceof UserFile
}
