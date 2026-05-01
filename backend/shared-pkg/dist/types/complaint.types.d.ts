import type { ComplaintCategory, ComplaintStatus, ComplaintPriority } from '../constants/status.constants';
export interface Complaint {
    id: string;
    complaintNumber: string;
    studentId: string;
    roomId: string;
    category: ComplaintCategory;
    description: string;
    photoUrl?: string;
    priority: ComplaintPriority;
    status: ComplaintStatus;
    assignedTo?: string;
    resolutionNote?: string;
    resolvedBy?: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
}
export interface ComplaintComment {
    id: string;
    complaintId: string;
    authorId: string;
    authorType: 'admin' | 'student';
    comment: string;
    createdAt: string;
}
//# sourceMappingURL=complaint.types.d.ts.map