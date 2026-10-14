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

export interface TableControlsLocale {
  sort: {
    label: string;
    title: string;
    empty: string;
    description: string;
    emptyDescription: string;
    add: string;
    reset: string;
    searchFields: string;
    noFields: string;
    ascending: string;
    descending: string;
    direction: string;
    remove: string;
    move: string;
    dragInstructions: string;
    dragOutside: string;
    dragStarted: (label: string, position: number, total: number) => string;
    dragMoved: (label: string, position: number, total: number) => string;
    dragDropped: (label: string, position: number, total: number) => string;
    dragCancelled: (label: string) => string;
  };
  columns: {
    label: string;
    search: string;
    empty: string;
  };
}

export interface AutoCrudLocale {
  /** Sorting and column visibility controls. Optional for existing custom locales. */
  tableControls?: TableControlsLocale;
  pagination?: { pageJump?: string };
  toolbar: {
    refresh: string;
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

export const enUSTableControls: TableControlsLocale = {
  sort: {
    label: 'Sort rows',
    title: 'Sort by',
    empty: 'No sorting applied',
    description: 'Modify sorting to organize your rows.',
    emptyDescription: 'Add sorting to organize your rows.',
    add: 'Add sort',
    reset: 'Reset sorting',
    searchFields: 'Search fields...',
    noFields: 'No fields found.',
    ascending: 'Asc',
    descending: 'Desc',
    direction: 'Sort direction',
    remove: 'Remove sort',
    move: 'Move sort',
    dragInstructions:
      'To pick up a sort, press space or enter. Use the up and down arrow keys to move it. Press space or enter to drop, or escape to cancel.',
    dragOutside: 'The sort is outside the drop area. Press escape to cancel.',
    dragStarted: (label, position, total) =>
      `Picked up ${label}, position ${position} of ${total}.`,
    dragMoved: (label, position, total) =>
      `Moved ${label} to position ${position} of ${total}.`,
    dragDropped: (label, position, total) =>
      `Dropped ${label} at position ${position} of ${total}.`,
    dragCancelled: (label) => `Sorting cancelled for ${label}.`,
  },
  columns: {
    label: 'Toggle columns',
    search: 'Search columns...',
    empty: 'No columns found.',
  },
};

export const zhCN: AutoCrudLocale = {
  tableControls: {
    sort: {
      label: '排序',
      title: '排序依据',
      empty: '尚未设置排序',
      description: '调整排序以组织表格数据。',
      emptyDescription: '添加排序以组织表格数据。',
      add: '添加排序',
      reset: '重置排序',
      searchFields: '搜索字段...',
      noFields: '未找到字段。',
      ascending: '升序',
      descending: '降序',
      direction: '排序方向',
      remove: '移除排序',
      move: '移动排序',
      dragInstructions:
        '按空格或回车键拾起排序项，使用上下方向键移动，再按空格或回车键放下，按 Esc 键取消。',
      dragOutside: '排序项已移出放置区域，按 Esc 键取消。',
      dragStarted: (label, position, total) =>
        `已拾起${label}，位于第 ${position} 项，共 ${total} 项。`,
      dragMoved: (label, position, total) =>
        `已将${label}移至第 ${position} 项，共 ${total} 项。`,
      dragDropped: (label, position, total) =>
        `已将${label}放置在第 ${position} 项，共 ${total} 项。`,
      dragCancelled: (label) => `已取消${label}的排序拖动。`,
    },
    columns: {
      label: '列设置',
      search: '搜索列...',
      empty: '未找到列。',
    },
  },
  pagination: { pageJump: '跳转到页' },
  toolbar: {
    refresh: '刷新',
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
  tableControls: enUSTableControls,
  pagination: { pageJump: 'Go to page' },
  toolbar: {
    refresh: 'Refresh',
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
  tableControls: {
    sort: {
      label: '並べ替え',
      title: '並べ替え条件',
      empty: '並べ替えは未設定です',
      description: '並べ替えを変更して行を整理します。',
      emptyDescription: '並べ替えを追加して行を整理します。',
      add: '並べ替えを追加',
      reset: '並べ替えをリセット',
      searchFields: 'フィールドを検索...',
      noFields: 'フィールドが見つかりません。',
      ascending: '昇順',
      descending: '降順',
      direction: '並べ替え方向',
      remove: '並べ替えを削除',
      move: '並べ替えを移動',
      dragInstructions:
        'スペースまたは Enter キーで並べ替え項目をつかみ、上下の矢印キーで移動します。スペースまたは Enter キーで配置し、Esc キーでキャンセルします。',
      dragOutside: '項目が配置領域の外にあります。Esc キーでキャンセルします。',
      dragStarted: (label, position, total) =>
        `${label}をつかみました。${total} 項目中 ${position} 番目です。`,
      dragMoved: (label, position, total) =>
        `${label}を ${total} 項目中 ${position} 番目に移動しました。`,
      dragDropped: (label, position, total) =>
        `${label}を ${total} 項目中 ${position} 番目に配置しました。`,
      dragCancelled: (label) => `${label}の移動をキャンセルしました。`,
    },
    columns: {
      label: '列の表示設定',
      search: '列を検索...',
      empty: '列が見つかりません。',
    },
  },
  pagination: { pageJump: 'ページへ移動' },
  toolbar: {
    refresh: '更新',
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
  tableControls: {
    sort: {
      label: '정렬',
      title: '정렬 기준',
      empty: '설정된 정렬이 없습니다',
      description: '정렬을 변경하여 행을 정리하세요.',
      emptyDescription: '정렬을 추가하여 행을 정리하세요.',
      add: '정렬 추가',
      reset: '정렬 초기화',
      searchFields: '필드 검색...',
      noFields: '필드를 찾을 수 없습니다.',
      ascending: '오름차순',
      descending: '내림차순',
      direction: '정렬 방향',
      remove: '정렬 삭제',
      move: '정렬 이동',
      dragInstructions:
        '스페이스 또는 Enter 키로 정렬 항목을 선택하고 위아래 화살표 키로 이동하세요. 스페이스 또는 Enter 키로 놓고 Esc 키로 취소하세요.',
      dragOutside: '항목이 놓기 영역 밖에 있습니다. Esc 키로 취소하세요.',
      dragStarted: (label, position, total) =>
        `${label} 항목을 선택했습니다. 총 ${total}개 중 ${position}번째입니다.`,
      dragMoved: (label, position, total) =>
        `${label} 항목을 총 ${total}개 중 ${position}번째로 이동했습니다.`,
      dragDropped: (label, position, total) =>
        `${label} 항목을 총 ${total}개 중 ${position}번째에 놓았습니다.`,
      dragCancelled: (label) => `${label} 항목의 이동을 취소했습니다.`,
    },
    columns: {
      label: '열 표시 설정',
      search: '열 검색...',
      empty: '열을 찾을 수 없습니다.',
    },
  },
  pagination: { pageJump: '페이지로 이동' },
  toolbar: {
    refresh: '새로고침',
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
  tableControls: {
    sort: {
      label: 'Trier les lignes',
      title: 'Trier par',
      empty: 'Aucun tri appliqué',
      description: 'Modifiez le tri pour organiser les lignes.',
      emptyDescription: 'Ajoutez un tri pour organiser les lignes.',
      add: 'Ajouter un tri',
      reset: 'Réinitialiser le tri',
      searchFields: 'Rechercher des champs...',
      noFields: 'Aucun champ trouvé.',
      ascending: 'Croissant',
      descending: 'Décroissant',
      direction: 'Sens du tri',
      remove: 'Supprimer le tri',
      move: 'Déplacer le tri',
      dragInstructions:
        'Appuyez sur Espace ou Entrée pour saisir un critère de tri. Déplacez-le avec les flèches haut et bas. Appuyez sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler.',
      dragOutside:
        'Le critère est hors de la zone de dépôt. Appuyez sur Échap pour annuler.',
      dragStarted: (label, position, total) =>
        `${label} saisi, position ${position} sur ${total}.`,
      dragMoved: (label, position, total) =>
        `${label} déplacé à la position ${position} sur ${total}.`,
      dragDropped: (label, position, total) =>
        `${label} déposé à la position ${position} sur ${total}.`,
      dragCancelled: (label) => `Déplacement de ${label} annulé.`,
    },
    columns: {
      label: 'Afficher les colonnes',
      search: 'Rechercher des colonnes...',
      empty: 'Aucune colonne trouvée.',
    },
  },
  pagination: { pageJump: 'Aller à la page' },
  toolbar: {
    refresh: 'Actualiser',
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
  tableControls: {
    sort: {
      label: 'Zeilen sortieren',
      title: 'Sortieren nach',
      empty: 'Keine Sortierung angewendet',
      description: 'Ändern Sie die Sortierung, um die Zeilen anzuordnen.',
      emptyDescription: 'Fügen Sie eine Sortierung hinzu, um die Zeilen anzuordnen.',
      add: 'Sortierung hinzufügen',
      reset: 'Sortierung zurücksetzen',
      searchFields: 'Felder suchen...',
      noFields: 'Keine Felder gefunden.',
      ascending: 'Aufsteigend',
      descending: 'Absteigend',
      direction: 'Sortierrichtung',
      remove: 'Sortierung entfernen',
      move: 'Sortierung verschieben',
      dragInstructions:
        'Drücken Sie die Leertaste oder Eingabetaste, um eine Sortierung aufzunehmen. Verschieben Sie sie mit den Pfeiltasten nach oben und unten. Drücken Sie die Leertaste oder Eingabetaste zum Ablegen oder Esc zum Abbrechen.',
      dragOutside:
        'Die Sortierung befindet sich außerhalb des Ablagebereichs. Drücken Sie Esc zum Abbrechen.',
      dragStarted: (label, position, total) =>
        `${label} aufgenommen, Position ${position} von ${total}.`,
      dragMoved: (label, position, total) =>
        `${label} auf Position ${position} von ${total} verschoben.`,
      dragDropped: (label, position, total) =>
        `${label} auf Position ${position} von ${total} abgelegt.`,
      dragCancelled: (label) => `Verschieben von ${label} abgebrochen.`,
    },
    columns: {
      label: 'Spalten anzeigen',
      search: 'Spalten suchen...',
      empty: 'Keine Spalten gefunden.',
    },
  },
  pagination: { pageJump: 'Zur Seite springen' },
  toolbar: {
    refresh: 'Aktualisieren',
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
  tableControls: {
    sort: {
      label: 'Ordenar filas',
      title: 'Ordenar por',
      empty: 'No se ha aplicado ningún orden',
      description: 'Modifica el orden para organizar las filas.',
      emptyDescription: 'Añade un criterio de ordenación para organizar las filas.',
      add: 'Añadir orden',
      reset: 'Restablecer orden',
      searchFields: 'Buscar campos...',
      noFields: 'No se encontraron campos.',
      ascending: 'Ascendente',
      descending: 'Descendente',
      direction: 'Dirección del orden',
      remove: 'Eliminar orden',
      move: 'Mover orden',
      dragInstructions:
        'Pulsa Espacio o Intro para recoger un criterio de ordenación. Usa las flechas arriba y abajo para moverlo. Pulsa Espacio o Intro para soltarlo, o Escape para cancelar.',
      dragOutside:
        'El criterio está fuera del área de destino. Pulsa Escape para cancelar.',
      dragStarted: (label, position, total) =>
        `Se ha recogido ${label}, posición ${position} de ${total}.`,
      dragMoved: (label, position, total) =>
        `Se ha movido ${label} a la posición ${position} de ${total}.`,
      dragDropped: (label, position, total) =>
        `Se ha soltado ${label} en la posición ${position} de ${total}.`,
      dragCancelled: (label) => `Se ha cancelado el movimiento de ${label}.`,
    },
    columns: {
      label: 'Mostrar columnas',
      search: 'Buscar columnas...',
      empty: 'No se encontraron columnas.',
    },
  },
  pagination: { pageJump: 'Ir a la página' },
  toolbar: {
    refresh: 'Actualizar',
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
  [P in keyof T]?: NonNullable<T[P]> extends (...args: never[]) => unknown
    ? T[P]
    : NonNullable<T[P]> extends object
      ? DeepPartial<NonNullable<T[P]>>
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
