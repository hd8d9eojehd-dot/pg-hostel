import { z } from 'zod';
export declare const CreateRoomSchema: z.ZodObject<{
    branchId: z.ZodString;
    floorId: z.ZodString;
    roomNumber: z.ZodString;
    roomType: z.ZodEnum<["single", "double", "triple", "quad"]>;
    bedCount: z.ZodNumber;
    hasAttachedBath: z.ZodDefault<z.ZodBoolean>;
    isFurnished: z.ZodDefault<z.ZodBoolean>;
    hasWifi: z.ZodDefault<z.ZodBoolean>;
    monthlyRent: z.ZodOptional<z.ZodNumber>;
    semesterRent: z.ZodOptional<z.ZodNumber>;
    annualRent: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    floorId: string;
    roomNumber: string;
    roomType: "single" | "double" | "triple" | "quad";
    bedCount: number;
    hasAttachedBath: boolean;
    isFurnished: boolean;
    hasWifi: boolean;
    notes?: string | undefined;
    monthlyRent?: number | undefined;
    semesterRent?: number | undefined;
    annualRent?: number | undefined;
}, {
    branchId: string;
    floorId: string;
    roomNumber: string;
    roomType: "single" | "double" | "triple" | "quad";
    bedCount: number;
    notes?: string | undefined;
    hasAttachedBath?: boolean | undefined;
    isFurnished?: boolean | undefined;
    hasWifi?: boolean | undefined;
    monthlyRent?: number | undefined;
    semesterRent?: number | undefined;
    annualRent?: number | undefined;
}>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export declare const UpdateRoomSchema: z.ZodObject<Omit<{
    branchId: z.ZodOptional<z.ZodString>;
    floorId: z.ZodOptional<z.ZodString>;
    roomNumber: z.ZodOptional<z.ZodString>;
    roomType: z.ZodOptional<z.ZodEnum<["single", "double", "triple", "quad"]>>;
    bedCount: z.ZodOptional<z.ZodNumber>;
    hasAttachedBath: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isFurnished: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    hasWifi: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    monthlyRent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    semesterRent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    annualRent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "branchId" | "floorId">, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    roomNumber?: string | undefined;
    roomType?: "single" | "double" | "triple" | "quad" | undefined;
    bedCount?: number | undefined;
    hasAttachedBath?: boolean | undefined;
    isFurnished?: boolean | undefined;
    hasWifi?: boolean | undefined;
    monthlyRent?: number | undefined;
    semesterRent?: number | undefined;
    annualRent?: number | undefined;
}, {
    notes?: string | undefined;
    roomNumber?: string | undefined;
    roomType?: "single" | "double" | "triple" | "quad" | undefined;
    bedCount?: number | undefined;
    hasAttachedBath?: boolean | undefined;
    isFurnished?: boolean | undefined;
    hasWifi?: boolean | undefined;
    monthlyRent?: number | undefined;
    semesterRent?: number | undefined;
    annualRent?: number | undefined;
}>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export declare const UpdateRoomStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["available", "occupied", "partial", "maintenance", "blocked"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "available" | "occupied" | "partial" | "maintenance" | "blocked";
    notes?: string | undefined;
}, {
    status: "available" | "occupied" | "partial" | "maintenance" | "blocked";
    notes?: string | undefined;
}>;
export type UpdateRoomStatusInput = z.infer<typeof UpdateRoomStatusSchema>;
export declare const CreateFloorSchema: z.ZodObject<{
    branchId: z.ZodString;
    floorNumber: z.ZodNumber;
    floorName: z.ZodOptional<z.ZodString>;
    groupType: z.ZodDefault<z.ZodEnum<["floor", "villa"]>>;
}, "strip", z.ZodTypeAny, {
    branchId: string;
    floorNumber: number;
    groupType: "floor" | "villa";
    floorName?: string | undefined;
}, {
    branchId: string;
    floorNumber: number;
    floorName?: string | undefined;
    groupType?: "floor" | "villa" | undefined;
}>;
export type CreateFloorInput = z.infer<typeof CreateFloorSchema>;
//# sourceMappingURL=room.schema.d.ts.map