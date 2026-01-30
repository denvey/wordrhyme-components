import { addDays, endOfDay, startOfDay } from "date-fns";
import {
  type AnyColumn,
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  not,
  notIlike,
  notInArray,
  or,
  type SQL,
  type Table,
} from "drizzle-orm";

/** 过滤器变体类型 */
export type FilterVariant =
  | "text"
  | "number"
  | "range"
  | "date"
  | "dateRange"
  | "boolean"
  | "select"
  | "multiSelect";

/** 过滤器操作符 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "iLike"
  | "notILike"
  | "inArray"
  | "notInArray"
  | "isBetween"
  | "isRelativeToToday"
  | "isEmpty"
  | "isNotEmpty";

/** 连接操作符 */
export type JoinOperator = "and" | "or";

/** 扩展的列过滤器 */
export interface ExtendedColumnFilter<T extends Table = Table> {
  id: keyof T;
  value: unknown;
  variant: FilterVariant;
  operator: FilterOperator;
}

/**
 * 检查列是否为空
 */
function isEmpty(column: AnyColumn): SQL {
  return or(isNull(column), eq(column, "")) as SQL;
}

/**
 * 安全解析日期时间戳
 * @returns Date 对象，如果解析失败返回 null
 */
function safeParseDate(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const timestamp = typeof value === "string" ? Number(value) : value;

  // 检查 NaN
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);

  // 检查 Invalid Date
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 安全解析数字
 * @returns number，如果解析失败返回 null
 */
function safeParseNumber(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function filterColumns<T extends Table>({
  table,
  filters,
  joinOperator,
}: {
  table: T;
  filters: ExtendedColumnFilter<T>[];
  joinOperator: JoinOperator;
}): SQL | undefined {
  const joinFn = joinOperator === "and" ? and : or;

  const conditions = filters.map((filter) => {
    const column = getColumn(table, filter.id);

    switch (filter.operator) {
      case "iLike":
        return filter.variant === "text" && typeof filter.value === "string"
          ? ilike(column, `%${filter.value}%`)
          : undefined;

      case "notILike":
        return filter.variant === "text" && typeof filter.value === "string"
          ? notIlike(column, `%${filter.value}%`)
          : undefined;

      case "eq":
        if (column.dataType === "boolean" && typeof filter.value === "string") {
          return eq(column, filter.value === "true");
        }
        if (filter.variant === "dateRange" && Array.isArray(filter.value) && filter.value.length === 2) {
          // dateRange with eq operator should be treated as isBetween
          const startDate = safeParseDate(filter.value[0]);
          const endDate = safeParseDate(filter.value[1]);
          if (!startDate && !endDate) return undefined;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          return and(
            startDate ? gte(column, startDate) : undefined,
            endDate ? lte(column, endDate) : undefined,
          );
        }
        if (filter.variant === "date" && typeof filter.value === "string") {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          return and(gte(column, date), lte(column, end));
        }
        return eq(column, filter.value);

      case "ne":
        if (column.dataType === "boolean" && typeof filter.value === "string") {
          return ne(column, filter.value === "true");
        }
        if (filter.variant === "date" || filter.variant === "dateRange") {
          const date = safeParseDate(filter.value as string);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          return or(lt(column, date), gt(column, end));
        }
        return ne(column, filter.value);

      case "inArray":
        if (Array.isArray(filter.value)) {
          return inArray(column, filter.value);
        }
        return undefined;

      case "notInArray":
        if (Array.isArray(filter.value)) {
          return notInArray(column, filter.value);
        }
        return undefined;

      case "lt":
        if (filter.variant === "number" || filter.variant === "range") {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? lt(column, num) : undefined;
        }
        if (filter.variant === "date" && typeof filter.value === "string") {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(23, 59, 59, 999);
          return lt(column, date);
        }
        return undefined;

      case "lte":
        if (filter.variant === "number" || filter.variant === "range") {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? lte(column, num) : undefined;
        }
        if (filter.variant === "date" && typeof filter.value === "string") {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(23, 59, 59, 999);
          return lte(column, date);
        }
        return undefined;

      case "gt":
        if (filter.variant === "number" || filter.variant === "range") {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? gt(column, num) : undefined;
        }
        if (filter.variant === "date" && typeof filter.value === "string") {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          return gt(column, date);
        }
        return undefined;

      case "gte":
        if (filter.variant === "number" || filter.variant === "range") {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? gte(column, num) : undefined;
        }
        if (filter.variant === "date" && typeof filter.value === "string") {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          return gte(column, date);
        }
        return undefined;

      case "isBetween":
        if (
          (filter.variant === "date" || filter.variant === "dateRange") &&
          Array.isArray(filter.value) &&
          filter.value.length === 2
        ) {
          const startDate = safeParseDate(filter.value[0]);
          const endDate = safeParseDate(filter.value[1]);
          if (!startDate && !endDate) return undefined;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          return and(
            startDate ? gte(column, startDate) : undefined,
            endDate ? lte(column, endDate) : undefined,
          );
        }

        if (
          (filter.variant === "number" || filter.variant === "range") &&
          Array.isArray(filter.value) &&
          filter.value.length === 2
        ) {
          const firstValue = safeParseNumber(filter.value[0]);
          const secondValue = safeParseNumber(filter.value[1]);

          if (firstValue === null && secondValue === null) {
            return undefined;
          }

          if (firstValue !== null && secondValue === null) {
            return eq(column, firstValue);
          }

          if (firstValue === null && secondValue !== null) {
            return eq(column, secondValue);
          }

          return and(
            firstValue !== null ? gte(column, firstValue) : undefined,
            secondValue !== null ? lte(column, secondValue) : undefined,
          );
        }
        return undefined;

      case "isRelativeToToday":
        if (
          (filter.variant === "date" || filter.variant === "dateRange") &&
          typeof filter.value === "string"
        ) {
          const today = new Date();
          const [amount, unit] = filter.value.split(" ") ?? [];
          let startDate: Date;
          let endDate: Date;

          if (!amount || !unit) return undefined;

          switch (unit) {
            case "days":
              startDate = startOfDay(
                addDays(today, Number.parseInt(amount, 10)),
              );
              endDate = endOfDay(startDate);
              break;
            case "weeks":
              startDate = startOfDay(
                addDays(today, Number.parseInt(amount, 10) * 7),
              );
              endDate = endOfDay(addDays(startDate, 6));
              break;
            case "months":
              startDate = startOfDay(
                addDays(today, Number.parseInt(amount, 10) * 30),
              );
              endDate = endOfDay(addDays(startDate, 29));
              break;
            default:
              return undefined;
          }

          return and(gte(column, startDate), lte(column, endDate));
        }
        return undefined;

      case "isEmpty":
        return isEmpty(column);

      case "isNotEmpty":
        return not(isEmpty(column));

      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
  });

  const validConditions = conditions.filter(
    (condition) => condition !== undefined,
  );

  return validConditions.length > 0 ? joinFn(...validConditions) : undefined;
}

export function getColumn<T extends Table>(
  table: T,
  columnKey: keyof T,
): AnyColumn {
  return table[columnKey] as AnyColumn;
}
