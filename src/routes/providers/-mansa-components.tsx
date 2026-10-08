import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "../../components/ui/Modal";
import { walletApi } from "../../lib/api";
import type { MerchantOption, Pagination, Sender } from "./-mansa-types";
import { errorMessage } from "./-mansa-types";
import { EnterpriseKybForm } from "./-mansa-kyb";

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function RegisterModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [pickerPage, setPickerPage] = useState(1);
  const [merchant, setMerchant] = useState<MerchantOption | null>(null);
  const [mode, setMode] = useState<"create" | "link">("create");
  const [linkId, setLinkId] = useState("");
  const [form, setForm] = useState({
    profile_type: "enterprise",
    legal_name: "",
    country_code: "",
    registration_number: "",
    address: "",
    contact_email: "",
    contact_phone: "",
  });

  const { data: result } = useQuery({
    queryKey: ["admin-mansa-merchants", debouncedSearch, pickerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get("/api/admin/mansa/merchants", {
        params: { search: debouncedSearch, page: pickerPage, limit: 10 },
      });
      return response.data as {
        data: MerchantOption[];
        pagination: Pagination;
      };
    },
    enabled: !merchant,
  });
  const merchants = result?.data || [];
  const totalPages = result?.pagination?.totalPages || 1;

  const register = useMutation({
    mutationFn: () =>
      walletApi.post(
        `/api/admin/mansa/senders/${merchant!.user_id}`,
        mode === "link"
          ? { sender_profile_id: linkId.trim() }
          : {
              sender: {
                ...Object.fromEntries(
                  Object.entries(form).filter(([, v]) => v.trim() !== ""),
                ),
                country_code: form.country_code.toUpperCase(),
              },
            },
      ),
    onSuccess: () => {
      toast.success("Sender registered");
      onDone();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSubmit =
    !!merchant &&
    (mode === "link"
      ? !!linkId.trim()
      : !!form.legal_name.trim() && form.country_code.length === 2);

  return (
    <Modal isOpen onClose={onClose} title="Register Mansa sender" size="lg">
      <div className="space-y-4">
        {merchant ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">
                {merchant.merchant_name || "Unnamed merchant"}
              </p>
              <p className="text-xs text-slate">{merchant.email}</p>
            </div>
            <button
              className="btn-secondary cursor-pointer"
              onClick={() => setMerchant(null)}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="Search merchant by business name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickerPage(1);
              }}
              autoFocus
            />
            <ul className="divide-y divide-graphite-hairline max-h-56 overflow-y-auto">
              {merchants.map((m) => (
                <li key={m.user_id}>
                  <button
                    type="button"
                    onClick={() => setMerchant(m)}
                    className="w-full text-left py-2 px-1 hover:bg-vellum cursor-pointer"
                  >
                    <p className="text-sm text-ink">
                      {m.merchant_name || "Unnamed merchant"}
                    </p>
                    <p className="text-xs text-slate">{m.email}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-slate">
              <button
                type="button"
                className="btn-secondary cursor-pointer"
                disabled={pickerPage <= 1}
                onClick={() => setPickerPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {pickerPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary cursor-pointer"
                disabled={pickerPage >= totalPages}
                onClick={() => setPickerPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === "create"}
              onChange={() => setMode("create")}
            />{" "}
            Create new sender
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === "link"}
              onChange={() => setMode("link")}
            />{" "}
            Link existing Mansa sender
          </label>
        </div>

        {mode === "link" ? (
          <input
            className="input w-full"
            placeholder="Mansa sender profile ID (UUID)"
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <select
              className="input"
              value={form.profile_type}
              onChange={(e) =>
                setForm({ ...form, profile_type: e.target.value })
              }
            >
              <option value="enterprise">Enterprise</option>
              <option value="individual">Individual</option>
            </select>
            <input
              className="input"
              placeholder="Country code (e.g. NG)"
              maxLength={2}
              value={form.country_code}
              onChange={(e) =>
                setForm({ ...form, country_code: e.target.value })
              }
            />
            <input
              className="input col-span-2"
              placeholder="Legal name"
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Registration number"
              value={form.registration_number}
              onChange={(e) =>
                setForm({ ...form, registration_number: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Contact email"
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Contact phone"
              value={form.contact_phone}
              onChange={(e) =>
                setForm({ ...form, contact_phone: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary cursor-pointer"
            disabled={!canSubmit || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function KycModal({
  sender,
  onClose,
  onDone,
}: {
  sender: Sender;
  onClose: () => void;
  onDone: () => void;
}) {
  const [profileType, setProfileType] = useState("enterprise");
  const [payload, setPayload] = useState("{\n  \n}");

  const submit = useMutation({
    mutationFn: () =>
      walletApi.post(`/api/admin/mansa/senders/${sender.user_id}/kyc`, {
        profile_type: profileType,
        kyc: JSON.parse(payload),
      }),
    onSuccess: () => {
      toast.success("KYC submitted");
      onDone();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const send = () => {
    try {
      JSON.parse(payload);
    } catch {
      toast.error("KYC payload must be valid JSON");
      return;
    }
    submit.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Submit KYC - ${sender.merchant_name || sender.merchant_email || "merchant"}`}
      size="full"
    >
      <div className="space-y-4">
        <select
          className="input"
          value={profileType}
          onChange={(e) => setProfileType(e.target.value)}
        >
          <option value="enterprise">Enterprise KYC</option>
          <option value="individual">Personal KYC</option>
        </select>
        {profileType === "enterprise" ? (
          <EnterpriseKybForm
            userId={sender.user_id}
            onSubmitted={() => {
              onDone();
              onClose();
            }}
          />
        ) : (
          <textarea
            className="input w-full font-mono text-xs"
            rows={14}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Mansa personal KYC payload (JSON)"
          />
        )}
        {profileType === "individual" && (
          <div className="flex justify-end gap-2">
            <button className="btn-secondary cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary cursor-pointer"
              disabled={submit.isPending}
              onClick={send}
            >
              {submit.isPending ? "Submitting..." : "Submit KYC"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
