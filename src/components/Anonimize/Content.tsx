import { useEffect, useMemo, useRef } from 'react'
import { AnonimizeStateState } from '../../types/AnonimizeState'
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';
import { useImages, useSpecificOffsets, useTypesDict } from '../../util/uses';
import { renderBlock, planAutoPageBreaks } from './render';

interface AnonimizeContentProps {
  file: UserFile
  anonimizeState: AnonimizeStateState
  showTypes: boolean
  accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps) {
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLElement[]>([]);

  const offsets = useSpecificOffsets(props.file.pool)
  const entityTypes = useTypesDict(props.file);
  const images = useImages(props.file)
  const accessHtml = props.accessHtml;

  const pageBreaks = useMemo(() => {
    return planAutoPageBreaks(props.file.doc, 2300);
  }, [props.file.doc]);

  const rawHtml = useMemo(() =>
    renderBlock(
      props.file.doc,
      entityTypes,
      offsets,
      props.anonimizeState,
      0,
      images,
      { current: 0 },
      pageBreaks
    ),
    [props.file.doc, images, props.anonimizeState, entityTypes, offsets, pageBreaks]
  );

  const normalizedHtml = useMemo(() => {
    return rawHtml
      .replace(/(?:<!--PAGEBREAK-->[\s]*){2,}/g, '<!--PAGEBREAK-->')
      .replace(/^\s*<!--PAGEBREAK-->\s*/,'')
      .replace(/\s*<!--PAGEBREAK-->\s*$/,'');
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
    accessHtml(exportHtml);
  }, [normalizedHtml, accessHtml]);

  return (
    <>
      <div className="doc-preview">
        {/* Mantemos id="content" para aproveitar o teu CSS existente */}
        <div
          id="content"
          className={props.showTypes ? 'show-type' : 'show-cod'}
          ref={contentWrapperRef}
        >
          {pages.map((chunk, i) => (
            <div className="page" key={i}>
              <div className="page__content">
                <div dangerouslySetInnerHTML={{ __html: chunk }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnonimizeTooltip
        entityTypes={Object.values(entityTypes)}
        pool={props.file.pool}
        contentRef={contentWrapperRef}
        nodesRef={nodesRef}
        file={props.file}
      />
    </>
  );
}
