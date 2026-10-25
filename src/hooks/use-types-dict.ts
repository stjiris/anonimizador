import { useCallback, useEffect, useState } from "react";
import { EntityTypeI } from "@/types/EntityType";
import { UserFile } from "@/core/UserFile";

export function useTypesDict(file: UserFile) {
    const getTypes = useCallback(() => {
        const obj: Record<string, EntityTypeI> = {};
        file.types.forEach(t => {
            obj[t.name] = t;
            t.subtypes?.forEach(s => { obj[s.name] = s; });
        });
        return obj;
    }, [file]);
    const [types, setTypes] = useState<Record<string, EntityTypeI>>(getTypes);
    const update = useCallback(() => setTypes(getTypes()), [getTypes]);
    useEffect(() => {
        file.onTypes(update);
        return () => {
            file.offTypes(update);
        };
    }, [file, update]);
    return types;
}
