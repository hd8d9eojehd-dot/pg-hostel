import type { InvoiceStatus, InvoiceType, PaymentMode } from '../constants/status.constants';
export interface Invoice {
    id: string;
    studentId: string;
    invoiceNumber: string;
    type: InvoiceType;
    description?: string;
    amount: number;
    lateFee: number;
    discount: number;
    totalAmount: number;
    dueDate: string;
    generatedDate: string;
    status: InvoiceStatus;
    paidAmount: number;
    balance: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Payment {
    id: string;
    invoiceId: string;
    studentId: string;
    receiptNumber: string;
    amount: number;
    paymentMode: PaymentMode;
    transactionRef?: string;
    paidDate: string;
    cashfreeOrderId?: string;
    cashfreePaymentId?: string;
    notes?: string;
    createdAt: string;
}
//# sourceMappingURL=finance.types.d.ts.map