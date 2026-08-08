import { toast } from "@/hooks/use-toast";

export function safeToast(opts: Parameters<typeof toast>[0]) {
  if (typeof window === "undefined") return;
  try {
    toast(opts);
  } catch {
    /* silencia quando provider não carregou ainda */ 
  }
}