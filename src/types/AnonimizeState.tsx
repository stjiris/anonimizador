export const enum AnonimizeStateState {
    ORIGINAL = "Original", // Shows original file without any marks
    TAGGED = "Edição", // Shows entities highlights
    ANONIMIZED = "Anonimizado" // Shows file without entities
}

export interface AnonimizeStateCombined{
    state: AnonimizeStateState,
    showTypes: boolean
}

export const enum AnonimizeVisualState {
    ORIGINAL   = "Ver - Forma inicial", // Shows original file without any marks
    TYPES      = "Editar - Tipos", // Shows entities highlights
    REPLACE    = "Editar - Subsituições", // Shows entities highlights
    ANONIMIZED = "Ver - Anonimização" // Shows file without entities
}

export function getAnonimizedStateCombined(from: AnonimizeVisualState): AnonimizeStateCombined{
    let showTypes: boolean = false;
    let anonimizeState: AnonimizeStateState = AnonimizeStateState.TAGGED;
    switch(from){
        case AnonimizeVisualState.ANONIMIZED:
            anonimizeState = AnonimizeStateState.ANONIMIZED;
            break;
        case AnonimizeVisualState.ORIGINAL:
            anonimizeState = AnonimizeStateState.ORIGINAL;
            break;
        case AnonimizeVisualState.TYPES:
            showTypes = true;
        case AnonimizeVisualState.REPLACE:
            anonimizeState = AnonimizeStateState.TAGGED;
    }
    return {
        showTypes: showTypes,
        state: anonimizeState
    }
}