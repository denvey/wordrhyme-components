/* eslint-disable perfectionist/sort-imports */
/**
 * AUTO-GENERATED FILE — DO NOT EDIT.
 *
 * This registry is produced by @internal/mcp from the `mcp.ts` files that live
 * next to each component. To change it, edit those `mcp.ts` files (or add a new
 * one when you add a component) and re-run the generator:
 *
 *   pnpm run mcp:generate
 */
import { meta as AbsoluteFillMeta0 } from '../absolute-fill/mcp';
import { meta as ActionBarMeta1 } from '../action-bar/mcp';
import { meta as AlertMeta2 } from '../alert/mcp';
import { meta as AvatarUploadMeta3 } from '../avatar-upload/mcp';
import { meta as ButtonMeta4 } from '../button/mcp';
import { meta as ButtonExtendedMeta5 } from '../button-extended/mcp';
import { meta as ButtonGroupMeta6 } from '../button-group/mcp';
import { meta as CardMeta7 } from '../card/mcp';
import { meta as CircleLoaderMeta8 } from '../circle-loader/mcp';
import { meta as CloseButtonAbsoluteMeta9 } from '../close-button-absolute/mcp';
import { meta as CloseButtonRoundedMeta10 } from '../close-button-rounded/mcp';
import { meta as ColorPickerMeta11 } from '../ColorPicker/mcp';
import { meta as ColorPickerBaseMeta12 } from '../ColorPickerBase/mcp';
import { meta as ColorSelectMeta13 } from '../color-select/mcp';
import { meta as ComboboxMeta14 } from '../combobox/mcp';
import { meta as ConfirmationDialogMeta15 } from '../confirmation-dialog/mcp';
import { meta as ContentCardMeta16 } from '../content-card/mcp';
import { meta as DatePickerMeta17 } from '../date-picker/mcp';
import { meta as DialogMeta18 } from '../dialog/mcp';
import { meta as DrawerMeta19 } from '../drawer/mcp';
import { meta as FacetedMeta20 } from '../faceted/mcp';
import { meta as FileUploadMeta21 } from '../file-upload/mcp';
import { meta as FileUploadInlineMeta22 } from '../file-upload-inline/mcp';
import { meta as FileUploadRootMeta23 } from '../file-upload-root/mcp';
import { meta as IconPickerMeta24 } from '../icon-selector/mcp';
import { meta as IconToggleMeta25 } from '../icon-toggle/mcp';
import { meta as InputMeta26 } from '../input/mcp';
import { meta as KbdMeta27 } from '../kbd/mcp';
import { meta as LayoutMeta28 } from '../layout/mcp';
import { meta as LoadingOverlayMeta29 } from '../loading-overlay/mcp';
import { meta as MultiComboboxMeta30 } from '../multi-combobox/mcp';
import { meta as OverlayProviderMeta31 } from '../overlay-provider/mcp';
import { meta as PaginationMeta32 } from '../pagination/mcp';
import { meta as PopoverMeta33 } from '../popover/mcp';
import { meta as RatingMeta34 } from '../rating/mcp';
import { meta as registerDialogMeta35 } from '../dialog-registry/mcp';
import { meta as registerDrawerMeta36 } from '../drawer-registry/mcp';
import { meta as RichTextEditorMeta37 } from '../rich-text-editor/mcp';
import { meta as ScaledPreviewMeta38 } from '../scaled-preview/mcp';
import { meta as SelectMeta39 } from '../select/mcp';
import { meta as ShakeStylesMeta40 } from '../shake-styles/mcp';
import { meta as SkeletonMeta41 } from '../skeleton/mcp';
import { meta as SliderMeta42 } from '../slider/mcp';
import { meta as SortableMeta43 } from '../sortable/mcp';
import { meta as TabsMeta44 } from '../tabs/mcp';
import { meta as TagsInputMeta45 } from '../tags-input/mcp';
import { meta as ThemeModeToggleButtonMeta46 } from '../theme-toggle/mcp';
import { meta as ThemeProviderMeta47 } from '../theme-provider/mcp';
import { meta as ToastMeta48 } from '../toast/mcp';
import { meta as ToggleButtonMeta49 } from '../toggle-button/mcp';
import { meta as ToggleGroupMeta50 } from '../toggle-group/mcp';
import { meta as TooltipMeta51 } from '../tooltip/mcp';

function withHtmlElementNote<
  TComponent extends { htmlElement?: string; notes?: readonly string[] },
>(comp: TComponent): TComponent & { notes: readonly string[] } {
  const htmlNote =
    comp.htmlElement != null && comp.htmlElement.length > 0
      ? `Also supports all standard props of a native <${comp.htmlElement}> element (onClick, disabled, className, style, type, aria-*, data-*, etc.).`
      : '';

  return {
    ...comp,
    notes:
      htmlNote.length > 0 ? [...(comp.notes ?? []), htmlNote] : [...(comp.notes ?? [])],
  };
}

// prettier-ignore
/** Generated component metadata map keyed by public component name. */
export const mcpRegistry = {
  "AbsoluteFill": withHtmlElementNote(AbsoluteFillMeta0),
  "ActionBar": withHtmlElementNote(ActionBarMeta1),
  "Alert": withHtmlElementNote(AlertMeta2),
  "AvatarUpload": withHtmlElementNote(AvatarUploadMeta3),
  "Button": withHtmlElementNote(ButtonMeta4),
  "ButtonExtended": withHtmlElementNote(ButtonExtendedMeta5),
  "ButtonGroup": withHtmlElementNote(ButtonGroupMeta6),
  "Card": withHtmlElementNote(CardMeta7),
  "CircleLoader": withHtmlElementNote(CircleLoaderMeta8),
  "CloseButtonAbsolute": withHtmlElementNote(CloseButtonAbsoluteMeta9),
  "CloseButtonRounded": withHtmlElementNote(CloseButtonRoundedMeta10),
  "ColorPicker": withHtmlElementNote(ColorPickerMeta11),
  "ColorPickerBase": withHtmlElementNote(ColorPickerBaseMeta12),
  "ColorSelect": withHtmlElementNote(ColorSelectMeta13),
  "Combobox": withHtmlElementNote(ComboboxMeta14),
  "ConfirmationDialog": withHtmlElementNote(ConfirmationDialogMeta15),
  "ContentCard": withHtmlElementNote(ContentCardMeta16),
  "DatePicker": withHtmlElementNote(DatePickerMeta17),
  "Dialog": withHtmlElementNote(DialogMeta18),
  "Drawer": withHtmlElementNote(DrawerMeta19),
  "Faceted": withHtmlElementNote(FacetedMeta20),
  "FileUpload": withHtmlElementNote(FileUploadMeta21),
  "FileUploadInline": withHtmlElementNote(FileUploadInlineMeta22),
  "FileUploadRoot": withHtmlElementNote(FileUploadRootMeta23),
  "IconPicker": withHtmlElementNote(IconPickerMeta24),
  "IconToggle": withHtmlElementNote(IconToggleMeta25),
  "Input": withHtmlElementNote(InputMeta26),
  "Kbd": withHtmlElementNote(KbdMeta27),
  "Layout": withHtmlElementNote(LayoutMeta28),
  "LoadingOverlay": withHtmlElementNote(LoadingOverlayMeta29),
  "MultiCombobox": withHtmlElementNote(MultiComboboxMeta30),
  "OverlayProvider": withHtmlElementNote(OverlayProviderMeta31),
  "Pagination": withHtmlElementNote(PaginationMeta32),
  "Popover": withHtmlElementNote(PopoverMeta33),
  "Rating": withHtmlElementNote(RatingMeta34),
  "registerDialog": withHtmlElementNote(registerDialogMeta35),
  "registerDrawer": withHtmlElementNote(registerDrawerMeta36),
  "RichTextEditor": withHtmlElementNote(RichTextEditorMeta37),
  "ScaledPreview": withHtmlElementNote(ScaledPreviewMeta38),
  "Select": withHtmlElementNote(SelectMeta39),
  "ShakeStyles": withHtmlElementNote(ShakeStylesMeta40),
  "Skeleton": withHtmlElementNote(SkeletonMeta41),
  "Slider": withHtmlElementNote(SliderMeta42),
  "Sortable": withHtmlElementNote(SortableMeta43),
  "Tabs": withHtmlElementNote(TabsMeta44),
  "TagsInput": withHtmlElementNote(TagsInputMeta45),
  "ThemeModeToggleButton": withHtmlElementNote(ThemeModeToggleButtonMeta46),
  "ThemeProvider": withHtmlElementNote(ThemeProviderMeta47),
  "Toast": withHtmlElementNote(ToastMeta48),
  "ToggleButton": withHtmlElementNote(ToggleButtonMeta49),
  "ToggleGroup": withHtmlElementNote(ToggleGroupMeta50),
  "Tooltip": withHtmlElementNote(TooltipMeta51),
} as const;

/** Type of the generated component metadata registry. */
export type McpRegistry = typeof mcpRegistry;
