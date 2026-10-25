import { AnonimizeImage } from "@/types/AnonimizeImage";
import { AnonimizeStateState } from "@/types/AnonimizeState";
import { EntityTypeI, SpecificOffsetRange } from "@/types/EntityType";

const TAGS_TO_IGNORE = new Set([
    "script", "style", "link", "meta", "head", "html", "svg", "iframe",
    "canvas", "object", "embed", "applet", "frameset", "frame", "noembed",
    "noscript", "param", "source", "track"
]);

const VOID_ELEMENTS = new Set([
    "area", "base", "br", "col", "embed", "img", "input", "link", "meta",
    "param", "source", "track", "wbr"
]);

const SAFE_SPLIT_TAGS = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "pre", "blockquote", "figure", "img",
    "ul", "ol"
]);

const TOKEN_REGEX = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;
const NON_WHITESPACE_REGEX = /\S/;

function consumeBreak(pageBreaks: Set<number> | undefined, pos: number): boolean {
    if (!pageBreaks) return false;
    if (pageBreaks.has(pos)) {
        pageBreaks.delete(pos);
        return true;
    }
    return false;
}

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
    const elmt = doc;

    if (elmt.nodeType === Node.TEXT_NODE) {
        const value = elmt.nodeValue || "";
        if (value.length === 0) return "";

        TOKEN_REGEX.lastIndex = 0;
        let tokenFragment = "";
        let token: RegExpExecArray | null;
        let remaining = offsets;

        while ((token = TOKEN_REGEX.exec(value)) !== null) {
            const tokenStr = token[0];
            const tokenStart = offset + token.index;
            const current = remaining[0];
            if (!current) {
                tokenFragment += renderToken(tokenStr, tokenStart, anonimizeState);
                continue;
            }
            if (current.end < tokenStart + tokenStr.length) {
                remaining = remaining.slice(1);
            }
            if (current.start > tokenStart) {
                tokenFragment += renderToken(tokenStr, tokenStart, anonimizeState);
            } else {
                tokenFragment += renderToken(
                    tokenStr,
                    tokenStart,
                    anonimizeState,
                    entityTypes[current.ent.type],
                    current
                );
            }
        }
        return tokenFragment;
    }

    if (elmt.nodeType === Node.COMMENT_NODE) {
        return "";
    }

    const Tag = elmt.nodeName.toLowerCase();
    if (TAGS_TO_IGNORE.has(Tag)) {
        return "";
    }

    const elmtElmt: HTMLElement = elmt as HTMLElement;

    if (
        Tag === "hr" ||
        elmtElmt.hasAttribute("data-page-break") ||
        (elmtElmt.classList?.contains?.("page-break") ?? false)
    ) {
        return "<!--PAGEBREAK-->";
    }

    const childNodes = elmt.childNodes;
    const childLen = childNodes.length;

    if (Tag === "ol" || Tag === "ul") {
        const baseAttrs = elmtElmt
            .getAttributeNames()
            .filter(a => a !== "start")
            .map(a => `${a}="${elmtElmt.getAttribute(a)}"`)
            .join(" ");

        const isOrdered = Tag === "ol";
        const baseStart = isOrdered ? (parseInt(elmtElmt.getAttribute("start") || "1", 10) || 1) : 0;

        const openList = (start: number) =>
            isOrdered
                ? `<ol ${baseAttrs}${baseAttrs ? " " : ""}start="${start}">`
                : `<ul ${baseAttrs}>`;

        let ht = "";
        let suboffset = 0;
        let remaining = offsets;
        let liCount = 0;

        if (consumeBreak(pageBreaks, offset)) {
            ht += "<!--PAGEBREAK-->";
        }

        ht += openList(baseStart + liCount);

        for (let i = 0; i < childLen; i++) {
            const child = childNodes[i];
            if (hasVisibleContent(child) && consumeBreak(pageBreaks, offset + suboffset)) {
                ht += `</${Tag}><!--PAGEBREAK-->${openList(baseStart + liCount)}`;
            }

            const size = (child.textContent || "").length;
            const lastIndex = remaining.findIndex(o => o.start > offset + suboffset + size);
            const cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex);

            if (remaining[cents.length - 1] && remaining[cents.length - 1].end > offset + suboffset + size) {
                remaining = remaining.slice(cents.length - 1);
            } else {
                remaining = remaining.slice(cents.length);
            }

            ht += renderBlock(
                child,
                entityTypes,
                cents,
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

        ht += `</${Tag}>`;
        return ht;
    }

    let ht = "";
    let suboffset: number = 0;
    let remaining = offsets;

    for (let i = 0; i < childLen; i++) {
        const child = childNodes[i];
        if (hasVisibleContent(child) && consumeBreak(pageBreaks, offset + suboffset)) {
            ht += "<!--PAGEBREAK-->";
        }

        const size = (child.textContent || "").length;
        const lastIndex = remaining.findIndex(o => o.start > offset + suboffset + size);
        const cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex);

        if (remaining[cents.length - 1] && remaining[cents.length - 1].end > offset + suboffset + size) {
            remaining = remaining.slice(cents.length - 1);
        } else {
            remaining = remaining.slice(cents.length);
        }

        ht += renderBlock(
            child,
            entityTypes,
            cents,
            anonimizeState,
            offset + suboffset,
            images,
            imageIndex,
            pageBreaks
        );
        suboffset += size;
    }

    const attrs: string[] = [];
    const href = elmtElmt.getAttribute("href");
    const localHref = href?.startsWith("#");

    for (const attr of elmtElmt.getAttributeNames()) {
        attrs.push(`${attr}="${elmtElmt.getAttribute(attr)}"`);
    }
    if (Tag === "a" && href && !localHref) attrs.push('target="_blank"');

    if (Tag === "img") {
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

    if (VOID_ELEMENTS.has(Tag)) {
        return `<${Tag} ${attrs.join(" ")}>`;
    }

    return `<${Tag} ${attrs.join(" ")}>${ht}</${Tag}>`;
}

export function renderToken(
    value: string,
    offset: number,
    anonimizeState: AnonimizeStateState,
    type?: EntityTypeI,
    specificOffset?: SpecificOffsetRange
): string {
    if (value.length === 0) {
        return "";
    }

    if (specificOffset && specificOffset.start >= offset && specificOffset.end < offset + value.length - 1) {
        const p1 = value.substring(0, specificOffset.start - offset);
        const token = value.substring(specificOffset.start - offset, specificOffset.end - offset + 1);
        const p2 = value.substring(specificOffset.end - offset + 1);

        return renderToken(p1, offset, anonimizeState, type) +
            renderToken(token, offset + p1.length, anonimizeState, type, specificOffset) +
            renderToken(p2, offset + p1.length - 1 + token.length - 1, anonimizeState, type);
    }

    if (anonimizeState === AnonimizeStateState.ORIGINAL) {
        return value;
    }

    if (anonimizeState === AnonimizeStateState.ANONIMIZED) {
        if (specificOffset && type) {
            if (specificOffset.start === offset) {
                return specificOffset.ent.anonimizingFunction(type)(
                    specificOffset.preview,
                    specificOffset.ent.type,
                    specificOffset.ent.index,
                    specificOffset.ent.typeIndex,
                    specificOffset.ent.funcIndex
                );
            }
            return "";
        }
        return value;
    }

    let attrStr = `data-offset="${offset}"`;

    if (specificOffset && type) {
        const cod = specificOffset.ent.anonimizingFunction(type)(
            specificOffset.preview,
            specificOffset.ent.type,
            specificOffset.ent.index,
            specificOffset.ent.typeIndex,
            specificOffset.ent.funcIndex
        );
        attrStr += ` data-anonimize-cod="${cod}" data-anonimize-type="${type.name}" data-anonimize-color="${type.color}" data-anonimize-offset-start="${specificOffset.start}" data-anonimize-offset-end="${specificOffset.end}"`;
        if (specificOffset.start === offset) {
            attrStr += ' data-anonimize-first="true"';
        }
        if (offset === specificOffset.end - value.length + 1) {
            attrStr += ' data-anonimize-last="true"';
        }
    }

    switch (anonimizeState) {
        case AnonimizeStateState.TAGGED:
            return `<span ${attrStr}>${value}</span>`;
        case AnonimizeStateState.OTHERS_TAGGED:
            if (type && type.name.startsWith("X")) {
                return `<span ${attrStr}>${value}</span>`;
            }
            return value;
        case AnonimizeStateState.NORMAL_TAGGED:
            if (type && !type.name.startsWith("X")) {
                return `<span ${attrStr}>${value}</span>`;
            }
            return value;
        default:
            return "";
    }
}
