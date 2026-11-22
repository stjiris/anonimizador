import {useMemo} from "react";
import {EntityPool} from "@/types/EntityPool";
import {SpecificOffsetRange} from "@/types/EntityType";
import {useEntities} from "./use-entities";

export type { SpecificOffsetRange };

export function useSpecificOffsets(pool: EntityPool) {
    const ents = useEntities(pool);

    return useMemo(() => {
        const offsets: SpecificOffsetRange[] = [];
        ents.forEach(e => {
            e.offsets.forEach(o => {
                offsets.push({...o, ent: e});
            });
        });
        return offsets.sort((a, b) => a.start - b.start);
    }, [ents]);
}
