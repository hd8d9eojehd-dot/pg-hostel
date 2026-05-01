import type { MealType } from '../constants/status.constants';
export interface FoodMenu {
    id: string;
    branchId: string;
    month: number;
    year: number;
    dayOfMonth: number;
    mealType: MealType;
    items: string;
    isSpecial: boolean;
    specialLabel?: string;
    specialNote?: string;
    isHoliday: boolean;
}
export interface MealTimings {
    id: string;
    branchId: string;
    breakfastStart: string;
    breakfastEnd: string;
    lunchStart: string;
    lunchEnd: string;
    dinnerStart: string;
    dinnerEnd: string;
}
//# sourceMappingURL=food.types.d.ts.map