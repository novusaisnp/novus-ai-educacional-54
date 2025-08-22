
export type DeepLink =
  | { type: "financeiro"; documentNumber?: string }
  | { type: "documentos"; missing?: boolean }
  | { type: "demandas"; requestId?: string };

export function buildPortalLink(link: DeepLink): string {
  switch (link.type) {
    case "financeiro":
      return `/portal/financeiro${link.documentNumber ? `?highlight=${encodeURIComponent(link.documentNumber)}` : ""}`;
    case "documentos":
      return `/portal/documentos${link.missing ? `?missing=true` : ""}`;
    case "demandas":
      return `/portal/demandas${link.requestId ? `?focus=${encodeURIComponent(link.requestId)}` : ""}`;
    default:
      return "/portal";
  }
}
