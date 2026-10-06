import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { walletApi } from "../../lib/api";
import { errorMessage } from "./-mansa-types";
import type { Fields } from "./-mansa-kyb-types";
import { CERT_TYPES, ROLES } from "./-mansa-kyb-types";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-slate space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <select
      className="input w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select...</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function FileUploader({
  userId,
  defaultFileType = "",
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
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("fileType", fileType.trim());
      const response = await walletApi.post(
        `/api/admin/mansa/senders/${userId}/files`,
        form,
      );
      return {
        file_id: response.data.data.file_id as string,
        file_type: fileType.trim(),
        name: file.name,
      };
    },
    onSuccess: (uploaded) => {
      toast.success(`Uploaded ${uploaded.name}`);
      onUploaded(uploaded);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex gap-2 items-center">
      <input
        className="input w-32"
        placeholder="File type code"
        value={fileType}
        onChange={(e) => setFileType(e.target.value)}
      />
      <input
        type="file"
        className="text-xs"
        disabled={!fileType.trim() || upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
      {upload.isPending && (
        <span className="text-xs text-slate">Uploading...</span>
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
  const f = (key: string, label: string, type = "text") => (
    <Field label={label}>
      <input
        type={type}
        className="input w-full"
        value={s[key] || ""}
        onChange={(e) => setS(i, key, e.target.value)}
      />
    </Field>
  );

  return (
    <div className="border border-graphite-hairline rounded p-3 space-y-3">
      <div className="flex justify-between text-xs text-slate">
        <span>Stakeholder {i + 1}</span>
        {totalCount > 1 && (
          <button
            type="button"
            className="cursor-pointer text-red-600"
            onClick={() => onRemove(i)}
          >
            Remove
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
        {f("name", "Full name")}
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
        {f("nationality", "Nationality (ISO-2)")}
        {f("document_issuing_country", "Document issuing country (ISO-2)")}
        <Field label="ID type">
          <Select
            value={s.cert_type}
            onChange={(v) => setS(i, "cert_type", v)}
            options={CERT_TYPES}
          />
        </Field>
        {f("cert_num", "ID number")}
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
          ID has no expiry
        </label>
        {f("residence_area", "Residence country (ISO-2)")}
        {f("province", "Province / state")}
        {f("city", "City")}
        {f("address", "Address (with unit no.)")}
        {s.role === "1" &&
          f("share_percentage", "Share percentage (e.g. 16.36)")}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-slate">
          ID front {s.cert_front && "- uploaded"}
        </p>
        <FileUploader
          userId={userId}
          onUploaded={(u) => setS(i, "cert_front", u.file_id)}
        />
        {s.cert_type === "11" && (
          <>
            <p className="text-xs text-slate">
              ID back {s.cert_back && "- uploaded"}
            </p>
            <FileUploader
              userId={userId}
              onUploaded={(u) => setS(i, "cert_back", u.file_id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
