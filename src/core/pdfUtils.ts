export function formatXml(xml: string): string {
    const TOP_MARGIN = 0.05;  // 8% acima da página para remoçao direta de header
    const POSSIBLE_HEADER = 0.2; // 20% acima da página para considerar como possível header e retirar se se repetir
    const BOTTOM_MARGIN = 0.95; // 8% abaixo da página
    const WRAP_THRESHOLD = 0.75; // 75% da largura da página para considerar quebra de linha como word wrap invés de parágrafo
    const SAME_LINE_THRESHOLD = 2; // 2px de diferença vertical para considerar como mesma linha

    const pageRegex = /<page\b([^>]*)>([\s\S]*?)<\/page>/g;
    let result = '';
    let pageMatch;
    let prevPageLastLineWasLong = false;
    const headerSeen: string[] = [];
    const repeatedHeaders = new Set<string>();
    while ((pageMatch = pageRegex.exec(xml)) !== null) {
        const pageAttrs = pageMatch[1];
        const pageContent = pageMatch[2];

        const pageWidthMatch = pageAttrs.match(/\bwidth="(\d+)"/);
        const pageHeightMatch = pageAttrs.match(/\bheight="(\d+)"/);
        const pageHeight = pageHeightMatch ? parseInt(pageHeightMatch[1], 10) : 1000;


        const possibleHeaderZone = pageHeight * POSSIBLE_HEADER;
        const headerZoneMax = pageHeight * TOP_MARGIN;
        const footerZoneMin = pageHeight * BOTTOM_MARGIN;


        result += `<page${pageAttrs}>\n`;

        // extrair imagens
        const imageRegex = /<image\b([^>]*?)\/?>(?:<\/image>)?/g;
        let imageMatch;
        const images: { top: number; height: number; src: string; width: number }[] = [];

        while ((imageMatch = imageRegex.exec(pageContent)) !== null) {
            const attrs = imageMatch[1];
            const topMatch = attrs.match(/\btop="(\d+)"/);
            const heightMatch = attrs.match(/\bheight="(\d+)"/);
            const widthMatch = attrs.match(/\bwidth="(\d+)"/);
            const srcMatch = attrs.match(/\bsrc="([^"]+)"/);

            const top = topMatch ? parseInt(topMatch[1], 10) : 0;
            if (top < headerZoneMax || top > footerZoneMin) continue;
            if (!srcMatch) continue;

            images.push({
                top,
                height: heightMatch ? parseInt(heightMatch[1], 10) : 0,
                width: widthMatch ? parseInt(widthMatch[1], 10) : 0,
                src: srcMatch[1],
            });
        }

        const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
        let textMatch;

        const fragments: { top: number; height: number; left: number; width: number; content: string }[] = [];
        while ((textMatch = textRegex.exec(pageContent)) !== null) {
            const attrs = textMatch[1];
            const content = textMatch[2].trim().replace(/ {2,}/g, ' ');
            if (!content) continue;

            const topMatch = attrs.match(/\btop="(\d+)"/);
            const heightMatch = attrs.match(/\bheight="(\d+)"/);
            const leftMatch = attrs.match(/\bleft="(\d+)"/);
            const widthMatch = attrs.match(/\bwidth="(\d+)"/);

            const top = topMatch    ? parseInt(topMatch[1],    10) : 0;
            const height = heightMatch ? parseInt(heightMatch[1], 10) : 12;
            const left = leftMatch   ? parseInt(leftMatch[1],   10) : 0;
            const width = widthMatch  ? parseInt(widthMatch[1],  10) : 0;
            
            if(top < possibleHeaderZone) {
                if (headerSeen.includes(content)){
                    repeatedHeaders.add(content);
                    continue;
                }
                else{
                    headerSeen.push(content);
                }
            }

            if (top < headerZoneMax || top > footerZoneMin) continue;

            fragments.push({ top, height, left, width, content });
        }

        if (fragments.length === 0) {
            result += `</page>\n`;
            prevPageLastLineWasLong = false;
            continue;
        }

        // juntar fragmentos que estão na mesma linha, ou seja, com top muito próximo (dentro de SAME_LINE_THRESHOLD)
        // ou se top + height se sobrepuserem
        const lines: { top: number; height: number; left: number; right: number; text: string }[] = [];

        for (const { top, height, left, width, content } of fragments) {
            const overlapping = lines.find(l => {
                
                const aTop = l.top;
                const aBottom = l.top + l.height;
                const bTop = top; 
                const bBottom = top + height;
                const verticalOverlap = aTop < bBottom && bTop < aBottom;
                return verticalOverlap || Math.abs(l.top - top) <= SAME_LINE_THRESHOLD;
            });
            if (overlapping) {
                overlapping.text += ' ' + content;
                overlapping.height = Math.max(overlapping.height, height);
                overlapping.left = Math.min(overlapping.left, left);
                overlapping.right = Math.max(overlapping.right, left + width);
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
        const gapEntries = [...gapCounts.entries()].sort((a, b) => b[1] - a[1]);
        const normalLineSpacing = gapEntries.length > 0 ? gapEntries[0][0] : lines[0].height;

        const leftCounts = new Map<number, number>();
        for (const l of lines) {
            const rounded = Math.round(l.left / 5) * 5;
            leftCounts.set(rounded, (leftCounts.get(rounded) || 0) + 1);
        }
        const leftEntries = [...leftCounts.entries()].sort((a, b) => b[1] - a[1]);
        const leftMargin = leftEntries.length > 0 ? leftEntries[0][0] : lines[0].left;
        const maxRight = Math.max(...lines.map(l => l.right));
        
        // O maxRight é o valor máximo que uma linha alcança à direita, por exemplo 700px
        // se uma linha tem right >= 525px (75% de 700px) e a próxima linha começa perto da margem esquerda (leftMargin), 
        // consideramos que é um word wrap, ou seja, a linha foi quebrada por falta de espaço e não por um parágrafo novo
        const wrapThreshold = maxRight * WRAP_THRESHOLD;   

        // Sort imagens pelo top para colocá-las pela ordem certa em relação ao texto
        images.sort((a, b) => a.top - b.top);
        let nextImageIdx = 0;

        const flushImages = (beforeTop: number) => {
            let imgHtml = '';
            while (nextImageIdx < images.length && images[nextImageIdx].top < beforeTop) {
                const img = images[nextImageIdx];
                imgHtml += `<img src="${img.src}" width="${img.width}" height="${img.height}" style="display:block;max-width:100%;">\n`;
                nextImageIdx++;
            }
            return imgHtml;
        };



        let output = '';

        // inserir imagens que aparecem antes da primeira linha de texto
        output += flushImages(lines[0].top);
        if (prevPageLastLineWasLong && Math.abs(lines[0].left - leftMargin) <= 5) {
            result = result.replace(/<\/p>\n(<\/page>\n<page\b[^>]*>\n)$/, '$1');
            output += ' ';
        } else {
            output += '<p>';
        }

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

            // inserir imagens que aparecem entre a linha anterior e a atual
            const pendingImages = flushImages(curr.top);

            if (pendingImages) {
                output += `</p>\n${pendingImages}<p>${curr.text}`;
            } else if (!isNormalLineAdvance) {
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
        // inserir imagens q aparecem depois da última linha de texto
        output += flushImages(Infinity);
        result += output;
        result += `</page>\n`;
        
        // determina se a última linha da página é longa para decidir se na próxima página
        // o texto vai ser juntado com a última linha da página anterior (word wrap) ou se começa um novo parágrafo
        const lastLine = lines[lines.length - 1];
        prevPageLastLineWasLong = lastLine.right >= wrapThreshold;
    }

    for (const header of repeatedHeaders) {
        const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`<p>${escaped}</p>\\n?`), '');
        result = result.replace(new RegExp(`<br>${escaped}`), '');
        result = result.replace(new RegExp(escaped), '');
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