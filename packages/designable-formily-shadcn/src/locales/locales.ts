import { createLocales } from '@wordrhyme/designable-core';

const zhStyleSettings = {
  width: '宽度',
  height: '高度',
  display: '展示',
  background: '背景',
  boxShadow: '阴影',
  font: '字体',
  margin: '外边距',
  padding: '内边距',
  borderRadius: '圆角',
  border: '边框',
  opacity: '透明度',
};

const enStyleSettings = {
  width: 'Width',
  height: 'Height',
  display: 'Display',
  background: 'Background',
  boxShadow: 'Box Shadow',
  font: 'Font',
  margin: 'Margin',
  padding: 'Padding',
  borderRadius: 'Radius',
  border: 'Border',
  opacity: 'Opacity',
};

export const Component = {
  'zh-CN': {
    settings: {
      style: zhStyleSettings,
    },
  },
  'en-US': {
    settings: {
      style: enStyleSettings,
    },
  },
};

export const Field = {
  'zh-CN': {
    title: '字段',
    settings: {
      name: '字段标识',
      title: '标题',
      required: '必填',
      description: '描述',
      default: '默认值',
      enum: '可选项',
      'x-display': {
        title: '展示状态',
        tooltip: '半隐藏只会隐藏UI，全隐藏会删除数据',
        dataSource: ['显示', '半隐藏', '全隐藏', '继承'],
      },
      'x-pattern': {
        title: 'UI形态',
        dataSource: ['可编辑', '禁用', '只读', '阅读', '继承'],
      },
      'x-validator': '校验规则',
      'x-decorator': '容器组件',
      'x-reactions': '响应器规则',
      'field-group': '字段属性',
      'component-group': '组件属性',
      'decorator-group': '容器属性',
      'component-style-group': '组件样式',
      'decorator-style-group': '容器样式',
      'x-component-props': {
        size: { title: '尺寸', dataSource: ['大', '小', '默认', '继承'] },
        allowClear: '允许清除内容',
        autoFocus: '自动获取焦点',
        bordered: '是否有边框',
        placeholder: '占位提示',
        showSearch: '支持搜索',
        notFoundContent: '空状态内容',
        style: zhStyleSettings,
      },
      'x-decorator-props': {
        addonAfter: '后缀标签',
        addonBefore: '前缀标签',
        tooltip: '提示',
        asterisk: '星号',
        gridSpan: '网格跨列',
        labelCol: '标签网格宽度',
        wrapperCol: '组件网格宽度',
        colon: '是否有冒号',
        labelAlign: {
          title: '标签对齐',
          dataSource: ['左对齐', '右对齐', '继承'],
        },
        wrapperAlign: {
          title: '组件对齐',
          dataSource: ['左对齐', '右对齐', '继承'],
        },
        labelWrap: '标签换行',
        wrapperWrap: '组件换行',
        labelWidth: '标签宽度',
        wrapperWidth: '组件宽度',
        fullness: '组件占满',
        inset: '内联布局',
        shallow: '是否浅传递',
        bordered: '是否有边框',
        size: { title: '尺寸', dataSource: ['大', '小', '默认', '继承'] },
        layout: {
          title: '布局',
          dataSource: ['垂直', '水平', '内联', '继承'],
        },
        feedbackLayout: {
          title: '反馈布局',
          dataSource: ['宽松', '紧凑', '弹层', '无', '继承'],
        },
        tooltipLayout: {
          title: '提示布局',
          dataSource: ['图标', '文本', '继承'],
        },
        style: zhStyleSettings,
      },
    },
  },
  'en-US': {
    title: 'Field',
    settings: {
      name: 'Name',
      title: 'Title',
      required: 'Required',
      description: 'Description',
      default: 'Default',
      enum: 'Options',
      'x-display': {
        title: 'Display State',
        tooltip:
          'When display is none, data is hidden and removed. Hidden only hides the UI.',
        dataSource: ['Visible', 'Hidden', 'None', 'Inherit'],
      },
      'x-pattern': {
        title: 'UI Pattern',
        dataSource: ['Editable', 'Disabled', 'ReadOnly', 'ReadPretty', 'Inherit'],
      },
      'x-validator': 'Validator',
      'x-decorator': 'Decorator',
      'x-reactions': 'Reactions',
      'field-group': 'Field Properties',
      'component-group': 'Component Properties',
      'decorator-group': 'Decorator Properties',
      'component-style-group': 'Component Style',
      'decorator-style-group': 'Decorator Style',
      'x-component-props': {
        size: {
          title: 'Size',
          dataSource: ['Large', 'Small', 'Default', 'Inherit'],
        },
        allowClear: 'Allow Clear',
        autoFocus: 'Auto Focus',
        bordered: 'Bordered',
        placeholder: 'Placeholder',
        showSearch: 'Show Search',
        notFoundContent: 'Not Found Content',
        style: enStyleSettings,
      },
      'x-decorator-props': {
        addonAfter: 'Addon After',
        addonBefore: 'Addon Before',
        tooltip: 'Tooltip',
        asterisk: 'Asterisk',
        gridSpan: 'Grid Span',
        labelCol: 'Label Col',
        wrapperCol: 'Wrapper Col',
        colon: 'Colon',
        labelAlign: {
          title: 'Label Align',
          dataSource: ['Left', 'Right', 'Inherit'],
        },
        wrapperAlign: {
          title: 'Wrapper Align',
          dataSource: ['Left', 'Right', 'Inherit'],
        },
        labelWrap: 'Label Wrap',
        wrapperWrap: 'Wrapper Wrap',
        labelWidth: 'Label Width',
        wrapperWidth: 'Wrapper Width',
        fullness: 'Fullness',
        inset: 'Inset',
        shallow: 'Shallow',
        bordered: 'Bordered',
        size: {
          title: 'Size',
          dataSource: ['Large', 'Small', 'Default', 'Inherit'],
        },
        layout: {
          title: 'Layout',
          dataSource: ['Vertical', 'Horizontal', 'Inline', 'Inherit'],
        },
        feedbackLayout: {
          title: 'Feedback Layout',
          dataSource: ['Loose', 'Terse', 'Popup', 'None', 'Inherit'],
        },
        tooltipLayout: {
          title: 'Tooltip Layout',
          dataSource: ['Icon', 'Text', 'Inherit'],
        },
        style: enStyleSettings,
      },
    },
  },
};

const formSettings = {
  'zh-CN': {
    title: '表单',
    settings: {
      labelCol: '标签网格宽度',
      wrapperCol: '组件网格宽度',
      colon: '是否有冒号',
      labelAlign: {
        title: '标签对齐',
        dataSource: ['左对齐', '右对齐', '继承'],
      },
      wrapperAlign: {
        title: '组件对齐',
        dataSource: ['左对齐', '右对齐', '继承'],
      },
      labelWrap: '标签换行',
      wrapperWrap: '组件换行',
      labelWidth: '标签宽度',
      wrapperWidth: '组件宽度',
      fullness: '组件占满',
      inset: '内联布局',
      shallow: '是否浅传递',
      bordered: '是否有边框',
      size: { title: '尺寸', dataSource: ['大', '小', '默认', '继承'] },
      layout: { title: '布局', dataSource: ['垂直', '水平', '内联', '继承'] },
      feedbackLayout: {
        title: '反馈布局',
        dataSource: ['宽松', '紧凑', '弹层', '无', '继承'],
      },
      tooltipLayout: {
        title: '提示布局',
        dataSource: ['图标', '文本', '继承'],
      },
    },
  },
  'en-US': {
    title: 'Form',
    settings: {
      labelCol: 'Label Col',
      wrapperCol: 'Wrapper Col',
      colon: 'Colon',
      labelAlign: {
        title: 'Label Align',
        dataSource: ['Left', 'Right', 'Inherit'],
      },
      wrapperAlign: {
        title: 'Wrapper Align',
        dataSource: ['Left', 'Right', 'Inherit'],
      },
      labelWrap: 'Label Wrap',
      wrapperWrap: 'Wrapper Wrap',
      labelWidth: 'Label Width',
      wrapperWidth: 'Wrapper Width',
      fullness: 'Fullness',
      inset: 'Inset',
      shallow: 'Shallow',
      bordered: 'Bordered',
      size: {
        title: 'Size',
        dataSource: ['Large', 'Small', 'Default', 'Inherit'],
      },
      layout: {
        title: 'Layout',
        dataSource: ['Vertical', 'Horizontal', 'Inline', 'Inherit'],
      },
      feedbackLayout: {
        title: 'Feedback Layout',
        dataSource: ['Loose', 'Terse', 'Popup', 'None', 'Inherit'],
      },
      tooltipLayout: {
        title: 'Tooltip Layout',
        dataSource: ['Icon', 'Text', 'Inherit'],
      },
    },
  },
};

export const Form = createLocales(Component, formSettings);

export const Input = {
  'zh-CN': {
    title: '输入框',
    settings: {
      'x-component-props': {
        addonAfter: '后缀标签',
        addonBefore: '前缀标签',
        maxLength: '最大长度',
        prefix: '前缀',
        suffix: '后缀',
        autoSize: {
          title: '自适应高度',
          tooltip: '可设置为 true | false 或对象：{ minRows: 2, maxRows: 6 }',
        },
        showCount: '是否展示字数',
        checkStrength: '检测强度',
      },
    },
  },
  'en-US': {
    title: 'Input',
    settings: {
      'x-component-props': {
        addonAfter: 'Addon After',
        addonBefore: 'Addon Before',
        maxLength: 'Max Length',
        prefix: 'Prefix',
        suffix: 'Suffix',
        autoSize: 'Auto Size',
        showCount: 'Show Count',
        checkStrength: 'Check Strength',
      },
    },
  },
};

export const TextArea = {
  'zh-CN': {
    title: '多行输入',
    settings: {
      'x-component-props': {
        maxLength: '最大长度',
        autoSize: {
          title: '自适应高度',
          tooltip: '可设置为 true | false 或对象：{ minRows: 2, maxRows: 6 }',
        },
        showCount: '是否展示字数',
      },
    },
  },
  'en-US': {
    title: 'TextArea',
    settings: {
      'x-component-props': {
        maxLength: 'Max Length',
        autoSize: 'Auto Size',
        showCount: 'Show Count',
      },
    },
  },
};

export const Select = {
  'zh-CN': {
    title: '选择框',
    settings: {
      'x-component-props': {
        mode: {
          title: '模式',
          dataSource: ['多选', '标签', '单选'],
        },
        autoClearSearchValue: {
          title: '选中自动清除',
          tooltip: '仅在多选或者标签模式下支持',
        },
        defaultActiveFirstOption: '默认高亮第一个选项',
        dropdownMatchSelectWidth: {
          title: '下拉菜单和选择器同宽',
          tooltip:
            '默认将设置 min-width，当值小于选择框宽度时会被忽略。false 时会关闭虚拟滚动',
        },
        defaultOpen: '默认展开',
        filterOption: '选项筛选器',
        filterSort: '选项排序器',
        labelInValue: {
          title: '标签值',
          tooltip:
            '是否把每个选项的 label 包装到 value 中，会把 Select 的 value 类型从 string 变为 { value: string, label: ReactNode } 的格式',
        },
        listHeight: '弹窗滚动高度',
        maxTagCount: {
          title: '最多标签数量',
          tooltip: '最多显示多少个 tag，响应式模式会对性能产生损耗',
        },
        maxTagPlaceholder: {
          title: '最多标签占位',
          tooltip: '隐藏 tag 时显示的内容',
        },
        maxTagTextLength: '最多标签文本长度',
        showArrow: '显示箭头',
        virtual: '开启虚拟滚动',
      },
    },
  },
  'en-US': {
    title: 'Select',
    settings: {
      'x-component-props': {
        mode: {
          title: 'Mode',
          dataSource: ['Multiple', 'Tags', 'Single'],
        },
        autoClearSearchValue: {
          title: 'Auto Clear Search Value',
          tooltip: 'Only used to multiple and tags mode',
        },
        defaultActiveFirstOption: 'Default Active First Option',
        dropdownMatchSelectWidth: 'Dropdown Match Select Width',
        defaultOpen: 'Default Open',
        filterOption: 'Filter Option',
        filterSort: 'Filter Sort',
        labelInValue: 'Label In Value',
        listHeight: 'List Height',
        maxTagCount: 'Max Tag Count',
        maxTagPlaceholder: {
          title: 'Max Tag Placeholder',
          tooltip: 'Content displayed when tag is hidden',
        },
        maxTagTextLength: 'Max Tag Text Length',
        showArrow: 'Show Arrow',
        virtual: 'Use Virtual Scroll',
      },
    },
  },
};

export const NumberInput = {
  'zh-CN': {
    title: '数字输入',
    settings: {
      'x-component-props': {
        formatter: {
          title: '格式转换器',
          tooltip: '格式：function(value: number | string): string',
        },
        keyboard: '启用快捷键',
        parser: {
          title: '格式解析器',
          tooltip:
            '指定从格式转换器里转换回数字的方式，和格式转换器搭配使用，格式：function(string): number',
        },
        decimalSeparator: '小数点',
        precision: '数字精度',
        max: '最大值',
        min: '最小值',
        step: '步长',
        stringMode: {
          title: '字符串格式',
          tooltip: '开启后支持高精度小数。同时 onChange 将返回 string 类型',
        },
      },
    },
  },
  'en-US': {
    title: 'NumberInput',
    settings: {
      'x-component-props': {
        formatter: {
          title: 'Format Converter',
          tooltip: 'Format: function(value: number | string): string',
        },
        keyboard: 'Enable Shortcut Keys',
        parser: {
          title: 'Format Parser',
          tooltip:
            'Specify the method of converting back to numbers from the format converter.',
        },
        decimalSeparator: 'Decimal Separator',
        precision: 'Precision',
        max: 'Max',
        min: 'Min',
        step: 'Step',
        stringMode: {
          title: 'String Format',
          tooltip:
            'Support high-precision decimals after opening. onChange will return string type.',
        },
      },
    },
  },
};

export const Switch = {
  'zh-CN': {
    title: '开关',
  },
  'en-US': {
    title: 'Switch',
  },
};

export const Checkbox = {
  'zh-CN': {
    title: '复选框',
    settings: {
      'x-component-props': {
        label: '标签',
        size: { title: '尺寸', dataSource: ['大', '小', '默认', '继承'] },
      },
    },
  },
  'en-US': {
    title: 'Checkbox',
    settings: {
      'x-component-props': {
        label: 'Label',
        size: {
          title: 'Size',
          dataSource: ['Large', 'Small', 'Default', 'Inherit'],
        },
      },
    },
  },
};

export const Rating = {
  'zh-CN': {
    title: '评分器',
    settings: {
      'x-component-props': {
        allowHalf: '允许半选',
        tooltips: { title: '提示信息', tooltip: '格式：string[]' },
        count: '总数',
      },
    },
  },
  'en-US': {
    title: 'Rating',
    settings: {
      'x-component-props': {
        allowHalf: 'Allow Half',
        tooltips: { title: 'Tooltips', tooltip: 'Format: string[]' },
        count: 'Count',
      },
    },
  },
};

export const Card = {
  'zh-CN': {
    title: '卡片',
    settings: {
      cardTypes: [
        { label: '内置', value: 'inner' },
        { label: '默认', value: '' },
      ],
      'x-component-props': {
        type: '类型',
        title: '标题',
        description: '描述',
        extra: '右侧扩展',
        cardTypes: [
          { label: '内置', value: 'inner' },
          { label: '默认', value: '' },
        ],
      },
    },
  },
  'en-US': {
    title: 'Card',
    settings: {
      cardTypes: [
        { label: 'Inner', value: 'inner' },
        { label: 'Default', value: '' },
      ],
      'x-component-props': {
        type: 'Type',
        title: 'Title',
        description: 'Description',
        extra: 'Extra',
        cardTypes: [
          { label: 'Inner', value: 'inner' },
          { label: 'Default', value: '' },
        ],
      },
    },
  },
};

export const Row = {
  'zh-CN': {
    title: '行',
    settings: {
      'x-component-props': {
        className: '样式类名',
      },
    },
  },
  'en-US': {
    title: 'Row',
    settings: {
      'x-component-props': {
        className: 'Class Name',
      },
    },
  },
};

export const Column = {
  'zh-CN': {
    title: '列',
    settings: Row['zh-CN'].settings,
  },
  'en-US': {
    title: 'Column',
    settings: Row['en-US'].settings,
  },
};

export const Separator = {
  'zh-CN': {
    title: '分隔线',
    settings: Row['zh-CN'].settings,
  },
  'en-US': {
    title: 'Separator',
    settings: Row['en-US'].settings,
  },
};

export const ObjectContainer = Card;

export const Text = {
  'zh-CN': {
    title: '文本',
    settings: {
      'x-component-props': {
        content: '文本内容',
        mode: {
          title: '文本类型',
          dataSource: ['H1', 'H2', 'H3', 'Paragraph', 'Normal'],
        },
      },
    },
  },
  'en-US': {
    title: 'Text',
    settings: {
      'x-component-props': {
        content: 'Text Content',
        mode: {
          title: 'Text Mode',
          dataSource: ['H1', 'H2', 'H3', 'Paragraph', 'Normal'],
        },
      },
    },
  },
};
