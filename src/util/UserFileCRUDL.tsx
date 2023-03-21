import { EntityI } from "../types/Entity";
import { isOldSavedUserFile, isSavedUserFile, SavedUserFile, UserFile } from "../types/UserFile"
import { getEntityTypes } from "../types/EntityTypes";

function alertUpdateListUserFile(){
    window.dispatchEvent(new CustomEvent("AlertUpdateListUserFile"));
}

export function createUserFile(userFile: UserFile | SavedUserFile): boolean{
    try{
        userFile.imported = userFile.modified = new Date()
        localStorage.setItem(userFile.name, JSON.stringify(userFile));
        alertUpdateListUserFile();
        return true;
    }
    catch(e){
        console.error(e);
        return false;
    }
}

export function readSavedUserFile(name: string): SavedUserFile | null {
    let maybeUser = localStorage.getItem(name);
    if( maybeUser == null ) return null;
    try{
        let objectUser = JSON.parse(maybeUser);
        if( !isSavedUserFile(objectUser) ) return null;
    
        return objectUser;
    }
    catch(e){
        // JSON.parse error on something not UserFile
        return null;
    }
}

export function updateUserFile(userFile: UserFile | SavedUserFile): boolean{
    try{
        userFile.modified = new Date();
        localStorage.setItem(userFile.name, JSON.stringify(userFile));
        return true;
    }
    catch(e){
        console.error(e);
        return false;
    }
}

export function deleteUserFile(userFile: UserFile | SavedUserFile): void{
    let deletedItems: any = JSON.parse( localStorage.getItem("DELETED_FILES") || "{}" );
    let entCount: any = {}
    for (let e of getEntityTypes()) {
        entCount[e.name] = userFile.ents.filter(t => t.type === e.name).length
    }
    deletedItems[userFile.name] = {
        name: userFile.name,
        imported: userFile.imported,
        modified: userFile.modified,
        entCount: entCount
    }
    localStorage.setItem("DELETED_FILES", JSON.stringify(deletedItems))

    localStorage.removeItem(userFile.name);
    alertUpdateListUserFile();
}

export function listUserFile(): SavedUserFile[]{
    let userFileList = [];
    for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if( name != null ){
            let userFile = readSavedUserFile(name);
            if( userFile != null ){
                userFileList.push(userFile);
            }
        }
    }
    return userFileList;
}

export function updateSavedUserFiles(): void{
    for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if( name != null ){
            let maybeFile = localStorage.getItem(name);
            if( maybeFile !== null ){
                try{
                    let maybeOldFile = JSON.parse(maybeFile);
                    let file = updateOldSavedUserFile(maybeOldFile);
                    if( file ){
                        localStorage.setItem(name, JSON.stringify(file))
                    }
                }
                catch(e){
                    console.log(e);
                }
            }
        }
    }
    alertUpdateListUserFile();
}

updateSavedUserFiles();

export function updateOldSavedUserFile(obj: any): SavedUserFile | null{
    if( !isOldSavedUserFile(obj) ) return null;

    let text = new DOMParser().parseFromString(obj.html_contents, "text/html").body.textContent || "";
    return {
        name: obj.name,
        html_contents: obj.html_contents,
        ents: obj.ents.map( (e: EntityI) => ({
            type: e.type,
            offsets: e.offsets.map(off => ({start: off.start, end: off.end, preview: text.substring(off.start, off.end+1)})),
            offsetsLength: e.offsets.length,
            overwriteAnonimization: e.overwriteAnonimization
        })),
        imported: new Date().toString(),
        modified: new Date().toString()
    }
}