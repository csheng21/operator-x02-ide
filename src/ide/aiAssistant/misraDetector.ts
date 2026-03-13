// ============================================================================
// FILE: src/ide/aiAssistant/misraDetector.ts
// PURPOSE: Detect and analyze MISRA C/C++ compliance in code
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface MISRAReference {
  standard: string;        // "MISRA C:2012" or "MISRA C++:2023"
  ruleId: string;          // e.g., "Rule 10.1"
  category: 'Mandatory' | 'Required' | 'Advisory';
  description: string;
  rationale: string;
  example?: string;
  decidable: boolean;      // Can be automatically checked?
}

export interface MISRAContext {
  isMISRA: boolean;
  standard: 'MISRA-C' | 'MISRA-CPP' | null;
  version: string | null;  // "2012", "2023", etc.
  detectedKeywords: string[];
  detectedViolations: string[];
  references: MISRAReference[];
  fileName?: string;
  language: 'c' | 'cpp' | null;
  complianceLevel: 'Strict' | 'Standard' | 'None';
}

// ============================================================================
// MISRA DETECTOR CLASS
// ============================================================================

export class MISRADetector {
  
  /**
   * MISRA detection keywords
   */
  private static readonly MISRA_KEYWORDS = [
    'MISRA', 'MISRA-C', 'MISRA-CPP', 'MISRA C', 'MISRA C++',
    'misra', 'misra-c', 'misra-cpp',
    'Rule 1.1', 'Rule 2.1', 'Rule 8.1', 'Rule 10.1', // Common rule references
    'mandatory rule', 'required rule', 'advisory rule',
    'decidable', 'undecidable'
  ];

  /**
   * MISRA C:2012 Rule Database (Comprehensive)
   */
  private static readonly MISRA_C_RULES: Record<string, MISRAReference[]> = {
    'pointer': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 11.1',
        category: 'Required',
        description: 'Conversions shall not be performed between a pointer to a function and any other type',
        rationale: 'Function pointers and data pointers may have different representations',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 11.2',
        category: 'Required',
        description: 'Conversions shall not be performed between a pointer to an incomplete type and any other type',
        rationale: 'Operations on incomplete types can lead to undefined behavior',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 11.3',
        category: 'Required',
        description: 'A cast shall not be performed between a pointer to object type and a pointer to a different object type',
        rationale: 'Different object types may have different alignment requirements',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 11.5',
        category: 'Advisory',
        description: 'A conversion should not be performed from pointer to void into pointer to object',
        rationale: 'Loss of type safety and potential alignment issues',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 18.1',
        category: 'Required',
        description: 'A pointer resulting from arithmetic on a pointer operand shall address an element of the same array as that pointer operand',
        rationale: 'Pointer arithmetic outside array bounds causes undefined behavior',
        decidable: false
      }
    ],
    
    'type-conversion': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 10.1',
        category: 'Required',
        description: 'Operands shall not be of an inappropriate essential type',
        rationale: 'Operations on inappropriate types can lead to unexpected behavior',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 10.3',
        category: 'Required',
        description: 'The value of an expression shall not be assigned to an object with a narrower essential type',
        rationale: 'May result in loss of information',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 10.4',
        category: 'Required',
        description: 'Both operands of an operator in which the usual arithmetic conversions are performed shall have the same essential type category',
        rationale: 'Prevents unintended implicit conversions',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 10.5',
        category: 'Advisory',
        description: 'The value of an expression should not be cast to an inappropriate essential type',
        rationale: 'Explicit casts should maintain type safety',
        decidable: true
      }
    ],
    
    'memory': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 22.1',
        category: 'Required',
        description: 'All resources obtained dynamically by means of Standard Library functions shall be explicitly released',
        rationale: 'Prevents memory leaks and resource exhaustion',
        decidable: false
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 21.3',
        category: 'Required',
        description: 'The memory allocation and deallocation functions of <stdlib.h> shall not be used',
        rationale: 'Dynamic memory allocation can lead to fragmentation and non-deterministic behavior',
        decidable: true
      }
    ],
    
    'control-flow': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 15.1',
        category: 'Advisory',
        description: 'The goto statement should not be used',
        rationale: 'goto can lead to spaghetti code and hard-to-analyze control flow',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 15.2',
        category: 'Required',
        description: 'The goto statement shall jump to a label declared later in the same function',
        rationale: 'Backward gotos are especially problematic for program analysis',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 15.5',
        category: 'Advisory',
        description: 'A function should have a single point of exit at the end',
        rationale: 'Multiple return points can make code harder to understand and maintain',
        decidable: true
      }
    ],
    
    'dead-code': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 2.1',
        category: 'Required',
        description: 'A project shall not contain unreachable code',
        rationale: 'Unreachable code is often the result of a programming error',
        decidable: false
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 2.2',
        category: 'Required',
        description: 'There shall be no dead code',
        rationale: 'Dead code indicates a programming error or redundant code',
        decidable: false
      }
    ],
    
    'initialization': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 9.1',
        category: 'Mandatory',
        description: 'The value of an object with automatic storage duration shall not be read before it has been set',
        rationale: 'Reading uninitialized variables leads to undefined behavior',
        decidable: false
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 9.2',
        category: 'Required',
        description: 'The initializer for an aggregate or union shall be enclosed in braces',
        rationale: 'Improves code clarity and prevents initialization errors',
        decidable: true
      }
    ],
    
    'side-effects': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 13.5',
        category: 'Required',
        description: 'The right hand operand of a logical && or || operator shall not contain persistent side effects',
        rationale: 'Side effects may not execute due to short-circuit evaluation',
        decidable: false
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 13.6',
        category: 'Mandatory',
        description: 'The operand of the sizeof operator shall not contain any expression which has potential side effects',
        rationale: 'sizeof does not evaluate its operand',
        decidable: false
      }
    ],
    
    'naming': [
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 5.1',
        category: 'Required',
        description: 'External identifiers shall be distinct',
        rationale: 'Some compilers have limitations on identifier length',
        decidable: true
      },
      {
        standard: 'MISRA C:2012',
        ruleId: 'Rule 5.2',
        category: 'Required',
        description: 'Identifiers declared in the same scope and name space shall be distinct',
        rationale: 'Prevents naming collisions and confusion',
        decidable: true
      }
    ]
  };

  /**
   * MISRA C++:2023 Rule Database
   */
  private static readonly MISRA_CPP_RULES: Record<string, MISRAReference[]> = {
    'pointer': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 7.5.1',
        category: 'Required',
        description: 'A pointer or reference parameter in a function shall be declared as pointer to const or reference to const if the value is not modified',
        rationale: 'Improves const-correctness and prevents unintended modifications',
        decidable: true
      },
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 8.5.2',
        category: 'Required',
        description: 'Braced-initializer-lists shall not be used to initialize pointer types',
        rationale: 'Can lead to confusion with array initialization',
        decidable: true
      }
    ],
    
    'exception': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 15.5.1',
        category: 'Required',
        description: 'A class destructor shall not exit with an exception',
        rationale: 'Can lead to program termination via std::terminate()',
        decidable: false
      },
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 15.5.2',
        category: 'Advisory',
        description: 'Where a function\'s declaration includes an exception-specification, the function shall only throw exceptions of the types indicated',
        rationale: 'Violating exception specifications leads to std::unexpected()',
        decidable: false
      }
    ],
    
    'templates': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 14.7.1',
        category: 'Required',
        description: 'All class templates, function templates, class template member functions shall be instantiated at least once',
        rationale: 'Ensures template code is actually compiled and checked',
        decidable: false
      }
    ],
    
    'inheritance': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 10.3.1',
        category: 'Required',
        description: 'There shall be no more than one definition of each virtual function on each path through the inheritance hierarchy',
        rationale: 'Multiple definitions can lead to ambiguity',
        decidable: true
      }
    ],
    
    'memory': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 18.5.1',
        category: 'Required',
        description: 'Functions malloc, calloc, realloc and free shall not be used',
        rationale: 'Use new/delete or smart pointers instead for type safety',
        decidable: true
      },
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 18.5.2',
        category: 'Required',
        description: 'The unbounded functions of library <cstring> shall not be used',
        rationale: 'Functions like strcpy, strcat are unsafe',
        decidable: true
      }
    ],
    
    'auto': [
      {
        standard: 'MISRA C++:2023',
        ruleId: 'Rule 8.2.1',
        category: 'Advisory',
        description: 'An object with automatic storage duration shall not be assigned to a variable of type auto',
        rationale: 'Maintains explicit type information',
        decidable: true
      }
    ]
  };

  /**
   * Detect MISRA context in code
   */
  public static detectMISRAContext(code: string, fileName?: string): MISRAContext {
    const codeLower = code.toLowerCase();
    const detectedKeywords: string[] = [];
    const detectedViolations: string[] = [];
    const references: MISRAReference[] = [];
    
    let standard: 'MISRA-C' | 'MISRA-CPP' | null = null;
    let version: string | null = null;
    let language: 'c' | 'cpp' | null = null;
    let complianceLevel: 'Strict' | 'Standard' | 'None' = 'None';

    // Detect MISRA keywords
    for (const keyword of this.MISRA_KEYWORDS) {
      if (codeLower.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        
        // Determine standard
        if (keyword.toLowerCase().includes('misra c++') || keyword.toLowerCase().includes('misra-cpp')) {
          standard = 'MISRA-CPP';
          language = 'cpp';
        } else if (keyword.toLowerCase().includes('misra c') || keyword.toLowerCase().includes('misra-c')) {
          standard = 'MISRA-C';
          language = 'c';
        }
        
        // Detect version
        if (code.includes('2012') || code.includes(':2012')) version = '2012';
        if (code.includes('2023') || code.includes(':2023')) version = '2023';
        if (code.includes('2008') || code.includes(':2008')) version = '2008';
      }
    }

    // Fallback: detect by file extension
    if (!standard && fileName) {
      if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx') || fileName.endsWith('.hpp')) {
        standard = 'MISRA-CPP';
        language = 'cpp';
      } else if (fileName.endsWith('.c') || fileName.endsWith('.h')) {
        standard = 'MISRA-C';
        language = 'c';
      }
    }

    // Detect compliance level
    if (code.includes('strict compliance') || code.includes('MISRA strict')) {
      complianceLevel = 'Strict';
    } else if (detectedKeywords.length > 0) {
      complianceLevel = 'Standard';
    }

    // Check for common violations and map to rules
    if (language === 'c') {
      // Check for pointer violations
      if (code.includes('(void*)') || code.match(/\(\s*\w+\s*\*\s*\)/)) {
        references.push(...this.MISRA_C_RULES['pointer']);
        detectedViolations.push('Potential pointer cast violation');
      }
      
      // Check for goto
      if (code.includes('goto ')) {
        references.push(...this.MISRA_C_RULES['control-flow']);
        detectedViolations.push('goto statement detected');
      }
      
      // Check for malloc/free
      if (code.includes('malloc') || code.includes('free') || code.includes('calloc') || code.includes('realloc')) {
        references.push(...this.MISRA_C_RULES['memory']);
        detectedViolations.push('Dynamic memory allocation detected');
      }
      
    } else if (language === 'cpp') {
      // Check for C++ specific violations
      if (code.includes('throw ') && code.includes('~')) {
        references.push(...this.MISRA_CPP_RULES['exception']);
        detectedViolations.push('Exception in destructor');
      }
      
      // Check for C-style memory functions
      if (code.includes('malloc') || code.includes('strcpy') || code.includes('strcat')) {
        references.push(...this.MISRA_CPP_RULES['memory']);
        detectedViolations.push('C-style memory function in C++ code');
      }
    }

    const isMISRA = detectedKeywords.length > 0 || detectedViolations.length > 0 || complianceLevel !== 'None';

    return {
      isMISRA,
      standard,
      version,
      detectedKeywords,
      detectedViolations,
      references: this.deduplicateReferences(references),
      fileName,
      language,
      complianceLevel
    };
  }

  /**
   * Remove duplicate references
   */
  private static deduplicateReferences(refs: MISRAReference[]): MISRAReference[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = `${ref.standard}-${ref.ruleId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate MISRA compliance prompt for AI
   */
  public static generateCompliancePrompt(context: MISRAContext): string {
    if (!context.isMISRA) return '';

    const standardName = context.standard === 'MISRA-C' 
      ? `MISRA C${context.version ? `:${context.version}` : ''}` 
      : `MISRA C++${context.version ? `:${context.version}` : ''}`;

    let prompt = `\n\n# 🛡️ ${standardName} COMPLIANCE REQUIREMENTS\n\n`;
    prompt += `**Detected Standard**: ${standardName}\n`;
    prompt += `**Compliance Level**: ${context.complianceLevel}\n`;
    prompt += `**Language**: ${context.language?.toUpperCase()}\n\n`;

    if (context.detectedViolations.length > 0) {
      prompt += `## Detected Potential Violations:\n\n`;
      context.detectedViolations.forEach((violation, idx) => {
        prompt += `${idx + 1}. ${violation}\n`;
      });
      prompt += '\n';
    }

    if (context.references.length > 0) {
      prompt += `## Applicable MISRA Rules:\n\n`;
      context.references.forEach((ref, idx) => {
        prompt += `### ${idx + 1}. ${ref.ruleId} (${ref.category})\n`;
        prompt += `- **Standard**: ${ref.standard}\n`;
        prompt += `- **Category**: ${ref.category}\n`;
        prompt += `- **Decidable**: ${ref.decidable ? 'Yes (can be checked automatically)' : 'No (requires manual review)'}\n`;
        prompt += `- **Description**: ${ref.description}\n`;
        prompt += `- **Rationale**: ${ref.rationale}\n`;
        if (ref.example) {
          prompt += `- **Example**: ${ref.example}\n`;
        }
        prompt += '\n';
      });
    }

    return prompt;
  }

  /**
   * Generate MISRA analysis template
   */
  public static generateAnalysisTemplate(context: MISRAContext, code: string): string {
    const standardName = context.standard === 'MISRA-C' 
      ? `MISRA C${context.version ? `:${context.version}` : ''}` 
      : `MISRA C++${context.version ? `:${context.version}` : ''}`;

    return `Analyze this ${context.language?.toUpperCase()} code for ${standardName} compliance:

\`\`\`${context.language}
${code}
\`\`\`

${this.generateCompliancePrompt(context)}

Provide comprehensive ${standardName} compliance analysis including:

# 1. COMPLIANCE OVERVIEW
- Overall compliance status
- Critical violations found
- Advisory findings
- Compliance percentage (if applicable)

# 2. RULE VIOLATIONS

For EACH violation, provide:
## Rule [X.X.X] - [Category]
- **Standard**: ${standardName}
- **Category**: Mandatory/Required/Advisory
- **Line**: [line number(s)]
- **Violation**: [description]
- **Rationale**: [why this rule exists]
- **Decidable**: Yes/No
- **Fix**: [specific fix]
- **Code Example**: [corrected code]

# 3. DEVIATION REQUESTS
If deviations are needed:
- Rule ID
- Justification
- Alternative implementation
- Risk assessment

# 4. RECOMMENDATIONS
- Priority fixes (Mandatory > Required > Advisory)
- Code improvements for better compliance
- Tool recommendations for automated checking

Format with clear sections and specific line references.`;
  }

  /**
   * Get all MISRA C rules
   */
  public static getMISRACRules(): Record<string, MISRAReference[]> {
    return this.MISRA_C_RULES;
  }

  /**
   * Get all MISRA C++ rules
   */
  public static getMISRACPPRules(): Record<string, MISRAReference[]> {
    return this.MISRA_CPP_RULES;
  }

  /**
   * Get reference by rule ID
   */
  public static getRuleById(ruleId: string, standard: 'MISRA-C' | 'MISRA-CPP'): MISRAReference | null {
    const rules = standard === 'MISRA-C' ? this.MISRA_C_RULES : this.MISRA_CPP_RULES;
    
    for (const category of Object.values(rules)) {
      const found = category.find(rule => rule.ruleId === ruleId);
      if (found) return found;
    }
    
    return null;
  }
}

export default MISRADetector;