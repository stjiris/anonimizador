
export interface SaveAnonimizeImage {
    anonimizedSrc?: string
    boxes: [number, number, number, number][]
}


export interface AnonimizeImage {
    boxes: [number, number, number, number][]
    anonimizedSrc?: string
    originalSrc: string
}
