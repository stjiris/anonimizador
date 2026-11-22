import { useCallback, useEffect, useState } from "react";
import { EntityTypeI } from "@/types/EntityType";
import { UserFile } from "@/core/UserFile";

export function useTypes(file: UserFile) {
    const [types, setTypes] = useState<EntityTypeI[]>(() => [...file.types]);
    const update = useCallback(() => setTypes([...file.types]), [file]);
    useEffect(() => {
        file.onTypes(update);
        return () => {
            file.offTypes(update);
        };
    }, [file, update]);
    return types;
}
