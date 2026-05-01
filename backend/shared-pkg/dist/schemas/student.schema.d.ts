import { z } from 'zod';
export declare const CreateStudentSchema: z.ZodObject<{
    name: z.ZodString;
    fatherName: z.ZodString;
    motherName: z.ZodOptional<z.ZodString>;
    mobile: z.ZodString;
    parentMobile: z.ZodOptional<z.ZodString>;
    motherMobile: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    aadhaar: z.ZodOptional<z.ZodString>;
    fatherAadhaar: z.ZodOptional<z.ZodString>;
    permanentAddress: z.ZodString;
    emergencyContact: z.ZodString;
    emergencyContactName: z.ZodString;
    college: z.ZodString;
    course: z.ZodString;
    branch: z.ZodString;
    yearOfStudy: z.ZodNumber;
    semester: z.ZodNumber;
    totalSemesters: z.ZodDefault<z.ZodNumber>;
    joiningDate: z.ZodString;
    stayDuration: z.ZodOptional<z.ZodString>;
    rentPackage: z.ZodEnum<["monthly", "semester", "annual"]>;
    depositAmount: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
    roomId: z.ZodString;
    bedId: z.ZodString;
    avatarUrl: z.ZodOptional<z.ZodString>;
    initialPayment: z.ZodOptional<z.ZodObject<{
        paymentMode: z.ZodEnum<["online", "semi_offline", "cash"]>;
        transactionRef: z.ZodOptional<z.ZodString>;
        cashAmount: z.ZodOptional<z.ZodNumber>;
        customAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    }, {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    semester: number;
    name: string;
    fatherName: string;
    mobile: string;
    permanentAddress: string;
    emergencyContact: string;
    emergencyContactName: string;
    college: string;
    course: string;
    branch: string;
    yearOfStudy: number;
    totalSemesters: number;
    joiningDate: string;
    rentPackage: "monthly" | "semester" | "annual";
    depositAmount: number;
    roomId: string;
    bedId: string;
    aadhaar?: string | undefined;
    motherName?: string | undefined;
    parentMobile?: string | undefined;
    motherMobile?: string | undefined;
    email?: string | undefined;
    fatherAadhaar?: string | undefined;
    stayDuration?: string | undefined;
    notes?: string | undefined;
    avatarUrl?: string | undefined;
    initialPayment?: {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    } | undefined;
}, {
    semester: number;
    name: string;
    fatherName: string;
    mobile: string;
    permanentAddress: string;
    emergencyContact: string;
    emergencyContactName: string;
    college: string;
    course: string;
    branch: string;
    yearOfStudy: number;
    joiningDate: string;
    rentPackage: "monthly" | "semester" | "annual";
    depositAmount: number;
    roomId: string;
    bedId: string;
    aadhaar?: string | undefined;
    motherName?: string | undefined;
    parentMobile?: string | undefined;
    motherMobile?: string | undefined;
    email?: string | undefined;
    fatherAadhaar?: string | undefined;
    totalSemesters?: number | undefined;
    stayDuration?: string | undefined;
    notes?: string | undefined;
    avatarUrl?: string | undefined;
    initialPayment?: {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    } | undefined;
}>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export declare const UpdateStudentSchema: z.ZodObject<Omit<{
    name: z.ZodOptional<z.ZodString>;
    fatherName: z.ZodOptional<z.ZodString>;
    motherName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    mobile: z.ZodOptional<z.ZodString>;
    parentMobile: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    motherMobile: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    aadhaar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    fatherAadhaar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    permanentAddress: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodString>;
    emergencyContactName: z.ZodOptional<z.ZodString>;
    college: z.ZodOptional<z.ZodString>;
    course: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    yearOfStudy: z.ZodOptional<z.ZodNumber>;
    semester: z.ZodOptional<z.ZodNumber>;
    totalSemesters: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    joiningDate: z.ZodOptional<z.ZodString>;
    stayDuration: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    rentPackage: z.ZodOptional<z.ZodEnum<["monthly", "semester", "annual"]>>;
    depositAmount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    roomId: z.ZodOptional<z.ZodString>;
    bedId: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    initialPayment: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        paymentMode: z.ZodEnum<["online", "semi_offline", "cash"]>;
        transactionRef: z.ZodOptional<z.ZodString>;
        cashAmount: z.ZodOptional<z.ZodNumber>;
        customAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    }, {
        paymentMode: "cash" | "online" | "semi_offline";
        transactionRef?: string | undefined;
        cashAmount?: number | undefined;
        customAmount?: number | undefined;
    }>>>;
}, "roomId" | "bedId" | "initialPayment">, "strip", z.ZodTypeAny, {
    semester?: number | undefined;
    aadhaar?: string | undefined;
    name?: string | undefined;
    fatherName?: string | undefined;
    motherName?: string | undefined;
    mobile?: string | undefined;
    parentMobile?: string | undefined;
    motherMobile?: string | undefined;
    email?: string | undefined;
    fatherAadhaar?: string | undefined;
    permanentAddress?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyContactName?: string | undefined;
    college?: string | undefined;
    course?: string | undefined;
    branch?: string | undefined;
    yearOfStudy?: number | undefined;
    totalSemesters?: number | undefined;
    joiningDate?: string | undefined;
    stayDuration?: string | undefined;
    rentPackage?: "monthly" | "semester" | "annual" | undefined;
    depositAmount?: number | undefined;
    notes?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    semester?: number | undefined;
    aadhaar?: string | undefined;
    name?: string | undefined;
    fatherName?: string | undefined;
    motherName?: string | undefined;
    mobile?: string | undefined;
    parentMobile?: string | undefined;
    motherMobile?: string | undefined;
    email?: string | undefined;
    fatherAadhaar?: string | undefined;
    permanentAddress?: string | undefined;
    emergencyContact?: string | undefined;
    emergencyContactName?: string | undefined;
    college?: string | undefined;
    course?: string | undefined;
    branch?: string | undefined;
    yearOfStudy?: number | undefined;
    totalSemesters?: number | undefined;
    joiningDate?: string | undefined;
    stayDuration?: string | undefined;
    rentPackage?: "monthly" | "semester" | "annual" | undefined;
    depositAmount?: number | undefined;
    notes?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export declare const RenewStudentSchema: z.ZodObject<{
    roomId: z.ZodString;
    bedId: z.ZodString;
    joiningDate: z.ZodString;
    stayDuration: z.ZodOptional<z.ZodString>;
    rentPackage: z.ZodEnum<["monthly", "semester", "annual"]>;
    depositAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    joiningDate: string;
    rentPackage: "monthly" | "semester" | "annual";
    depositAmount: number;
    roomId: string;
    bedId: string;
    stayDuration?: string | undefined;
}, {
    joiningDate: string;
    rentPackage: "monthly" | "semester" | "annual";
    depositAmount: number;
    roomId: string;
    bedId: string;
    stayDuration?: string | undefined;
}>;
export type RenewStudentInput = z.infer<typeof RenewStudentSchema>;
export declare const DeleteStudentSchema: z.ZodObject<{
    confirmStudentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmStudentId: string;
}, {
    confirmStudentId: string;
}>;
export type DeleteStudentInput = z.infer<typeof DeleteStudentSchema>;
export declare const ShiftRoomSchema: z.ZodObject<{
    newRoomId: z.ZodString;
    newBedId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newRoomId: string;
    newBedId: string;
    reason: string;
}, {
    newRoomId: string;
    newBedId: string;
    reason: string;
}>;
export type ShiftRoomInput = z.infer<typeof ShiftRoomSchema>;
export declare const ExtendStaySchema: z.ZodObject<{
    newEndDate: z.ZodString;
    newPackage: z.ZodOptional<z.ZodEnum<["monthly", "semester", "annual"]>>;
}, "strip", z.ZodTypeAny, {
    newEndDate: string;
    newPackage?: "monthly" | "semester" | "annual" | undefined;
}, {
    newEndDate: string;
    newPackage?: "monthly" | "semester" | "annual" | undefined;
}>;
export type ExtendStayInput = z.infer<typeof ExtendStaySchema>;
export declare const VacateStudentSchema: z.ZodObject<{
    vacateDate: z.ZodString;
    reason: z.ZodString;
    depositRefundAmount: z.ZodOptional<z.ZodNumber>;
    damageAmount: z.ZodOptional<z.ZodNumber>;
    inspectionNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    vacateDate: string;
    depositRefundAmount?: number | undefined;
    damageAmount?: number | undefined;
    inspectionNotes?: string | undefined;
}, {
    reason: string;
    vacateDate: string;
    depositRefundAmount?: number | undefined;
    damageAmount?: number | undefined;
    inspectionNotes?: string | undefined;
}>;
export type VacateStudentInput = z.infer<typeof VacateStudentSchema>;
export declare const UpdateStudentStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["active", "reserved", "pending", "vacated", "suspended"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "reserved" | "pending" | "vacated" | "suspended";
    reason?: string | undefined;
}, {
    status: "active" | "reserved" | "pending" | "vacated" | "suspended";
    reason?: string | undefined;
}>;
export type UpdateStudentStatusInput = z.infer<typeof UpdateStudentStatusSchema>;
//# sourceMappingURL=student.schema.d.ts.map