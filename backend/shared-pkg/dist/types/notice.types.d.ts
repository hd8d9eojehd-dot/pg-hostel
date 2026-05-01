import type { NoticeCategory, NoticePriority } from '../constants/status.constants';
export interface Notice {
    id: string;
    branchId?: string;
    title: string;
    description: string;
    category: NoticeCategory;
    priority: NoticePriority;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    expiryDate?: string;
    isPublished: boolean;
    publishedAt?: string;
    whatsappSent: boolean;
    whatsappSentAt?: string;
}
//# sourceMappingURL=notice.types.d.ts.map