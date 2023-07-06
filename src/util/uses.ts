import { useCallback, useEffect, useMemo, useState } from "react";
import { AnonimizeImage } from "../types/AnonimizeImage";
import { Entity, OffsetRange } from "../types/Entity";
import { EntityPool } from "../types/EntityPool";
import { EntityTypeI } from "../types/EntityTypes";
import { UserFile } from "../types/UserFile";

export function useEntities(pool: EntityPool){
    const [ents, setEnts] = useState(() => [...pool.entities])
    const update = useCallback(() => setEnts([...pool.entities]), [pool])
    useEffect(() => {
        pool.onChange(update);
        return () => {
            pool.offChange(update);
        }
    }, [pool, update])
    return ents;
}

export interface SpecificOffsetRange extends OffsetRange {
    ent: Entity
}

export function useSpecificOffsets(pool: EntityPool){
    const ents = useEntities(pool);
    const specific = useMemo(() => {
        const offsets: SpecificOffsetRange[] = [];
        ents.forEach( e => {
            e.offsets.forEach( o => {
                offsets.push({...o, ent: e})
            })
        })
        return offsets.sort((a, b) => a.start - b.start);
    }, [ents])
    return specific;
}

export function useImages(file: UserFile){
    const [images, setImages] = useState<Record<number,AnonimizeImage>>(() => ({...file.images}))
    const update = useCallback(() => setImages({...file.images}),[file])
    useEffect(() => {
        file.onImages(update)
        return () => {
            file.offImages(update)
        }
    }, [file, update])
    return images
}

export function useTypesDict(file: UserFile){
    const getTypes = useCallback(() => {
        let obj: Record<string, EntityTypeI> = {};
        file.types.forEach( t => obj[t.name] = t)
        return obj;
    },[file])
    const [types, setTypes] = useState<Record<string, EntityTypeI>>(getTypes)
    const update = useCallback(() => setTypes(getTypes()),[file])
    useEffect(() => {
        file.onTypes(update)
        return () => {
            file.offTypes(update)
        }
    }, [file, update])
    return types
}

export function useTypes(file: UserFile){
    const [types, setTypes] = useState<EntityTypeI[]>(() => [...file.types])
    const update = useCallback(() => setTypes([...file.types]),[file])
    useEffect(() => {
        file.onTypes(update)
        return () => {
            file.offTypes(update)
        }
    }, [file, update])
    return types
}


export function useSave(file: UserFile){
    const [saved, setSaved] = useState<boolean>(() => file.saved)
    const update = useCallback(() => setSaved(file.saved), [file])
    useEffect(() => {
        file.onSave(update);
        return () => {
            file.offSave(update);
        }
    }, [file])
    return saved;  
}