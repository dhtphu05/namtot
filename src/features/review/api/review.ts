import { apiClient } from "@/lib/api/client";
import { useApp } from "@/lib/store";

// Temporary delay function for mock
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export interface ReviewTaskResponse {
  id: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  studentMssv: string;
  studentKhoa: string;
  evidenceName: string;
  criterion: string;
  targetLevel: string;
  sourceType: string;
  confidence: number;
  status: string;
  dueDate: string;
  assignedOfficerId: string;
}

export const reviewApi = {
  // TODO: Replace with real API call when backend is ready
  getReviewTasks: async (filters?: {
    criterion?: string;
    status?: string;
    officerId?: string;
  }) => {
    // Simulate network delay
    await delay(500);

    let tasks = useApp.getState().tasks;
    
    if (filters) {
      if (filters.officerId) {
        // Mock filtering logic for the current officer
        tasks = tasks.filter((t) => t.assignedOfficerId === filters.officerId || ["priority"].includes(t.criterion)); 
      }
      if (filters.criterion && filters.criterion !== "all") {
        tasks = tasks.filter((t) => t.criterion === filters.criterion);
      }
      if (filters.status && filters.status !== "all") {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
    }

    return { success: true, data: tasks as ReviewTaskResponse[] };
  },

  getReviewTaskDetail: async (studentId: string) => {
    await delay(500);
    const tasks = useApp.getState().tasks;
    const task = tasks.find((t) => t.studentId === studentId);
    if (!task) {
      throw new Error("Task not found");
    }
    return { success: true, data: task as ReviewTaskResponse };
  },

  submitDecision: async (studentId: string, payload: { decision: "accepted" | "rejected" | "supplement_required" | "resolution_needed"; reason?: string }) => {
    await delay(800);
    // Mutate the mock store
    useApp.getState().decideTask(studentId, payload.decision as any);
    
    // Also push audit (in a real app, backend handles this)
    useApp.getState().pushAudit({
      actor: "Cán bộ xét duyệt",
      role: "Cán bộ",
      action: `Ra quyết định: ${payload.decision}`,
      before: "Đang xét",
      after: payload.decision,
      reason: payload.reason || "Cập nhật qua API"
    });

    return { success: true, data: null };
  }
};
