import { useCallback, useEffect, useState } from "react";
import { AnonimizeImage } from "../types/AnonimizeImage";
import { EntityPool } from "../types/EntityPool";
import { EntityTypeI } from "../types/EntityTypes";
import { UserFile } from "../types/UserFile";


export function useEntities(pool: EntityPool){
    const [ents, setEnts] = useState([...pool.entities])
    const update = useCallback(() => setEnts([...pool.entities]), [pool])
    useEffect(() => {
        pool.onChange(update);
        return () => {
            pool.offChange(update);
        }
    }, [pool, update])
    return ents;
}

export function useImages(file: UserFile){
    const [images, setImages] = useState<Record<number,AnonimizeImage>>({...file.images})
    const update = useCallback(() => setImages({...file.images}),[file])
    useEffect(() => {
        file.onImages(update)
        return () => {
            file.offImages(update)
        }
    }, [file, update])
    return images
}

export function useTypes(file: UserFile){
    const [types, setTypes] = useState<EntityTypeI[]>([...file.types])
    const update = useCallback(() => setTypes([...file.types]),[file])
    useEffect(() => {
        file.onTypes(update)
        return () => {
            file.offTypes(update)
        }
    }, [file, update])
    return types
}