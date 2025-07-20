import { useState } from "react";
import { UserFile } from "../../types/UserFile";
import { DescritoresModalBody } from "../../util/runRemoteDescritores";
import { Button } from "../../util/BootstrapIcons";
import { SumarizadorModalBody } from "../../util/runRemoteSumarizador";
import { ProfileI, useProfile } from "../../types/Profile";


const TOOLS = {
    "Descritores": {node: DescritoresModalBody, enabled: (profile: ProfileI) => profile.tools.descritores},
    "Sumarizador": {node: SumarizadorModalBody, enabled: (profile: ProfileI) => profile.tools.sumarizador}
} as const;

export function ToolsButton(){
    let [profile] = useProfile();
    if ( profile && !profile.tools.descritores && !profile.tools.sumarizador ) return null;
    return <Button title="Outras ferramentas" i="tools" text="Ferramentas" className="btn btn-sm text-body  alert alert-gray m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-tools" />
}

export function ToolsModalBody({ file }: { file: UserFile }) {
    let [tool, setTool] = useState<keyof typeof TOOLS | undefined>();

    let Tool = tool ? TOOLS[tool].node : ListTools.bind(null, setTool);

    return <>
        <div className="modal-header">
            <div><h4 className="modal-title" id="modal-info-label">Ferramentas</h4></div>
            {tool && <Button i="box-arrow-left" text="Voltar" className="btn btn-warning" onClick={() => setTool(undefined)} />}
        </div>
        <Tool file={file} />
    </>
}

function ListTools(setTool: (tool: keyof typeof TOOLS) => void) {
    const [profile] = useProfile();
    const availableTools = Object.keys(TOOLS).filter(t => profile ? TOOLS[t as keyof typeof TOOLS].enabled(profile) : true);
    if (availableTools.length === 0) return <div className="modal-body">Nenhuma ferramenta disponível</div>
    return <ul className="list-group">
        {Object.keys(TOOLS).filter(t => profile ? TOOLS[t as keyof typeof TOOLS].enabled(profile) : true).map(t => <li key={t} className="list-group-item d-flex justify-content-between align-items-center">
            <Button i="tools" text={t} className="btn btn-primary" onClick={() => setTool(t as keyof typeof TOOLS)} />
        </li>)}
    </ul>
}
