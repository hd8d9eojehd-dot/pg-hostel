import type { DocType } from '../constants/status.constants';
export interface Document {
    id: string;
    studentId: string;
    type: DocType;
    label?: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt: string;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    rejectionNote?: string;
}
//# sourceMappingURL=document.types.d.ts.map