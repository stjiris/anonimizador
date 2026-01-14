import { SavedUserFile } from "@/core/UserFile"
import { AnonimizeImage } from "./AnonimizeImage"
import { DescriptorI } from "./Descriptor"
import { EntityPool } from "./EntityPool"
import { EntityTypeI } from "./EntityType"
import { SummaryI } from "./Summary"

export interface UserFileInterface {
    name: string
    html_contents: string
    types: EntityTypeI[]
    pool: EntityPool
    images: Record<number, AnonimizeImage>
    imported: Date
    modified: Date
    lastTopPosition: number
    area?: string
    descriptors?: DescriptorI[]
    summary?: SummaryI[]
    profile?: string
    typesListeners: ((types: EntityTypeI[]) => void)[]
    savedListeners: ((saved: boolean) => void)[]
    imagesListeners: ((images: Record<number, AnonimizeImage>) => void)[]
    areaListeners: ((area?: string) => void)[]
    descriptorsListeners: ((descriptors: DescriptorI[]) => void)[]
    summaryListeners: ((summary: SummaryI[]) => void)[]
    saved: boolean
    doc: HTMLElement;
    onSave(cb: (saved: boolean) => void): void
    offSave(cb: (saved: boolean) => void): void
    addType(key: string, color: string, funcIndex: number): void
    updateType(key: string, color: string, funcIndex: number): void
    deleteType(key: string): void
    resetTypes(): void
    notifySave(saved: boolean): void
    onTypes(cb: (types: EntityTypeI[]) => void): void
    offTypes(cb: (types: EntityTypeI[]) => void): void
    onImages(cb: (images: Record<number, AnonimizeImage>) => void): void
    offImages(cb: (images: Record<number, AnonimizeImage>) => void): void
    notifyImages(): void
    onDescriptors(cb: (descriptors: DescriptorI[]) => void): void
    offDescriptors(cb: (descriptors: DescriptorI[]) => void): void
    notifyDescriptors(): void
    onArea(cb: (area?: string) => void): void
    offArea(cb: (area?: string) => void): void
    notifyArea(): void
    onSummary(cb: (summary: SummaryI[]) => void): void
    offSummary(cb: (summary: SummaryI[]) => void): void
    notifySummary(): void
    checkCountPES(): void
    toSavedFile(): SavedUserFile
    save(): boolean
    notifyType(): void
}
