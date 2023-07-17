import { useEffect, useMemo, useRef } from 'react'
import { AnonimizeStateState } from '../../types/AnonimizeState'
import AnonimizeBlock from './Block';
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';
import { useEntities, useImages, useSpecificOffsets, useTypes, useTypesDict } from '../../util/uses';
import { renderBlock } from './render';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps){
    const contentRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<HTMLElement[]>([]);

    const offsets = useSpecificOffsets(props.file.pool)
    const entityTypes = useTypesDict(props.file);
    const images = useImages(props.file)

    const html = useMemo( () => renderBlock(props.file.doc, entityTypes, offsets, props.anonimizeState, 0, images, {current: 0}), [props.file.doc, images, props.anonimizeState, entityTypes, offsets])
    
    useEffect(() => {
        nodesRef.current = Array.from(contentRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>)
        props.accessHtml(html);
    },[html])

    return <>
        <div id="content" className={props.showTypes ? 'show-type' : 'show-cod'} ref={contentRef} dangerouslySetInnerHTML={{__html: html}}></div>
        <AnonimizeTooltip entityTypes={Object.values(entityTypes)} pool={props.file.pool} contentRef={contentRef} nodesRef={nodesRef} />
    </>
}

