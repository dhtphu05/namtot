import { apiClient } from "@/lib/api/client";
import type { ChatbotActionExecutionResult, ChatbotMessageRequest, ChatbotResponse } from "../types";

export const chatbotApi = {
  sendMessage: async (payload: ChatbotMessageRequest) => {
    return apiClient<ChatbotResponse>("/api/chatbot/message", {
      method: "POST",
      body: payload,
    });
  },
  confirmAction: async (actionId: string) => {
    return apiClient<ChatbotActionExecutionResult>(`/api/chatbot/actions/${actionId}/confirm`, {
      method: "POST",
    });
  },
  executeAction: async (actionId: string) => {
    return apiClient<ChatbotActionExecutionResult>(`/api/chatbot/actions/${actionId}/execute`, {
      method: "POST",
    });
  },
  cancelAction: async (actionId: string) => {
    return apiClient<ChatbotActionExecutionResult>(`/api/chatbot/actions/${actionId}/cancel`, {
      method: "POST",
    });
  },
};
