interface TreeConfigOptions {
  // Children property key name (default: 'children')
  childProps: string;
}

/**
 * Traverse tree structure and extract specified value from each node.
 * @param tree Tree data array
 * @param getValue Getter function for node value
 * @param options Optional children property name options.
 * @returns Array of extracted node values
 */
function traverseTreeValues<T, V>(
  tree: T[],
  getValue: (node: T) => V,
  options?: TreeConfigOptions,
): V[] {
  const result: V[] = [];
  const { childProps } = options || {
    childProps: 'children',
  };

  const dfs = (treeNode: T) => {
    const value = getValue(treeNode);
    result.push(value);
    const children = (treeNode as Record<string, any>)?.[childProps];
    if (!children) {
      return;
    }
    if (children.length > 0) {
      for (const child of children) {
        dfs(child);
      }
    }
  };

  for (const treeNode of tree) {
    dfs(treeNode);
  }
  return result.filter(Boolean);
}

/**
 * Filter tree nodes matching condition, preserving original order.
 *
 * Pure function: does not mutate input tree (source data untouched).
 * Callers re-filtering with different conditions will not lose filtered children.
 
 *
 * Reference semantics: branch nodes are shallow-copied only when child sequence changes.
 * When children are unchanged, original node reference is returned.
 
 *
 * @param tree Root nodes array of tree to filter.
 * @param filter Filter predicate.
 * @param options Optional children property name options.
 * @returns Array containing all matched nodes.
 */
function filterTree<T extends Record<string, any>>(
  tree: T[],
  filter: (node: T) => boolean,
  options?: TreeConfigOptions,
): T[] {
  const { childProps } = options || {
    childProps: 'children',
  };

  const _filterTree = (nodes: T[]): T[] => {
    const result: T[] = [];

    for (const node of nodes) {
      if (!filter(node)) {
        continue;
      }

      const children = (node as Record<string, any>)[childProps];

      if (!children) {
        result.push(node);
        continue;
      }

      const filteredChildren = _filterTree(children);

      // Return original node by reference if children are unchanged;
      // clone only when children need replacement to avoid mutating source
      const childrenUnchanged =
        filteredChildren.length === children.length &&
        filteredChildren.every((child, index) => child === children[index]);

      result.push(
        childrenUnchanged ? node : { ...node, [childProps]: filteredChildren },
      );
    }

    return result;
  };

  return _filterTree(tree);
}

/**
 * Remap nodes of tree structure based on mapper function
 * @param tree Root nodes array of tree to filter.
 * @param mapper Mapping transform function.
 * @param options Optional children property name options.
 */
function mapTree<T, V extends Record<string, any>>(
  tree: T[],
  mapper: (node: T, parent: null | V) => V,
  options?: TreeConfigOptions,
  parent: null | V = null,
): V[] {
  const { childProps } = options || {
    childProps: 'children',
  };
  return tree.map((node) => {
    const mapperNode: Record<string, any> = mapper(node, parent as null | V);
    if (mapperNode[childProps]) {
      mapperNode[childProps] = mapTree(
        mapperNode[childProps],
        mapper,
        options,
        mapperNode as V,
      );
    }
    return mapperNode as V;
  });
}

/**
 * Recursively sort tree data
 * @param treeData - Tree data array
 * @param sortFunction - Sort comparator function
 * @param options - Configuration options, including children property key
 * @returns Sorted tree data
 */
function sortTree<T extends Record<string, any>>(
  treeData: T[],
  sortFunction: (a: T, b: T) => number,
  options?: TreeConfigOptions,
): T[] {
  const { childProps } = options || {
    childProps: 'children',
  };

  return treeData.toSorted(sortFunction).map((item) => {
    const children = item[childProps];
    if (children && Array.isArray(children) && children.length > 0) {
      return {
        ...item,
        [childProps]: sortTree(children, sortFunction, options),
      };
    }
    return item;
  });
}

export { filterTree, mapTree, sortTree, traverseTreeValues };
