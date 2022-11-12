import { isUserFile, UserFile } from "../types/UserFile"

function alertUpdateListUserFile(){
    window.dispatchEvent(new CustomEvent("AlertUpdateListUserFile"));
}

export function createUserFile(userFile: UserFile): void{
    localStorage.setItem(userFile.name, JSON.stringify(userFile));
    alertUpdateListUserFile();
}

export function readUserFile(name: string): UserFile | null {
    let maybeUser = localStorage.getItem(name);
    if( maybeUser == null ) return null;
    try{
        let objectUser = JSON.parse(maybeUser);
        if( !isUserFile(objectUser) ) return null;
    
        return objectUser;
    }
    catch(e){
        // JSON.parse error on something not UserFile
        return null;
    }
}

export function updateUserFile(userFile: UserFile): void{
    localStorage.setItem(userFile.name, JSON.stringify(userFile));
}

export function deleteUserFile(userFile: UserFile): void{
    localStorage.removeItem(userFile.name);
    alertUpdateListUserFile();
}

export function listUserFile(): UserFile[]{
    let userFileList = [];
    for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if( name != null ){
            let userFile = readUserFile(name);
            if( userFile != null ){
                userFileList.push(userFile);
            }
        }
    }
    return userFileList;
}
