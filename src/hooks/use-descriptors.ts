import { useCallback, useEffect, useState } from "react";
import { DescriptorI } from "@/types/DescriptorType";
import { UserFile } from "@/core/UserFile";

export function useDescriptors(file: UserFile) {
    const [desc, setDesc] = useState<DescriptorI[] | undefined>(() => file.descriptors);
    const update = useCallback(() => setDesc(file.descriptors), [file]);
    useEffect(() => {
        file.onDescriptors(update);
        return () => {
            file.offDescriptors(update);
        };
    }, [file, update]);
    return desc;
}
