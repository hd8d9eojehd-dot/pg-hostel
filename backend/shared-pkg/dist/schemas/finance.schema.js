"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateInvoiceSchema = exports.WaiveInvoiceSchema = exports.RecordPaymentSchema = exports.CreateInvoiceSchema = void 0;
const zod_1 = require("zod");
const status_constants_1 = require("../constants/status.constants");
exports.CreateInvoiceSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(status_constants_1.INVOICE_TYPE),
    description: zod_1.z.string().min(3).max(500).trim(),
    amount: zod_1.z.number().positive().max(9999999),
    discount: zod_1.z.number().min(0).default(0),
    lateFee: zod_1.z.number().min(0).default(0),
    dueDate: zod_1.z.string().date(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.RecordPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().uuid(),
    studentId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    paymentMode: zod_1.z.enum(status_constants_1.PAYMENT_MODE),
    transactionRef: zod_1.z.string().max(100).optional(),
    paidDate: zod_1.z.string().date(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.WaiveInvoiceSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(500).trim(),
    waiveAmount: zod_1.z.number().positive().optional(),
});
exports.UpdateInvoiceSchema = zod_1.z.object({
    description: zod_1.z.string().min(3).max(500).optional(),
    amount: zod_1.z.number().positive().optional(),
    discount: zod_1.z.number().min(0).optional(),
    lateFee: zod_1.z.number().min(0).optional(),
    dueDate: zod_1.z.string().date().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=finance.schema.js.map