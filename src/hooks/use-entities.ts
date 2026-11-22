import { useCallback, useEffect, useState } from "react";
import { EntityPool } from "@/types/EntityPool";

export function useEntities(pool: EntityPool) {
    const [ents, setEnts] = useState(() => [...pool.entities]);
    const update = useCallback(() => setEnts([...pool.entities]), [pool]);
    useEffect(() => {
        pool.onChange(update);
        return () => {
            pool.offChange(update);
        };
    }, [pool, update]);
    return ents;
}
