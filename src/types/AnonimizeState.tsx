export const enum AnonimizeStateState {
    ORIGINAL = "Original", // Shows original file without any marks
    TAGGED = "Edição", // Shows entities highlights
    ANONIMIZED = "Anonimizado" // Shows file without entities
}

export const enum AnonimizeVisualState {
    ORIGINAL   = "Visualizar - Original", // Shows original file without any marks
    TYPES      = "Editar - Tipos", // Shows entities highlights
    REPLACE    = "Editar - Subsituições", // Shows entities highlights
    ANONIMIZED = "Visualizar - Anonimização" // Shows file without entities
}