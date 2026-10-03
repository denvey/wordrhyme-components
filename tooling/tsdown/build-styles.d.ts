import type { BuildContext } from 'tsdown';

export declare function buildStyles(
  ctx: BuildContext,
  dependency?: string,
  buildSource?: string,
): Promise<void>;
