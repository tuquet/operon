import { describe, expect, it } from 'vitest';

import { filterTree, mapTree, traverseTreeValues } from '../tree';

describe('traverseTreeValues', () => {
  interface Node {
    children?: Node[];
    name: string;
  }

  type NodeValue = string;

  const sampleTree: Node[] = [
    {
      name: 'A',
      children: [
        { name: 'B' },
        {
          name: 'C',
          children: [{ name: 'D' }, { name: 'E' }],
        },
      ],
    },
    {
      name: 'F',
      children: [
        { name: 'G' },
        {
          name: 'H',
          children: [{ name: 'I' }],
        },
      ],
    },
  ];

  it('traverses tree and returns all node values', () => {
    const values = traverseTreeValues<Node, NodeValue>(
      sampleTree,
      (node) => node.name,
      {
        childProps: 'children',
      },
    );
    expect(values).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });

  it('handles empty tree', () => {
    const values = traverseTreeValues<Node, NodeValue>([], (node) => node.name);
    expect(values).toEqual([]);
  });

  it('handles tree with only root node', () => {
    const rootNode = { name: 'A' };
    const values = traverseTreeValues<Node, NodeValue>(
      [rootNode],
      (node) => node.name,
    );
    expect(values).toEqual(['A']);
  });

  it('handles tree with only leaf nodes', () => {
    const leafNodes = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const values = traverseTreeValues<Node, NodeValue>(
      leafNodes,
      (node) => node.name,
    );
    expect(values).toEqual(['A', 'B', 'C']);
  });
});

describe('filterTree', () => {
  const tree = [
    {
      id: 1,
      children: [
        { id: 2 },
        { id: 3, children: [{ id: 4 }, { id: 5 }, { id: 6 }] },
        { id: 7 },
      ],
    },
    { id: 8, children: [{ id: 9 }, { id: 10 }] },
    { id: 11 },
  ];

  it('should return all nodes when condition is always true', () => {
    const result = filterTree(tree, () => true, { childProps: 'children' });
    expect(result).toEqual(tree);
  });

  it('should return only root nodes when condition is always false', () => {
    const result = filterTree(tree, () => false);
    expect(result).toEqual([]);
  });

  it('should return nodes with even id values', () => {
    const result = filterTree(tree, (node) => node.id % 2 === 0);
    expect(result).toEqual([{ id: 8, children: [{ id: 10 }] }]);
  });

  it('should return nodes with odd id values and their ancestors', () => {
    const result = filterTree(tree, (node) => node.id % 2 === 1);
    expect(result).toEqual([
      {
        id: 1,
        children: [{ id: 3, children: [{ id: 5 }] }, { id: 7 }],
      },
      { id: 11 },
    ]);
  });

  it('should return nodes with "leaf" in their name', () => {
    const tree = [
      {
        name: 'root',
        children: [
          { name: 'leaf 1' },
          {
            name: 'branch',
            children: [{ name: 'leaf 2' }, { name: 'leaf 3' }],
          },
          { name: 'leaf 4' },
        ],
      },
    ];
    const result = filterTree(
      tree,
      (node) => node.name.includes('leaf') || node.name === 'root',
    );
    expect(result).toEqual([
      {
        name: 'root',
        children: [{ name: 'leaf 1' }, { name: 'leaf 4' }],
      },
    ]);
  });
});

describe('filterTree immutability', () => {
  type TreeNode = {
    children?: TreeNode[];
    id: number;
  };

  // Mock module-level route constants under apps/*/src/router/routes.
  // Refiltered by filterTree on every login or role refresh.
  const buildTree = (): TreeNode[] => [
    {
      id: 1,
      children: [
        { id: 2 },
        { id: 3, children: [{ id: 4 }, { id: 5 }, { id: 6 }] },
        { id: 7 },
      ],
    },
    { id: 8, children: [{ id: 9 }, { id: 10 }] },
    { id: 11 },
  ];

  const keepEven = (node: TreeNode) => node.id % 2 === 0;
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  it('should not mutate the source tree', () => {
    const tree = buildTree();
    const snapshot = clone(tree);

    filterTree(tree, keepEven);

    expect(tree).toEqual(snapshot);
  });

  it('should not write filtered children back onto the source node', () => {
    const tree = buildTree();

    const result = filterTree(tree, keepEven);

    const sourceParent = tree.find((node) => node.id === 8);
    const resultParent = result.find((node) => node.id === 8);

    expect(sourceParent?.children?.map((child) => child.id)).toEqual([9, 10]);
    expect(resultParent).not.toBe(sourceParent);
    expect(resultParent?.children?.map((child) => child.id)).toEqual([10]);
  });

  it('should keep nodes without children by reference', () => {
    const tree = buildTree();
    const leaf = tree.find((node) => node.id === 11);

    const result = filterTree(tree, () => true);

    expect(result.find((node) => node.id === 11)).toBe(leaf);
  });

  it('should keep branch nodes by reference when no child is dropped', () => {
    // When child node sequence is unchanged, branch nodes must retain reference,
    // otherwise callers caching nodes by reference consider content modified.
    const tree = buildTree();

    const result = filterTree(tree, () => true);

    expect(result[0]).toBe(tree[0]);
    expect(result[1]).toBe(tree[1]);
    expect(result[0]?.children).toEqual(tree[0]?.children);
    expect(result[0]?.children?.[1]).toBe(tree[0]?.children?.[1]);
  });

  it('should only copy the branches on the path of a dropped node', () => {
    const tree = buildTree();

    // Only evict deep node (id 6); other branches must keep original reference
    const result = filterTree(tree, (node) => node.id !== 6);

    const sourceBranch = tree[0]?.children?.find((node) => node.id === 3);
    const resultBranch = result[0]?.children?.find((node) => node.id === 3);

    // Affected branch: cloned, source node untouched
    expect(resultBranch).not.toBe(sourceBranch);
    expect(sourceBranch?.children?.map((child) => child.id)).toEqual([4, 5, 6]);
    expect(resultBranch?.children?.map((child) => child.id)).toEqual([4, 5]);

    // Unaffected sibling branches retain original reference
    expect(result[0]?.children?.[0]).toBe(tree[0]?.children?.[0]);
    expect(result[0]?.children?.[2]).toBe(tree[0]?.children?.[2]);
    expect(result[1]).toBe(tree[1]);
    expect(result[2]).toBe(tree[2]);
  });

  it('should keep returning nodes that an earlier filter run dropped', () => {
    // Repro: low-privilege user logs in, then regenerates routes with higher privileges in same session.
    // Before fix, previously filtered children were permanently written back to source,
    // preventing subsequent broader filters from retrieving them.
    const tree = buildTree();

    // Filter with narrower condition first (low privilege), discarding id 9
    filterTree(tree, (node) => node.id !== 9);

    // Loosen condition (higher privilege); discarded node must reappear
    const widened = filterTree(tree, () => true);

    expect(widened).toEqual(buildTree());
  });

  it('should not mutate the source tree with a custom childProps', () => {
    type CustomNode = {
      id: number;
      items?: CustomNode[];
    };

    const tree: CustomNode[] = [
      { id: 1, items: [{ id: 2 }, { id: 3 }] },
      { id: 4, items: [{ id: 5 }] },
    ];
    const snapshot = clone(tree);

    const result = filterTree(tree, (node) => node.id !== 2, {
      childProps: 'items',
    });

    expect(tree).toEqual(snapshot);
    expect(result).toEqual([
      { id: 1, items: [{ id: 3 }] },
      { id: 4, items: [{ id: 5 }] },
    ]);
  });
});

describe('mapTree', () => {
  it('map infinite depth tree using mapTree', () => {
    const tree = [
      {
        id: 1,
        name: 'node1',
        children: [
          { id: 2, name: 'node2' },
          { id: 3, name: 'node3' },
          {
            id: 4,
            name: 'node4',
            children: [
              {
                id: 5,
                name: 'node5',
                children: [
                  { id: 6, name: 'node6' },
                  { id: 7, name: 'node7' },
                ],
              },
              { id: 8, name: 'node8' },
            ],
          },
        ],
      },
    ];
    const newTree = mapTree(tree, (node) => ({
      ...node,
      name: `${node.name}-new`,
    }));

    expect(newTree).toEqual([
      {
        id: 1,
        name: 'node1-new',
        children: [
          { id: 2, name: 'node2-new' },
          { id: 3, name: 'node3-new' },
          {
            id: 4,
            name: 'node4-new',
            children: [
              {
                id: 5,
                name: 'node5-new',
                children: [
                  { id: 6, name: 'node6-new' },
                  { id: 7, name: 'node7-new' },
                ],
              },
              { id: 8, name: 'node8-new' },
            ],
          },
        ],
      },
    ]);
  });
});
