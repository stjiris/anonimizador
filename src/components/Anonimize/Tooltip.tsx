import { AddEntityDryRun, EntityPool } from "../../types/EntityPool"
import { EntityTypeI, getEntityTypes } from "../../types/EntityTypes"
import { TokenSelection } from "../../types/Selection"

interface AnonimizeTooltipProps {
    entityTypes: EntityTypeI[]
    selectionWould: AddEntityDryRun | undefined
    selectionAffects: number
    selection: TokenSelection | undefined
    pool: EntityPool | undefined
}


export default function AnonimizeTooltip(props: AnonimizeTooltipProps){
    if( !props.selection || !props.pool) return <></>
    
    let sel = props.selection;
    let start = document.querySelector(`[data-offset="${sel.start}"]`);
    if(!start) return <></>;
    let rects = start.getClientRects();

    let style: React.CSSProperties = {
        position: "fixed",
        display: "block",
        bottom: window.innerHeight - rects[0].top,
        top: rects[0].top+rects[0].height,
        left: rects[0].left,
        width: "fit-content"
    };

    if( rects[0].top > window.innerHeight / 2 ){
        delete style.top;
    }
    else{
        delete style.bottom;
    }

    switch(props.selectionWould){
        case AddEntityDryRun.CHANGE_ARRAY:
            return <div style={style}>
                <div className="d-flex flex-column gap-1 bg-white p-1 border">
                    {props.entityTypes.map( (t,i) => <span key={i} role="button" className='badge text-body' style={{background: t.color}} onMouseDown={() => setType(props.pool!, sel, t)}>{t.name}</span>)}
                </div>
            </div>;
        case AddEntityDryRun.CHANGE_OFFSET:
            return <div style={style}>
                <div className="d-flex flex-column gap-1 bg-white p-1 border">
                    {props.entityTypes.map( (t,i) => <span key={i} role="button" className='badge text-body' style={{background: t.color}} onMouseDown={() => setType(props.pool!, sel, t)}>{t.name}</span>)}
                </div>
            </div>;
        case AddEntityDryRun.CHANGE_TYPE:
            return <div style={style}>
                <div className="d-flex flex-column gap-1 bg-white p-1 border">
                    <span role="button" onMouseDown={() => removeType(props.pool!, sel)}><i className='bi bi-trash'></i> Remover</span>
                    {props.entityTypes.map( (t,i) => <span key={i} role="button" className='badge text-body' style={{background: t.color}} onMouseDown={() => setType(props.pool!, sel, t)}>{t.name}</span>)}
                </div>
            </div>;
        default:
            return <></>
    }
}

function setType(pool: EntityPool, selection: TokenSelection, type: EntityTypeI){
    console.log("Setting", pool, selection, type)
    pool.removeOffset(selection.start, selection.end);
    pool.addEntity(selection.start, selection.end, selection.text, type.name);
}

function removeType(pool: EntityPool, selection: TokenSelection){
    pool.removeOffset(selection.start, selection.end)
}