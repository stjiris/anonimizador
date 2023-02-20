import { isSavedUserFile, SavedUserFile, UserFile } from "../types/UserFile"

function alertUpdateListUserFile(){
    window.dispatchEvent(new CustomEvent("AlertUpdateListUserFile"));
}

export function createUserFile(userFile: UserFile | SavedUserFile): boolean{
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

export function updateUserFile(userFile: UserFile | SavedUserFile): boolean{
    try{
        localStorage.setItem(userFile.name, JSON.stringify(userFile));
        return true;
    }
    catch(e){
        console.error(e);
        return false;
    }
}

export function deleteUserFile(userFile: UserFile | SavedUserFile): void{
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
