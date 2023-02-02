import { AnonimizableEnt } from "./EntType";


export interface UserFile {
    name: string
    html_contents: string
    size: number
    ents: AnonimizableEnt[]
}

export function isUserFile(obj: any): obj is UserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string";
}
