import { isSavedUserFile, SavedUserFile, UserFile } from "../types/UserFile"

function alertUpdateListUserFile(){
    window.dispatchEvent(new CustomEvent("AlertUpdateListUserFile"));
}

export function createUserFile(userFile: SavedUserFile): boolean{
    try{
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

export function updateUserFile(userFile: SavedUserFile): boolean{
    try{
        localStorage.setItem(userFile.name, JSON.stringify(userFile));
        return true;
    }
    catch(e){
        console.error(e);
        return false;
    }
}

export function deleteUserFile(userFile: SavedUserFile): void{
    let deletedItems: any = JSON.parse( localStorage.getItem("DELETED_FILES") || "{}" );
    let entCount = {} as Record<string, number>;
    if( userFile instanceof UserFile ){
        userFile.pool.entities.forEach(e => {
            entCount[e.type] = (entCount[e.type] || 0) + 1;
        })
    }
    else{
        userFile.ents.forEach(e => {
            entCount[e.type] = (entCount[e.type] || 0) + 1;
        })
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
