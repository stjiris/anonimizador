import { useCallback, useEffect, useState } from "react";
import { UserFile } from "@/core/UserFile";

export function useArea(file: UserFile) {
    const [area, setArea] = useState<string | undefined>(() => file.area);
    const update = useCallback(() => setArea(file.area), [file]);
    useEffect(() => {
        file.onArea(update);
        return () => {
            file.offArea(update);
        };
    }, [file, update]);
    return area;
}
