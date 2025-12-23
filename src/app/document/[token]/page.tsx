'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createUserFile, readSavedUserFile, deleteUserFile } from "@/client-utils/UserFileCRUDL";
import { UserFile } from "@/client-utils/UserFile";

interface ApiDocument {
  id: string;
  "Número de Processo": string;
  "Texto": string;
  "Sumário"?: string;
  "Fonte"?: string;
  "UUID"?: string;
  "URL"?: string;
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
        const res = await fetch(`/api/get_document?token=${token}`);
        const data = await res.json();

        if (!data.ok) {
          setError(data.message || 'Falha ao obter documento');
          return;
        }

        const apiDocument: ApiDocument = data.document;
        const fileName = apiDocument["Número de Processo"] || `Document_${apiDocument.id}`;
        const textContent = apiDocument["Texto"];

        if (!textContent) {
          setError('Documento não contém texto');
          return;
        }

        const existingFile = readSavedUserFile(fileName);
        if (existingFile != null) {
          const usrConfirm = window.confirm(
            `Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?`
          );
          if (!usrConfirm) {
            setError('Importação cancelada pelo utilizador');
            return;
          }
          deleteUserFile(existingFile);
        }

        setStatus('A criar ficheiro...');
        const userFile = UserFile.newFrom(fileName, textContent);

        setStatus('A guardar documento localmente...');
        try {
          createUserFile(userFile.toSavedFile());
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