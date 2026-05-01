export declare const ROLES: {
    readonly SUPER_ADMIN: "super_admin";
    readonly STAFF: "staff";
    readonly STUDENT: "student";
    readonly PARENT: "parent";
};
export type Role = typeof ROLES[keyof typeof ROLES];
export declare const ADMIN_ROLES: Role[];
export declare const STUDENT_ROLES: Role[];
//# sourceMappingURL=roles.constants.d.ts.map