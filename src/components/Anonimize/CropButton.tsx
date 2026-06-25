"use client"

import { useEffect, useRef, useState } from "react";
import { Button } from "@/core/BootstrapIcons";
import { UserFileInterface } from "@/types/UserFileInterface";
import { EntityPool } from "@/types/EntityPool";

interface CropMargins {
    header: number;
    footer: number;
}

const defaultCropMargins = (): CropMargins => ({ header: 10, footer: 10 });

export function CropButton({ file }: { file: UserFileInterface }) {
    const [loading, setLoading] = useState(false);
    const [previewPages, setPreviewPages] = useState<string[]>([]);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [cropMargins, setCropMargins] = useState<CropMargins>(defaultCropMargins);
    const [showModal, setShowModal] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [dragging, setDragging] = useState<{ pageIdx: number; type: "header" | "footer" } | null>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const canCropPdf = !!file.originalPdf;
    const cropHintKey = `crop-hint-seen:${file.name}:${file.imported?.toISOString?.() ?? ""}`;

    const markHintSeen = () => {
        setShowHint(false);
        try {
            localStorage.setItem(cropHintKey, "true");
        } catch { }
    };

    const openModal = () => {
        markHintSeen();
        setShowModal(true);
    };

    useEffect(() => {
        if (!canCropPdf) {
            setShowHint(false);
            return;
        }

        try {
            setShowHint(localStorage.getItem(cropHintKey) !== "true");
        } catch {
            setShowHint(true);
        }
    }, [canCropPdf, cropHintKey]);

    useEffect(() => {
        if (!showModal) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        }
    }, [showModal]);

    useEffect(() => {
        const originalPdf = file.originalPdf;
        if (!showModal || !originalPdf) return;

        const controller = new AbortController();
        setLoading(true);
        setPreviewError(null);
        setPreviewPages([]);

        (async () => {
            const pdfBlob = await fetch(originalPdf.dataUrl).then((r) => r.blob());
            const pdfFile = new File([pdfBlob], originalPdf.name, { type: originalPdf.type });
            const formData = new FormData();
            formData.append("file", pdfFile);
            formData.append("maxPages", "3");

            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/pdf_preview`, {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            if (!res.ok) {
                throw new Error(await res.text());
            }

            const data = await res.json() as { pages: string[] };
            setPreviewPages(data.pages);
            setCropMargins(defaultCropMargins());
        })().catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") return;
            console.error(error);
            setPreviewError("Não foi possível gerar a pré-visualização do PDF original.");
        }).finally(() => {
            setLoading(false);
        });

        return () => controller.abort();
    }, [showModal, file.originalPdf]);

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = pageRefs.current[dragging.pageIdx];
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const percentage = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));

            setCropMargins(prev => ({
                ...prev,
                [dragging.type]: Math.round(
                    dragging.type === "footer" ? 100 - percentage : percentage
                )
            }));
        };

        const handleMouseUp = () => setDragging(null);

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging]);

    const closeModal = () => {
        setShowModal(false);
        setLoading(false);
        setDragging(null);
    }

    const applyCroppedHtml = async (html: string) => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(html, "text/html");
        const nextBody = dom.body;
        const text = nextBody.textContent || "";

        file.html_contents = nextBody.innerHTML;
        file.doc = nextBody;
        file.pool = new EntityPool(text, []);
        file.pool.onChange(() => file.save());

        file.images = {};
        Array.from(nextBody.getElementsByTagName("img") as HTMLCollectionOf<HTMLImageElement>).forEach((img, i) => {
            file.images[i] = {
                originalSrc: img.src,
                anonimizedSrc: undefined,
                boxes: [],
                boxColor: "#ffffff",
            };
        });

        file.notifyImages();
        await file.save();
    }

    const applyCrop = async () => {
        const originalPdf = file.originalPdf;
        if (!originalPdf || loading) return;

        if (file.pool.entities.length > 0) {
            const confirmed = window.confirm("Ao recortar o PDF, as entidades já assinaladas serão limpas porque o texto do documento pode mudar. Continuar?");
            if (!confirmed) return;
        }

        setLoading(true);
        setPreviewError(null);

        try {
            const pdfBlob = await fetch(originalPdf.dataUrl).then((r) => r.blob());
            const pdfFile = new File([pdfBlob], originalPdf.name, { type: originalPdf.type });
            const formData = new FormData();
            formData.append("file", pdfFile);
            formData.append("headerPercent", String(cropMargins.header));
            formData.append("footerPercent", String(cropMargins.footer));

            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/crop_pdf`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(await res.text());
            }

            await applyCroppedHtml(await res.text());
            closeModal();
        } catch (error) {
            console.error(error);
            setPreviewError("Não foi possível aplicar o corte ao PDF.");
        } finally {
            setLoading(false);
        }
    }
    const buttonTitle = canCropPdf ? "Cortar cabeçalho/rodapé" : "Corte de cabeçalho/rodapé disponível apenas para PDFs importados";

    return <>
        <span title={buttonTitle}>
            <span style={{ position: "relative", display: "inline-block" }}>
                <Button
                    i="scissors"
                    title={buttonTitle}
                    className="btn m-1 p-1"
                    disabled={!canCropPdf}
                    onClick={openModal}
                />
                {showHint && <div
                    role="status"
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        width: 280,
                        zIndex: 20,
                        padding: "0.75rem 0.9rem",
                        border: "1px solid #b6d4fe",
                        borderRadius: 6,
                        background: "#e7f1ff",
                        color: "#084298",
                        boxShadow: "0 8px 22px rgba(0,0,0,0.16)",
                        fontSize: "0.875rem",
                        lineHeight: 1.35,
                    }}
                >
                    <div style={{ position: "absolute", top: -7, right: 12, width: 12, height: 12, transform: "rotate(45deg)", background: "#e7f1ff", borderLeft: "1px solid #b6d4fe", borderTop: "1px solid #b6d4fe" }} />
                    <button
                        type="button"
                        aria-label="Fechar sugestão"
                        onClick={markHintSeen}
                        style={{ position: "absolute", top: 4, right: 6, border: 0, background: "transparent", color: "#084298", fontSize: "1rem", lineHeight: 1 }}
                    >
                        ×
                    </button>
                    <div style={{ paddingRight: 14 }}>
                        Se o cabeçalho ou rodapé não ficou bem cortado, use este botão para ajustar o corte do PDF.
                    </div>
                </div>}
            </span>
        </span>

        {showModal && <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ width: "100%", maxWidth: 1500, maxHeight: "95vh", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid #dee2e6" }}>
                    <h5 className="modal-title">Definir corte (3 primeiras páginas)</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
                </div>
                <div style={{ padding: "1rem", overflowY: "auto", maxHeight: "calc(95vh - 132px)" }}>
                    {loading && <div className="alert alert-info">A gerar pré-visualização do PDF original...</div>}
                    {previewError && <div className="alert alert-warning">{previewError}</div>}
                    {!loading && previewPages.length > 0 && <div className="container-fluid">
                        <p className="text-muted small mb-3">Arraste as barras vermelhas para definir o corte do cabeçalho e rodapé. O mesmo corte será aplicado a todo o PDF.</p>
                        <div className="d-flex flex-row" style={{ gap: 20, overflowX: "auto", paddingBottom: 8 }}>
                            {previewPages.map((pageSrc, i) => {
                                return (
                                    <div key={i} style={{ flex: "0 0 620px", minWidth: 620 }}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong>Página {i + 1}</strong>
                                        </div>
                                        <div
                                            ref={(el) => {
                                                pageRefs.current[i] = el;
                                            }}
                                            style={{ position: "relative", border: "1px solid #ddd", overflow: "hidden", background: "#fff", cursor: dragging ? "grabbing" : "grab" }}
                                        >
                                            <img src={pageSrc} alt={`Página ${i + 1}`} style={{ display: "block", width: "100%", height: "auto" }} />
                                            <div onMouseDown={() => setDragging({ pageIdx: i, type: "header" })} style={{ position: "absolute", top: `${cropMargins.header}%`, left: 0, right: 0, height: "6px", background: "rgba(220, 53, 69, 0.9)", cursor: "ns-resize", userSelect: "none" }} />
                                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${cropMargins.header}%`, background: "rgba(220, 53, 69, 0.1)", pointerEvents: "none" }} />
                                            <div onMouseDown={() => setDragging({ pageIdx: i, type: "footer" })} style={{ position: "absolute", bottom: `${cropMargins.footer}%`, left: 0, right: 0, height: "6px", background: "rgba(220, 53, 69, 0.9)", cursor: "ns-resize", userSelect: "none" }} />
                                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${cropMargins.footer}%`, background: "rgba(220, 53, 69, 0.1)", pointerEvents: "none" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "1rem 1.25rem", borderTop: "1px solid #dee2e6" }}>
                    <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                    <button className="btn btn-primary" onClick={applyCrop} disabled={loading || previewPages.length === 0}>{loading ? "A aplicar..." : "Concluído"}</button>
                </div>
            </div>
        </div>}
    </>
}

export default CropButton;