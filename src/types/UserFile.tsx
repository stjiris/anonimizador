export interface UserFileProp {
    file: UserFile
}

export interface UserFile {
    name: string
    html_contents: string
}

export function isUserFile(obj: any): obj is UserFile {
    return  "name" in obj && typeof obj.name === "string" &&
            "html_contents" in obj && typeof obj.html_contents === "string";
}
