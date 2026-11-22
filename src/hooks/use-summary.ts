import { useCallback, useEffect, useState } from "react";
import { SummaryI } from "@/types/SummaryType";
import { UserFile } from "@/core/UserFile";

export function useSummary(file: UserFile) {
    const [summary, setSummary] = useState<SummaryI[] | undefined>(() => file.summary);
    const update = useCallback(() => setSummary(file.summary), [file]);
    useEffect(() => {
        file.onSummary(update);
        return () => {
            file.offSummary(update);
        };
    }, [file, update]);
    return summary;
}
