import { useState } from "react";
import { UserFile } from "../../types/UserFile";
import { DescritoresModalBody } from "../../util/runRemoteDescritores";
import { Button } from "../../util/BootstrapIcons";


const TOOLS = {
    "Descritores": DescritoresModalBody,
} as const;

export function ToolsModalBody({ file }: { file: UserFile }) {
    let [tool, setTool] = useState<keyof typeof TOOLS | undefined>();

    let Tool = tool ? TOOLS[tool] : ListTools.bind(null, setTool);

    return <>
        <div className="modal-header">
            <div><h4 className="modal-title" id="modal-info-label">Ferramentas</h4></div>
            {tool && <Button i="box-arrow-left" text="Voltar" className="btn btn-warning" onClick={() => setTool(undefined)} />}
        </div>
        <Tool file={file} />
    </>
}

function ListTools(setTool: (tool: keyof typeof TOOLS) => void) {
    return <ul className="list-group">
        {Object.keys(TOOLS).map(t => <li key={t} className="list-group-item d-flex justify-content-between align-items-center">
            <Button i="tools" text={t} className="btn btn-primary" onClick={() => setTool(t as keyof typeof TOOLS)} />
        </li>)}
    </ul>
}
