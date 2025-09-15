import { useEffect, useMemo, useRef } from 'react'
import { AnonimizeStateState } from '../../types/AnonimizeState'
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';
import { useImages, useSpecificOffsets, useTypesDict } from '../../util/uses';
import { renderBlock } from './render';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<HTMLElement[]>([]);

    const offsets = useSpecificOffsets(props.file.pool)
    const entityTypes = useTypesDict(props.file);
    const images = useImages(props.file)
    const accessHtml = props.accessHtml;

    const html = useMemo(() => renderBlock(props.file.doc, entityTypes, offsets, props.anonimizeState, 0, images, { current: 0 }), [props.file.doc, images, props.anonimizeState, entityTypes, offsets])

    useEffect(() => {
        nodesRef.current = Array.from(contentRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>)
        accessHtml(html);
    }, [html, accessHtml])

    return (
        <>
          <div className="doc-preview">
            <div className="page">
              <div className="page__content">
                <div
                  id="content"
                  className={props.showTypes ? 'show-type' : 'show-cod'}
                  ref={contentRef}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          </div>

          <AnonimizeTooltip
            entityTypes={Object.values(entityTypes)}
            pool={props.file.pool}
            contentRef={contentRef}
            nodesRef={nodesRef}
            file={props.file}
          />
        </>
      );
}

