"use client";
import { UserFile } from "@/client-utils/UserFile";
import { useTypes } from "./uses";
import { UserFileInterface } from "@/types/UserFile";

export function EntitiesStyle({file}:{file: UserFileInterface}){
    const entityTypes = useTypes(file)
    return <style>
        {/* Generate type colors */}
        {`[data-anonimize-type$="*"]{
            background: red;
        }`}
        {Object.values(entityTypes).map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
    </style>
}