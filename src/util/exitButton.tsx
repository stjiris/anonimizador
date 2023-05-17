import { UserFile } from "../types/UserFile";
import { Button } from "./BootstrapIcons";


export function ExitButton({file, setUserFile}: {file: UserFile, setUserFile: (f: UserFile | undefined) => void}){
    let saved = file.useSave()()
    return <Button className="btn red-link fw-bold m-1 p-1" onClick={() => (saved || window.confirm("Trabalho não será guardado no browser. Sair?")) ? setUserFile(undefined) : null} i="arrow-left" title="Fechar ficheiro"/>
}