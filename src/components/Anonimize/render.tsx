import { AnonimizeImage } from "@/types/AnonimizeImage";
import { AnonimizeStateState } from "@/types/AnonimizeState";
import {EntityTypeI, SpecificOffsetRange, DUMMY_ENTITY_TYPE} from "@/types/EntityType";

/** Set of non-visual and script tag names that should not be rendered. */
const TAGS_TO_IGNORE = new Set([
    "script", "style", "link", "meta", "head", "html", "svg", "iframe",
    "canvas", "object", "embed", "applet", "frameset", "frame", "noembed",
    "noscript", "param", "source", "track"
]);

/** Set of void/self-closing HTML elements that must not have closing tags. */
const VOID_ELEMENTS = new Set([
    "area", "base", "br", "col", "embed", "img", "input", "link", "meta",
    "param", "source", "track", "wbr"
]);

/** Set of block tags that represent natural boundaries for page breaks. */
const SAFE_SPLIT_TAGS = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "pre", "blockquote", "figure", "img",
    "ul", "ol"
]);

/** Regular expression splitting text into numbers, words (including Latin accented characters), or symbols/whitespace. */
const TOKEN_REGEX = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;

/** Fast non-whitespace check for early-exit visible content detection. */
const NON_WHITESPACE_REGEX = /\S/;

/**
 * Checks if a page break should be consumed at the given document character position.
 * If present, removes the break from the set and returns true.
 *
 * @param pageBreaks - Active set of planned page break character offsets.
 * @param pos - Current absolute character offset in the document.
 */
function consumeBreak(pageBreaks: Set<number> | undefined, pos: number): boolean {
    if (!pageBreaks) return false;
    if (pageBreaks.has(pos)) {
        pageBreaks.delete(pos);
        return true;
    }
    return false;
}

/**
 * Checks whether a node or any of its descendants contains visible (non-whitespace) text.
 * Short-circuits immediately upon discovering the first non-whitespace character.
 *
 * @param node - The DOM node to inspect.
 */
function hasVisibleContent(node: ChildNode): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
        return NON_WHITESPACE_REGEX.test(node.nodeValue || "");
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const children = (node as HTMLElement).childNodes;
        for (let i = 0; i < children.length; i++) {
            if (hasVisibleContent(children[i])) return true;
        }
    }
    return false;
}

/**
 * Renders an entity slice, wrapping it in an interactive `<span>` in `TAGGED` mode,
 * or replacing it with its anonymized code string in `ANONIMIZED` mode.
 *
 * @param text - The text content of the entity slice.
 * @param offset - Absolute character offset where this slice starts.
 * @param anonimizeState - Current view mode.
 * @param type - Entity type configuration (name, color, function).
 * @param specificOffset - Range and entity reference metadata.
 */
function renderEntity(
    text: string,
    offset: number,
    anonimizeState: AnonimizeStateState,
    type: EntityTypeI,
    specificOffset: SpecificOffsetRange
): string {
    const style = "border-radius: 0.5em; padding: 0 0.4em;"

    if (!type) {
        // Not an entity, but still needs to be highlighted (e.g. when searching for text).
        return `<span
            style="color: white; background-color: black; ${style}"
            data-offset="${offset}"
        >${text}</span>`;
    }

    if (anonimizeState === AnonimizeStateState.ORIGINAL) {
        return text;
    }

    const anonymizedCode = specificOffset.ent.anonimizingFunction(type)(
        specificOffset.preview,
        specificOffset.ent.type,
        specificOffset.ent.index,
        specificOffset.ent.typeIndex,
        specificOffset.ent.funcIndex
    );

    if (anonimizeState === AnonimizeStateState.ANONIMIZED) {
        const isFirstSlice = specificOffset.start >= offset;
        return isFirstSlice ? anonymizedCode : "";
    }

    const span = `<span
        style="cursor: pointer; background-color: ${type.color}; ${style}"
        data-offset="${offset}"
        data-anonimize-cod="${anonymizedCode}"
        data-anonimize-type="${type.name}"
    >${text}</span>`;

    switch (anonimizeState) {
        case AnonimizeStateState.TAGGED:
            return span;
        case AnonimizeStateState.OTHERS_TAGGED:
            return type.name.startsWith("X") ? span : text;
        case AnonimizeStateState.NORMAL_TAGGED:
            return !type.name.startsWith("X") ? span : text;
        default:
            return "";
    }
}

/**
 * Tokenizes non-entity text into word and whitespace tokens wrapped in `<span data-offset="...">`
 * when in `TAGGED` mode. This enables fine-grained text selection and tooltip positioning in `Tooltip.tsx`.
 *
 * @param text - Plain text outside entity boundaries.
 * @param startOffset - Starting absolute character offset for this text slice.
 * @param anonimizeState - Current view mode.
 */
function renderNonEntityTokens(
    text: string,
    startOffset: number,
    anonimizeState: AnonimizeStateState
): string {
    if (text.length === 0) return "";
    if (anonimizeState !== AnonimizeStateState.TAGGED) {
        return text;
    }

    TOKEN_REGEX.lastIndex = 0;
    let result = "";
    let match: RegExpExecArray | null;
    while ((match = TOKEN_REGEX.exec(text)) !== null) {
        const tokenStr = match[0];
        const tokenOffset = startOffset + match.index;
        result += `<span data-offset="${tokenOffset}">${tokenStr}</span>`;
    }
    return result;
}

/**
 * Renders a DOM Text node, interleaving entity highlights and non-entity token spans.
 *
 * Text is segmented so that:
 * - Un-anonymized text is split into token spans with `data-offset` to support
 *   mouse selection in `Tooltip.tsx`.
 * - Entity ranges are wrapped in a single continuous `<span>` with metadata attributes.
 *
 * @param node - The DOM Text node to render.
 * @param entityTypes - Dictionary of entity types keyed by type name.
 * @param offsets - Sorted entity offset ranges active in this text block.
 * @param anonimizeState - Current view mode (ORIGINAL, TAGGED, ANONIMIZED, etc.).
 * @param offset - Absolute character offset of the text node in the document.
 */
function renderTextNode(
    node: ChildNode,
    entityTypes: Record<string, EntityTypeI>,
    offsets: SpecificOffsetRange[],
    anonimizeState: AnonimizeStateState,
    offset: number
): string {
    const value = node.nodeValue || "";
    if (value.length === 0) return "";

    let renderedHtml = "";
    let curIndex = 0;
    let offsetIndex = 0;

    while (curIndex < value.length) {
        // Advance past entity ranges that ended before the current character position
        while (offsetIndex < offsets.length && offsets[offsetIndex].end < offset + curIndex) {
            offsetIndex++;
        }

        const current = offsetIndex < offsets.length ? offsets[offsetIndex] : null;

        // If no further entity applies to this text node, render the rest as non-entity tokens
        if (!current || current.start >= offset + value.length) {
            renderedHtml += renderNonEntityTokens(value.substring(curIndex), offset + curIndex, anonimizeState);
            break;
        }

        const entRelStart = current.start - offset;
        const entRelEnd = current.end - offset;

        // Render any plain text occurring before the start of the entity
        if (entRelStart > curIndex) {
            renderedHtml += renderNonEntityTokens(value.substring(curIndex, entRelStart), offset + curIndex, anonimizeState);
            curIndex = entRelStart;
        }

        // Render the portion of the entity within this text node
        const endInNode = Math.min(value.length - 1, entRelEnd);
        const entityText = value.substring(curIndex, endInNode + 1);
        const entityType = entityTypes[current.ent.type];

        renderedHtml += renderEntity(entityText, offset + curIndex, anonimizeState, entityType, current);

        curIndex = endInNode + 1;
        if (endInNode === entRelEnd) {
            offsetIndex++;
        }
    }

    return renderedHtml;
}

/**
 * Renders ordered and unordered list elements (`<ol>`, `<ul>`).
 *
 * Handles pagination across list items: if a page break falls before a list item,
 * the list tag is closed, a `<!--PAGEBREAK-->` marker is inserted, and a new list
 * tag is opened with the updated `start` attribute (for `<ol>`) so numbering remains continuous.
 *
 * @param element - The HTML list element (`<ol>` or `<ul>`).
 * @param entityTypes - Dictionary of entity types.
 * @param offsets - Active entity offset ranges for this element.
 * @param anonimizeState - Current view mode.
 * @param offset - Absolute character offset of the element in the document.
 * @param images - Map of image id to anonymized image metadata.
 * @param imageIndex - Sequential counter for document images.
 * @param pageBreaks - Set of absolute offsets where page breaks should occur.
 */
function renderListElement(
    element: HTMLElement,
    entityTypes: Record<string, EntityTypeI>,
    offsets: SpecificOffsetRange[],
    anonimizeState: AnonimizeStateState,
    offset: number,
    images: Record<number, AnonimizeImage>,
    imageIndex: { current: number },
    pageBreaks?: Set<number>
): string {
    const tagName = element.nodeName.toLowerCase();
    const isOrdered = tagName === "ol";

    // Collect base attributes, excluding 'start' which is dynamically managed across page breaks
    const baseAttrs = element
        .getAttributeNames()
        .filter(a => a !== "start")
        .map(a => `${a}="${element.getAttribute(a)}"`)
        .join(" ");

    const baseStart = isOrdered ? (parseInt(element.getAttribute("start") || "1", 10) || 1) : 0;

    const openListTag = (start: number) =>
        isOrdered
            ? `<ol ${baseAttrs}${baseAttrs ? " " : ""}start="${start}">`
            : `<ul ${baseAttrs}>`;

    let renderedHtml = "";
    let suboffset = 0;
    let remainingOffsets = offsets;
    let liCount = 0;

    if (consumeBreak(pageBreaks, offset)) {
        renderedHtml += "<!--PAGEBREAK-->";
    }

    renderedHtml += openListTag(baseStart + liCount);

    const childNodes = element.childNodes;
    const childLen = childNodes.length;

    for (let i = 0; i < childLen; i++) {
        const child = childNodes[i];
        if (hasVisibleContent(child) && consumeBreak(pageBreaks, offset + suboffset)) {
            renderedHtml += `</${tagName}><!--PAGEBREAK-->${openListTag(baseStart + liCount)}`;
        }

        const size = (child.textContent || "").length;
        const lastIndex = remainingOffsets.findIndex(o => o.start > offset + suboffset + size);
        const childOffsets = lastIndex === -1 ? remainingOffsets : remainingOffsets.slice(0, lastIndex);

        if (remainingOffsets[childOffsets.length - 1] && remainingOffsets[childOffsets.length - 1].end > offset + suboffset + size) {
            remainingOffsets = remainingOffsets.slice(childOffsets.length - 1);
        } else {
            remainingOffsets = remainingOffsets.slice(childOffsets.length);
        }

        renderedHtml += renderBlock(
            child,
            entityTypes,
            childOffsets,
            anonimizeState,
            offset + suboffset,
            images,
            imageIndex,
            pageBreaks
        );

        if (child.nodeType === Node.ELEMENT_NODE &&
            (child as HTMLElement).nodeName.toLowerCase() === "li") {
            liCount++;
        }

        suboffset += size;
    }

    renderedHtml += `</${tagName}>`;
    return renderedHtml;
}

/**
 * Plans page break character offsets across a DOM tree based on an approximate character limit per page.
 * Breaks are placed at natural block boundaries (`SAFE_SPLIT_TAGS`).
 *
 * @param root - Document root node to walk.
 * @param approxCharsPerPage - Target character count per page (default: 2300).
 */
export function planAutoPageBreaks(root: ChildNode, approxCharsPerPage = 2300): Set<number> {
    const breaks = new Set<number>();
    let acc = 0;
    let globalOffset = 0;
    let pending = false;
    let lastBreak = -1;

    function walk(node: ChildNode, parentTag: string | null) {
        if (node.nodeType === Node.TEXT_NODE) {
            const len = (node.nodeValue || "").length;
            globalOffset += len;
            acc += len;
            if (acc >= approxCharsPerPage) pending = true;
            return;
        }

        if (node.nodeType === Node.COMMENT_NODE) return;

        const el = node as HTMLElement;
        const tag = el.nodeName ? el.nodeName.toLowerCase() : "";
        if (TAGS_TO_IGNORE.has(tag)) return;

        const isSafeStart =
            SAFE_SPLIT_TAGS.has(tag) && tag !== "img"
            && globalOffset > 0;

        if (pending && isSafeStart && globalOffset !== lastBreak) {
            breaks.add(globalOffset);
            lastBreak = globalOffset;
            pending = false;
            acc = 0;
        }

        if (pending && tag === "img" && globalOffset !== lastBreak) {
            breaks.add(globalOffset);
            lastBreak = globalOffset;
            pending = false;
            acc = 0;
        }

        const isListItem = tag === "li" || parentTag === "li";
        const childNodes = el.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            walk(childNodes[i], isListItem ? "li" : tag);
        }
    }

    walk(root, null);

    return breaks;
}

/**
 * Recursively serializes a DOM node tree to HTML with entity highlights,
 * inline styles, page breaks, and interactive image modal attributes.
 *
 * Dispatches:
 * - Text nodes to `renderTextNode`
 * - List elements (`<ol>`, `<ul>`) to `renderListElement`
 * - Ignored tags / comments to empty string
 * - Page breaks (`<hr>`, `data-page-break`) to `<!--PAGEBREAK-->`
 * - General container and void elements with attribute formatting
 *
 * @param doc - The DOM node to render.
 * @param entityTypes - Dictionary of entity types.
 * @param offsets - Active entity offset ranges for this node.
 * @param anonimizeState - Current view mode.
 * @param offset - Absolute character offset of the node in the document.
 * @param images - Map of image id to anonymized image metadata.
 * @param imageIndex - Sequential counter for document images.
 * @param pageBreaks - Set of absolute offsets where page breaks should occur.
 */
export function renderBlock(
    doc: ChildNode,
    entityTypes: Record<string, EntityTypeI>,
    offsets: SpecificOffsetRange[],
    anonimizeState: AnonimizeStateState,
    offset: number,
    images: Record<number, AnonimizeImage>,
    imageIndex: { current: number },
    pageBreaks?: Set<number>,
): string {
    if (doc.nodeType === Node.TEXT_NODE) {
        return renderTextNode(doc, entityTypes, offsets, anonimizeState, offset);
    }

    if (doc.nodeType === Node.COMMENT_NODE) {
        return "";
    }

    const tagName = doc.nodeName.toLowerCase();
    if (TAGS_TO_IGNORE.has(tagName)) {
        return "";
    }

    const element = doc as HTMLElement;

    if (
        tagName === "hr" ||
        element.hasAttribute("data-page-break") ||
        (element.classList?.contains?.("page-break") ?? false)
    ) {
        return "<!--PAGEBREAK-->";
    }

    if (tagName === "ol" || tagName === "ul") {
        return renderListElement(
            element,
            entityTypes,
            offsets,
            anonimizeState,
            offset,
            images,
            imageIndex,
            pageBreaks
        );
    }

    const childNodes = element.childNodes;
    const childLen = childNodes.length;

    let renderedChildren = "";
    let suboffset = 0;
    let remainingOffsets = offsets;

    for (let i = 0; i < childLen; i++) {
        const child = childNodes[i];
        if (hasVisibleContent(child) && consumeBreak(pageBreaks, offset + suboffset)) {
            renderedChildren += "<!--PAGEBREAK-->";
        }

        const size = (child.textContent || "").length;
        const lastIndex = remainingOffsets.findIndex(o => o.start > offset + suboffset + size);
        const childOffsets = lastIndex === -1 ? remainingOffsets : remainingOffsets.slice(0, lastIndex);

        if (remainingOffsets[childOffsets.length - 1] && remainingOffsets[childOffsets.length - 1].end > offset + suboffset + size) {
            remainingOffsets = remainingOffsets.slice(childOffsets.length - 1);
        } else {
            remainingOffsets = remainingOffsets.slice(childOffsets.length);
        }

        renderedChildren += renderBlock(
            child,
            entityTypes,
            childOffsets,
            anonimizeState,
            offset + suboffset,
            images,
            imageIndex,
            pageBreaks
        );
        suboffset += size;
    }

    const attrs: string[] = [];
    const href = element.getAttribute("href");
    const isLocalHref = href?.startsWith("#");

    for (const attr of element.getAttributeNames()) {
        attrs.push(`${attr}="${element.getAttribute(attr)}"`);
    }
    if (tagName === "a" && href && !isLocalHref) {
        attrs.push('target="_blank"');
    }

    if (tagName === "img") {
        attrs.push(`data-image-id="${imageIndex.current.toString()}"`);
        attrs.push(`data-bs-toggle="modal"`);
        attrs.push(`data-bs-target="#modal-image-editor"`);
        if (anonimizeState !== AnonimizeStateState.ORIGINAL) {
            if (images[imageIndex.current] && images[imageIndex.current].anonimizedSrc) {
                const srcIdx = attrs.findIndex(v => v.startsWith("src="));
                if (srcIdx !== -1) attrs.splice(srcIdx, 1);
                attrs.push(`src="${images[imageIndex.current].anonimizedSrc!}"`);
            }
        }
        imageIndex.current++;
    }

    if (VOID_ELEMENTS.has(tagName)) {
        return `<${tagName} ${attrs.join(" ")}>`;
    }

    return `<${tagName} ${attrs.join(" ")}>${renderedChildren}</${tagName}>`;
}
