import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom';
import { AnonimizeStateState } from '../../types/AnonimizeState'
import { Entity } from '../../types/Entity'
import { AddEntityDryRun, EntityPool } from '../../types/EntityPool'
import { EntityTypeI, getEntityType, getEntityTypes } from '../../types/EntityTypes'
import { TokenSelection } from '../../types/Selection'
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReactSketchCanvas, ExportImageType } from 'react-sketch-canvas';
import { Bicon, Button } from "../../util/BootstrapIcons";
import AnonimizeToken from './Token';
import AnonimizeBlock from './Block';
import AnonimizeTooltip from './Tooltip';


interface AnonimizeContentProps {
    doc: HTMLElement
    pool: EntityPool
    ents: Entity[]
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

interface SelectionState {
    selection: TokenSelection | undefined,
    would: AddEntityDryRun | undefined
    affects: number | undefined
}

export default function AnonimizeContent(props: AnonimizeContentProps){
    const [selection, setSelection] = useState<SelectionState>({selection: undefined, would: undefined, affects: undefined});
    const contentRef = useRef<HTMLDivElement>(null);
    const nodes = useRef<HTMLElement[]>([])

    let listItems: JSX.Element[] = [];
    let offset = 0;

    for(let i=0; i < props.doc.childNodes.length; i++){
        listItems.push(<AnonimizeBlock key={i} element={props.doc.childNodes[i]} offset={offset} ents={props.ents} anonimizeState={props.anonimizeState}/>)
        offset += (props.doc.childNodes[i].textContent?.normalize("NFKC") || "").length;
    }

    const onMouseup = (ev: React.MouseEvent<HTMLDivElement>) => {
        if(contentRef.current){
            updateSelection(ev, contentRef.current, nodes.current, props.pool, selection, setSelection)
        }
    }
    useEffect(() => {
        nodes.current = Array.from(contentRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>)
        props.accessHtml(contentRef.current?.innerHTML || "");
        window.addEventListener("mouseup", onMouseup as any)
        return () => {
            window.removeEventListener("mouseup", onMouseup as any)
        }
    }, [props.anonimizeState])


    const entityTypes = getEntityTypes();
    
    return <>
        <style>
            {/* Generate type colors */}
            {`[data-anonimize-type^="ERRO"]{
                background: red;
            }`}
            {entityTypes.map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
        </style>
        <div id="content" className={props.showTypes ? 'show-type' : 'show-cod'} ref={contentRef}>
            {listItems}
        </div>
        <AnonimizeTooltip
            entityTypes={entityTypes}
            pool={props.pool}
            selection={selection.selection}
            selectionWould={selection.would}
            selectionAffects={selection.affects || 0}
        />
    </>
}

function updateSelection(ev: React.MouseEvent<HTMLDivElement>, contentDiv: HTMLDivElement, nodes: HTMLElement[], pool: EntityPool, selection: SelectionState, setSelection: (s: SelectionState) => void){
    let sel = window.getSelection();
    if( !sel || sel.isCollapsed ){
        sel = null
    }
    else{
        let commonAncestorContainer = sel.getRangeAt(0).commonAncestorContainer;
        if( !commonAncestorContainer.contains(contentDiv) && !contentDiv.contains(commonAncestorContainer) ){
            sel = null
        }
    }
    if( sel !== null ){
        let range = sel.getRangeAt(0);
        let startOffset = parseInt(range.startContainer.parentElement?.dataset.offset || "-1");
        let endOffset = parseInt(range.endContainer.parentElement?.dataset.offset || "-1") + (range.endContainer.parentElement?.textContent?.length || 0);
        if( range.startContainer.textContent?.length == range.startOffset ){
            startOffset+=range.startOffset;
            console.log("FIXING OFF BY ONE ERROR (start)");
        }
        if( range.endOffset == 0 ){
            console.log("FIXING OFF BY ONE ERROR (end)");
            endOffset-=1;
        }
        if( startOffset >= 0 && endOffset >= 0){
            let cnodes = nodes.filter((e: HTMLElement) => parseInt(e.dataset.offset || "-1") >= startOffset && parseInt(e.dataset.offset || "-1") < endOffset )
            let sNode = cnodes[0]?.firstChild;
            let eNode = cnodes[cnodes.length-1]?.lastChild;
            if( sNode && eNode ){
                range.setStart(sNode,0);
                range.setEnd(eNode, eNode.textContent?.length || 0 );
            }
            let text = cnodes.map(e => e.textContent).join("")
            let r = pool.addEntityDryRun(startOffset, endOffset-1, text)
            setSelection({
                selection: {
                    text: text,
                    start: startOffset,
                    end: endOffset-1
                },
                would: r[0],
                affects: r[1]
            })
            return;
        }
        else{
            sel = null;
        }
    }
    if( selection.selection !== undefined ){
        setSelection({selection: undefined, affects: undefined, would: undefined})
    }
    else{
        let target = ev.target;
        if( target instanceof HTMLElement ){
            let startOffset = parseInt(target.dataset.offset || "-1");
            let iresult = pool.entitiesAt(startOffset, startOffset+1);
            let ent = iresult[0];
            if( ent ){
                let off = ent.offsets.find( off => startOffset >= off.start && startOffset < off.end );
                if( off ){
                    setSelection({
                        selection: {
                            text: pool.originalText.substring(off.start, off.end+1),
                            start: off.start,
                            end: off.end
                        },
                        would: AddEntityDryRun.CHANGE_TYPE,
                        affects: 1
                    })
                }
            }
        }
    }
}

