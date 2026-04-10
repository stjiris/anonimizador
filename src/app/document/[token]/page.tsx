'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createUserFile, readSavedUserFile, deleteUserFile } from "@/core/UserFileCRUDL";
import { UserFile } from "@/core/UserFile";
import { applyNlpEntitiesToPool, RemoteEntity } from "@/core/runRemoteNlp";
import { EntityPool } from "@/types/EntityPool";

interface ApiDocument {
  id: string;
  "Número de Processo": string;
  "Texto": string;
  "Texto Não Anonimizado"?: string;
  "Sumário"?: string;
  "Sumário Não Anonimizado"?: string;
  "Fonte"?: string;
  "UUID"?: string;
  "URL"?: string;
}

function applyAnonimizedEntitiesToPool(pool: EntityPool, entities: Record<string, string[]>) {
  const text = pool.originalText;
  const seen = new Set<string>();
  for (const [type, previews] of Object.entries(entities)) {
    for (const preview of previews) {
      const key = `${type}|${preview}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const escaped = preview.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        pool.addEntity(match.index, match.index + preview.length - 1, preview, type, false);
      }
    }
  }
  pool.updateOrder("Restaurar entidades");
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('A obter documento...');

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido');
      setLoading(false);
      return;
    }

    async function fetchAndSaveDocument() {
      try {
        setStatus('A obter documento do servidor...');
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/juris/get_document?token=${token}`);
        const data = await res.json();

        if (!data.ok) {
          setError(data.message || 'Falha ao obter documento');
          return;
        }

        const apiDocument: ApiDocument = data.document;
        const jurisUrl: string | undefined = data.jurisUrl;
        const savedEntities: Record<string, string[]> | null = data.entities || null;
        const nlpData: RemoteEntity[] | null = (() => {
          if (!data.nlp) return null;
          try {
            const parsed = typeof data.nlp === "string" ? JSON.parse(data.nlp) : data.nlp;
            return Array.isArray(parsed) ? parsed : null;
          } catch { return null; }
        })();

        const fileName = apiDocument["Número de Processo"] || `Document_${apiDocument.id}`;
        const sumario = apiDocument["Sumário Não Anonimizado"] || apiDocument["Sumário"];
        const texto = apiDocument["Texto Não Anonimizado"] || apiDocument["Texto"];
        const textContent = sumario
            ? `<div data-juris="sumario">${sumario}</div><div data-juris="texto">${texto || ""}</div>`
            : texto;

        if (!textContent) {
          setError('Documento não contém texto');
          return;
        }

        const existingFile = await readSavedUserFile(fileName);
        if (existingFile != null) {
          const usrConfirm = window.confirm(
            `Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?`
          );
          if (!usrConfirm) {
            setError('Importação cancelada pelo utilizador');
            return;
          }
          await deleteUserFile(existingFile);
        }

        setStatus('A criar ficheiro...');
        const userFile = UserFile.newFrom(fileName, textContent);
        userFile.jurisId = apiDocument["UUID"];
        userFile.jurisDocUrl = jurisUrl;

        if (savedEntities && Object.keys(savedEntities).length > 0) {
          setStatus('A restaurar entidades da última anonimização...');
          applyAnonimizedEntitiesToPool(userFile.pool, savedEntities);
        } else if (nlpData && nlpData.length > 0) {
          setStatus('A aplicar entidades identificadas...');
          applyNlpEntitiesToPool(userFile.pool, nlpData);
        }

        setStatus('A guardar documento localmente...');
        try {
          await createUserFile(userFile.toSavedFile());
          window.dispatchEvent(new Event('AlertUpdateListUserFile'));
          sessionStorage.setItem('autoSelectFile', fileName);

          setStatus('Documento guardado! A redirecionar...');
          setTimeout(() => router.push('/'), 1000);

        } catch (e) {
          console.error(e);
          alert('Aviso! Ficheiro grande demais para ser guardado no browser. Poderá trabalhar nele à mesma.');
          sessionStorage.setItem('autoSelectFile', fileName);
          setTimeout(() => router.push('/'), 1500);
        }

      } catch (err) {
        console.error(err);
        setError('Falha ao processar ficheiro.');
      } finally {
        setLoading(false);
      }
    }

    fetchAndSaveDocument();
  }, [token, router]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border mb-3" role="status">
            <span className="visually-hidden">A carregar...</span>
          </div>
          <div className="fs-5">{status}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="alert alert-danger">
            <h1 className="h2 mb-2">Erro</h1>
            <p>{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-4">
      <div className="alert alert-success">
        <h2 className="h4 mb-2">✓ Documento Guardado com Sucesso</h2>
        <p>A redirecionar para a aplicação...</p>
      </div>
    </div>
  );
}