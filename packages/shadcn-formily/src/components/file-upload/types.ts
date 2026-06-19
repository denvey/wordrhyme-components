import type { FileUploadProgressCallBacks } from '@wordrhyme/shadcn-ui';

export interface FormFileUploadOptions extends FileUploadProgressCallBacks {
  component: string;
  componentProps: Record<string, any>;
  path: string;
}
