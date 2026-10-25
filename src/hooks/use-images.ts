import { useCallback, useEffect, useState } from "react";
import { AnonimizeImage } from "@/types/AnonimizeImage";
import { UserFile } from "@/core/UserFile";

export function useImages(file: UserFile) {
    const [images, setImages] = useState<Record<number, AnonimizeImage>>(() => ({ ...file.images }));
    const update = useCallback(() => setImages({ ...file.images }), [file]);
    useEffect(() => {
        file.onImages(update);
        return () => {
            file.offImages(update);
        };
    }, [file, update]);
    return images;
}
