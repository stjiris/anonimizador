"use client";
import { useTypes } from "./uses";
import { UserFileInterface } from "@/types/UserFileInterface";

export function EntitiesStyle({ file }: { file: UserFileInterface }) {
    const entityTypes = useTypes(file)

    return <style>
        {/* Generate type colors */}
        {`[data-anonimize-type$="*"]{
            background: red;
        }`}
        {entityTypes.map(({ name, color }) => `[data-anonimize-type="${name}"]{background:${color}}`)}
        {entityTypes.flatMap(type => type.subtypes?.map(s => `[data-anonimize-type="${s.name}"]{background:${s.color}}`) ?? [])}
    </style>
}