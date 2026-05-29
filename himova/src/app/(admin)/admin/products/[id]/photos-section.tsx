"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AlertCircle, CheckCircle2, ImagePlus, Trash2, Upload } from "lucide-react";

import {
  deleteProductPhoto,
  uploadProductPhotos,
  type PhotoActionState,
} from "@/app/actions/product-photos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ACCEPTED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type ProductPhoto = {
  id: string;
  url: string;
  sortOrder: number;
};

const initialUploadState: PhotoActionState = { ok: false };

export function PhotosSection({
  productId,
  photos,
  variantId,
}: {
  productId: string;
  photos: ProductPhoto[];
  /** When set, uploads are tagged to this variant (colour / style). */
  variantId?: string;
}) {
  const t = useTranslations("photos");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, uploadAction] = useFormState(uploadProductPhotos, initialUploadState);

  // Unique key so multiple PhotosSections on one product page (general + each
  // variant) don't share the same input id / htmlFor target.
  const scope = variantId ? `${productId}-${variantId}` : productId;

  // After a successful upload, clear local preview state and refresh server data.
  useEffect(() => {
    if (uploadState.ok && uploadState.uploaded && uploadState.uploaded > 0) {
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    }
  }, [uploadState, router]);

  function onPickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const valid: File[] = [];
    for (const f of Array.from(list)) {
      if (
        !(ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(f.type) ||
        f.size > MAX_PHOTO_BYTES
      ) {
        continue;
      }
      valid.push(f);
    }
    setPendingFiles(valid);
  }

  function clearPending() {
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Existing photos grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              productId={productId}
              isPrimary={index === 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {/* Upload form */}
      <form action={uploadAction} className="space-y-3">
        <input type="hidden" name="productId" value={productId} />
        {variantId ? <input type="hidden" name="variantId" value={variantId} /> : null}

        {/* Drag + drop / click area */}
        <label
          htmlFor={`photo-input-${scope}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            onPickFiles(e.dataTransfer.files);
            // Mirror dropped files onto the file input so the form submits them.
            if (fileInputRef.current) {
              fileInputRef.current.files = e.dataTransfer.files;
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-input bg-card hover:border-primary/50 hover:bg-accent/40"
          )}
        >
          <ImagePlus className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{t("dropzoneTitle")}</span>
          <span className="text-xs text-muted-foreground">{t("dropzoneHint")}</span>
        </label>
        <input
          ref={fileInputRef}
          id={`photo-input-${scope}`}
          name="files"
          type="file"
          accept={ACCEPTED_PHOTO_MIME_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => onPickFiles(e.target.files)}
        />

        {/* Selected-file previews */}
        {pendingFiles.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("selectedCount", { count: pendingFiles.length })}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {pendingFiles.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded border bg-card px-2 py-1">
                  <span className="truncate">{f.name}</span>
                  <span className="ml-2 shrink-0 tabular-nums">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {uploadState.error ? (
          <Alert variant={uploadState.ok ? "warning" : "destructive"}>
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertDescription>{uploadState.error}</AlertDescription>
          </Alert>
        ) : null}

        {uploadState.ok && uploadState.uploaded ? (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            <AlertDescription>
              {t("uploadedCount", { count: uploadState.uploaded })}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-2">
          <UploadButton hasFiles={pendingFiles.length > 0} />
          {pendingFiles.length > 0 ? (
            <Button type="button" variant="ghost" onClick={clearPending}>
              {t("clear")}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function UploadButton({ hasFiles }: { hasFiles: boolean }) {
  const t = useTranslations("photos");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={!hasFiles || pending}>
      <Upload className="mr-2 h-4 w-4" aria-hidden />
      {pending ? t("uploading") : t("upload")}
    </Button>
  );
}

function PhotoTile({
  photo,
  productId,
  isPrimary,
}: {
  photo: ProductPhoto;
  productId: string;
  isPrimary: boolean;
}) {
  const t = useTranslations("photos");
  const router = useRouter();
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    startDelete(async () => {
      const fd = new FormData();
      fd.set("photoId", photo.id);
      fd.set("productId", productId);
      await deleteProductPhoto(null, fd);
      router.refresh();
    });
  }

  return (
    <figure className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
      {/* Use a regular img tag here — Supabase storage URLs are external and
          cumulative file sizes for thumbnails don't justify configuring next/image
          remote patterns rigidly. Using next/image with `unoptimized` keeps things consistent. */}
      <Image
        src={photo.url}
        alt=""
        fill
        sizes="(min-width: 768px) 200px, 50vw"
        className="object-cover transition-transform group-hover:scale-105"
        unoptimized
      />
      {isPrimary ? (
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide shadow-sm">
          {t("primary")}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={t("delete")}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </figure>
  );
}
