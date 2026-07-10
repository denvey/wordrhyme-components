/**
 * 将字符串转为人类可读格式
 *
 * @example
 * humanize("createdAt") // "Created At"
 * humanize("user_name") // "User Name"
 * humanize("firstName") // "First Name"
 */
export function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
