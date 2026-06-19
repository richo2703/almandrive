import { useRef, useState, type DragEvent } from "react";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminUploadImage } from "../../lib/api";
import { AdminButton } from "./Button";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxSize = 5 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
  category,
  label,
}: {
  value: string | null;
  onChange(url: string | null): void;
  category: "banners" | "promotions" | "news";
  label?: string;
}) {
  const { t } = useTranslation("translation");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(file: File | null) {
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setError(t("upload.unsupported"));
      return;
    }
    if (file.size > maxSize) {
      setError(t("upload.sizeHint"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await adminUploadImage(file, category);
      onChange(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("upload.unsupported"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement | HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    await handleFiles(file);
  }

  return (
    <div className="image-uploader">
      {label ? <span className="admin-label">{label}</span> : null}
      {value ? (
        <button className="image-uploader__preview" type="button" onClick={() => onChange(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void handleDrop(event)}>
          <img src={value} alt="" />
          <span className="image-uploader__remove">
            <X size={14} />
            {t("upload.remove")}
          </span>
        </button>
      ) : (
        <button className="image-uploader__drop" type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void handleDrop(event)}>
          <Upload size={18} />
          <span>{uploading ? t("upload.uploading") : t("upload.drop")}</span>
          <small>{t("upload.sizeHint")}</small>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => void handleFiles(event.target.files?.[0] ?? null)}
      />
      {error ? <p className="admin-help admin-help--danger">{error}</p> : null}
      {value ? (
        <AdminButton variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
          {t("upload.upload")}
        </AdminButton>
      ) : null}
    </div>
  );
}
