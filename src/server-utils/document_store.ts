const globalForDocuments = global as unknown as {
    documents: Map<string, { document: any; expiresAt: number }> | undefined;
};

const documents = globalForDocuments.documents ?? new Map<string, { document: any; expiresAt: number }>();

globalForDocuments.documents = documents;

export function saveDocument(token: string, document: any, ttlSeconds = 3600) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    documents.set(token, { document, expiresAt });

    console.log("Document saved for token:", token);
    console.log("Map size:", documents.size);

    setTimeout(() => {
        documents.delete(token);
        console.log("Document expired for token:", token);
    }, ttlSeconds * 1000);
}


export function getAndDeleteDocument(token: string) {
    console.log("Map size before retrieval:", documents.size);
    console.log("All tokens:", Array.from(documents.keys()));

    const data = documents.get(token);

    console.log("Retrieving document for token:", token);
    console.log("Data found:", !!data);

    if (!data) {
        return null;
    }

    if (Date.now() > data.expiresAt) {
        documents.delete(token);
        return null;
    }

    documents.delete(token);
    return data.document;
}