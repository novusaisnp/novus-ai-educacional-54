import { logger } from "@/lib/logger";
import { safeToast } from "@/lib/safeToast";

export interface ErrorWithCode extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  static handle(error: unknown, options: ErrorHandlerOptions = {}) {
    const {
      showToast = true,
      fallbackMessage = "Ocorreu um erro inesperado",
      context = {}
    } = options;

    let message = fallbackMessage;
    let details = "";

    if (error instanceof Error) {
      const errorWithCode = error as ErrorWithCode;
      
      // Mapear códigos Supabase para mensagens amigáveis
      switch (errorWithCode.code) {
        case "PGRST116":
          message = "Nenhum registro encontrado";
          break;
        case "23505":
          message = "Este registro já existe";
          break;
        case "23503":
          message = "Não é possível excluir este registro pois ele está sendo usado";
          break;
        case "42501":
          message = "Você não tem permissão para esta ação";
          break;
        case "23514":
          message = "Dados inválidos fornecidos";
          break;
        default:
          message = errorWithCode.message || fallbackMessage;
      }

      details = errorWithCode.details || errorWithCode.hint || "";
    }

    // Log do erro
    logger.error("ErrorHandler.handle", {
      message,
      details,
      originalError: error instanceof Error ? error.message : String(error),
      context
    });

    // Mostrar toast se solicitado
    if (showToast) {
      safeToast({
        title: "Erro",
        description: message,
        variant: "destructive"
      });
    }

    return { message, details };
  }

  static handleSupabaseError(error: unknown, options: ErrorHandlerOptions = {}) {
    return this.handle(error, {
      ...options,
      context: { ...options.context, source: "supabase" }
    });
  }

  static handleERPError(error: unknown, options: ErrorHandlerOptions = {}) {
    return this.handle(error, {
      ...options,
      fallbackMessage: "Erro na integração com sistema ERP",
      context: { ...options.context, source: "erp" }
    });
  }

  static handleEdgeFunctionError(error: unknown, options: ErrorHandlerOptions = {}) {
    return this.handle(error, {
      ...options,
      fallbackMessage: "Erro no processamento do servidor",
      context: { ...options.context, source: "edge_function" }
    });
  }
}

export const errorHandler = ErrorHandler;