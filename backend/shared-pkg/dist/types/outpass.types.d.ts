import type { OutpassType, OutpassStatus } from '../constants/status.constants';
export interface Outpass {
    id: string;
    outpassNumber: string;
    studentId: string;
    type: OutpassType;
    fromDate: string;
    toDate: string;
    fromTime?: string;
    toTime?: string;
    reason: string;
    destination?: string;
    contactAtDestination?: string;
    status: OutpassStatus;
    approvedBy?: string;
    approvalNote?: string;
    createdAt: string;
    updatedAt: string;
    returnConfirmedAt?: string;
}
//# sourceMappingURL=outpass.types.d.ts.map