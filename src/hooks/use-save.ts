import { useCallback, useEffect, useState } from "react";
import { UserFile } from "@/core/UserFile";

export function useSave(file: UserFile) {
    const [saved, setSaved] = useState<boolean>(() => file.saved);
    const update = useCallback(() => setSaved(file.saved), [file]);
    useEffect(() => {
        file.onSave(update);
        return () => {
            file.offSave(update);
        };
    }, [file, update]);
    return saved;
}
