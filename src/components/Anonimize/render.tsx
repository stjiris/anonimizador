import { AnonimizeImage } from "../../types/AnonimizeImage";
import { AnonimizeStateState } from "../../types/AnonimizeState";
import { EntityTypeI } from "../../types/EntityTypes";
import { SpecificOffsetRange } from "../../util/uses";

const TAGS_TO_IGNORE = "script,style,link,meta,head,html,svg,iframe,canvas,object,embed,applet,frameset,frame,noembed,noscript,param,source,track".split(",");

const SAFE_SPLIT_TAGS = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "pre", "blockquote", "figure", "img",
    "ul", "ol"
]);

function consumeBreak(pageBreaks: Set<number> | undefined, pos: number): boolean {
    if (!pageBreaks) return false;
    if (pageBreaks.has(pos)) {
        pageBreaks.delete(pos);
        return true;
    }
    return false;
}

function visibleTextLen(node: ChildNode): number {
    if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.nodeValue || "").replace(/\s+/g, "");
        return t.length;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        let sum = 0;
        for (let i = 0; i < el.childNodes.length; i++) sum += visibleTextLen(el.childNodes[i]);
        return sum;
    }
    return 0;
}

function hasVisibleContent(node: ChildNode): boolean {
    return visibleTextLen(node) > 0;
}

export function planAutoPageBreaks(root: ChildNode, approxCharsPerPage = 2300): Set<number> {
    const breaks = new Set<number>();
    let acc = 0;
    let globalOffset = 0;
    let pending = false;
    let lastBreak = -1;

    function walk(node: ChildNode, parentTag: string | null) {
        const tag = (node as HTMLElement).nodeName?.toLowerCase?.() ?? "";

        if (node.nodeType === Node.TEXT_NODE) {
            const len = (node.nodeValue || "").length;
            globalOffset += len;
            acc += len;
            if (acc >= approxCharsPerPage) pending = true;
            return;
        }

        if (node.nodeType === Node.COMMENT_NODE || TAGS_TO_IGNORE.includes(tag)) return;

        const el = node as HTMLElement;

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
        for (let i = 0; i < el.childNodes.length; i++) {
            walk(el.childNodes[i], isListItem ? "li" : tag);
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
    pageBreaks?: Set<number>
) {
    let elmt = doc;

    if (elmt.nodeType === Node.TEXT_NODE) {
        let elmtStr = elmt.nodeValue || "";
        let tokenFragment = "";
        var reg = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;
        var token: RegExpExecArray | null;
        let remaining = offsets;
        while ((token = reg.exec(elmtStr)) !== null) {
            let current = remaining.at(0);
            if (!current) {
                tokenFragment += renderToken(token[0], offset + token.index, anonimizeState);
                continue;
            }
            if (current.end < offset + token.index + token[0].length) {
                remaining = remaining.slice(1);
            }
            if (current.start > offset + token.index) {
                tokenFragment += renderToken(token[0], offset + token.index, anonimizeState);
            } else {
                tokenFragment += renderToken(
                    token[0],
                    offset + token.index,
                    anonimizeState,
                    entityTypes[current.ent.type],
                    current
                );
            }
        }
        return tokenFragment;
    }

    if (elmt.nodeType === Node.COMMENT_NODE || TAGS_TO_IGNORE.includes(elmt.nodeName.toLowerCase())) {
        return "";
    }

    const Tag = elmt.nodeName.toLowerCase();
    const elmtElmt: HTMLElement = elmt as HTMLElement;

    if (
        Tag === "hr" ||
        elmtElmt.hasAttribute("data-page-break") ||
        (elmtElmt.classList?.contains?.("page-break") ?? false)
    ) {
        return "<!--PAGEBREAK-->";
    }

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

        for (let i = 0; i < elmt.childNodes.length; i++) {
            if (hasVisibleContent(elmt.childNodes[i]) && consumeBreak(pageBreaks, offset + suboffset)) {
                ht += `</${Tag}><!--PAGEBREAK-->${openList(baseStart + liCount)}`;
            }

            const size = (elmt.childNodes[i].textContent || "").length;
            const findLastIndex = (o: SpecificOffsetRange, start: number) => o.start > offset + suboffset + start;
            let lastIndex = remaining.findIndex(o => findLastIndex(o, size));
            let cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex);

            if (remaining[cents.length - 1] && remaining[cents.length - 1].end > offset + suboffset + size) {
                remaining = remaining.slice(cents.length - 1);
            } else {
                remaining = remaining.slice(cents.length);
            }

            ht += renderBlock(
                elmt.childNodes[i],
                entityTypes,
                cents,
                anonimizeState,
                offset + suboffset,
                images,
                imageIndex,
                pageBreaks
            );

            if (elmt.childNodes[i].nodeType === Node.ELEMENT_NODE &&
                (elmt.childNodes[i] as HTMLElement).nodeName.toLowerCase() === "li") {
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
    const findLastIndex = (o: SpecificOffsetRange, start: number) => o.start > offset + suboffset + start;

    for (let i = 0; i < elmt.childNodes.length; i++) {
        if (hasVisibleContent(elmt.childNodes[i]) && consumeBreak(pageBreaks, offset + suboffset)) {
            ht += "<!--PAGEBREAK-->";
        }

        let size = (elmt.childNodes[i].textContent || "").length;
        let lastIndex = remaining.findIndex(o => findLastIndex(o, size));
        let cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex);

        if (remaining[cents.length - 1] && remaining[cents.length - 1].end > offset + suboffset + size) {
            remaining = remaining.slice(cents.length - 1);
        } else {
            remaining = remaining.slice(cents.length);
        }

        ht += renderBlock(
            elmt.childNodes[i],
            entityTypes,
            cents,
            anonimizeState,
            offset + suboffset,
            images,
            imageIndex,
            pageBreaks
        );
        suboffset += (elmt.childNodes[i].textContent || "").length;
    }

    const attrs: string[] = [];
    const href = elmtElmt.getAttribute("href");
    const localHref = href?.startsWith("#");
    for (let attr of elmtElmt.getAttributeNames()) {
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

    return `<${Tag} ${attrs.join(" ")}>${ht}</${Tag}>`;
}


export function renderToken(value: string, offset: number, anonimizeState: AnonimizeStateState, type?: EntityTypeI, specificOffset?: SpecificOffsetRange): string {
    if (value.length === 0) {
        return ""
    }

    if (specificOffset && specificOffset.start >= offset && specificOffset.end < offset + value.length - 1) {
        let p1 = value.substring(0, specificOffset.start - offset);
        let token = value.substring(specificOffset.start - offset, specificOffset.end - offset + 1);
        let p2 = value.substring(specificOffset.end - offset + 1);

        return renderToken(p1, offset, anonimizeState, type) +
            renderToken(token, offset + p1.length, anonimizeState, type, specificOffset) +
            renderToken(p2, offset + p1.length - 1 + token.length - 1, anonimizeState, type)
    }
    let dataAttrs: { [_: string]: string } = {
        'data-offset': offset.toString()
    };

    if (specificOffset && type) {
        dataAttrs['data-anonimize-cod'] = specificOffset.ent.anonimizingFunction(type)(specificOffset.preview, specificOffset.ent.type, specificOffset.ent.index, specificOffset.ent.typeIndex, specificOffset.ent.funcIndex);
        dataAttrs['data-anonimize-type'] = type.name;
        dataAttrs['data-anonimize-color'] = type.color;
        dataAttrs['data-anonimize-offset-start'] = specificOffset.start.toString()
        dataAttrs['data-anonimize-offset-end'] = specificOffset.end.toString()
        if (specificOffset.start === offset) {
            dataAttrs['data-anonimize-first'] = "true";
        }
        if (offset === specificOffset.end - value.length + 1) {
            dataAttrs['data-anonimize-last'] = "true";
        }
    }

    switch (anonimizeState) {
        case AnonimizeStateState.ANONIMIZED:
            if ('data-anonimize-first' in dataAttrs) {
                return dataAttrs['data-anonimize-cod']
            }
            else if ('data-anonimize-cod' in dataAttrs) {
                return ""
            }
            else {
                return value
            }
        case AnonimizeStateState.ORIGINAL:
            return value;
        case AnonimizeStateState.TAGGED:
            return `<span ${Object.entries(dataAttrs).map(([k, v]) => `${k}="${v}"`).join("")}>${value}</span>`
        case AnonimizeStateState.OTHERS_TAGGED:
            if (type && type.name.startsWith("X")) {
                return `<span ${Object.entries(dataAttrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${value}</span>`;
            } else {
                return value;
            }
        case AnonimizeStateState.NORMAL_TAGGED:
            if (type && !type.name.startsWith("X")) {
                return `<span ${Object.entries(dataAttrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${value}</span>`;
            } else {
                return value;
            }
        default:
            return "";
    }
}
