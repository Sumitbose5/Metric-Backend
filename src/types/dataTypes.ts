// types.ts
export enum DataType {
  INT = 'int',
  STRING = 'string',
  BOOLEAN = 'boolean',
  INT_ARRAY = 'int[]',
  INT_MATRIX = 'int[][]',
  STRING_ARRAY = 'string[]',
  LISTNODE = 'ListNode',
  TREENODE = 'TreeNode',
  // ... add more as needed
}

export enum Language {
  CPP = 'cpp',
  JAVA = 'java',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
}

export interface InputField {
  name: string;
  type: DataType;
}

export interface OutputSchema {
  type: DataType;
  comparison: 'exact' | 'any_order' | 'sorted';
}

export interface TypeSchema {
  inputSchema: InputField[];
  outputSchema: OutputSchema;
}