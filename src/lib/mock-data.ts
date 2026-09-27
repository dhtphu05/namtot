// Mock data for 5TOT Platform — realistic Vietnamese Sinh viên 5 tốt content
export type Role =
  | "student"
  | "data_uploader"
  | "officer"
  | "manager"
  | "committee"
  | "city_officer"
  | "city_manager"
  | "city_committee"
  | "admin"
  | "collective";

export const ROLES: Record<Role, { label: string; desc: string; initial: string; icon: string }> = {
  student: {
    label: "Sinh viên",
    desc: "Hồ sơ Sinh viên 5 tốt năm học 2025–2026",
    initial: "SV",
    icon: "SV",
  },
  officer: {
    label: "Cán bộ xét duyệt",
    desc: "Xét duyệt minh chứng & hồ sơ SV5T",
    initial: "CB",
    icon: "CB",
  },
  manager: {
    label: "Quản lý / Hội đồng",
    desc: "Theo dõi tổng quan, phân công, audit",
    initial: "QL",
    icon: "QL",
  },
  collective: {
    label: "Tập thể / Chi hội",
    desc: "Hồ sơ Tập thể Sinh viên 5 tốt",
    initial: "TT",
    icon: "TT",
  },
  data_uploader: {
    label: "Cán bộ nhập liệu",
    desc: "Thông tin quyền truy cập của đơn vị",
    initial: "DL",
    icon: "DL",
  },
  city_officer: {
    label: "Cán bộ xét duyệt thành phố",
    desc: "Hàng đợi xét duyệt theo chuyên môn",
    initial: "CB",
    icon: "CB",
  },
  city_manager: {
    label: "Quản lý thành phố",
    desc: "Điều phối review và theo dõi vận hành",
    initial: "QL",
    icon: "QL",
  },
  city_committee: {
    label: "Hội đồng thành phố",
    desc: "Resolution Hub và kết luận cuối",
    initial: "HĐ",
    icon: "HĐ",
  },
  committee: {
    label: "Hội đồng trường",
    desc: "Resolution Hub và kết luận cuối",
    initial: "HĐ",
    icon: "HĐ",
  },
  admin: {
    label: "Quản trị hệ thống",
    desc: "Quản lý đơn vị triển khai",
    initial: "QT",
    icon: "QT",
  },
};

// =================== MEDIA LIBRARY ===================
// Real certificate sample for Sinh viên 5 tốt
export const SAMPLE_GCN =
  "https://hcmyu.hpu2.edu.vn/public/fileupload/source/Tai%20lieu/GCN_daoductot_Record-146-1.png";

export const MEDIA = {
  avatars: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
  ],
  evidence: {
    sample: SAMPLE_GCN,
    gpa: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Bang+Diem+GPA+2024-2025",
    drl: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Phieu+Diem+Ren+Luyen",
    volunteer: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Giay+Chung+Nhan+Tinh+Nguyen",
    language: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Chung+Chi+Ngoai+Ngu",
    fitness: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Giay+Chung+Nhan+Sinh+Vien+Khoe",
    nckh: SAMPLE_GCN,
    list: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Danh+Sach+Tham+Gia+Su+Kien",
    minutes: "https://placehold.co/900x1200/FFFFFF/0057C2/png?text=Bien+Ban+Xac+Nhan+Tap+The",
  },
  events: [
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1000&h=700&fit=crop",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1000&h=700&fit=crop",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1000&h=700&fit=crop",
  ],
  hero: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=800&fit=crop"],
};

export const CRITERIA = [
  {
    key: "dao-duc",
    label: "Đạo đức tốt",
    short: "Đạo đức",
    color: "#ef4444",
    iconKey: "ShieldCheck" as const,
    icon: "ShieldCheck",
  },
  {
    key: "hoc-tap",
    label: "Học tập tốt",
    short: "Học tập",
    color: "#00AEEF",
    iconKey: "GraduationCap" as const,
    icon: "GraduationCap",
  },
  {
    key: "the-luc",
    label: "Thể lực tốt",
    short: "Thể lực",
    color: "#22c55e",
    iconKey: "Dumbbell" as const,
    icon: "Dumbbell",
  },
  {
    key: "tinh-nguyen",
    label: "Tình nguyện tốt",
    short: "Tình nguyện",
    color: "#f59e0b",
    iconKey: "HeartHandshake" as const,
    icon: "HeartHandshake",
  },
  {
    key: "hoi-nhap",
    label: "Hội nhập tốt",
    short: "Hội nhập",
    color: "#0057C2",
    iconKey: "Globe2" as const,
    icon: "Globe2",
  },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const LEVELS = [
  {
    key: "truong",
    label: "Cấp Trường",
    difficulty: 1,
    color: "#22c55e",
    desc: "Tiêu chí cơ bản — phù hợp số đông sinh viên",
  },
  {
    key: "dhdn",
    label: "Cấp Đại học Đà Nẵng",
    difficulty: 2,
    color: "#00AEEF",
    desc: "Có thành tích nổi bật ở ít nhất 1 tiêu chí",
  },
  {
    key: "thanh-pho",
    label: "Cấp Thành phố",
    difficulty: 3,
    color: "#f59e0b",
    desc: "Sinh viên xuất sắc, minh chứng đầy đủ & xác thực",
  },
  {
    key: "trung-uong",
    label: "Cấp Trung ương",
    difficulty: 4,
    color: "#0057C2",
    desc: "Tiêu biểu toàn quốc — thành tích vượt trội",
  },
] as const;

// Single-application lifecycle
export const PROFILE_STATUS = {
  "not-started": {
    label: "Chưa bắt đầu",
    color: "bg-slate-100 text-slate-700",
    cta: "Bắt đầu hồ sơ",
  },
  drafting: {
    label: "Đang hoàn thiện bản nháp",
    color: "bg-cyan-50 text-cyan-700",
    cta: "Tiếp tục hoàn thiện bản nháp",
  },
  prechecked: {
    label: "Đã tiền kiểm",
    color: "bg-indigo-50 text-indigo-700",
    cta: "Xem kết quả tiền kiểm",
  },
  ready: { label: "Sẵn sàng nộp", color: "bg-emerald-50 text-emerald-700", cta: "Nộp chính thức" },
  submitted: {
    label: "Đã nộp chính thức",
    color: "bg-blue-50 text-blue-700",
    cta: "Xem trạng thái",
  },
  supplement: {
    label: "Cần bổ sung minh chứng",
    color: "bg-amber-50 text-amber-700",
    cta: "Bổ sung minh chứng",
  },
  reviewing: {
    label: "Đang xét duyệt",
    color: "bg-indigo-50 text-indigo-700",
    cta: "Xem trạng thái",
  },
  resolution: {
    label: "Đang xử lý hồ sơ mập mờ",
    color: "bg-purple-50 text-purple-700",
    cta: "Xem trạng thái",
  },
  done: { label: "Hoàn tất", color: "bg-emerald-50 text-emerald-700", cta: "Xem kết quả" },
} as const;
export type ProfileLifecycle = keyof typeof PROFILE_STATUS;

// Legacy alias kept for existing routes
export const STATUS = {
  draft: { label: "Nháp", color: "bg-slate-100 text-slate-700" },
  prechecking: { label: "Đang tiền kiểm", color: "bg-cyan-50 text-cyan-700" },
  submitted: { label: "Mới nộp", color: "bg-blue-50 text-blue-700" },
  reviewing: { label: "Đang xét", color: "bg-indigo-50 text-indigo-700" },
  supplement: { label: "Cần bổ sung", color: "bg-amber-50 text-amber-700" },
  resolution: { label: "Mập mờ", color: "bg-purple-50 text-purple-700" },
  approved: { label: "Đã duyệt", color: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Từ chối", color: "bg-rose-50 text-rose-700" },
  done: { label: "Hoàn tất", color: "bg-emerald-50 text-emerald-700" },
} as const;
export type ProfileStatus = keyof typeof STATUS;

// =================== STUDENT ===================
export const CURRENT_STUDENT = {
  id: "sv-001",
  name: "Nguyễn Linh An",
  mssv: "21IT001",
  khoa: "Công nghệ Thông tin",
  lop: "21IT_CLC1",
  email: "an.nl.21it@sv.udn.vn",
  phone: "0905 123 456",
  gpa: "3.72",
  drl: "92",
  avatar: MEDIA.avatars[1],
};

// =================== EVENT REGISTRY ===================
export type IndexingStatus =
  | "not_started"
  | "uploaded"
  | "pending_indexing"
  | "ocr_processing"
  | "extracting"
  | "checking_registry"
  | "indexed"
  | "failed"
  | "needs_manual_review";

export const INDEXING_STATUS_LABEL: Record<
  IndexingStatus,
  { label: string; tone: "muted" | "brand" | "success" | "warning" | "error" }
> = {
  not_started: { label: "Chưa bắt đầu", tone: "muted" },
  uploaded: { label: "Đã upload", tone: "brand" },
  pending_indexing: { label: "Chờ index", tone: "warning" },
  ocr_processing: { label: "SmartReader OCR", tone: "brand" },
  extracting: { label: "Đang bóc tách", tone: "brand" },
  checking_registry: { label: "Đối chiếu Event Registry", tone: "brand" },
  indexed: { label: "Đã index", tone: "success" },
  failed: { label: "Index lỗi", tone: "error" },
  needs_manual_review: { label: "Cần cán bộ xác minh", tone: "warning" },
};

export interface EventParticipant {
  id: string;
  eventId: string;
  studentName: string;
  studentCode: string; // MSSV
  className: string;
  faculty: string;
  participationStatus: "Tham gia" | "Vắng" | "Đại biểu";
  convertedValue: number;
  sourceFile: string;
}

export interface EventRegistry {
  id: string;
  eventName: string;
  criterion: CriterionKey | "priority";
  organizer: string;
  organizerLevel: "Khoa" | "Trường" | "ĐHĐN" | "Thành phố" | "Trung ương";
  startDate: string;
  endDate: string;
  convertedValue: number;
  convertedUnit: "ngày" | "buổi" | "giải" | "lượt tham gia";
  eligibleLevels: string[];
  participantCount: number;
  rosterIndexed: boolean;
  rosterFileUrl: string;
  sampleCertificateUrl: string;
  status: "pending_indexing" | "indexed" | "needs_review" | "approved";
  indexingStatus: IndexingStatus;
  requiredFields: string[];
  notes: string;
}

export const EVENT_REGISTRY: EventRegistry[] = [
  {
    id: "ev-mhx-2025",
    eventName: "Chiến dịch Mùa hè xanh 2025",
    criterion: "tinh-nguyen",
    organizer: "Hội Sinh viên Trường ĐH Bách khoa — ĐHĐN",
    organizerLevel: "Trường",
    startDate: "10/07/2025",
    endDate: "30/07/2025",
    convertedValue: 3,
    convertedUnit: "ngày",
    eligibleLevels: ["truong", "dhdn", "thanh-pho"],
    participantCount: 186,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Lớp", "Khoa", "Số ngày tham gia"],
    notes: "Áp dụng cho tiêu chí Tình nguyện tốt cấp Trường, ĐHĐN, Thành phố.",
  },
  {
    id: "ev-hm-2025-1",
    eventName: "Hiến máu nhân đạo đợt 1 năm 2025",
    criterion: "tinh-nguyen",
    organizer: "Đoàn Thanh niên Trường ĐHBK",
    organizerLevel: "Trường",
    startDate: "15/03/2025",
    endDate: "15/03/2025",
    convertedValue: 1,
    convertedUnit: "ngày",
    eligibleLevels: ["truong", "dhdn"],
    participantCount: 94,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Đơn vị tổ chức"],
    notes: "Hiến máu được quy đổi 1 ngày tình nguyện theo quy định nội bộ.",
  },
  {
    id: "ev-thcb-2025",
    eventName: "Tập huấn cán bộ Đoàn – Hội năm 2025",
    criterion: "hoi-nhap",
    organizer: "Đoàn Trường ĐH Bách khoa",
    organizerLevel: "Trường",
    startDate: "20/04/2025",
    endDate: "22/04/2025",
    convertedValue: 3,
    convertedUnit: "buổi",
    eligibleLevels: ["truong", "dhdn"],
    participantCount: 72,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Lớp"],
    notes: "Dùng cho tiêu chí Hội nhập tốt — kỹ năng và công tác Hội–Đoàn.",
  },
  {
    id: "ev-ielts-glq-2025",
    eventName: "Hội thảo quốc tế AI & Education 2025",
    criterion: "hoi-nhap",
    organizer: "Khoa CNTT phối hợp Viện CNTT Singapore",
    organizerLevel: "ĐHĐN",
    startDate: "05/05/2025",
    endDate: "06/05/2025",
    convertedValue: 1,
    convertedUnit: "lượt tham gia",
    eligibleLevels: ["dhdn", "thanh-pho", "trung-uong"],
    participantCount: 48,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Email"],
    notes: "Hoạt động giao lưu quốc tế — tính cho tiêu chí Hội nhập tốt.",
  },
  {
    id: "ev-bdkhoacntt-2025",
    eventName: "Giải bóng đá sinh viên Khoa CNTT 2025",
    criterion: "the-luc",
    organizer: "Liên chi đoàn Khoa CNTT",
    organizerLevel: "Khoa",
    startDate: "10/04/2025",
    endDate: "20/04/2025",
    convertedValue: 1,
    convertedUnit: "giải",
    eligibleLevels: ["truong"],
    participantCount: 64,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Đội"],
    notes: "Giải thể thao cấp Khoa — dùng cho tiêu chí Thể lực tốt.",
  },
  {
    id: "ev-olympic-tin-2025",
    eventName: "Olympic Tin học cấp Trường 2025",
    criterion: "hoc-tap",
    organizer: "Trường ĐH Bách khoa — ĐHĐN",
    organizerLevel: "Trường",
    startDate: "12/05/2025",
    endDate: "12/05/2025",
    convertedValue: 1,
    convertedUnit: "giải",
    eligibleLevels: ["truong", "dhdn", "thanh-pho"],
    participantCount: 38,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Thứ hạng"],
    notes: "Giải học thuật — có thể dùng cho ưu tiên xét cấp cao hơn.",
  },
  {
    id: "ev-svkhoe-2025",
    eventName: "Hội thi Sinh viên khỏe cấp Trường 2025",
    criterion: "the-luc",
    organizer: "Đoàn Trường ĐHBK",
    organizerLevel: "Trường",
    startDate: "10/03/2025",
    endDate: "10/03/2025",
    convertedValue: 1,
    convertedUnit: "lượt tham gia",
    eligibleLevels: ["truong", "dhdn"],
    participantCount: 220,
    rosterIndexed: true,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "indexed",
    indexingStatus: "indexed",
    requiredFields: ["Họ tên", "MSSV", "Kết quả"],
    notes: "Đạt = đủ chuẩn rèn luyện thể lực cho tiêu chí Thể lực tốt.",
  },
  {
    id: "ev-asd-2025",
    eventName: "Cuộc thi Ánh sáng soi đường 2025",
    criterion: "dao-duc",
    organizer: "Trung ương Hội Sinh viên Việt Nam",
    organizerLevel: "Trung ương",
    startDate: "15/05/2025",
    endDate: "30/06/2025",
    convertedValue: 1,
    convertedUnit: "giải",
    eligibleLevels: ["truong", "dhdn", "thanh-pho", "trung-uong"],
    participantCount: 156,
    rosterIndexed: false,
    rosterFileUrl: MEDIA.evidence.list,
    sampleCertificateUrl: SAMPLE_GCN,
    status: "needs_review",
    indexingStatus: "checking_registry",
    requiredFields: ["Họ tên", "MSSV", "Vòng thi"],
    notes: "Cuộc thi tìm hiểu chủ nghĩa Mác–Lênin, tư tưởng Hồ Chí Minh.",
  },
];

// Roster participant rows (current student is included in Mùa hè xanh and Sinh viên khỏe)
export const EVENT_PARTICIPANTS: EventParticipant[] = [
  {
    id: "p-1",
    eventId: "ev-mhx-2025",
    studentName: "Nguyễn Linh An",
    studentCode: "21IT001",
    className: "21IT_CLC1",
    faculty: "Công nghệ Thông tin",
    participationStatus: "Tham gia",
    convertedValue: 3,
    sourceFile: "DS_MuaHeXanh_2025.xlsx",
  },
  {
    id: "p-2",
    eventId: "ev-mhx-2025",
    studentName: "Trần Minh Khoa",
    studentCode: "21ECE042",
    className: "21DT_CLC2",
    faculty: "Điện tử Viễn thông",
    participationStatus: "Tham gia",
    convertedValue: 3,
    sourceFile: "DS_MuaHeXanh_2025.xlsx",
  },
  {
    id: "p-3",
    eventId: "ev-svkhoe-2025",
    studentName: "Nguyễn Linh An",
    studentCode: "21IT001",
    className: "21IT_CLC1",
    faculty: "Công nghệ Thông tin",
    participationStatus: "Tham gia",
    convertedValue: 1,
    sourceFile: "DS_SinhVienKhoe_2025.xlsx",
  },
  {
    id: "p-4",
    eventId: "ev-thcb-2025",
    studentName: "Lê Hoàng Nam",
    studentCode: "21ME119",
    className: "21CK1",
    faculty: "Cơ khí",
    participationStatus: "Tham gia",
    convertedValue: 3,
    sourceFile: "DS_TapHuanCBDoanHoi.xlsx",
  },
  {
    id: "p-5",
    eventId: "ev-olympic-tin-2025",
    studentName: "Đặng Thu Hà",
    studentCode: "22BA512",
    className: "22KT3",
    faculty: "Kinh tế",
    participationStatus: "Tham gia",
    convertedValue: 1,
    sourceFile: "DS_Olympic_Tin_2025.xlsx",
  },
];

// =================== EVIDENCE & METRICS ===================
export type EvidenceSourceType =
  "metric_input" | "event_import" | "manual_upload" | "collective_import";
export type EvidenceReviewStatus =
  "not_reviewed" | "pending" | "accepted" | "rejected" | "supplement_required" | "ambiguous";

export interface Evidence {
  id: string;
  applicationId: string;
  evidenceName: string; // BẮT BUỘC
  criterion: CriterionKey | "priority";
  sourceType: EvidenceSourceType;
  eventId?: string;
  fileUrl: string;
  originalFileName?: string;
  indexingStatus: IndexingStatus;
  extractedFields: Record<string, string>;
  matchedEvent?: string;
  matchedKnowledgeItems: string[];
  confidence: number;
  reviewStatus: EvidenceReviewStatus;
  assignedOfficerId?: string;
  warnings: string[];
  levelSuggest: string;
}

export interface MetricInput {
  id: string;
  applicationId: string;
  type: "gpa" | "conduct_score" | "physical_score" | "volunteer_days";
  value: string;
  scale: string;
  evidenceFileUrl?: string;
  verificationStatus: "draft" | "pending" | "verified" | "rejected";
  note?: string;
}

export const EVIDENCE_SEED: Evidence[] = [
  {
    id: "evd-1",
    applicationId: "app-2025-2026",
    evidenceName: "Bảng điểm học tập năm học 2024–2025",
    criterion: "hoc-tap",
    sourceType: "metric_input",
    fileUrl: MEDIA.evidence.gpa,
    originalFileName: "BangDiem_2024-2025.pdf",
    indexingStatus: "indexed",
    extractedFields: {
      "Họ tên": "Nguyễn Linh An",
      MSSV: "21IT001",
      GPA: "3.72/4.00",
      "Có điểm F": "Không",
      "Đơn vị cấp": "Phòng Đào tạo ĐHĐN",
    },
    matchedKnowledgeItems: ["kb-gpa"],
    confidence: 0.96,
    reviewStatus: "pending",
    warnings: [],
    levelSuggest: "thanh-pho",
  },
  {
    id: "evd-2",
    applicationId: "app-2025-2026",
    evidenceName: "Phiếu điểm rèn luyện năm học 2024–2025",
    criterion: "dao-duc",
    sourceType: "manual_upload",
    fileUrl: MEDIA.evidence.drl,
    originalFileName: "PhieuDRL_2024-2025.jpg",
    indexingStatus: "needs_manual_review",
    extractedFields: {
      "Họ tên": "Nguyễn Linh An",
      "Điểm rèn luyện": "87/100",
      "Vi phạm quy chế": "Không",
      "Đơn vị cấp": "Khoa CNTT",
    },
    matchedKnowledgeItems: ["kb-drl"],
    confidence: 0.78,
    reviewStatus: "pending",
    warnings: ["Cần cán bộ Khoa CNTT xác minh chữ ký"],
    levelSuggest: "thanh-pho",
  },
  {
    id: "evd-3",
    applicationId: "app-2025-2026",
    evidenceName: "Giấy chứng nhận Mùa hè xanh 2025",
    criterion: "tinh-nguyen",
    sourceType: "event_import",
    eventId: "ev-mhx-2025",
    fileUrl: SAMPLE_GCN,
    originalFileName: "GCN_MuaHeXanh_2025.pdf",
    indexingStatus: "indexed",
    extractedFields: {
      "Họ tên": "Nguyễn Linh An",
      "Hoạt động": "Mùa hè xanh 2025",
      "Số ngày tình nguyện": "3 ngày",
      "Đơn vị cấp": "Hội Sinh viên Trường ĐHBK",
      "Cấp tổ chức": "Cấp Trường",
    },
    matchedEvent: "ev-mhx-2025",
    matchedKnowledgeItems: ["kb-mhx"],
    confidence: 0.93,
    reviewStatus: "pending",
    warnings: ["Thiếu 2 ngày nếu aim Cấp Thành phố (yêu cầu ≥ 5 ngày)"],
    levelSuggest: "truong",
  },
  {
    id: "evd-4",
    applicationId: "app-2025-2026",
    evidenceName: "Giấy chứng nhận Sinh viên khỏe 2025",
    criterion: "the-luc",
    sourceType: "event_import",
    eventId: "ev-svkhoe-2025",
    fileUrl: MEDIA.evidence.fitness,
    originalFileName: "GCN_SinhVienKhoe_2025.jpg",
    indexingStatus: "indexed",
    extractedFields: {
      "Họ tên": "Nguyễn Linh An",
      Năm: "2025",
      "Kết quả": "Đạt",
      "Đơn vị cấp": "Đoàn Trường ĐHBK",
    },
    matchedEvent: "ev-svkhoe-2025",
    matchedKnowledgeItems: ["kb-svkhoe"],
    confidence: 0.94,
    reviewStatus: "pending",
    warnings: [],
    levelSuggest: "truong",
  },
  {
    id: "evd-5",
    applicationId: "app-2025-2026",
    evidenceName: "Chứng chỉ IELTS 5.5",
    criterion: "hoi-nhap",
    sourceType: "manual_upload",
    fileUrl: MEDIA.evidence.language,
    originalFileName: "IELTS_5.5.pdf",
    indexingStatus: "needs_manual_review",
    extractedFields: {
      "Họ tên": "NGUYEN LINH AN",
      "Trình độ": "IELTS 5.5",
      "Ngày cấp": "01/02/2025",
      "Đơn vị cấp": "British Council",
    },
    matchedKnowledgeItems: ["kb-ielts"],
    confidence: 0.72,
    reviewStatus: "pending",
    warnings: ["Cần cán bộ xác minh thời hạn chứng chỉ (2 năm)"],
    levelSuggest: "dhdn",
  },
  {
    id: "evd-6",
    applicationId: "app-2025-2026",
    evidenceName: "Giấy khen NCKH Sinh viên cấp ĐHĐN 2025 (Giải Nhì)",
    criterion: "priority",
    sourceType: "manual_upload",
    fileUrl: SAMPLE_GCN,
    originalFileName: "GiayKhen_NCKH_DHDN_2025.pdf",
    indexingStatus: "indexed",
    extractedFields: {
      "Họ tên": "Nguyễn Linh An",
      "Giải thưởng": "Giải Nhì NCKH cấp ĐHĐN",
      Năm: "2025",
    },
    matchedKnowledgeItems: ["kb-nckh"],
    confidence: 0.95,
    reviewStatus: "pending",
    warnings: [],
    levelSuggest: "dhdn",
  },
];

export const METRIC_SEED: MetricInput[] = [
  {
    id: "m-1",
    applicationId: "app-2025-2026",
    type: "gpa",
    value: "3.72",
    scale: "4.0",
    verificationStatus: "verified",
    note: "Phòng Đào tạo ĐHĐN xác nhận",
  },
  {
    id: "m-2",
    applicationId: "app-2025-2026",
    type: "conduct_score",
    value: "87",
    scale: "100",
    verificationStatus: "pending",
    note: "Chờ Khoa CNTT xác minh",
  },
  {
    id: "m-3",
    applicationId: "app-2025-2026",
    type: "volunteer_days",
    value: "3",
    scale: "ngày",
    verificationStatus: "verified",
    note: "Từ Event Registry — Mùa hè xanh 2025",
  },
];

// =================== APPLICATION (single per year) ===================
export const CURRENT_APPLICATION = {
  id: "app-2025-2026",
  studentId: CURRENT_STUDENT.id,
  schoolYear: "2025–2026",
  applicationType: "individual" as const,
  targetLevel: "thanh-pho",
  status: "drafting" as ProfileLifecycle,
  readinessScore: 68,
  lastUpdatedAt: "21:34 hôm nay",
  submittedAt: null as string | null,
  currentDraftVersion: 4,
  supplementDeadline: "30/10/2025",
  cascadeReviewResult: {
    "trung-uong": { status: "miss" as const, score: 58 },
    "thanh-pho": { status: "near" as const, score: 78 },
    dhdn: { status: "pass" as const, score: 88 },
    truong: { status: "pass" as const, score: 95 },
  },
  criteriaProgress: {
    "dao-duc": { progress: 70, label: "ĐRL 87 — cần xác minh chữ ký Khoa", missing: 1 },
    "hoc-tap": { progress: 92, label: "GPA 3.72 + Giải Nhì NCKH ĐHĐN", missing: 0 },
    "the-luc": { progress: 80, label: "Đạt Sinh viên khỏe 2025", missing: 0 },
    "tinh-nguyen": { progress: 55, label: "Có 3/5 ngày — thiếu cho Cấp Thành phố", missing: 1 },
    "hoi-nhap": { progress: 60, label: "IELTS 5.5 cần xác minh hạn", missing: 1 },
  } as Record<string, { progress: number; label: string; missing: number }>,
};

// Legacy aliases kept for compatibility
export const CURRENT_PROFILE = {
  id: CURRENT_APPLICATION.id,
  schoolYear: CURRENT_APPLICATION.schoolYear,
  type: "ca-nhan" as const,
  targetLevel: CURRENT_APPLICATION.targetLevel,
  status: CURRENT_APPLICATION.status,
  progress: CURRENT_APPLICATION.readinessScore,
  lastSavedAt: CURRENT_APPLICATION.lastUpdatedAt,
  supplementDeadline: CURRENT_APPLICATION.supplementDeadline,
  criteriaProgress: CURRENT_APPLICATION.criteriaProgress,
};

// =================== OFFICERS (specialized) ===================
export interface Officer {
  id: string;
  name: string;
  role: string;
  specializedCriteria: (CriterionKey | "priority")[];
  workload: number;
  /** Alias of workload — kept for legacy templates */
  load: number;
  avatar: string;
  experienced: boolean;
}

export const OFFICERS: Officer[] = [
  {
    id: "cb-001",
    name: "Nguyễn Thảo Vy",
    role: "Phụ trách Tình nguyện tốt",
    specializedCriteria: ["tinh-nguyen"],
    workload: 18,
    load: 18,
    avatar: MEDIA.avatars[1],
    experienced: true,
  },
  {
    id: "cb-002",
    name: "Trần Đức Minh",
    role: "Phụ trách Học tập tốt",
    specializedCriteria: ["hoc-tap", "priority"],
    workload: 22,
    load: 22,
    avatar: MEDIA.avatars[0],
    experienced: true,
  },
  {
    id: "cb-003",
    name: "Lê Gia Hân",
    role: "Phụ trách Hội nhập tốt",
    specializedCriteria: ["hoi-nhap"],
    workload: 14,
    load: 14,
    avatar: MEDIA.avatars[3],
    experienced: false,
  },
  {
    id: "cb-004",
    name: "Phạm Quốc Bảo",
    role: "Phụ trách Thể lực tốt",
    specializedCriteria: ["the-luc"],
    workload: 11,
    load: 11,
    avatar: MEDIA.avatars[2],
    experienced: false,
  },
  {
    id: "cb-005",
    name: "Võ Minh Anh",
    role: "Phụ trách Đạo đức tốt",
    specializedCriteria: ["dao-duc"],
    workload: 16,
    load: 16,
    avatar: MEDIA.avatars[1],
    experienced: true,
  },
];

// =================== REVIEW TASKS (criterion-specialized) ===================
export interface ReviewTask {
  id: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  studentMssv: string;
  studentKhoa: string;
  studentLop: string;
  targetLevel: string;
  criterion: CriterionKey | "priority";
  evidenceId: string;
  evidenceName: string;
  sourceType: EvidenceSourceType;
  assignedOfficerId: string;
  status:
    "waiting" | "reviewing" | "supplement_required" | "accepted" | "rejected" | "resolution_needed";
  confidence: number;
  dueDate: string;
}

export const REVIEW_TASKS: ReviewTask[] = [
  {
    id: "t-1",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "tinh-nguyen",
    evidenceId: "evd-3",
    evidenceName: "Giấy chứng nhận Mùa hè xanh 2025",
    sourceType: "event_import",
    assignedOfficerId: "cb-001",
    status: "reviewing",
    confidence: 0.93,
    dueDate: "05/07/2026",
  },
  {
    id: "t-2",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "dao-duc",
    evidenceId: "evd-2",
    evidenceName: "Phiếu điểm rèn luyện năm học 2024–2025",
    sourceType: "manual_upload",
    assignedOfficerId: "cb-005",
    status: "waiting",
    confidence: 0.78,
    dueDate: "06/07/2026",
  },
  {
    id: "t-3",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "hoi-nhap",
    evidenceId: "evd-5",
    evidenceName: "Chứng chỉ IELTS 5.5",
    sourceType: "manual_upload",
    assignedOfficerId: "cb-003",
    status: "supplement_required",
    confidence: 0.72,
    dueDate: "04/07/2026",
  },
  {
    id: "t-4",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "hoc-tap",
    evidenceId: "evd-1",
    evidenceName: "Bảng điểm học tập năm học 2024–2025",
    sourceType: "metric_input",
    assignedOfficerId: "cb-002",
    status: "accepted",
    confidence: 0.96,
    dueDate: "03/07/2026",
  },
  {
    id: "t-5",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "the-luc",
    evidenceId: "evd-4",
    evidenceName: "Giấy chứng nhận Sinh viên khỏe 2025",
    sourceType: "event_import",
    assignedOfficerId: "cb-004",
    status: "accepted",
    confidence: 0.94,
    dueDate: "03/07/2026",
  },
  {
    id: "t-6",
    applicationId: "app-2025-2026",
    studentId: "sv-001",
    studentName: "Nguyễn Linh An",
    studentMssv: "21IT001",
    studentKhoa: "CNTT",
    studentLop: "21IT_CLC1",
    targetLevel: "thanh-pho",
    criterion: "priority",
    evidenceId: "evd-6",
    evidenceName: "Giấy khen NCKH cấp ĐHĐN 2025",
    sourceType: "manual_upload",
    assignedOfficerId: "cb-002",
    status: "accepted",
    confidence: 0.95,
    dueDate: "03/07/2026",
  },
  {
    id: "t-7",
    applicationId: "app-2025-2026-khoa",
    studentId: "sv-002",
    studentName: "Trần Minh Khoa",
    studentMssv: "21ECE042",
    studentKhoa: "ĐTVT",
    studentLop: "21DT_CLC2",
    targetLevel: "dhdn",
    criterion: "tinh-nguyen",
    evidenceId: "evd-3",
    evidenceName: "Giấy chứng nhận Mùa hè xanh 2025",
    sourceType: "event_import",
    assignedOfficerId: "cb-001",
    status: "reviewing",
    confidence: 0.91,
    dueDate: "07/07/2026",
  },
  {
    id: "t-8",
    applicationId: "app-2025-2026-mai",
    studentId: "sv-004",
    studentName: "Phạm Ngọc Mai",
    studentMssv: "21BA208",
    studentKhoa: "Kinh tế",
    studentLop: "21QTKD1",
    targetLevel: "trung-uong",
    criterion: "hoi-nhap",
    evidenceId: "evd-5",
    evidenceName: "Bài tham luận giao lưu quốc tế",
    sourceType: "manual_upload",
    assignedOfficerId: "cb-003",
    status: "resolution_needed",
    confidence: 0.54,
    dueDate: "06/07/2026",
  },
];

// =================== KNOWLEDGE BASE ===================
export interface KnowledgeBaseItem {
  id: string;
  evidenceName: string;
  eventName?: string;
  organizer: string;
  criterion: CriterionKey | "priority";
  level: string;
  decision: "approved" | "rejected" | "needs_review";
  reason: string;
  sampleCertificateUrl: string;
  requiredFields: string[];
  commonErrors: string[];
  usageCount: number;
  similarCases: string[];
}

export const KB_ITEMS: KnowledgeBaseItem[] = [
  {
    id: "kb-mhx",
    evidenceName: "Giấy chứng nhận Mùa hè xanh",
    eventName: "Chiến dịch Mùa hè xanh 2025",
    organizer: "Hội Sinh viên Trường ĐHBK",
    criterion: "tinh-nguyen",
    level: "truong",
    decision: "approved",
    reason: "Có dấu xác nhận của HSV Trường, có trong danh sách indexed.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "MSSV", "Số ngày tham gia", "Đơn vị cấp"],
    commonErrors: ["Ảnh mờ không đọc được số ngày", "Thiếu dấu của HSV Trường"],
    usageCount: 186,
    similarCases: ["GCN Tiếp sức mùa thi", "GCN Xuân tình nguyện"],
  },
  {
    id: "kb-hm",
    evidenceName: "Giấy chứng nhận hiến máu nhân đạo",
    organizer: "Đoàn Trường ĐHBK",
    criterion: "tinh-nguyen",
    level: "truong",
    decision: "approved",
    reason: "Quy đổi 1 ngày tình nguyện theo quy định nội bộ.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "MSSV", "Đợt hiến máu"],
    commonErrors: ["Không ghi rõ đợt hiến máu"],
    usageCount: 94,
    similarCases: [],
  },
  {
    id: "kb-gpa",
    evidenceName: "Bảng điểm học tập từ Phòng Đào tạo",
    organizer: "Phòng Đào tạo ĐHĐN",
    criterion: "hoc-tap",
    level: "dhdn",
    decision: "approved",
    reason: "Bảng điểm có dấu của Phòng Đào tạo — hợp lệ.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "MSSV", "GPA", "Năm học"],
    commonErrors: ["Bảng điểm không có dấu đỏ", "Có môn F mà không khai báo"],
    usageCount: 312,
    similarCases: ["Bảng điểm tích lũy", "Phiếu điểm HK"],
  },
  {
    id: "kb-drl",
    evidenceName: "Phiếu điểm rèn luyện",
    organizer: "Khoa chủ quản",
    criterion: "dao-duc",
    level: "truong",
    decision: "approved",
    reason: "Có dấu Khoa và chữ ký phụ trách.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "Điểm rèn luyện", "Vi phạm"],
    commonErrors: ["Chưa có chữ ký", "Sai năm học"],
    usageCount: 280,
    similarCases: [],
  },
  {
    id: "kb-ielts",
    evidenceName: "Chứng chỉ IELTS / TOEIC",
    organizer: "British Council / IIG",
    criterion: "hoi-nhap",
    level: "dhdn",
    decision: "needs_review",
    reason: "Cần xác minh thời hạn 2 năm trước thời điểm xét.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "Trình độ", "Ngày cấp"],
    commonErrors: ["Chứng chỉ hết hạn", "Tên trên chứng chỉ khác hồ sơ"],
    usageCount: 142,
    similarCases: ["HSK", "JLPT", "TCF"],
  },
  {
    id: "kb-svkhoe",
    evidenceName: "Giấy chứng nhận Sinh viên khỏe",
    organizer: "Đoàn Trường ĐHBK",
    criterion: "the-luc",
    level: "truong",
    decision: "approved",
    reason: "Dùng cho tiêu chí Thể lực tốt cấp Trường.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "Năm", "Kết quả"],
    commonErrors: ["Không ghi năm", "Không có dấu Trường"],
    usageCount: 220,
    similarCases: ["Phiếu kiểm tra thể lực HK"],
  },
  {
    id: "kb-nckh",
    evidenceName: "Giấy khen NCKH cấp Khoa/ĐHĐN",
    organizer: "ĐHĐN",
    criterion: "priority",
    level: "dhdn",
    decision: "approved",
    reason: "Dùng cho ưu tiên xét cấp cao hơn.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "Giải thưởng", "Năm"],
    commonErrors: ["Giấy khen không ghi đơn vị tổ chức"],
    usageCount: 64,
    similarCases: ["Giải Olympic Tin học"],
  },
  {
    id: "kb-asd",
    evidenceName: "Giải Cuộc thi Ánh sáng soi đường",
    organizer: "TW Hội Sinh viên VN",
    criterion: "dao-duc",
    level: "trung-uong",
    decision: "approved",
    reason: "Dùng cho tiêu chí Đạo đức + ưu tiên xét cấp Trung ương.",
    sampleCertificateUrl: SAMPLE_GCN,
    requiredFields: ["Họ tên", "Vòng thi", "Thứ hạng"],
    commonErrors: [],
    usageCount: 12,
    similarCases: [],
  },
];

// =================== CRITERION REQUIREMENTS by level ===================
export const REQUIREMENT_BY_LEVEL: Record<
  string,
  Record<CriterionKey, { mandatory: string[]; allowedEvidence: string[]; systemChecks: string[] }>
> = {
  truong: {
    "dao-duc": {
      mandatory: [
        "Điểm rèn luyện trung bình năm ≥ 82/100",
        "Không vi phạm pháp luật, quy chế, nội quy",
      ],
      allowedEvidence: ["Phiếu điểm rèn luyện có dấu Khoa", "Xác nhận không vi phạm của Khoa"],
      systemChecks: ["So sánh điểm DRL với ngưỡng 82/100", "Đối chiếu danh sách vi phạm"],
    },
    "hoc-tap": {
      mandatory: ["GPA năm học ≥ 3.0/4.0", "Không có điểm F"],
      allowedEvidence: ["Bảng điểm Phòng Đào tạo", "Giấy khen NCKH cấp Khoa (ưu tiên)"],
      systemChecks: ["Đọc GPA từ bảng điểm OCR", "Phát hiện môn F"],
    },
    "the-luc": {
      mandatory: [
        "Đạt một trong: điểm thể dục ≥ Khá, hoạt động thể thao LCD/CLB, giải thể thao cấp ĐHĐN trở lên, hoặc rèn luyện định kỳ",
      ],
      allowedEvidence: ["GCN Sinh viên khỏe", "Giấy CN giải thể thao", "Xác nhận CLB thể thao"],
      systemChecks: ["Match với Event Registry: Sinh viên khỏe / giải thể thao"],
    },
    "tinh-nguyen": {
      mandatory: ["Có chứng nhận chiến dịch tình nguyện hoặc tham gia ≥ 2 ngày"],
      allowedEvidence: [
        "GCN Mùa hè xanh, Tiếp sức mùa thi, Xuân tình nguyện",
        "Xác nhận hiến máu (quy đổi 1 ngày)",
      ],
      systemChecks: ["Cộng dồn ngày tình nguyện từ Event Registry", "Đối chiếu MSSV trong roster"],
    },
    "hoi-nhap": {
      mandatory: [
        "Tham gia tập huấn cán bộ Đoàn–Hội HOẶC giao lưu quốc tế HOẶC chứng chỉ A2/B1 HOẶC cuộc thi ngoại ngữ",
      ],
      allowedEvidence: [
        "GCN tập huấn cán bộ Đoàn–Hội",
        "Chứng chỉ ngoại ngữ A2/B1",
        "GCN hội thảo quốc tế",
      ],
      systemChecks: ["Đối chiếu với Knowledge Base chứng chỉ ngoại ngữ"],
    },
  },
  dhdn: {
    "dao-duc": {
      mandatory: ["ĐRL ≥ 80/100", "Đạt SV5T cấp Trường", "Không vi phạm"],
      allowedEvidence: ["Phiếu DRL", "QĐ công nhận SV5T cấp Trường"],
      systemChecks: ["Kiểm tra DRL ≥ 80", "Kiểm tra QĐ SV5T cấp Trường"],
    },
    "hoc-tap": {
      mandatory: [
        "GPA ≥ 3.2/4.0",
        "Có thêm tiêu chí học thuật (NCKH, đồ án, đội tuyển, giải thưởng)",
      ],
      allowedEvidence: ["Bảng điểm", "Giấy khen NCKH", "QĐ đội tuyển học thuật"],
      systemChecks: ["GPA ≥ 3.2", "Có ít nhất 1 minh chứng học thuật phụ"],
    },
    "the-luc": {
      mandatory: ["Đạt 1 trong các minh chứng thể lực, ưu tiên giải cấp Trường trở lên"],
      allowedEvidence: ["GCN Sinh viên khỏe", "Giấy CN giải cấp Trường"],
      systemChecks: ["Match Event Registry cấp Trường+"],
    },
    "tinh-nguyen": {
      mandatory: ["≥ 3 ngày tình nguyện/năm hoặc có chiến dịch/khen thưởng cấp Trường+"],
      allowedEvidence: ["GCN chiến dịch", "Giấy khen cấp Trường"],
      systemChecks: ["Cộng dồn ≥ 3 ngày"],
    },
    "hoi-nhap": {
      mandatory: [
        "Hoàn thành kỹ năng xã hội HOẶC được khen Hội–Đoàn",
        "B1/tương đương HOẶC giao lưu quốc tế/cuộc thi ngoại ngữ",
      ],
      allowedEvidence: ["Chứng chỉ B1+", "GCN giao lưu quốc tế", "Khen thưởng Hội–Đoàn"],
      systemChecks: ["KB chứng chỉ B1+"],
    },
  },
  "thanh-pho": {
    "dao-duc": {
      mandatory: [
        "ĐRL ≥ 80/100",
        "Đạt SV5T cấp Trường + đề nghị xét",
        "Không vi phạm",
        "Có 1 trong: Đảng viên / đội thi Mác–Lênin–HCM / tham luận / thanh niên tiêu biểu",
      ],
      allowedEvidence: ["Phiếu DRL", "Bài tham luận", "QĐ Đảng viên", "Giải Ánh sáng soi đường"],
      systemChecks: ["DRL ≥ 80", "QĐ cấp Trường"],
    },
    "hoc-tap": {
      mandatory: ["GPA ≥ 3.2/4.0 hoặc 8.0/10", "Có tiêu chí học thuật"],
      allowedEvidence: ["Bảng điểm", "Giấy khen NCKH", "Đồ án đạt giải"],
      systemChecks: ["GPA ngưỡng cao", "Học thuật phụ"],
    },
    "the-luc": {
      mandatory: ["Đạt Thanh niên khỏe/Sinh viên khỏe HOẶC giải thể thao phong trào cấp Khoa+"],
      allowedEvidence: ["GCN Sinh viên khỏe", "Giấy CN giải thể thao Khoa+"],
      systemChecks: ["Match Event Registry"],
    },
    "tinh-nguyen": {
      mandatory: ["≥ 5 ngày tình nguyện/năm", "Khen thưởng tình nguyện cấp Khoa+"],
      allowedEvidence: ["GCN chiến dịch tình nguyện", "Giấy khen Khoa+"],
      systemChecks: ["Cộng dồn ≥ 5 ngày"],
    },
    "hoi-nhap": {
      mandatory: [
        "Kỹ năng/khen Hội–Đoàn",
        "B1 / TOEIC 405 / IELTS 4.5 HOẶC giao lưu quốc tế/giải ngoại ngữ",
      ],
      allowedEvidence: ["Chứng chỉ ngoại ngữ ngưỡng", "GCN giao lưu quốc tế"],
      systemChecks: ["KB ngưỡng chứng chỉ"],
    },
  },
  "trung-uong": {
    "dao-duc": {
      mandatory: [
        "ĐRL ≥ 90/100",
        "Đạt SV5T cấp Tỉnh/Thành (hoặc cấp Trường với một số đơn vị)",
        "Không vi phạm",
        "Mác–Lênin–HCM HOẶC thanh niên tiêu biểu",
      ],
      allowedEvidence: ["Phiếu DRL", "QĐ SV5T cấp Tỉnh", "Giải Ánh sáng soi đường"],
      systemChecks: ["DRL ≥ 90", "QĐ cấp Tỉnh+"],
    },
    "hoc-tap": {
      mandatory: [
        "GPA ≥ 3.4/4.0 hoặc 8.5/10",
        "Có tiêu chí học thuật: NCKH, đồ án đạt giải, đội tuyển, giải sáng tạo",
      ],
      allowedEvidence: ["Bảng điểm", "Giải NCKH", "Đội tuyển học thuật"],
      systemChecks: ["GPA ngưỡng cao", "Học thuật phụ mạnh"],
    },
    "the-luc": {
      mandatory: [
        "Sinh viên khỏe cấp Tỉnh+",
        "HOẶC hoạt động thể thao cấp TW",
        "HOẶC giải thể thao phong trào cấp Trường+",
      ],
      allowedEvidence: ["GCN cấp Tỉnh+", "Giấy CN giải TW"],
      systemChecks: ["Match Event Registry cấp Tỉnh+"],
    },
    "tinh-nguyen": {
      mandatory: ["≥ 5 ngày tình nguyện/năm", "Khen thưởng cấp Tỉnh hoặc UBND huyện+"],
      allowedEvidence: ["GCN chiến dịch", "Bằng khen cấp Tỉnh"],
      systemChecks: ["Cộng dồn ≥ 5 ngày"],
    },
    "hoi-nhap": {
      mandatory: [
        "Kỹ năng/khen Hội–Đoàn",
        "Hội nhập cấp Trường+",
        "B1/tương đương",
        "+ Giao lưu quốc tế hoặc giải hội nhập",
      ],
      allowedEvidence: ["Chứng chỉ B1+", "GCN giao lưu quốc tế", "Giải ngoại ngữ"],
      systemChecks: ["KB ngưỡng cao"],
    },
  },
};

// =================== OFFICER QUEUE STUDENTS (compat) ===================
export const STUDENTS = [
  {
    id: "sv-001",
    name: "Nguyễn Linh An",
    mssv: "21IT001",
    khoa: "Công nghệ Thông tin",
    lop: "21IT_CLC1",
    aim: "thanh-pho",
    gpa: 3.72,
    drl: 92,
    avatar: MEDIA.avatars[1],
    status: "reviewing" as ProfileStatus,
    progress: 88,
    missing: ["Tình nguyện: thiếu 2 ngày"],
    aiConfidence: 0.86,
  },
  {
    id: "sv-002",
    name: "Trần Minh Khoa",
    mssv: "21ECE042",
    khoa: "Điện tử Viễn thông",
    lop: "21DT_CLC2",
    aim: "dhdn",
    gpa: 3.55,
    drl: 88,
    avatar: MEDIA.avatars[2],
    status: "supplement" as ProfileStatus,
    progress: 72,
    missing: ["Chứng chỉ ngoại ngữ cần xác minh"],
    aiConfidence: 0.62,
  },
  {
    id: "sv-003",
    name: "Lê Hoàng Nam",
    mssv: "21ME119",
    khoa: "Cơ khí",
    lop: "21CK1",
    aim: "truong",
    gpa: 3.3,
    drl: 85,
    avatar: MEDIA.avatars[0],
    status: "submitted" as ProfileStatus,
    progress: 95,
    missing: [],
    aiConfidence: 0.91,
  },
  {
    id: "sv-004",
    name: "Phạm Ngọc Mai",
    mssv: "21BA208",
    khoa: "Kinh tế",
    lop: "21QTKD1",
    aim: "trung-uong",
    gpa: 3.85,
    drl: 95,
    avatar: MEDIA.avatars[3],
    status: "resolution" as ProfileStatus,
    progress: 90,
    missing: ["Hoạt động NCKH chưa có tiền lệ"],
    aiConfidence: 0.54,
  },
  {
    id: "sv-005",
    name: "Võ Quốc Đạt",
    mssv: "22IT311",
    khoa: "Công nghệ Thông tin",
    lop: "22IT2",
    aim: "truong",
    gpa: 3.1,
    drl: 80,
    avatar: MEDIA.avatars[0],
    status: "draft" as ProfileStatus,
    progress: 35,
    missing: ["Thể lực", "Tình nguyện", "Hội nhập"],
    aiConfidence: 0,
  },
  {
    id: "sv-006",
    name: "Đặng Thu Hà",
    mssv: "22BA512",
    khoa: "Kinh tế",
    lop: "22KT3",
    aim: "dhdn",
    gpa: 3.62,
    drl: 90,
    avatar: MEDIA.avatars[1],
    status: "approved" as ProfileStatus,
    progress: 100,
    missing: [],
    aiConfidence: 0.94,
  },
];

// =================== LEGACY EVIDENCE SAMPLES (compat for old routes) ===================
export const EVIDENCE_SAMPLES = EVIDENCE_SEED.map((e) => ({
  id: e.id,
  name: e.evidenceName,
  criteria: e.criterion as CriterionKey | "priority",
  org: e.extractedFields["Đơn vị cấp"] ?? "—",
  date: e.extractedFields["Ngày cấp"] ?? e.extractedFields["Năm"] ?? "—",
  confidence: e.confidence,
  level: e.levelSuggest,
  img: e.fileUrl,
  warning: e.warnings[0],
  days: e.extractedFields["Số ngày tình nguyện"],
}));

export const EVIDENCE_CARDS = EVIDENCE_SEED.map((e) => ({
  id: e.id,
  criteria: e.criterion as CriterionKey | "priority",
  fileName: e.originalFileName ?? e.evidenceName,
  type: e.evidenceName,
  preview: e.fileUrl,
  ocrText: "",
  extracted: e.extractedFields,
  levelSuggest: e.levelSuggest,
  confidence: e.confidence,
  warnings: e.warnings,
  status: (e.confidence >= 0.9 ? "likely" : e.warnings.length ? "needs-officer" : "uploaded") as
    "missing" | "uploaded" | "prechecking" | "likely" | "needs-supplement" | "needs-officer",
}));

export const DRAFT_PROFILES = [
  {
    id: CURRENT_APPLICATION.id,
    studentId: CURRENT_STUDENT.id,
    title: `Hồ sơ Sinh viên 5 tốt năm học ${CURRENT_APPLICATION.schoolYear}`,
    progress: CURRENT_APPLICATION.readinessScore,
    updated: CURRENT_APPLICATION.lastUpdatedAt,
    status: PROFILE_STATUS[CURRENT_APPLICATION.status].label,
    missing: ["Thiếu 2 ngày tình nguyện cho Cấp Thành phố"],
  },
];

export const NOTIFICATIONS_SEED = [
  {
    id: "n-1",
    title: "Bản nháp đã tự động lưu",
    desc: "Hồ sơ SV5T 2025–2026 — lưu lúc 21:34",
    time: "10 phút trước",
    type: "info" as const,
  },
  {
    id: "n-2",
    title: "Cần bổ sung minh chứng tình nguyện",
    desc: "Thiếu 2 ngày tình nguyện để giữ aim Cấp Thành phố",
    time: "1 giờ trước",
    type: "warning" as const,
  },
  {
    id: "n-3",
    title: "AI tiền kiểm hoàn tất",
    desc: "Hồ sơ sẵn sàng 68% — có 2 minh chứng cần cán bộ xác minh",
    time: "2 giờ trước",
    type: "success" as const,
  },
];

export const AUDIT_SEED = [
  {
    id: "a-1",
    time: "14:32 28/06/2026",
    actor: "Nguyễn Linh An",
    role: "Sinh viên",
    action: "Cập nhật cấp aim hồ sơ",
    before: "Cấp Đại học Đà Nẵng",
    after: "Cấp Thành phố",
    reason: "Sinh viên thay đổi mục tiêu",
  },
  {
    id: "a-2",
    time: "13:18 28/06/2026",
    actor: "VNPT SmartReader",
    role: "AI",
    action: "Sinh Evidence Card từ minh chứng tình nguyện",
    before: "—",
    after: "3 ngày — Mùa hè xanh 2025",
    reason: "OCR + KIE thành công",
  },
  {
    id: "a-3",
    time: "11:05 28/06/2026",
    actor: "Nguyễn Thảo Vy",
    role: "Cán bộ Tình nguyện",
    action: "Duyệt minh chứng Mùa hè xanh 2025",
    before: "Đang xét",
    after: "Đạt tiêu chí",
    reason: "Khớp Event Registry",
  },
  {
    id: "a-4",
    time: "09:42 28/06/2026",
    actor: "Hội đồng xét duyệt",
    role: "Quản lý",
    action: "Chuyển Resolution Hub",
    before: "Đang xét",
    after: "Mập mờ",
    reason: "AI confidence 0.54 — hoạt động chưa có tiền lệ",
  },
];

export const RESOLUTION_CASES = [
  {
    id: "r-1",
    student: "Phạm Ngọc Mai",
    criteria: "Hội nhập",
    type: "Bài tham luận giao lưu quốc tế — chưa có tiền lệ",
    confidence: 0.54,
    similar: 3,
    status: "Chờ hội đồng",
  },
  {
    id: "r-2",
    student: "Trần Minh Khoa",
    criteria: "Hội nhập",
    type: "Chứng chỉ ngoại ngữ cần xác minh thời hạn",
    confidence: 0.62,
    similar: 12,
    status: "Đang phân tích",
  },
  {
    id: "r-3",
    student: "Hoàng Bảo Long",
    criteria: "Tình nguyện",
    type: "Chiến dịch tự tổ chức — không rõ cấp",
    confidence: 0.58,
    similar: 5,
    status: "Chờ hội đồng",
  },
];

// =================== COLLECTIVE ===================
export const CURRENT_COLLECTIVE = {
  id: "c-1",
  name: "Chi hội 21T_DT1",
  type: "Chi hội lớp",
  schoolYear: "2025–2026",
  total: 42,
  registered: 42,
  sv5tTruong: 12,
  sv5tHigher: 4,
  aim: "truong",
  progress: 82,
  status: "drafting" as ProfileLifecycle,
  lastSavedAt: "20:12 hôm nay",
};

export const COLLECTIVES = [
  {
    id: CURRENT_COLLECTIVE.id,
    name: `Tập thể ${CURRENT_COLLECTIVE.name}`,
    type: CURRENT_COLLECTIVE.type,
    total: 42,
    registered: 42,
    sv5tTruong: 12,
    sv5tHigher: 4,
    aim: "truong",
    progress: 82,
  },
];

export const COLLECTIVE_ROSTER = [
  {
    id: "r1",
    name: "Nguyễn Linh An",
    mssv: "21IT001",
    registered: true,
    sv5t: "Cấp Thành phố",
    violation: false,
  },
  {
    id: "r2",
    name: "Trần Đăng Khoa",
    mssv: "21IT002",
    registered: true,
    sv5t: "Cấp Trường",
    violation: false,
  },
  {
    id: "r3",
    name: "Lê Phương Thảo",
    mssv: "21IT003",
    registered: true,
    sv5t: "Cấp Trường",
    violation: false,
  },
  {
    id: "r4",
    name: "Hoàng Nhật Minh",
    mssv: "21IT004",
    registered: true,
    sv5t: "—",
    violation: false,
  },
  {
    id: "r5",
    name: "Phạm Quốc Hưng",
    mssv: "21IT005",
    registered: true,
    sv5t: "Cấp ĐHĐN",
    violation: false,
  },
  {
    id: "r6",
    name: "Đỗ Minh Châu",
    mssv: "21IT006",
    registered: true,
    sv5t: "—",
    violation: false,
  },
  {
    id: "r7",
    name: "Vũ Hà My",
    mssv: "21IT007",
    registered: true,
    sv5t: "Cấp Trường",
    violation: false,
  },
  { id: "r8", name: "Bùi Anh Tú", mssv: "21IT008", registered: true, sv5t: "—", violation: false },
];

export const FAQ_CHIPS = [
  "Hồ sơ của em còn thiếu gì?",
  "Minh chứng tình nguyện như thế nào là hợp lệ?",
  "Em có thể đạt cấp nào?",
  "Chứng chỉ ngoại ngữ này có dùng cho tiêu chí hội nhập không?",
  "Hạn bổ sung minh chứng là khi nào?",
];

export const VNPT_SERVICES = [
  {
    key: "smartreader",
    name: "VNPT SmartReader",
    desc: "OCR + KIE bóc tách minh chứng, tạo Evidence Card",
    uses: [
      "OCR ảnh/PDF minh chứng",
      "Trích xuất trường thông tin",
      "Tạo Evidence Card tự động",
      "Index danh sách sự kiện",
    ],
    color: "#00AEEF",
  },
  {
    key: "smartbot",
    name: "VNPT Smartbot nâng cao",
    desc: "Chatbot RAG hướng dẫn sinh viên & hỗ trợ cán bộ",
    uses: [
      "Chatbot sinh viên",
      "Copilot cho cán bộ",
      "FAQ hồ sơ SV5T",
      "Escalation khi confidence thấp",
    ],
    color: "#0057C2",
  },
  {
    key: "smartux",
    name: "VNPT SmartUX",
    desc: "Phân tích trải nghiệm sử dụng và lỗi thường gặp",
    uses: [
      "Drop-off theo bước",
      "Completion rate",
      "Upload error rate",
      "Tỷ lệ chấp nhận gợi ý AI",
    ],
    color: "#22C55E",
  },
  {
    key: "smartvoice",
    name: "VNPT SmartVoice",
    desc: "Giọng nói cho chatbot và đọc hướng dẫn tiêu chí",
    uses: ["Voice input chatbot", "TTS hướng dẫn tiêu chí", "Voice note cán bộ"],
    color: "#F59E0B",
  },
];
