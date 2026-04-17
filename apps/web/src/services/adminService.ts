import { api } from "../lib/api";
import type {
  AdminCacheInvalidationView,
  AdminIngestionStatusView,
  AdminRefreshSignalsView,
} from "../lib/types";

export async function fetchAdminIngestionStatus() {
  const { data } = await api.get<AdminIngestionStatusView>("/admin/ingestion/status");
  return data;
}

export async function triggerAdminSignalRefresh(payload?: { sourceKey?: string }) {
  const { data } = await api.post<AdminRefreshSignalsView>(
    "/admin/ingestion/refresh",
    payload ?? {},
  );
  return data;
}

export async function invalidateAdminIntelligenceCache(payload?: {
  countryCode?: string;
  actionKey?: string;
}) {
  const { data } = await api.post<AdminCacheInvalidationView>(
    "/admin/intelligence/cache/invalidate",
    payload ?? {},
  );
  return data;
}
