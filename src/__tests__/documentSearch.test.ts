import { filterEntities, searchText } from "@/core/documentSearch";
import { EntityPool } from "@/types/EntityPool";

function makePool(text: string, entries: Array<{ type: string; start: number; end: number }> = []) {
    return new EntityPool(
        text,
        entries.map((entry) => ({
            type: entry.type,
            offsets: [{ start: entry.start, end: entry.end, preview: text.slice(entry.start, entry.end + 1) }],
            offsetsLength: 1,
        })),
    );
}

test("Minimum 2-character normalized threshold applies to both filterEntities and searchText", () => {
    const text = "Ana Maria e João Silva.";
    const pool = makePool(text, [{ type: "PES", start: 0, end: 2 }]);

    for (const query of [undefined, "", "  ", "a", " a "]) {
        expect(filterEntities(pool.entities, query)).toHaveLength(1);
        expect(searchText(pool.originalText, pool.entities, query)).toEqual([]);
    }
});

test("Filters Entity Pool and finds Search Results with unified diacritic-stripped matching", () => {
    const text = "João apresentou recurso contra Joãozinho.";
    const pool = makePool(text, [{ type: "PES", start: 0, end: 3 }]);

    const entities = filterEntities(pool.entities, "  joao ");
    expect(entities).toHaveLength(1);
    expect(entities[0].offsets[0].preview).toBe("João");

    const results = searchText(pool.originalText, pool.entities, "  joao ");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
        start: 31,
        end: 39,
        preview: "Joãozinho",
    });
});

test("Expands substring matches anywhere in a word to whole-word boundaries", () => {
    const text = "Dr. António da Silva, advogado.";
    const pool = makePool(text);

    const results = searchText(pool.originalText, pool.entities, "lva");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
        start: 15,
        end: 19,
        preview: "Silva",
    });
});

test("Deduplicates multiple query matches within the same word", () => {
    const text = "A palavra banana aparece aqui.";
    const pool = makePool(text);

    const results = searchText(pool.originalText, pool.entities, "an");
    expect(results).toHaveLength(1);
    expect(results[0].preview).toBe("banana");
});

test("Expands multi-word queries to outer word boundaries", () => {
    const text = "O arguido da Silva recorreu.";
    const pool = makePool(text);

    const results = searchText(pool.originalText, pool.entities, "a sil");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
        start: 10,
        end: 17,
        preview: "da Silva",
    });
});

test("Excludes expanded Search Results that overlap Entity Pool occurrences including boundary char", () => {
    const text = "Joãozinho-Silva";
    const pool = makePool(text, [{ type: "PES", start: 0, end: 3 }]);

    expect(searchText(pool.originalText, pool.entities, "zinho")).toEqual([]);

    const adjacentPool = makePool("abcde", [{ type: "PES", start: 2, end: 4 }]);
    expect(searchText(adjacentPool.originalText, adjacentPool.entities, "ab")).toEqual([]);
});

test("Preserves trailing combining marks in NFD source text when slicing previews", () => {
    const text = "O cafe\u0301 esta\u0301 quente.";
    const pool = makePool(text);

    const results = searchText(pool.originalText, pool.entities, "cafe");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
        start: 2,
        end: 6,
        preview: "cafe\u0301",
    });
});
