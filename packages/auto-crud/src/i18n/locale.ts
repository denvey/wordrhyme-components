/**
 * AutoCrud 国际化接口及内置语言包
 *
 * 使用方式：
 *   // 内置语言
 *   <AutoCrudTable locale="en-US" ... />
 *
 *   // 部分覆盖（以 zh-CN 为基础深合并）
 *   <AutoCrudTable locale={{ toolbar: { create: "Add" } }} ... />
 */

// ─── Locale Interface ────────────────────────────────────────────────────────

export interface AutoCrudLocale {
  toolbar: {
    create: string;
    import: string;
    export: string;
    exportSelected: (count: number) => string;
  };
  rowActions: {
    view: string;
    edit: string;
    copy: string;
    delete: string;
  };
  viewModal: {
    title: string;
  };
  boolean: {
    true: string;
    false: string;
  };
  formModal: {
    createTitle: string;
    editTitle: string;
    cancel: string;
    create: string;
    save: string;
    submitting: string;
  };
  deleteModal: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
    confirming: string;
  };
  bulkDeleteModal: {
    title: string;
    description: (count: number) => string;
    cancel: string;
    confirm: string;
  };
  importDialog: {
    title: string;
    uploadDescription: string;
    previewDescription: (count: number) => string;
    importingDescription: string;
    doneDescription: string;
    dragHint: string;
    formatHint: string;
    downloadTemplate: string;
    moreColumns: (count: number) => string;
    previewSummary: (
      rows: number,
      fields: number,
      format: string,
      previewLimit?: number,
    ) => string;
    reselect: string;
    confirmImport: string;
    importingRows: (count: number) => string;
    resultCreated: string;
    resultUpdated: string;
    resultSkipped: string;
    resultFailed: string;
    failedRowHeader: string;
    failedErrorHeader: string;
    close: string;
    continueImport: string;
    errorNoData: string;
    errorParseFailed: string;
    errorImportFailed: string;
  };
}

// ─── Built-in Locales ────────────────────────────────────────────────────────

export const zhCN: AutoCrudLocale = {
  toolbar: {
    create: '新建',
    import: '导入',
    export: '导出',
    exportSelected: (count) => `导出(${count})`,
  },
  rowActions: {
    view: '查看',
    edit: '编辑',
    copy: '复制',
    delete: '删除',
  },
  viewModal: {
    title: '详情',
  },
  boolean: {
    true: '是',
    false: '否',
  },
  formModal: {
    createTitle: '新建',
    editTitle: '编辑',
    cancel: '取消',
    create: '创建',
    save: '保存',
    submitting: '处理中...',
  },
  deleteModal: {
    title: '确认删除',
    description: '此操作无法撤销。确定要删除这条记录吗？',
    cancel: '取消',
    confirm: '确认删除',
    confirming: '删除中...',
  },
  bulkDeleteModal: {
    title: '确认批量删除',
    description: (count) => `此操作无法撤销。确定要删除选中的 ${count} 条记录吗？`,
    cancel: '取消',
    confirm: '确认删除',
  },
  importDialog: {
    title: '导入数据',
    uploadDescription: '上传 CSV 或 JSON 文件以批量导入数据',
    previewDescription: (count) => `已解析 ${count} 条数据，确认后开始导入`,
    importingDescription: '正在导入数据...',
    doneDescription: '导入完成',
    dragHint: '拖拽文件到此处，或点击选择文件',
    formatHint: '支持 CSV、JSON 格式',
    downloadTemplate: '下载 CSV 模板',
    moreColumns: (count) => `+${count} 列`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `共 ${rows} 条数据${previewLimit ? `（预览前 ${previewLimit} 条）` : ''}，${fields} 个字段，格式: ${format.toUpperCase()}`,
    reselect: '重新选择',
    confirmImport: '确认导入',
    importingRows: (count) => `正在导入 ${count} 条数据...`,
    resultCreated: '新建',
    resultUpdated: '更新',
    resultSkipped: '跳过',
    resultFailed: '验证失败',
    failedRowHeader: '行号',
    failedErrorHeader: '错误',
    close: '关闭',
    continueImport: '继续导入',
    errorNoData: '文件中没有数据行',
    errorParseFailed: '文件解析失败',
    errorImportFailed: '导入失败',
  },
};

export const enUS: AutoCrudLocale = {
  toolbar: {
    create: 'New',
    import: 'Import',
    export: 'Export',
    exportSelected: (count) => `Export (${count})`,
  },
  rowActions: {
    view: 'View',
    edit: 'Edit',
    copy: 'Copy',
    delete: 'Delete',
  },
  viewModal: {
    title: 'Details',
  },
  boolean: {
    true: 'Yes',
    false: 'No',
  },
  formModal: {
    createTitle: 'New',
    editTitle: 'Edit',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    submitting: 'Processing...',
  },
  deleteModal: {
    title: 'Confirm Delete',
    description:
      'This action cannot be undone. Are you sure you want to delete this record?',
    cancel: 'Cancel',
    confirm: 'Delete',
    confirming: 'Deleting...',
  },
  bulkDeleteModal: {
    title: 'Confirm Bulk Delete',
    description: (count) =>
      `This action cannot be undone. Are you sure you want to delete ${count} selected ${count === 1 ? 'record' : 'records'}?`,
    cancel: 'Cancel',
    confirm: 'Delete',
  },
  importDialog: {
    title: 'Import Data',
    uploadDescription: 'Upload a CSV or JSON file to bulk import data',
    previewDescription: (count) => `Parsed ${count} records, confirm to start importing`,
    importingDescription: 'Importing data...',
    doneDescription: 'Import complete',
    dragHint: 'Drag file here, or click to select',
    formatHint: 'Supports CSV, JSON formats',
    downloadTemplate: 'Download CSV Template',
    moreColumns: (count) => `+${count} more`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows} records${previewLimit ? ` (preview first ${previewLimit})` : ''}, ${fields} fields, format: ${format.toUpperCase()}`,
    reselect: 'Reselect',
    confirmImport: 'Confirm Import',
    importingRows: (count) => `Importing ${count} records...`,
    resultCreated: 'Created',
    resultUpdated: 'Updated',
    resultSkipped: 'Skipped',
    resultFailed: 'Failed',
    failedRowHeader: 'Row',
    failedErrorHeader: 'Error',
    close: 'Close',
    continueImport: 'Import More',
    errorNoData: 'No data rows found in file',
    errorParseFailed: 'Failed to parse file',
    errorImportFailed: 'Import failed',
  },
};

export const jaJP: AutoCrudLocale = {
  toolbar: {
    create: '新規作成',
    import: 'インポート',
    export: 'エクスポート',
    exportSelected: (count) => `エクスポート(${count})`,
  },
  rowActions: {
    view: '詳細',
    edit: '編集',
    copy: 'コピー',
    delete: '削除',
  },
  viewModal: { title: '詳細' },
  boolean: { true: 'はい', false: 'いいえ' },
  formModal: {
    createTitle: '新規作成',
    editTitle: '編集',
    cancel: 'キャンセル',
    create: '作成',
    save: '保存',
    submitting: '処理中...',
  },
  deleteModal: {
    title: '削除の確認',
    description: 'この操作は元に戻せません。このレコードを削除してもよろしいですか？',
    cancel: 'キャンセル',
    confirm: '削除する',
    confirming: '削除中...',
  },
  bulkDeleteModal: {
    title: '一括削除の確認',
    description: (count) =>
      `この操作は元に戻せません。選択した${count}件のレコードを削除してもよろしいですか？`,
    cancel: 'キャンセル',
    confirm: '削除する',
  },
  importDialog: {
    title: 'データのインポート',
    uploadDescription: 'CSVまたはJSONファイルをアップロードして一括インポート',
    previewDescription: (count) =>
      `${count}件のデータを解析しました。確認してインポートを開始します`,
    importingDescription: 'データをインポート中...',
    doneDescription: 'インポート完了',
    dragHint: 'ファイルをここにドラッグするか、クリックして選択',
    formatHint: 'CSV・JSON形式に対応',
    downloadTemplate: 'CSVテンプレートをダウンロード',
    moreColumns: (count) => `+${count}列`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows}件${previewLimit ? `（上位${previewLimit}件プレビュー）` : ''}、${fields}フィールド、形式: ${format.toUpperCase()}`,
    reselect: '再選択',
    confirmImport: 'インポートを確認',
    importingRows: (count) => `${count}件をインポート中...`,
    resultCreated: '新規作成',
    resultUpdated: '更新',
    resultSkipped: 'スキップ',
    resultFailed: '失敗',
    failedRowHeader: '行番号',
    failedErrorHeader: 'エラー',
    close: '閉じる',
    continueImport: '続けてインポート',
    errorNoData: 'ファイルにデータ行がありません',
    errorParseFailed: 'ファイルの解析に失敗しました',
    errorImportFailed: 'インポートに失敗しました',
  },
};

export const koKR: AutoCrudLocale = {
  toolbar: {
    create: '새로 만들기',
    import: '가져오기',
    export: '내보내기',
    exportSelected: (count) => `내보내기(${count})`,
  },
  rowActions: {
    view: '보기',
    edit: '편집',
    copy: '복사',
    delete: '삭제',
  },
  viewModal: { title: '상세 정보' },
  boolean: { true: '예', false: '아니요' },
  formModal: {
    createTitle: '새로 만들기',
    editTitle: '편집',
    cancel: '취소',
    create: '만들기',
    save: '저장',
    submitting: '처리 중...',
  },
  deleteModal: {
    title: '삭제 확인',
    description: '이 작업은 취소할 수 없습니다. 이 레코드를 삭제하시겠습니까?',
    cancel: '취소',
    confirm: '삭제',
    confirming: '삭제 중...',
  },
  bulkDeleteModal: {
    title: '일괄 삭제 확인',
    description: (count) =>
      `이 작업은 취소할 수 없습니다. 선택한 ${count}개 레코드를 삭제하시겠습니까?`,
    cancel: '취소',
    confirm: '삭제',
  },
  importDialog: {
    title: '데이터 가져오기',
    uploadDescription: 'CSV 또는 JSON 파일을 업로드하여 일괄 가져오기',
    previewDescription: (count) =>
      `${count}개의 데이터를 분석했습니다. 확인 후 가져오기를 시작합니다`,
    importingDescription: '데이터를 가져오는 중...',
    doneDescription: '가져오기 완료',
    dragHint: '파일을 여기에 드래그하거나 클릭하여 선택',
    formatHint: 'CSV, JSON 형식 지원',
    downloadTemplate: 'CSV 템플릿 다운로드',
    moreColumns: (count) => `+${count}열 더`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows}개 레코드${previewLimit ? ` (상위 ${previewLimit}개 미리보기)` : ''}, ${fields}개 필드, 형식: ${format.toUpperCase()}`,
    reselect: '다시 선택',
    confirmImport: '가져오기 확인',
    importingRows: (count) => `${count}개의 레코드를 가져오는 중...`,
    resultCreated: '생성됨',
    resultUpdated: '업데이트됨',
    resultSkipped: '건너뜀',
    resultFailed: '실패',
    failedRowHeader: '행 번호',
    failedErrorHeader: '오류',
    close: '닫기',
    continueImport: '계속 가져오기',
    errorNoData: '파일에 데이터 행이 없습니다',
    errorParseFailed: '파일 파싱에 실패했습니다',
    errorImportFailed: '가져오기에 실패했습니다',
  },
};

export const frFR: AutoCrudLocale = {
  toolbar: {
    create: 'Nouveau',
    import: 'Importer',
    export: 'Exporter',
    exportSelected: (count) => `Exporter (${count})`,
  },
  rowActions: {
    view: 'Voir',
    edit: 'Modifier',
    copy: 'Copier',
    delete: 'Supprimer',
  },
  viewModal: { title: 'Détails' },
  boolean: { true: 'Oui', false: 'Non' },
  formModal: {
    createTitle: 'Nouveau',
    editTitle: 'Modifier',
    cancel: 'Annuler',
    create: 'Créer',
    save: 'Enregistrer',
    submitting: 'En cours...',
  },
  deleteModal: {
    title: 'Confirmer la suppression',
    description:
      'Cette action est irréversible. Voulez-vous vraiment supprimer cet enregistrement ?',
    cancel: 'Annuler',
    confirm: 'Supprimer',
    confirming: 'Suppression...',
  },
  bulkDeleteModal: {
    title: 'Confirmer la suppression en masse',
    description: (count) =>
      `Cette action est irréversible. Voulez-vous vraiment supprimer les ${count} enregistrements sélectionnés ?`,
    cancel: 'Annuler',
    confirm: 'Supprimer',
  },
  importDialog: {
    title: 'Importer des données',
    uploadDescription: 'Téléchargez un fichier CSV ou JSON pour importer en masse',
    previewDescription: (count) =>
      `${count} enregistrements analysés, confirmez pour démarrer l'import`,
    importingDescription: 'Importation en cours...',
    doneDescription: 'Import terminé',
    dragHint: 'Glissez un fichier ici ou cliquez pour sélectionner',
    formatHint: 'Formats CSV et JSON acceptés',
    downloadTemplate: 'Télécharger le modèle CSV',
    moreColumns: (count) => `+${count} colonnes`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows} enregistrements${previewLimit ? ` (aperçu des ${previewLimit} premiers)` : ''}, ${fields} champs, format : ${format.toUpperCase()}`,
    reselect: 'Resélectionner',
    confirmImport: "Confirmer l'import",
    importingRows: (count) => `Importation de ${count} enregistrements...`,
    resultCreated: 'Créés',
    resultUpdated: 'Mis à jour',
    resultSkipped: 'Ignorés',
    resultFailed: 'Échoués',
    failedRowHeader: 'Ligne',
    failedErrorHeader: 'Erreur',
    close: 'Fermer',
    continueImport: "Continuer l'import",
    errorNoData: 'Aucune ligne de données dans le fichier',
    errorParseFailed: "Échec de l'analyse du fichier",
    errorImportFailed: "Échec de l'importation",
  },
};

export const deDE: AutoCrudLocale = {
  toolbar: {
    create: 'Neu',
    import: 'Importieren',
    export: 'Exportieren',
    exportSelected: (count) => `Exportieren (${count})`,
  },
  rowActions: {
    view: 'Anzeigen',
    edit: 'Bearbeiten',
    copy: 'Kopieren',
    delete: 'Löschen',
  },
  viewModal: { title: 'Details' },
  boolean: { true: 'Ja', false: 'Nein' },
  formModal: {
    createTitle: 'Neu',
    editTitle: 'Bearbeiten',
    cancel: 'Abbrechen',
    create: 'Erstellen',
    save: 'Speichern',
    submitting: 'Wird verarbeitet...',
  },
  deleteModal: {
    title: 'Löschen bestätigen',
    description:
      'Diese Aktion kann nicht rückgängig gemacht werden. Möchten Sie diesen Datensatz wirklich löschen?',
    cancel: 'Abbrechen',
    confirm: 'Löschen',
    confirming: 'Wird gelöscht...',
  },
  bulkDeleteModal: {
    title: 'Mehrfaches Löschen bestätigen',
    description: (count) =>
      `Diese Aktion kann nicht rückgängig gemacht werden. Möchten Sie die ${count} ausgewählten Datensätze wirklich löschen?`,
    cancel: 'Abbrechen',
    confirm: 'Löschen',
  },
  importDialog: {
    title: 'Daten importieren',
    uploadDescription:
      'CSV- oder JSON-Datei hochladen, um Daten massenweise zu importieren',
    previewDescription: (count) =>
      `${count} Datensätze analysiert, bestätigen Sie den Import`,
    importingDescription: 'Daten werden importiert...',
    doneDescription: 'Import abgeschlossen',
    dragHint: 'Datei hierher ziehen oder klicken zum Auswählen',
    formatHint: 'CSV- und JSON-Formate werden unterstützt',
    downloadTemplate: 'CSV-Vorlage herunterladen',
    moreColumns: (count) => `+${count} Spalten`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows} Datensätze${previewLimit ? ` (Vorschau der ersten ${previewLimit})` : ''}, ${fields} Felder, Format: ${format.toUpperCase()}`,
    reselect: 'Neu auswählen',
    confirmImport: 'Import bestätigen',
    importingRows: (count) => `${count} Datensätze werden importiert...`,
    resultCreated: 'Erstellt',
    resultUpdated: 'Aktualisiert',
    resultSkipped: 'Übersprungen',
    resultFailed: 'Fehlgeschlagen',
    failedRowHeader: 'Zeile',
    failedErrorHeader: 'Fehler',
    close: 'Schließen',
    continueImport: 'Weiteren Import starten',
    errorNoData: 'Keine Datenzeilen in der Datei',
    errorParseFailed: 'Datei konnte nicht analysiert werden',
    errorImportFailed: 'Import fehlgeschlagen',
  },
};

export const esES: AutoCrudLocale = {
  toolbar: {
    create: 'Nuevo',
    import: 'Importar',
    export: 'Exportar',
    exportSelected: (count) => `Exportar (${count})`,
  },
  rowActions: {
    view: 'Ver',
    edit: 'Editar',
    copy: 'Copiar',
    delete: 'Eliminar',
  },
  viewModal: { title: 'Detalles' },
  boolean: { true: 'Sí', false: 'No' },
  formModal: {
    createTitle: 'Nuevo',
    editTitle: 'Editar',
    cancel: 'Cancelar',
    create: 'Crear',
    save: 'Guardar',
    submitting: 'Procesando...',
  },
  deleteModal: {
    title: 'Confirmar eliminación',
    description:
      'Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar este registro?',
    cancel: 'Cancelar',
    confirm: 'Eliminar',
    confirming: 'Eliminando...',
  },
  bulkDeleteModal: {
    title: 'Confirmar eliminación masiva',
    description: (count) =>
      `Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar los ${count} registros seleccionados?`,
    cancel: 'Cancelar',
    confirm: 'Eliminar',
  },
  importDialog: {
    title: 'Importar datos',
    uploadDescription: 'Suba un archivo CSV o JSON para importar datos de forma masiva',
    previewDescription: (count) =>
      `Se analizaron ${count} registros, confirme para iniciar la importación`,
    importingDescription: 'Importando datos...',
    doneDescription: 'Importación completada',
    dragHint: 'Arrastre el archivo aquí o haga clic para seleccionar',
    formatHint: 'Formatos CSV y JSON compatibles',
    downloadTemplate: 'Descargar plantilla CSV',
    moreColumns: (count) => `+${count} columnas`,
    previewSummary: (rows, fields, format, previewLimit) =>
      `${rows} registros${previewLimit ? ` (vista previa de los primeros ${previewLimit})` : ''}, ${fields} campos, formato: ${format.toUpperCase()}`,
    reselect: 'Volver a seleccionar',
    confirmImport: 'Confirmar importación',
    importingRows: (count) => `Importando ${count} registros...`,
    resultCreated: 'Creados',
    resultUpdated: 'Actualizados',
    resultSkipped: 'Omitidos',
    resultFailed: 'Fallidos',
    failedRowHeader: 'Fila',
    failedErrorHeader: 'Error',
    close: 'Cerrar',
    continueImport: 'Continuar importando',
    errorNoData: 'No se encontraron filas de datos en el archivo',
    errorParseFailed: 'Error al analizar el archivo',
    errorImportFailed: 'Error en la importación',
  },
};

export const BUILTIN_LOCALES: Record<string, AutoCrudLocale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
};

// ─── Prop Type ───────────────────────────────────────────────────────────────

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (...args: unknown[]) => unknown
    ? T[P]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

/** locale prop 类型：内置语言 key 或部分覆盖对象 */
export type LocaleProp = string | DeepPartial<AutoCrudLocale>;

// ─── Resolver ────────────────────────────────────────────────────────────────

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== undefined &&
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      typeof tv === 'object' &&
      tv !== null &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      );
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}

/**
 * 解析 locale prop 为完整的 AutoCrudLocale
 * - string → 内置语言（fallback: zh-CN）
 * - object → 以 zh-CN 为基础深合并
 */
export function resolveLocale(localeProp?: LocaleProp): AutoCrudLocale {
  if (!localeProp) return zhCN;
  if (typeof localeProp === 'string') {
    return BUILTIN_LOCALES[localeProp] ?? zhCN;
  }
  return deepMerge(
    zhCN as unknown as Record<string, unknown>,
    localeProp as unknown as Record<string, unknown>,
  ) as unknown as AutoCrudLocale;
}
