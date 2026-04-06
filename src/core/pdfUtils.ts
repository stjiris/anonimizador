export function formatXml(xml: string): string {
    const TOP_MARGIN = 0.08; // 8% acima da página
    const BOTTOM_MARGIN = 0.92; // 8% abaixo da página
    const WRAP_THRESHOLD = 0.75; // 75% da largura da página para considerar quebra de linha como word wrap invés de parágrafo
    const SAME_LINE_THRESHOLD = 2; // 2px de diferença vertical para considerar como mesma linha
    
    const pageRegex = /<page\b([^>]*)>([\s\S]*?)<\/page>/g;
    let result = '';
    let pageMatch;

    while ((pageMatch = pageRegex.exec(xml)) !== null) {
        const pageAttrs = pageMatch[1];
        const pageContent = pageMatch[2];

        const pageWidthMatch = pageAttrs.match(/\bwidth="(\d+)"/);
        const pageHeightMatch = pageAttrs.match(/\bheight="(\d+)"/);
        const pageHeight = pageHeightMatch ? parseInt(pageHeightMatch[1], 10) : 1000;

        const headerZoneMax = pageHeight * TOP_MARGIN;
        const footerZoneMin = pageHeight * BOTTOM_MARGIN;


        result += `<page${pageAttrs}>\n`;

        const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
        let textMatch;

        const fragments: { top: number; height: number; left: number; width: number; content: string }[] = [];

        while ((textMatch = textRegex.exec(pageContent)) !== null) {
            const attrs = textMatch[1];
            const content = textMatch[2].trim();
            if (!content) continue;

            const topMatch = attrs.match(/\btop="(\d+)"/);
            const heightMatch = attrs.match(/\bheight="(\d+)"/);
            const leftMatch = attrs.match(/\bleft="(\d+)"/);
            const widthMatch = attrs.match(/\bwidth="(\d+)"/);

            const top = topMatch    ? parseInt(topMatch[1],    10) : 0;
            const height = heightMatch ? parseInt(heightMatch[1], 10) : 12;
            const left = leftMatch   ? parseInt(leftMatch[1],   10) : 0;
            const width = widthMatch  ? parseInt(widthMatch[1],  10) : 0;

            if (top < headerZoneMax || top > footerZoneMin) continue;

            fragments.push({ top, height, left, width, content });
        }

        if (fragments.length === 0) {
            result += `</page>\n`;
            continue;
        }

        // juntar fragmentos que estão na mesma linha, ou seja, com top muito próximo (dentro de SAME_LINE_THRESHOLD)
        const lines: { top: number; height: number; left: number; right: number; text: string }[] = [];

        for (const { top, height, left, width, content } of fragments) {
            const existing = lines.find(l => Math.abs(l.top - top) <= SAME_LINE_THRESHOLD);
            if (existing) {
                existing.text += ' ' + content;
                existing.height = Math.max(existing.height, height);
                existing.left = Math.min(existing.left, left);
                existing.right = Math.max(existing.right, left + width);
            } else {
                lines.push({ top, height, left, right: left + width, text: content });
            }
        }

        lines.sort((a, b) => a.top - b.top);

        // calcular o gap entre linhas para determinar espaçamento
        const gaps = lines.slice(1).map((l, i) => l.top - lines[i].top);
        const gapCounts = new Map<number, number>();
        for (const g of gaps) {
            const rounded = Math.round(g / 2) * 2;
            gapCounts.set(rounded, (gapCounts.get(rounded) ?? 0) + 1);
        }
        const normalLineSpacing = [...gapCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

        const leftMargin = Math.min(...lines.map(l => l.left));
        const maxRight = Math.max(...lines.map(l => l.right));
        
        // O maxRight é o valor máximo que uma linha alcança à direita, por exemplo 700px
        // se uma linha tem right >= 525px (75% de 700px) e a próxima linha começa perto da margem esquerda (leftMargin), 
        // consideramos que é um word wrap, ou seja, a linha foi quebrada por falta de espaço e não por um parágrafo novo
        const wrapThreshold = maxRight * WRAP_THRESHOLD;   

        let output = '<p>';

        for (let i = 0; i < lines.length; i++) {
            if (i === 0) {
                output += lines[i].text;
                continue;
            }

            const prev = lines[i - 1];
            const curr = lines[i];
            const gap = curr.top - prev.top;

            const isNormalLineAdvance = gap <= normalLineSpacing * 1.3;
            const prevLineIsLong = prev.right >= wrapThreshold;
            const currAtLeftMargin = Math.abs(curr.left - leftMargin) <= 5;

            if (!isNormalLineAdvance) {
                // gap entre linhas maior que o normal = nova linha
                output += `</p>\n<p>${curr.text}`;
            } else if (prevLineIsLong && currAtLeftMargin) {
                // a linha anterior é longa e a atual começa na margem esquerda = word wrap, sem quebra de parágrafo
                output += ` ${curr.text}`;
            } else {
                // caso contrário = nova linha normal
                output += `<br>${curr.text}`;
            }
        }

        output += '</p>\n';
        result += output;
        result += `</page>\n`;
    }

    return result;
}

export function wrapXmlIntoHtml(xml: string, title: string): string {
    return `<!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <title>${title}</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.5; padding: 20px; }
                            page { display: block; margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                    ${xml}
                    </body>
                    </html>`;
}