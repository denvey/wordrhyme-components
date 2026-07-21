import { addDays } from 'date-fns/addDays';
import { endOfDay } from 'date-fns/endOfDay';
import { startOfDay } from 'date-fns/startOfDay';
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
  sql,
  type SQL,
  type Table,
} from 'drizzle-orm';

type ColumnTarget = AnyColumn | SQL;

/** 过滤器变体类型 */
export type FilterVariant =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'dateRange'
  | 'boolean'
  | 'select'
  | 'multiSelect';

/** 过滤器操作符 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'iLike'
  | 'notILike'
  | 'inArray'
  | 'notInArray'
  | 'isBetween'
  | 'isRelativeToToday'
  | 'isEmpty'
  | 'isNotEmpty';

type DateRangeOperator = Extract<
  FilterOperator,
  'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'isBetween' | 'isRelativeToToday'
>;

/** 连接操作符 */
export type JoinOperator = 'and' | 'or';

/** 扩展的列过滤器 */
export interface ExtendedColumnFilter<T extends Table = Table> {
  id: keyof T | string;
  value: unknown;
  variant: FilterVariant;
  operator: FilterOperator;
}

/** Host-resolved UTC boundaries for a calendar-date filter. */
export interface DateFilterRange {
  start?: Date;
  endExclusive?: Date;
}

/**
 * Optional host adapter for date filters.
 *
 * AutoCrud intentionally does not choose a time zone. A host that has business
 * time-zone context can resolve the filter to UTC boundaries. Returning
 * undefined preserves the legacy server-local parsing behavior. A non-empty
 * result is authoritative and must contain valid boundaries for the operator.
 */
export type DateRangeResolver<T extends Table = Table> = (
  filter: ExtendedColumnFilter<T>,
) => DateFilterRange | undefined;

/**
 * 检查列是否为空
 */
function toSqlTarget(column: ColumnTarget): SQL {
  return sql`${column}`;
}

function isBooleanColumn(column: ColumnTarget): boolean {
  return 'dataType' in column && column.dataType === 'boolean';
}

function isEmpty(column: ColumnTarget): SQL {
  const expr = toSqlTarget(column);
  return or(isNull(expr), eq(expr, '')) as SQL;
}

/**
 * 安全解析日期时间戳
 * @returns Date 对象，如果解析失败返回 null
 */
function safeParseDate(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const timestamp = typeof value === 'string' ? Number(value) : value;

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
  if (value === undefined || value === null || value.trim() === '') {
    return null;
  }

  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function isValidDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isDateRangeOperator(operator: FilterOperator): operator is DateRangeOperator {
  switch (operator) {
    case 'eq':
    case 'ne':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
    case 'isBetween':
    case 'isRelativeToToday':
      return true;
    case 'iLike':
    case 'notILike':
    case 'inArray':
    case 'notInArray':
    case 'isEmpty':
    case 'isNotEmpty':
      return false;
  }

  return false;
}

function normalizeDateRange(range: DateFilterRange): DateFilterRange {
  if (range.start !== undefined && !isValidDate(range.start)) {
    throw new RangeError('resolveDateRange returned an invalid start boundary');
  }
  if (range.endExclusive !== undefined && !isValidDate(range.endExclusive)) {
    throw new RangeError('resolveDateRange returned an invalid endExclusive boundary');
  }

  const { start, endExclusive } = range;
  if (!start && !endExclusive) {
    throw new RangeError('resolveDateRange must return at least one date boundary');
  }
  if (start && endExclusive && start >= endExclusive) {
    throw new RangeError('resolveDateRange requires start to be before endExclusive');
  }

  return { start, endExclusive };
}

function requireDateBoundary(
  boundary: Date | undefined,
  name: keyof DateFilterRange,
  operator: DateRangeOperator,
): Date {
  if (!boundary) {
    throw new RangeError(`resolveDateRange must return ${name} for operator ${operator}`);
  }
  return boundary;
}

function resolvedDateCondition(
  expr: SQL,
  operator: DateRangeOperator,
  range: DateFilterRange,
): SQL {
  const { start, endExclusive } = range;

  switch (operator) {
    case 'eq':
    case 'isBetween':
    case 'isRelativeToToday':
      if (start && endExclusive)
        return and(gte(expr, start), lt(expr, endExclusive)) as SQL;
      if (start) return gte(expr, start);
      return lt(expr, requireDateBoundary(endExclusive, 'endExclusive', operator));
    case 'ne':
      if (start && endExclusive)
        return or(lt(expr, start), gte(expr, endExclusive)) as SQL;
      if (start) return lt(expr, start);
      return gte(expr, requireDateBoundary(endExclusive, 'endExclusive', operator));
    case 'lt':
      return lt(expr, requireDateBoundary(start, 'start', operator));
    case 'lte':
      return lt(expr, requireDateBoundary(endExclusive, 'endExclusive', operator));
    case 'gt':
      return gte(expr, requireDateBoundary(endExclusive, 'endExclusive', operator));
    case 'gte':
      return gte(expr, requireDateBoundary(start, 'start', operator));
  }

  throw new Error('Unsupported resolved date operator');
}

export function filterColumns<T extends Table>({
  table,
  filters,
  joinOperator,
  resolveColumn,
  resolveDateRange,
}: {
  table: T;
  filters: ExtendedColumnFilter<T>[];
  joinOperator: JoinOperator;
  resolveColumn?: (columnId: keyof T | string) => ColumnTarget | undefined;
  resolveDateRange?: DateRangeResolver<T>;
}): SQL | undefined {
  const joinFn = joinOperator === 'and' ? and : or;

  const conditions = filters.map((filter) => {
    const column = resolveColumn ? resolveColumn(filter.id) : getColumn(table, filter.id);
    if (!column) return undefined;
    const expr = toSqlTarget(column);
    if (
      (filter.variant === 'date' || filter.variant === 'dateRange') &&
      isDateRangeOperator(filter.operator)
    ) {
      const resolvedRange = resolveDateRange?.(filter);
      if (resolvedRange !== undefined) {
        return resolvedDateCondition(
          expr,
          filter.operator,
          normalizeDateRange(resolvedRange),
        );
      }
    }

    switch (filter.operator) {
      case 'iLike':
        return filter.variant === 'text' && typeof filter.value === 'string'
          ? ilike(expr, `%${filter.value}%`)
          : undefined;

      case 'notILike':
        return filter.variant === 'text' && typeof filter.value === 'string'
          ? notIlike(expr, `%${filter.value}%`)
          : undefined;

      case 'eq':
        if (isBooleanColumn(column) && typeof filter.value === 'string') {
          return eq(expr, filter.value === 'true');
        }
        if (
          filter.variant === 'dateRange' &&
          Array.isArray(filter.value) &&
          filter.value.length === 2
        ) {
          // dateRange with eq operator should be treated as isBetween
          const startDate = safeParseDate(filter.value[0]);
          const endDate = safeParseDate(filter.value[1]);
          if (!startDate && !endDate) return undefined;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          return and(
            startDate ? gte(expr, startDate) : undefined,
            endDate ? lte(expr, endDate) : undefined,
          );
        }
        if (filter.variant === 'date' && typeof filter.value === 'string') {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          return and(gte(expr, date), lte(expr, end));
        }
        return eq(expr, filter.value);

      case 'ne':
        if (isBooleanColumn(column) && typeof filter.value === 'string') {
          return ne(expr, filter.value === 'true');
        }
        if (filter.variant === 'date' || filter.variant === 'dateRange') {
          const date = safeParseDate(filter.value as string);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          return or(lt(expr, date), gt(expr, end));
        }
        return ne(expr, filter.value);

      case 'inArray':
        if (Array.isArray(filter.value)) {
          return inArray(expr, filter.value);
        }
        return undefined;

      case 'notInArray':
        if (Array.isArray(filter.value)) {
          return notInArray(expr, filter.value);
        }
        return undefined;

      case 'lt':
        if (filter.variant === 'number' || filter.variant === 'range') {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? lt(expr, num) : undefined;
        }
        if (filter.variant === 'date' && typeof filter.value === 'string') {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(23, 59, 59, 999);
          return lt(expr, date);
        }
        return undefined;

      case 'lte':
        if (filter.variant === 'number' || filter.variant === 'range') {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? lte(expr, num) : undefined;
        }
        if (filter.variant === 'date' && typeof filter.value === 'string') {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(23, 59, 59, 999);
          return lte(expr, date);
        }
        return undefined;

      case 'gt':
        if (filter.variant === 'number' || filter.variant === 'range') {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? gt(expr, num) : undefined;
        }
        if (filter.variant === 'date' && typeof filter.value === 'string') {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          return gt(expr, date);
        }
        return undefined;

      case 'gte':
        if (filter.variant === 'number' || filter.variant === 'range') {
          const num = safeParseNumber(filter.value as string);
          return num !== null ? gte(expr, num) : undefined;
        }
        if (filter.variant === 'date' && typeof filter.value === 'string') {
          const date = safeParseDate(filter.value);
          if (!date) return undefined;
          date.setHours(0, 0, 0, 0);
          return gte(expr, date);
        }
        return undefined;

      case 'isBetween':
        if (
          (filter.variant === 'date' || filter.variant === 'dateRange') &&
          Array.isArray(filter.value) &&
          filter.value.length === 2
        ) {
          const startDate = safeParseDate(filter.value[0]);
          const endDate = safeParseDate(filter.value[1]);
          if (!startDate && !endDate) return undefined;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);
          return and(
            startDate ? gte(expr, startDate) : undefined,
            endDate ? lte(expr, endDate) : undefined,
          );
        }

        if (
          (filter.variant === 'number' || filter.variant === 'range') &&
          Array.isArray(filter.value) &&
          filter.value.length === 2
        ) {
          const firstValue = safeParseNumber(filter.value[0]);
          const secondValue = safeParseNumber(filter.value[1]);

          if (firstValue === null && secondValue === null) {
            return undefined;
          }

          if (firstValue !== null && secondValue === null) {
            return eq(expr, firstValue);
          }

          if (firstValue === null && secondValue !== null) {
            return eq(expr, secondValue);
          }

          return and(
            firstValue !== null ? gte(expr, firstValue) : undefined,
            secondValue !== null ? lte(expr, secondValue) : undefined,
          );
        }
        return undefined;

      case 'isRelativeToToday':
        if (
          (filter.variant === 'date' || filter.variant === 'dateRange') &&
          typeof filter.value === 'string'
        ) {
          const today = new Date();
          const [amount, unit] = filter.value.split(' ') ?? [];
          let startDate: Date;
          let endDate: Date;

          if (!amount || !unit) return undefined;

          switch (unit) {
            case 'days':
              startDate = startOfDay(addDays(today, Number.parseInt(amount, 10)));
              endDate = endOfDay(startDate);
              break;
            case 'weeks':
              startDate = startOfDay(addDays(today, Number.parseInt(amount, 10) * 7));
              endDate = endOfDay(addDays(startDate, 6));
              break;
            case 'months':
              startDate = startOfDay(addDays(today, Number.parseInt(amount, 10) * 30));
              endDate = endOfDay(addDays(startDate, 29));
              break;
            default:
              return undefined;
          }

          return and(gte(expr, startDate), lte(expr, endDate));
        }
        return undefined;

      case 'isEmpty':
        return isEmpty(expr);

      case 'isNotEmpty':
        return not(isEmpty(expr));

      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
  });

  const validConditions = conditions.filter((condition) => condition !== undefined);

  return validConditions.length > 0 ? joinFn(...validConditions) : undefined;
}

export function getColumn<T extends Table>(
  table: T,
  columnKey: keyof T | string,
): AnyColumn | undefined {
  return table[columnKey as keyof T] as AnyColumn | undefined;
}
