import selectorParser from 'postcss-selector-parser';

function isScopedAntAttribute(node) {
  return (
    node.type === 'attribute' &&
    node.attribute === 'class' &&
    node.operator === '*=' &&
    node.value === 'ant-'
  );
}

function hasScopedAntAttribute(selector) {
  let scoped = false;

  selector.walkAttributes((node) => {
    if (isScopedAntAttribute(node)) {
      scoped = true;
    }
  });

  return scoped;
}

function scopeAntdSelector(selector) {
  if (!selector.includes('ant-')) {
    return selector;
  }

  const processor = selectorParser((selectors) => {
    selectors.each((selectorNode) => {
      if (hasScopedAntAttribute(selectorNode)) {
        return;
      }

      let firstAntClassNode = null;

      selectorNode.walkClasses((node) => {
        if (!firstAntClassNode && node.value.startsWith('ant-')) {
          firstAntClassNode = node;
        }
      });

      if (!firstAntClassNode) {
        return;
      }

      const previousNode = firstAntClassNode.prev();

      if (!previousNode || previousNode.type === 'combinator') {
        selectorNode.insertBefore(firstAntClassNode, selectorParser.universal());
      }

      selectorNode.insertBefore(
        firstAntClassNode,
        selectorParser.attribute({
          attribute: 'class',
          operator: '*=',
          quoteMark: "'",
          value: 'ant-',
        }),
      );
    });
  });

  return processor.processSync(selector);
}

export function antdScopePostcssPlugin() {
  return {
    postcssPlugin: 'wordrhyme-antd-scope',
    Rule(rule) {
      if (!rule.selector || !rule.selector.includes('ant-')) {
        return;
      }

      rule.selectors = rule.selectors.map(scopeAntdSelector);
    },
  };
}
