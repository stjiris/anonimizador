import { UserFile } from "../types/UserFile";
import { useTypes } from "./uses";

export function EntitiesStyle({file}:{file: UserFile}){
    const entityTypes = useTypes(file)
    return <style>
        {/* Generate type colors */}
        {`[data-anonimize-type$="*"]{
            background: red;
        }`}
        {Object.values(entityTypes).map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
    </style>
}