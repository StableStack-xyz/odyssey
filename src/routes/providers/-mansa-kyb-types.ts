export type Fields = Record<string, string>;

export interface KycFile {
  file_type: string;
  file_id: string;
  name: string;
}

export const BUSINESS_TYPES = [
  ["1", "Limited company"],
  ["2", "LLC"],
  ["3", "Sole proprietorship"],
  ["4", "Listed company"],
  ["5", "Unlisted stock company"],
  ["6", "State-owned"],
  ["7", "Other"],
];

export const MONTHLY_COUNT = [
  ["1", "> 1,000"],
  ["2", "100 - 1,000"],
  ["3", "1 - 99"],
];

export const MONTHLY_VOLUME = [
  ["1", "> USD 4M"],
  ["2", "USD 300k - 999,999"],
  ["3", "> USD 1M"],
];

export const SINGLE_TX = [
  ["1", "> USD 100k"],
  ["2", "USD 10k - 99,999"],
  ["3", "USD 0 - 1M"],
];

export const ROLES = [
  ["1", "Ultimate beneficiary"],
  ["2", "Director"],
  ["3", "Authorized signatory"],
];

export const CERT_TYPES = [
  ["11", "ID card"],
  ["13", "Passport"],
  ["14", "Driver's license"],
];

export const COMPANY_REQUIRED = [
  "member_name",
  "name_on_cert",
  "reg_country",
  "province",
  "city",
  "reg_address",
  "postcode",
  "actual_operating_address",
  "reg_number",
  "phone_area_code",
  "phone_num",
  "email",
  "effective_date",
  "business_type",
  "industry_type",
  "business_scope",
  "business_category",
  "operation_region",
  "payment_regions",
  "export_regions",
  "amt_count",
  "amt_amt",
  "ex_amt",
  "business_use_case",
];

export const STAKEHOLDER_REQUIRED = [
  "role",
  "name",
  "gender",
  "nationality",
  "document_issuing_country",
  "cert_type",
  "cert_num",
  "effective_date",
  "cert_front",
  "birthday",
  "residence_area",
  "province",
  "city",
  "address",
];

export const emptyStakeholder = (): Fields => ({
  role: "1",
  name: "",
  gender: "1",
  nationality: "",
  document_issuing_country: "",
  cert_type: "11",
  cert_num: "",
  effective_date: "",
  expiration_date: "",
  is_long_term: "0",
  cert_front: "",
  cert_back: "",
  birthday: "",
  residence_area: "",
  province: "",
  city: "",
  address: "",
  share_percentage: "",
});
