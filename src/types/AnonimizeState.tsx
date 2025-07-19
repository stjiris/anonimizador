export const enum AnonimizeStateState {
    ORIGINAL = "Original", // Shows original file without any marks
    TAGGED = "Edição - Todos", // Shows entities highlights
    ANONIMIZED = "Anonimizado", // Shows file without entities
    OTHERS_TAGGED = "Edição - Outros", // Shows other entities highlights
    NORMAL_TAGGED = "Edição - Normais" // Shows normal entities highlights
}

export interface AnonimizeStateCombined {
    state: AnonimizeStateState,
    showTypes: boolean
}

export const enum AnonimizeVisualState {
    ORIGINAL = "Ver - Forma inicial", // Shows original file without any marks
    ALL_TYPES = "Editar - Tipos - Todos", // Shows all types of entities
    OTHER_TYPES = "Editar - Tipos - Outros", // Shows other types of entities
    NORMAL_TYPES = "Editar - Tipos - Normais", // Shows normal types of entities
    REPLACE = "Editar - Subsituições", // Shows entities highlights
    ANONIMIZED = "Ver - Anonimização" // Shows file without entities
}

export function getAnonimizedStateCombined(from: AnonimizeVisualState): AnonimizeStateCombined {
    let showTypes: boolean = false;
    let anonimizeState: AnonimizeStateState = AnonimizeStateState.TAGGED;
    switch (from) {
        case AnonimizeVisualState.ANONIMIZED:
            anonimizeState = AnonimizeStateState.ANONIMIZED;
            break;
        case AnonimizeVisualState.ORIGINAL:
            anonimizeState = AnonimizeStateState.ORIGINAL;
            break;
        case AnonimizeVisualState.ALL_TYPES:
            showTypes = true;
            anonimizeState = AnonimizeStateState.TAGGED;
            break;
        case AnonimizeVisualState.OTHER_TYPES:
            showTypes = true;
            anonimizeState = AnonimizeStateState.OTHERS_TAGGED;
            break;
        case AnonimizeVisualState.NORMAL_TYPES:
            showTypes = true;
            anonimizeState = AnonimizeStateState.NORMAL_TAGGED;
            break;
        case AnonimizeVisualState.REPLACE:
            anonimizeState = AnonimizeStateState.TAGGED;
            break;
    }
    return {
        showTypes: showTypes,
        state: anonimizeState
    }
}