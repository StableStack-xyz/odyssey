import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, FileCheck, FileText, Loader2, Sparkles } from "lucide-react";
import { walletApi } from "../../lib/api";
import { errorMessage } from "./-mansa-types";
import type { Fields, KycFile, ProfileDocument } from "./-mansa-kyb-types";
import {
  CERT_TYPES,
  COUNTRY_OPTIONS,
  KYC_FILE_TYPES,
  PHONE_AREA_CODES,
  ROLES,
  extractProfileDocuments,
} from "./-mansa-kyb-types";

export function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-slate space-y-1">
      <span className="font-medium text-ink/90">{label}</span>
      {children}
      {helper && <span className="block text-[11px] text-slate/70">{helper}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "input w-full",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={COUNTRY_OPTIONS}
      placeholder={placeholder}
    />
  );
}

export function PhoneAreaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={PHONE_AREA_CODES}
      placeholder="Dial code..."
    />
  );
}

export function FileUploader({
  userId,
  defaultFileType = "1",
  onUploaded,
}: {
  userId: string;
  defaultFileType?: string;
  onUploaded: (file: {
    file_id: string;
    file_type: string;
    name: string;
  }) => void;
}) {
  const [fileType, setFileType] = useState(defaultFileType);
  const [customType, setCustomType] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveType = fileType === "99" ? customType.trim() : fileType;

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("fileType", effectiveType);
      const response = await walletApi.post(
        `/api/admin/mansa/senders/${userId}/files`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return {
        file_id: response.data.data.file_id as string,
        file_type: effectiveType,
        name: file.name,
      };
    },
    onSuccess: (uploaded) => {
      toast.success(`Uploaded ${uploaded.name}`);
      onUploaded(uploaded);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  return (
    <div className="flex flex-wrap gap-2 items-center bg-vellum/50 p-2 rounded-lg border border-graphite-hairline">
      <Select
        value={fileType}
        onChange={setFileType}
        options={KYC_FILE_TYPES}
        placeholder="Select document type..."
        className="input text-xs max-w-xs"
      />
      {fileType === "99" && (
        <input
          className="input text-xs w-32"
          placeholder="Type code"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="text-xs file:btn-secondary file:text-xs file:py-1 file:px-2 file:cursor-pointer"
        disabled={!effectiveType || upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setSelectedFileName(file.name);
            upload.mutate(file);
          }
        }}
      />
      {selectedFileName && (
        <span className="text-xs font-medium text-ink bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex items-center gap-1.5 truncate max-w-xs">
          📄 {selectedFileName}
        </span>
      )}
      {upload.isPending && (
        <span className="text-xs text-brand font-medium flex items-center gap-1.5 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> Uploading...
        </span>
      )}
    </div>
  );
}

export function StakeholderCard({
  stakeholder: s,
  index: i,
  totalCount,
  userId,
  onUpdate: setS,
  onRemove,
}: {
  stakeholder: Fields;
  index: number;
  totalCount: number;
  userId: string;
  onUpdate: (index: number, key: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const f = (
    key: string,
    label: string,
    type = "text",
    placeholder = "",
    helper = "",
  ) => (
    <Field label={label} helper={helper}>
      <input
        type={type}
        className="input w-full"
        placeholder={placeholder}
        value={s[key] || ""}
        onChange={(e) => setS(i, key, e.target.value)}
      />
    </Field>
  );

  return (
    <div className="border border-graphite-hairline bg-paper rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex justify-between items-center text-xs font-semibold text-ink border-b border-graphite-hairline pb-2">
        <span>Stakeholder #{i + 1}</span>
        {totalCount > 1 && (
          <button
            type="button"
            className="cursor-pointer text-red-600 hover:underline"
            onClick={() => onRemove(i)}
          >
            Remove stakeholder
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <Select
            value={s.role}
            onChange={(v) => setS(i, "role", v)}
            options={ROLES}
          />
        </Field>
        {f("name", "Full legal name", "text", "John Doe")}
        <Field label="Gender">
          <Select
            value={s.gender}
            onChange={(v) => setS(i, "gender", v)}
            options={[
              ["1", "Male"],
              ["2", "Female"],
            ]}
          />
        </Field>
        {f("birthday", "Date of birth", "date")}
        <Field label="Nationality">
          <CountrySelect
            value={s.nationality}
            onChange={(v) => setS(i, "nationality", v)}
          />
        </Field>
        <Field label="Document issuing country">
          <CountrySelect
            value={s.document_issuing_country}
            onChange={(v) => setS(i, "document_issuing_country", v)}
          />
        </Field>
        <Field label="ID document type">
          <Select
            value={s.cert_type}
            onChange={(v) => setS(i, "cert_type", v)}
            options={CERT_TYPES}
          />
        </Field>
        {f("cert_num", "ID number", "text", "A12345678")}
        {f("effective_date", "ID issue date", "date")}
        <Field label="ID expiry date">
          <input
            type="date"
            className="input w-full"
            disabled={s.is_long_term === "1"}
            value={s.expiration_date || ""}
            onChange={(e) => setS(i, "expiration_date", e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-slate col-span-2">
          <input
            type="checkbox"
            checked={s.is_long_term === "1"}
            onChange={(e) =>
              setS(i, "is_long_term", e.target.checked ? "1" : "0")
            }
          />{" "}
          ID has no expiration date (Long-term)
        </label>
        <Field label="Residence country">
          <CountrySelect
            value={s.residence_area}
            onChange={(v) => setS(i, "residence_area", v)}
          />
        </Field>
        {f("province", "Province / state", "text", "Lagos")}
        {f("city", "City", "text", "Ikeja")}
        {f("address", "Residential address", "text", "12 Broad Street, Suite 4")}
        {s.role === "1" &&
          f("share_percentage", "Share percentage (%)", "number", "25.00", "Must be > 0 for UBO")}
      </div>

      <div className="space-y-3 pt-2 border-t border-graphite-hairline">
        <div>
          <p className="text-xs font-medium text-ink mb-1">
            ID Document Front {s.cert_front ? "✓ Uploaded" : "(Required)"}
          </p>
          <FileUploader
            userId={userId}
            defaultFileType="11"
            onUploaded={(u) => setS(i, "cert_front", u.file_id)}
          />
        </div>
        {s.cert_type === "11" && (
          <div>
            <p className="text-xs font-medium text-ink mb-1">
              ID Document Back {s.cert_back ? "✓ Uploaded" : "(Required for ID Card)"}
            </p>
            <FileUploader
              userId={userId}
              defaultFileType="11"
              onUploaded={(u) => setS(i, "cert_back", u.file_id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CollectedDocumentsImporter({
  userId,
  userData,
  files,
  onFileImported,
}: {
  userId: string;
  userData: any;
  files: KycFile[];
  onFileImported: (file: KycFile) => void;
}) {
  const profileDocs = extractProfileDocuments(userData);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({});

  if (!profileDocs.length) return null;

  const getType = (doc: ProfileDocument) =>
    selectedTypes[doc.id] || doc.suggestedFileType;

  const isAlreadyUploaded = (doc: ProfileDocument) =>
    files.some(
      (f) =>
        f.name.toLowerCase().trim() === doc.name.toLowerCase().trim() ||
        f.name.toLowerCase().includes(doc.name.toLowerCase()) ||
        doc.name.toLowerCase().includes(f.name.toLowerCase())
    );

  const importSingleDoc = async (doc: ProfileDocument, customType?: string) => {
    const fileType = customType || getType(doc);
    setLoadingDocId(doc.id);
    try {
      const res = await fetch(doc.url);
      if (!res.ok) throw new Error("Could not fetch document image/file from URL");
      const blob = await res.blob();
      const mimeType = blob.type || "image/png";
      const ext = mimeType.includes("pdf")
        ? "pdf"
        : mimeType.includes("jpeg") || mimeType.includes("jpg")
        ? "jpg"
        : "png";
      const safeName = doc.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const fileObj = new File([blob], `${safeName}.${ext}`, { type: mimeType });

      const form = new FormData();
      form.append("file", fileObj);
      form.append("fileType", fileType);

      const response = await walletApi.post(
        `/api/admin/mansa/senders/${userId}/files`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploaded: KycFile = {
        file_id: response.data.data.file_id as string,
        file_type: fileType,
        name: doc.name,
      };
      onFileImported(uploaded);
      toast.success(`Imported ${doc.name} to Mansa!`);
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      setLoadingDocId(null);
    }
  };

  const importAllDocs = async () => {
    const unimported = profileDocs.filter((d) => !isAlreadyUploaded(d));
    if (!unimported.length) {
      toast.info("All detected documents have already been imported!");
      return;
    }
    setIsImportingAll(true);
    let count = 0;
    for (const doc of unimported) {
      try {
        await importSingleDoc(doc);
        count++;
      } catch (err) {
        // continue
      }
    }
    setIsImportingAll(false);
    toast.success(`Batch imported ${count} document(s) to Mansa!`);
  };

  return (
    <div className="border border-brand/30 bg-brand/5 dark:bg-brand/15 rounded-xl p-4 space-y-3 my-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            Collected Profile Documents ({profileDocs.length})
          </h4>
          <p className="text-[11px] text-slate">
            Documents found in merchant profile. Select target Mansa document type and click import.
          </p>
        </div>
        <button
          type="button"
          disabled={isImportingAll || !!loadingDocId}
          onClick={importAllDocs}
          className="btn text-xs bg-brand text-white hover:bg-brand/90 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
        >
          {isImportingAll ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Importing All...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Import All Documents
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
        {profileDocs.map((doc) => {
          const isLoading = loadingDocId === doc.id;
          const uploaded = isAlreadyUploaded(doc);
          const currentType = getType(doc);

          return (
            <div
              key={doc.id}
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-colors ${
                uploaded
                  ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800/60"
                  : "border-brand/20 bg-white dark:bg-brand/20 dark:border-brand/30 hover:border-brand/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-brand/10 dark:bg-brand/30 flex items-center justify-center shrink-0 text-brand">
                    <FileText className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{doc.name}</p>
                    <span className="text-[10px] text-slate/70 block">{doc.source}</span>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate hover:text-brand p-1 shrink-0"
                  title="View Cloudinary document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={currentType}
                  disabled={uploaded || isLoading}
                  onChange={(e) =>
                    setSelectedTypes((prev) => ({
                      ...prev,
                      [doc.id]: e.target.value,
                    }))
                  }
                  className="input text-[11px] py-1 px-2 w-full truncate dark:bg-brand/20 dark:border-brand/30"
                >
                  {KYC_FILE_TYPES.map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={uploaded || isLoading || isImportingAll}
                  onClick={() => importSingleDoc(doc)}
                  className={`btn text-[11px] py-1 px-3 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 font-medium transition-all ${
                    uploaded
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-brand text-white hover:bg-brand/90 shadow-sm"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </>
                  ) : uploaded ? (
                    <>
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      Imported
                    </>
                  ) : (
                    "Import"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
