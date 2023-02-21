import { TypeNames } from "./EntityTypes";

// If changes on interface change this string
const FiltersVersion = "FiltersStored.v0.0";

export interface FiltersI {
    text: string,
    types: TypeNames[]
}


const FiltersDefaults: FiltersI[] = [
    {text: "tribunal", types: [] },
    {text: "recorrid", types: [] },
    {text: "ministério público", types: [] }
]

export function getFilters(): FiltersI[]{
    let FiltersStored = JSON.parse( localStorage.getItem(FiltersVersion) || "null" );
    if( !FiltersStored ){
        localStorage.setItem(FiltersVersion, JSON.stringify(FiltersDefaults))
        return FiltersDefaults;
    }

    if( Array.isArray( FiltersStored ) ){
        let c = FiltersStored.filter( f => isFilter(f) );
        localStorage.setItem(FiltersVersion, JSON.stringify(c))
        return c;
    }

    return [];
}

export function updateFilter(prevText: string, newText: string, types: TypeNames[]): FiltersI[]{
    let filters = getFilters();
    filters.forEach( f => {
        if( f.text == prevText ){
            f.text = newText;
            f.types = types;
        }
    });

    localStorage.setItem(FiltersVersion, JSON.stringify(filters));
    return filters;
}

export function createFilter(text: string, types: TypeNames[]): FiltersI[]{
    let filters = getFilters().concat({
        text,
        types
    })

    localStorage.setItem(FiltersVersion, JSON.stringify(filters));
    return filters;   
}

export function deleteFilter(text: string): FiltersI[]{
    let filters = getFilters().filter( f => f.text !== text)
    localStorage.setItem(FiltersVersion, JSON.stringify(filters));
    return filters;   
}


export function restoreFilters(): FiltersI[]{
    localStorage.removeItem(FiltersVersion);
    return getFilters();
}

// https://stackoverflow.com/a/56266358 (adapted)
function isFilter(obj: any): obj is FiltersI {
    return typeof obj.text === "string" && Array.isArray(obj.types) ;
}