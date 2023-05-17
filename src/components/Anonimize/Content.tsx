import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom';
import { AnonimizeStateState } from '../../types/AnonimizeState'
import { Entity } from '../../types/Entity'
import { AddEntityDryRun, EntityPool } from '../../types/EntityPool'
import { TokenSelection } from '../../types/Selection'
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ReactSketchCanvas, ExportImageType } from 'react-sketch-canvas';
import { Bicon, Button } from "../../util/BootstrapIcons";
import AnonimizeToken from './Token';
import AnonimizeBlock from './Block';
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps){
    const contentRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<HTMLElement[]>([])

    let listItems: JSX.Element[] = [];
    let offset = 0;

    const ents = props.file.pool.useEntities()();
    const entityTypes = props.file.useTypes()();

    for(let i=0; i < props.file.doc.childNodes.length; i++){
        listItems.push(<AnonimizeBlock key={i} element={props.file.doc.childNodes[i]} offset={offset} types={entityTypes} ents={ents} anonimizeState={props.anonimizeState}/>)
        offset += (props.file.doc.childNodes[i].textContent?.normalize("NFKC") || "").length;
    }

    useEffect(() => {
        nodesRef.current = Array.from(contentRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>)
        props.accessHtml(contentRef.current?.innerHTML || "");
    }, [props.anonimizeState])


    
    return <>
        <div id="content" className={props.showTypes ? 'show-type' : 'show-cod'} ref={contentRef}>
            {listItems}
        </div>
        <AnonimizeTooltip entityTypes={entityTypes} pool={props.file.pool} contentRef={contentRef} nodesRef={nodesRef} />
    </>
}
