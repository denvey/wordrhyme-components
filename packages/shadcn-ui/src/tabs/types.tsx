import type { TabsTrigger as BaseTabsTrigger } from '@wordrhyme/shadcn';

export type BaseTabsTriggerProps = React.ComponentProps<typeof BaseTabsTrigger>;
export type TabsVariant = 'default' | 'underline' | BaseTabsTriggerProps['variant'];
