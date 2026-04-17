import { api } from "../lib/api";
import type { CheckoutSession } from "../lib/types";

export async function createCheckoutSession() {
  const { data } = await api.post<CheckoutSession>("/billing/checkout-session");
  return data;
}
