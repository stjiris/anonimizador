
export interface SaveAnonimizeImage {
    anonimizedSrc?: string
    boxes: [number, number, number, number][]
    boxColor: string
}


export interface AnonimizeImage {
    boxColor: string
    boxes: [number, number, number, number][]
    anonimizedSrc?: string
    originalSrc: string
}
