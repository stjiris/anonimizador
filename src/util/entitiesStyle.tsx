import { UserFile } from "../types/UserFile";

export function EntitiesStyle({file}:{file: UserFile}){
    const entityTypes = file.useTypes()();
    return <style>
        {/* Generate type colors */}
        {`[data-anonimize-type$="*"]{
            background: red;
        }`}
        {entityTypes.map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
    </style>
}