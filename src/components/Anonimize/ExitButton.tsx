import { UserFile } from "@/core/UserFile";
import { Button } from "../../core/BootstrapIcons";
import { useSave } from "../../core/uses";


export function ExitButton({file, setUserFile}: {file: UserFile, setUserFile: (f: UserFile | undefined) => void}){
    let saved = useSave(file);
    return <Button className="btn red-link fw-bold m-1 p-1" onClick={() => (saved || window.confirm("Trabalho não será guardado no browser. Sair?")) ? setUserFile(undefined) : null} i="arrow-left" title="Fechar ficheiro"/>
}

export function ForceExitButton({setUserFile}: {setUserFile: (f: undefined) => void}){
    return <Button className="btn red-link fw-bold m-1 p-1" onClick={() => window.confirm("A anonimização automática será parada. Sair?") && setUserFile(undefined)} i="arrow-left" title="Fechar ficheiro"/>
}