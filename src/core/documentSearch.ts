import { Entity, SpecificOffsetRange } from "@/types/EntityType";

const MIN_SEARCH_LENGTH = 2;

export function normalizeSearchText(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function isWordChar(char: string | undefined): boolean {
    return Boolean(char && /[\p{L}\p{N}_]/u.test(char));
}

/** Filters Entity Pool entries whose occurrence previews contain the normalized query. */
export function filterEntities(entities: Entity[], query: string | undefined): Entity[] {
    const needle = normalizeSearchText(query ?? "").trim();
    if (needle.length < MIN_SEARCH_LENGTH) return entities;

    return entities.filter((ent) =>
        ent.offsets.some((off) => normalizeSearchText(off.preview ?? "").includes(needle))
    );
}

/**
 * Searches `text` for whole words containing `query` (accent- and case-insensitive),
 * excluding matches that overlap existing Entity Pool occurrences.
 */
export function searchText(
    text: string,
    entities: Entity[],
    query: string | undefined,
): SpecificOffsetRange[] {
    const needle = normalizeSearchText(query ?? "").trim();
    if (needle.length < MIN_SEARCH_LENGTH) return [];

    let normalizedText = "";
    const sourceStarts: number[] = [];
    const sourceEnds: number[] = [];

    for (let i = 0; i < text.length;) {
        const original = String.fromCodePoint(text.codePointAt(i)!);
        const start = i;
        i += original.length;

        const normalized = normalizeSearchText(original);
        if (normalized.length === 0 && sourceEnds.length > 0 && /[\u0300-\u036f]/u.test(original)) {
            sourceEnds[sourceEnds.length - 1] = i - 1;
            continue;
        }

        for (let j = 0; j < normalized.length; j++) {
            normalizedText += normalized[j];
            sourceStarts.push(start);
            sourceEnds.push(i - 1);
        }
    }

    const results: SpecificOffsetRange[] = [];
    const seenSpans = new Set<string>();

    let from = 0;
    while (from <= normalizedText.length - needle.length) {
        const index = normalizedText.indexOf(needle, from);
        if (index < 0) break;

        let wordStart = index;
        let wordEnd = index + needle.length - 1;

        while (wordStart > 0 && isWordChar(normalizedText[wordStart]) && isWordChar(normalizedText[wordStart - 1])) {
            wordStart--;
        }
        while (
            wordEnd + 1 < normalizedText.length &&
            isWordChar(normalizedText[wordEnd]) &&
            isWordChar(normalizedText[wordEnd + 1])
        ) {
            wordEnd++;
        }

        const start = sourceStarts[wordStart];
        const end = sourceEnds[wordEnd];
        const spanKey = `${start}:${end}`;

        if (!seenSpans.has(spanKey)) {
            seenSpans.add(spanKey);

            const overlaps = entities.some((ent) =>
                ent.offsets.some((off) => off.start <= end && start <= off.end)
            );

            if (!overlaps) {
                const preview = text.slice(start, end + 1);
                const ent = new Entity("");
                ent.addOffset([{ start, end, preview }]);
                results.push({ start, end, preview, ent });
            }
        }

        from = index + 1;
    }

    return results;
}
