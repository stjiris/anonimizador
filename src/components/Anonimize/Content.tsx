import { useEffect, useMemo, useRef } from 'react'
import { AnonimizeStateState } from '@/types/AnonimizeState'
import { UserFile } from '@/core/UserFile';
import { SpecificOffsetRange } from '@/types/EntityType';
import { useImages, useSpecificOffsets, useTypes, useTypesDict } from '@/hooks';
import { planAutoPageBreaks, renderBlock } from './render';
import AnonimizeTooltip from './Tooltip';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    searchResults: SpecificOffsetRange[]
    showTypes: boolean
    paginated?: boolean
}

export default function AnonimizeContent(props: AnonimizeContentProps) {
    const contentWrapperRef = useRef<HTMLDivElement>(null!);
    const nodesRef = useRef<HTMLElement[]>([]);

    const offsets = useSpecificOffsets(props.file.pool)
    const entityTypes = useTypesDict(props.file);
    const typesList = useTypes(props.file);
    const images = useImages(props.file);

    const renderOffsets = useMemo(() => {
        return [...offsets, ...props.searchResults].sort((a, b) => a.start - b.start);
    }, [props.searchResults, offsets]);

    const pageBreaks = useMemo(() => {
        return planAutoPageBreaks(props.file.doc, 2300);
    }, [props.file.doc]);

    const rawHtml = useMemo(() => {
        return renderBlock(
            props.file.doc,
            entityTypes,
            renderOffsets,
            props.anonimizeState,
            0,
            images,
            { current: 0 },
            props.paginated ? new Set(pageBreaks) : undefined
        );
    }, [props.file.doc, images, props.anonimizeState, entityTypes, renderOffsets, pageBreaks, props.paginated]);

    const normalizedHtml = useMemo(() => {
        return rawHtml
            .replace(/(?:<!--PAGEBREAK-->[\s]*){2,}/g, '<!--PAGEBREAK-->')
            .replace(/^\s*<!--PAGEBREAK-->\s*/, '')
            .replace(/\s*<!--PAGEBREAK-->\s*$/, '');
    }, [rawHtml]);

    const pages = useMemo(() => {
        return normalizedHtml
            .split(/<!--PAGEBREAK-->/g)
            .map(chunk => chunk.trim())
            .filter(chunk => chunk.length > 0);
    }, [normalizedHtml]);

    useEffect(() => {
        nodesRef.current = Array.from(
            (contentWrapperRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>) ?? []
        );
        const exportHtml = normalizedHtml.replace(/<!--PAGEBREAK-->/g, '<hr class="page-break" />');
    }, [normalizedHtml]);

    return (
        <>
            <div className={`doc-preview${props.paginated ? ' doc-preview--paginated' : ''}`}>
                <div
                    id="content"
                    className={props.showTypes ? 'show-type' : 'show-cod'}
                    ref={contentWrapperRef}
                >
                    {pages.map((chunk, i) => (
                        <div className={`page${props.paginated ? ' page--paginated' : ''}`} key={i}>
                            <div className={`page__content${props.paginated ? ' page__content--paginated' : ''}`}>
                                <div dangerouslySetInnerHTML={{ __html: chunk }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AnonimizeTooltip
                entityTypes={typesList}
                pool={props.file.pool}
                contentRef={contentWrapperRef}
                nodesRef={nodesRef}
                file={props.file}
            />
        </>
    );
}