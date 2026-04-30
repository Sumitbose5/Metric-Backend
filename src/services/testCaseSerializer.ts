import { DataType, Language, TypeSchema } from "../types/dataTypes";

export class TestCaseSerializer {

  static serialize(
    testCases: Array<{ input: any; expectedOutput: any }>,
    typeSchema: TypeSchema,
    language: Language
  ): string {
    return testCases
      .map(tc => this.serializeSingleTestCase(tc, typeSchema, language))
      .join(',\n' + this.getIndentation(language));
  }

  private static serializeSingleTestCase(
    testCase: { input: any; expectedOutput: any },
    typeSchema: TypeSchema,
    language: Language
  ): string {
    const inputs = typeSchema.inputSchema.map(field => {
      const value = testCase.input[field.name];
      return this.formatValue(value, field.type, language);
    });

    const output = this.formatValue(
      testCase.expectedOutput,
      typeSchema.outputSchema.type,
      language
    );

    return this.buildTestCaseStruct(inputs, output, language);
  }

  private static formatValue(val: any, type: DataType, lang: Language): string {
    if (val === null || val === undefined) {
      return this.getNullValue(lang);
    }

    // --- UNIVERSAL NORMALIZATION ---
    // Convert stringified arrays "[1,2,3]" into real JS arrays
    let normalizedVal = val;
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try { normalizedVal = JSON.parse(val); } catch (e) { normalizedVal = val; }
    }

    // Ensure we have an array for collection types to prevent .map() crashes
    const typeStr = String(type).toLowerCase();
    const isCollectionType = typeStr.includes('node') || typeStr.includes('array') || typeStr.includes('matrix');
    
    if (isCollectionType && !Array.isArray(normalizedVal)) {
      normalizedVal = [normalizedVal];
    }

    switch (lang) {
      case Language.CPP: return this.formatCpp(normalizedVal, typeStr);
      case Language.JAVA: return this.formatJava(normalizedVal, typeStr);
      case Language.PYTHON: return this.formatPython(normalizedVal, typeStr);
      case Language.JAVASCRIPT: return this.formatJavaScript(normalizedVal, typeStr);
      default: throw new Error(`Unsupported language: ${lang}`);
    }
  }

  private static formatCpp(val: any, typeStr: string): string {
    const isTreeNode = typeStr.includes('tree') || typeStr.includes('node');

    if (Array.isArray(val)) {
      // Handle Matrices
      if (typeStr.includes('matrix')) {
        return `{${val.map(row => this.formatCpp(row, 'int_array')).join(', ')}}`;
      }

      // Handle Arrays/Tree Traversal Lists
      return `{${val.map(v => {
        if (v === null || v === undefined) {
          // If it's a TreeNode type, use INT_MIN (or "null" if your C++ buildTree handles it)
          return isTreeNode ? 'INT_MIN' : '0'; 
        }
        if (typeof v === 'string') {
          return `"${this.escapeString(v)}"`;
        }
        return v;
      }).join(', ')}}`;
    }

    // Handle single values
    if (val === null || val === undefined) return isTreeNode ? 'nullptr' : '0';
    return typeStr === 'string' ? `"${this.escapeString(val)}"` : val.toString();
  }

  private static formatJava(val: any, typeStr: string): string {
    if (Array.isArray(val)) {
      if (typeStr.includes('matrix')) {
        return `new int[][]{${val.map(row => this.formatJava(row, 'int_array')).join(', ')}}`;
      }
      if (typeStr.includes('string')) {
        return `new String[]{${val.map(v => `"${this.escapeString(v)}"`).join(', ')}}`;
      }
      // Default to int array for ListNode or IntArray
      return `new int[]{${val.map(v => v === null ? '0' : v).join(', ')}}`;
    }
    return typeStr === 'string' ? `"${this.escapeString(val)}"` : val.toString();
  }

  private static formatPython(val: any, typeStr: string): string {
    if (typeStr === 'boolean') return val ? 'True' : 'False';
    if (val === null) return 'None';
    // Python handles JSON format perfectly for lists/matrices
    return JSON.stringify(val).replace(/:null/g, ':None');
  }

  private static formatJavaScript(val: any, typeStr: string): string {
    return JSON.stringify(val);
  }

  private static buildTestCaseStruct(inputs: string[], output: string, language: Language): string {
    switch (language) {
      case Language.CPP: return `{ ${inputs.join(', ')}, ${output} }`;
      case Language.JAVA: 
        // Matches the Object[][] format in your Java Runner
        return `{ ${inputs.join(', ')}, ${output} }`;
      case Language.PYTHON: return `{"input": [${inputs.join(', ')}], "expected": ${output}}`;
      case Language.JAVASCRIPT: return `{ input: [${inputs.join(', ')}], expected: ${output} }`;
      default: throw new Error(`Unknown language: ${language}`);
    }
  }

  // (Helper methods escapeString, getNullValue, getIndentation remain the same as previous)
  private static escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, " ");
  }

  private static getNullValue(lang: Language): string {
    const nullMap: Record<string, string> = { [Language.CPP]: '{}', [Language.JAVA]: 'null', [Language.PYTHON]: 'None', [Language.JAVASCRIPT]: 'null' };
    return nullMap[lang] || 'null';
  }

  private static getIndentation(lang: Language): string {
    const spaceMap: Record<string, string> = { [Language.CPP]: '        ', [Language.JAVA]: '        ', [Language.PYTHON]: '    ', [Language.JAVASCRIPT]: '  ' };
    return spaceMap[lang] || '  ';
  }
}