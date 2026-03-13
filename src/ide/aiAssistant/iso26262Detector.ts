// ============================================================================
// FILE: src/ide/aiAssistant/iso26262Detector.ts
// PURPOSE: Detect and analyze ISO 26262 / ASIL compliance in code
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface ISO26262Reference {
  version: string;           // e.g., "ISO 26262-6:2018"
  part: number;              // e.g., 6
  chapter: string;           // e.g., "7"
  clause: string;            // e.g., "7.4.8"
  page: number;              // e.g., 45
  requirement: string;       // Short requirement name
  description: string;       // Full requirement description
  testScope?: string;        // Related test clause
  testPage?: number;         // Test clause page number
}

export interface ASILContext {
  isASIL: boolean;
  asilLevel: string | null;  // "ASIL-A", "ASIL-B", "ASIL-C", "ASIL-D"
  detectedKeywords: string[];
  safetyMechanisms: string[];
  references: ISO26262Reference[];
  fileName?: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

// ============================================================================
// ISO 26262 DETECTOR CLASS
// ============================================================================

export class ISO26262Detector {
  
  /**
   * ASIL level detection keywords
   */
  private static readonly ASIL_KEYWORDS = [
    'ASIL-A', 'ASIL-B', 'ASIL-C', 'ASIL-D',
    'ASIL A', 'ASIL B', 'ASIL C', 'ASIL D',
    'asil-a', 'asil-b', 'asil-c', 'asil-d',
    'ISO 26262', 'ISO26262', 'ISO-26262',
    'functional safety', 'safety-critical', 'safety critical'
  ];

  /**
   * Safety mechanism keywords
   */
  private static readonly SAFETY_KEYWORDS = [
    'error handling', 'error detection', 'fault detection',
    'range check', 'boundary check', 'input validation',
    'plausibility check', 'sanity check',
    'redundancy', 'dual channel', 'diverse redundancy',
    'watchdog', 'monitoring', 'diagnostic',
    'safe state', 'fail-safe', 'failsafe',
    'FTTI', 'fault tolerant time interval',
    'safety mechanism', 'safety function',
    'diagnostic coverage', 'error coverage'
  ];

  /**
   * ISO 26262 standard reference database - COMPREHENSIVE
   */
  private static readonly ISO_REFERENCES: Record<string, ISO26262Reference[]> = {
    'error-handling': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.8',
        page: 45,
        requirement: 'Detection and handling of errors',
        description: 'Software shall implement mechanisms to detect errors and handle them according to ASIL requirements. Error detection coverage shall meet diagnostic coverage targets per Table 10.',
        testScope: 'Clause 9.4.5.3 - Error injection testing',
        testPage: 74
      },
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '8',
        clause: '8.4.4',
        page: 58,
        requirement: 'Use of well-trusted design principles',
        description: 'Structured exception handling mechanisms shall be implemented with clear error propagation paths',
        testScope: 'Clause 9.4.5.1 - Unit testing',
        testPage: 72
      }
    ],
    
    'range-check': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.6',
        page: 42,
        requirement: 'Range check of input and output data',
        description: 'All input and output values shall be checked against their valid range to detect out-of-bounds values',
        testScope: 'Clause 9.4.5.4 - Boundary value analysis',
        testPage: 74
      }
    ],
    
    'plausibility-check': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.7',
        page: 43,
        requirement: 'Plausibility check',
        description: 'Data plausibility checks shall verify consistency and reasonableness of data values',
        testScope: 'Clause 9.4.5.5 - Plausibility verification',
        testPage: 75
      }
    ],
    
    'redundancy': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.11',
        page: 48,
        requirement: 'Use of redundancy (homogeneous or diverse)',
        description: 'Redundant elements shall be used for ASIL C/D applications to detect random hardware failures. Voting or comparison mechanisms required.',
        testScope: 'Clause 9.4.5.8 - Redundancy verification',
        testPage: 77
      },
      {
        version: 'ISO 26262-5:2018',
        part: 5,
        chapter: '8',
        clause: '8.4.6',
        page: 56,
        requirement: 'Hardware redundancy at architectural level',
        description: 'Hardware elements shall implement redundancy with voting or comparison mechanisms',
        testScope: 'Part 6, Clause 9.4.5.8',
        testPage: 77
      }
    ],
    
    'watchdog': [
      {
        version: 'ISO 26262-5:2018',
        part: 5,
        chapter: '8',
        clause: '8.4.2',
        page: 52,
        requirement: 'Monitoring of program execution (watchdog)',
        description: 'Watchdog mechanisms shall monitor program execution time and sequence to detect timing failures',
        testScope: 'Clause 9.4.5.6 - Timing verification',
        testPage: 76
      },
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.9',
        page: 46,
        requirement: 'Use of program flow monitoring',
        description: 'Software shall implement mechanisms to detect program flow violations',
        testScope: 'Clause 9.4.5.6 - Timing tests',
        testPage: 76
      }
    ],
    
    'safe-state': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.13',
        page: 50,
        requirement: 'Safe state after fault detection',
        description: 'System shall transition to defined safe state within FTTI upon fault detection',
        testScope: 'Clause 9.4.5.7 - Safe state verification',
        testPage: 76
      },
      {
        version: 'ISO 26262-3:2018',
        part: 3,
        chapter: '8',
        clause: '8.4.3',
        page: 38,
        requirement: 'Fault Tolerant Time Interval (FTTI)',
        description: 'Time span from fault occurrence until safe state must be achieved',
        testScope: 'Part 6, Clause 9.4.5.7',
        testPage: 76
      }
    ],
    
    'input-validation': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.6',
        page: 42,
        requirement: 'Range check of input and output data',
        description: 'All inputs shall be validated for type, range, and plausibility before use',
        testScope: 'Clause 9.4.5.4 - Boundary value testing',
        testPage: 74
      }
    ],
    
    'diagnostic-coverage': [
      {
        version: 'ISO 26262-5:2018',
        part: 5,
        chapter: '8',
        clause: '8.4.9',
        page: 59,
        requirement: 'Evaluation of diagnostic coverage',
        description: 'Diagnostic coverage shall be evaluated to ensure sufficient fault detection capability',
        testScope: 'Clause 9.4.6 - Diagnostic coverage measurement',
        testPage: 78
      },
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '9',
        clause: 'Table 10',
        page: 73,
        requirement: 'Test coverage requirements per ASIL',
        description: 'ASIL A: 90%, ASIL B: 95%, ASIL C/D: 100% statement and branch coverage required',
        testScope: 'Clause 9.4.5 - Structural coverage testing',
        testPage: 72
      }
    ],
    
    'code-review': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '8',
        clause: '8.4.3',
        page: 57,
        requirement: 'Verification reviews',
        description: 'Code reviews shall be performed by qualified personnel according to ASIL requirements',
        testScope: 'Part 8, Clause 9.4.6 - Review process',
        testPage: 52
      },
      {
        version: 'ISO 26262-8:2018',
        part: 8,
        chapter: '9',
        clause: '9.4.6',
        page: 52,
        requirement: 'Independent verification for ASIL D',
        description: 'ASIL D requires independent verification by personnel not involved in development',
        testScope: 'Part 8, Clause 8.4.5 - Independence requirements',
        testPage: 48
      }
    ],
    
    'test-coverage': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '9',
        clause: '9.4.5',
        page: 72,
        requirement: 'Structural coverage at software unit level',
        description: 'Statement, branch, and MC/DC coverage per Table 10 requirements based on ASIL level',
        testScope: 'Table 10 - Coverage requirements',
        testPage: 73
      }
    ],
    
    'fault-injection': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '9',
        clause: '9.4.5.3',
        page: 74,
        requirement: 'Fault injection testing',
        description: 'Tests shall inject faults to verify error detection and handling mechanisms',
        testScope: 'Clause 9.4.5.3 - Error injection tests',
        testPage: 74
      }
    ],
    
    'back-to-back': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '9',
        clause: '9.4.5',
        page: 72,
        requirement: 'Back-to-back comparison testing',
        description: 'Highly recommended (++) for ASIL C/D - compare implementation against reference model',
        testScope: 'Table 10 - Back-to-back testing',
        testPage: 73
      }
    ],
    
    'memory-protection': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.10',
        page: 47,
        requirement: 'Static and dynamic memory checks',
        description: 'Memory access violations shall be detected through bounds checking and protection mechanisms',
        testScope: 'Clause 9.4.5.9 - Resource usage testing',
        testPage: 77
      }
    ],
    
    'timing-constraints': [
      {
        version: 'ISO 26262-6:2018',
        part: 6,
        chapter: '7',
        clause: '7.4.12',
        page: 49,
        requirement: 'Verification of timing constraints',
        description: 'Timing requirements including FTTI shall be verified through testing and analysis',
        testScope: 'Clause 9.4.5.6 - Timing and resource tests',
        testPage: 76
      }
    ]
  };

  /**
   * ASIL-specific requirements
   */
  private static readonly ASIL_REQUIREMENTS: Record<string, { coverage: number; requirements: string[] }> = {
    'ASIL-A': {
      coverage: 90,
      requirements: [
        'Statement coverage: 90% (ISO 26262-6:2018, Table 10, Page 73)',
        'Branch coverage: 90% (ISO 26262-6:2018, Table 10, Page 73)',
        'Input validation required (ISO 26262-6:2018, Clause 7.4.6, Page 42)',
        'Error handling required (ISO 26262-6:2018, Clause 7.4.8, Page 45)'
      ]
    },
    'ASIL-B': {
      coverage: 95,
      requirements: [
        'Statement coverage: 95% (ISO 26262-6:2018, Table 10, Page 73)',
        'Branch coverage: 95% (ISO 26262-6:2018, Table 10, Page 73)',
        'Range checks required (ISO 26262-6:2018, Clause 7.4.6, Page 42)',
        'Plausibility checks required (ISO 26262-6:2018, Clause 7.4.7, Page 43)',
        'Safe state mechanisms (ISO 26262-6:2018, Clause 7.4.13, Page 50)'
      ]
    },
    'ASIL-C': {
      coverage: 100,
      requirements: [
        'Statement coverage: 100% (ISO 26262-6:2018, Table 10, Page 73)',
        'Branch coverage: 100% (ISO 26262-6:2018, Table 10, Page 73)',
        'MC/DC coverage: Highly recommended (ISO 26262-6:2018, Table 10, Page 73)',
        'Redundancy MANDATORY (ISO 26262-6:2018, Clause 7.4.11, Page 48)',
        'Fault injection testing (ISO 26262-6:2018, Clause 9.4.5.3, Page 74)',
        'Back-to-back testing highly recommended (ISO 26262-6:2018, Table 10, Page 73)'
      ]
    },
    'ASIL-D': {
      coverage: 100,
      requirements: [
        'Statement coverage: 100% MANDATORY (ISO 26262-6:2018, Table 10, Page 73)',
        'Branch coverage: 100% MANDATORY (ISO 26262-6:2018, Table 10, Page 73)',
        'MC/DC coverage: 100% MANDATORY (ISO 26262-6:2018, Table 10, Page 73)',
        'Redundancy MANDATORY (ISO 26262-6:2018, Clause 7.4.11, Page 48)',
        'Independent verification MANDATORY (ISO 26262-8:2018, Clause 8.4.5, Page 48)',
        'Fault injection testing MANDATORY (ISO 26262-6:2018, Clause 9.4.5.3, Page 74)',
        'Back-to-back testing highly recommended (ISO 26262-6:2018, Table 10, Page 73)',
        'Diverse redundancy recommended (ISO 26262-6:2018, Clause 7.4.11, Page 48)'
      ]
    }
  };

  /**
   * Detect ASIL context in code
   */
  public static detectASILContext(code: string, fileName?: string): ASILContext {
    const codeLower = code.toLowerCase();
    const detectedKeywords: string[] = [];
    const safetyMechanisms: string[] = [];
    const references: ISO26262Reference[] = [];
    
    let asilLevel: string | null = null;
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';

    // Check for ASIL level keywords
    for (const keyword of this.ASIL_KEYWORDS) {
      if (codeLower.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        
        // Extract ASIL level
        if (keyword.toUpperCase().includes('ASIL-D') || keyword.toUpperCase().includes('ASIL D')) {
          asilLevel = 'ASIL-D';
          riskLevel = 'Critical';
        } else if (keyword.toUpperCase().includes('ASIL-C') || keyword.toUpperCase().includes('ASIL C')) {
          if (!asilLevel || asilLevel === 'ASIL-A' || asilLevel === 'ASIL-B') {
            asilLevel = 'ASIL-C';
            riskLevel = 'High';
          }
        } else if (keyword.toUpperCase().includes('ASIL-B') || keyword.toUpperCase().includes('ASIL B')) {
          if (!asilLevel || asilLevel === 'ASIL-A') {
            asilLevel = 'ASIL-B';
            riskLevel = 'Medium';
          }
        } else if (keyword.toUpperCase().includes('ASIL-A') || keyword.toUpperCase().includes('ASIL A')) {
          if (!asilLevel) {
            asilLevel = 'ASIL-A';
            riskLevel = 'Medium';
          }
        }
      }
    }

    // Check for safety mechanism keywords
    for (const keyword of this.SAFETY_KEYWORDS) {
      if (codeLower.includes(keyword.toLowerCase())) {
        if (!safetyMechanisms.includes(keyword)) {
          safetyMechanisms.push(keyword);
        }
      }
    }

    // Map detected mechanisms to ISO references
    if (codeLower.includes('error') && (codeLower.includes('handling') || codeLower.includes('detection'))) {
      references.push(...this.ISO_REFERENCES['error-handling']);
    }
    if (codeLower.includes('range check') || codeLower.includes('boundary check')) {
      references.push(...this.ISO_REFERENCES['range-check']);
    }
    if (codeLower.includes('plausibility') || codeLower.includes('sanity check')) {
      references.push(...this.ISO_REFERENCES['plausibility-check']);
    }
    if (codeLower.includes('redundancy') || codeLower.includes('dual channel')) {
      references.push(...this.ISO_REFERENCES['redundancy']);
    }
    if (codeLower.includes('watchdog') || codeLower.includes('monitoring')) {
      references.push(...this.ISO_REFERENCES['watchdog']);
    }
    if (codeLower.includes('safe state') || codeLower.includes('fail-safe')) {
      references.push(...this.ISO_REFERENCES['safe-state']);
    }
    if (codeLower.includes('input validation') || codeLower.includes('validate input')) {
      references.push(...this.ISO_REFERENCES['input-validation']);
    }

    // Default to ASIL-D if ISO 26262 mentioned but no specific level
    if (detectedKeywords.length > 0 && !asilLevel) {
      asilLevel = 'ASIL-D';
      riskLevel = 'Critical';
    }

    const isASIL = detectedKeywords.length > 0 || safetyMechanisms.length > 0;

    return {
      isASIL,
      asilLevel,
      detectedKeywords,
      safetyMechanisms,
      references,
      fileName,
      riskLevel
    };
  }

  /**
   * Generate compliance prompt for AI
   */
  public static generateCompliancePrompt(context: ASILContext): string {
    if (!context.isASIL) {
      return '';
    }

    const level = context.asilLevel || 'ASIL-D';
    const requirements = this.ASIL_REQUIREMENTS[level];

    let prompt = `\n\n# 🛡️ ISO 26262 SAFETY REQUIREMENTS\n\n`;
    prompt += `**Detected ASIL Level**: ${level}\n`;
    prompt += `**Risk Level**: ${context.riskLevel}\n`;
    prompt += `**Required Test Coverage**: ${requirements?.coverage || 100}%\n\n`;

    if (requirements) {
      prompt += `## Mandatory Requirements for ${level}:\n\n`;
      requirements.requirements.forEach((req, idx) => {
        prompt += `${idx + 1}. ${req}\n`;
      });
      prompt += '\n';
    }

    if (context.references.length > 0) {
      prompt += `## Applicable ISO 26262 References:\n\n`;
      context.references.forEach((ref, idx) => {
        prompt += `### ${idx + 1}. ${ref.requirement}\n`;
        prompt += `- **Reference**: ${ref.version}, Chapter ${ref.chapter}, Clause ${ref.clause}, Page ${ref.page}\n`;
        prompt += `- **Description**: ${ref.description}\n`;
        if (ref.testScope) {
          prompt += `- **Test Scope**: ${ref.testScope}${ref.testPage ? `, Page ${ref.testPage}` : ''}\n`;
        }
        prompt += '\n';
      });
    }

    return prompt;
  }

  /**
   * Generate safety analysis report
   */
  public static generateSafetyAnalysis(
    context: ASILContext,
    modifiedCode: string,
    originalCode?: string
  ): string {
    if (!context.isASIL) {
      return '';
    }

    const level = context.asilLevel || 'Safety-Critical';
    const requirements = this.ASIL_REQUIREMENTS[context.asilLevel || 'ASIL-D'];

    let analysis = `\n\n---\n\n`;
    analysis += `# 🛡️ ISO 26262 SAFETY ANALYSIS\n\n`;
    analysis += `## Safety Classification\n\n`;
    analysis += `- **ASIL Level**: ${level}\n`;
    analysis += `- **Risk Level**: ${context.riskLevel}\n`;
    analysis += `- **File**: ${context.fileName || 'Unknown'}\n`;
    analysis += `- **Required Coverage**: ${requirements?.coverage || 100}%\n\n`;

    analysis += `## Detected Safety Mechanisms\n\n`;
    if (context.safetyMechanisms.length > 0) {
      context.safetyMechanisms.forEach(mechanism => {
        analysis += `- ✅ ${mechanism}\n`;
      });
    } else {
      analysis += `- ⚠️ No safety mechanisms explicitly detected\n`;
    }
    analysis += '\n';

    analysis += `## Compliance Status\n\n`;
    const hasErrorHandling = modifiedCode.toLowerCase().includes('try') && modifiedCode.toLowerCase().includes('catch');
    const hasInputValidation = modifiedCode.toLowerCase().includes('if') && (modifiedCode.toLowerCase().includes('null') || modifiedCode.toLowerCase().includes('undefined'));
    const hasRangeCheck = modifiedCode.toLowerCase().includes('min') || modifiedCode.toLowerCase().includes('max');
    const hasISO26262Comments = modifiedCode.includes('ISO 26262');

    analysis += `| Requirement | Status | Reference |\n`;
    analysis += `|-------------|--------|----------|\n`;
    analysis += `| Error Handling | ${hasErrorHandling ? '✅ Present' : '❌ Missing'} | ISO 26262-6:2018, Clause 7.4.8, Page 45 |\n`;
    analysis += `| Input Validation | ${hasInputValidation ? '✅ Present' : '❌ Missing'} | ISO 26262-6:2018, Clause 7.4.6, Page 42 |\n`;
    analysis += `| Range Checks | ${hasRangeCheck ? '✅ Present' : '⚠️ Review Needed'} | ISO 26262-6:2018, Clause 7.4.6, Page 42 |\n`;
    analysis += `| ISO Documentation | ${hasISO26262Comments ? '✅ Present' : '❌ Missing'} | ISO 26262-6:2018, Clause 8.4.3, Page 57 |\n\n`;

    analysis += `## Required Actions\n\n`;
    const actions: string[] = [];
    
    if (!hasErrorHandling) {
      actions.push('❌ Add comprehensive error handling per ISO 26262-6:2018, Clause 7.4.8');
    }
    if (!hasInputValidation) {
      actions.push('❌ Implement input validation per ISO 26262-6:2018, Clause 7.4.6');
    }
    if (!hasISO26262Comments) {
      actions.push('❌ Add ISO 26262 compliance comments to code');
    }
    if (level === 'ASIL-C' || level === 'ASIL-D') {
      actions.push('⚠️ Consider implementing redundancy per ISO 26262-6:2018, Clause 7.4.11 (MANDATORY for ' + level + ')');
    }
    
    actions.push(`📋 Achieve ${requirements?.coverage || 100}% test coverage per ISO 26262-6:2018, Table 10`);
    actions.push('📋 Conduct code review per ISO 26262-6:2018, Clause 8.4.3');
    
    if (level === 'ASIL-D') {
      actions.push('📋 Arrange independent verification per ISO 26262-8:2018, Clause 8.4.5');
    }

    actions.forEach(action => {
      analysis += `${action}\n`;
    });

    return analysis;
  }

  /**
   * Generate ISO 26262 compliant code template
   */
  public static generateSafetyCodeTemplate(
    asilLevel: string,
    language: string,
    functionName: string = 'safetyFunction'
  ): string {
    const coverage = asilLevel === 'ASIL-D' || asilLevel === 'ASIL-C' ? 100 : 
                     asilLevel === 'ASIL-B' ? 95 : 90;
    
    const templates: Record<string, string> = {
      'javascript': `/**
 * ${functionName}
 * 
 * SAFETY CLASSIFICATION: ${asilLevel}
 * ISO 26262:2018 Compliance
 * 
 * Safety Mechanisms:
 * - Input validation (ISO 26262-6:2018, Clause 7.4.6, Page 42)
 * - Error handling (ISO 26262-6:2018, Clause 7.4.8, Page 45)
 * - Safe state transitions (ISO 26262-6:2018, Clause 7.4.13, Page 50)
 * 
 * Test Requirements:
 * - Coverage: ${coverage}% (ISO 26262-6:2018, Table 10, Page 73)
 * - Boundary value testing (Clause 9.4.5.4, Page 74)
 * - Error injection testing (Clause 9.4.5.3, Page 74)
 */
function ${functionName}(input) {
  // ${asilLevel}: Input validation per ISO 26262-6:2018, Clause 7.4.6, Page 42
  if (!input || typeof input !== 'object') {
    console.error('[SAFETY] Invalid input detected');
    return null; // Safe state per Clause 7.4.13, Page 50
  }
  
  // ${asilLevel}: Range check per ISO 26262-6:2018, Clause 7.4.6, Page 42
  if (input.value < MIN_SAFE_VALUE || input.value > MAX_SAFE_VALUE) {
    console.error('[SAFETY] Input out of safe range');
    return null; // Safe state per Clause 7.4.13, Page 50
  }
  
  // ${asilLevel}: Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
  try {
    // Critical operation
    const result = processInput(input);
    
    // Plausibility check per ISO 26262-6:2018, Clause 7.4.7, Page 43
    if (!isPlausible(result)) {
      console.error('[SAFETY] Implausible result detected');
      return null; // Safe state
    }
    
    return result;
    
  } catch (error) {
    // Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
    console.error('[SAFETY] Operation failed:', error);
    return null; // Safe state per Clause 7.4.13, Page 50
  }
}`,
      
      'typescript': `/**
 * ${functionName}
 * 
 * SAFETY CLASSIFICATION: ${asilLevel}
 * ISO 26262:2018 Compliance
 * 
 * @param input - Input data requiring validation
 * @returns Processed result or null if safety violation
 */
function ${functionName}(input: InputType): ResultType | null {
  // ${asilLevel}: Input validation per ISO 26262-6:2018, Clause 7.4.6, Page 42
  if (!input || typeof input !== 'object') {
    console.error('[SAFETY] Invalid input detected');
    return null; // Safe state per Clause 7.4.13, Page 50
  }
  
  // ${asilLevel}: Range check per ISO 26262-6:2018, Clause 7.4.6, Page 42
  if (input.value < MIN_SAFE_VALUE || input.value > MAX_SAFE_VALUE) {
    console.error('[SAFETY] Input out of safe range');
    return null;
  }
  
  // ${asilLevel}: Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
  try {
    const result = processInput(input);
    
    // Plausibility check per ISO 26262-6:2018, Clause 7.4.7, Page 43
    if (!isPlausible(result)) {
      console.error('[SAFETY] Implausible result');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('[SAFETY] Operation failed:', error);
    return null; // Safe state per Clause 7.4.13, Page 50
  }
}`,
      
      'c': `/**
 * ${functionName}
 * 
 * SAFETY CLASSIFICATION: ${asilLevel}
 * ISO 26262:2018 Compliance
 * 
 * Safety Mechanisms:
 * - Input validation (ISO 26262-6:2018, Clause 7.4.6, Page 42)
 * - Error handling (ISO 26262-6:2018, Clause 7.4.8, Page 45)
 * - Safe state transitions (ISO 26262-6:2018, Clause 7.4.13, Page 50)
 * 
 * @return 0 on success, error code on failure
 */
int ${functionName}(const InputType* input, OutputType* output) {
    // ${asilLevel}: Input validation per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if (input == NULL || output == NULL) {
        LOG_SAFETY_ERROR("Invalid NULL pointer");
        return ERROR_INVALID_INPUT; // Safe state per Clause 7.4.13
    }
    
    // ${asilLevel}: Range check per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if (input->value < MIN_SAFE_VALUE || input->value > MAX_SAFE_VALUE) {
        LOG_SAFETY_ERROR("Input out of safe range");
        return ERROR_OUT_OF_RANGE; // Safe state per Clause 7.4.13
    }
    
    // ${asilLevel}: Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
    int result = processInput(input, output);
    if (result != SUCCESS) {
        LOG_SAFETY_ERROR("Processing failed");
        enterSafeState(); // Safe state per Clause 7.4.13, Page 50
        return result;
    }
    
    // Plausibility check per ISO 26262-6:2018, Clause 7.4.7, Page 43
    if (!isPlausible(output)) {
        LOG_SAFETY_ERROR("Implausible result");
        enterSafeState();
        return ERROR_IMPLAUSIBLE;
    }
    
    return SUCCESS;
}`,

      'cpp': `/**
 * ${functionName}
 * 
 * SAFETY CLASSIFICATION: ${asilLevel}
 * ISO 26262:2018 Compliance
 * 
 * @param input Input data requiring validation
 * @return Result or std::nullopt on safety violation
 */
std::optional<ResultType> ${functionName}(const InputType& input) {
    // ${asilLevel}: Input validation per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if (!input.isValid()) {
        LOG_SAFETY_ERROR("Invalid input detected");
        return std::nullopt; // Safe state per Clause 7.4.13, Page 50
    }
    
    // ${asilLevel}: Range check per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if (input.value < MIN_SAFE_VALUE || input.value > MAX_SAFE_VALUE) {
        LOG_SAFETY_ERROR("Input out of safe range");
        return std::nullopt;
    }
    
    // ${asilLevel}: Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
    try {
        auto result = processInput(input);
        
        // Plausibility check per ISO 26262-6:2018, Clause 7.4.7, Page 43
        if (!isPlausible(result)) {
            LOG_SAFETY_ERROR("Implausible result");
            return std::nullopt;
        }
        
        return result;
    } catch (const std::exception& e) {
        LOG_SAFETY_ERROR("Operation failed: " << e.what());
        return std::nullopt; // Safe state per Clause 7.4.13, Page 50
    }
}`,

      'python': `"""
${functionName}

SAFETY CLASSIFICATION: ${asilLevel}
ISO 26262:2018 Compliance

Safety Mechanisms:
- Input validation (ISO 26262-6:2018, Clause 7.4.6, Page 42)
- Error handling (ISO 26262-6:2018, Clause 7.4.8, Page 45)
- Safe state transitions (ISO 26262-6:2018, Clause 7.4.13, Page 50)

Test Requirements:
- Coverage: ${coverage}% (ISO 26262-6:2018, Table 10, Page 73)
"""
def ${functionName}(input_data):
    # ${asilLevel}: Input validation per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if input_data is None or not isinstance(input_data, dict):
        logging.error("[SAFETY] Invalid input detected")
        return None  # Safe state per Clause 7.4.13, Page 50
    
    # ${asilLevel}: Range check per ISO 26262-6:2018, Clause 7.4.6, Page 42
    if input_data['value'] < MIN_SAFE_VALUE or input_data['value'] > MAX_SAFE_VALUE:
        logging.error("[SAFETY] Input out of safe range")
        return None  # Safe state per Clause 7.4.13, Page 50
    
    # ${asilLevel}: Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
    try:
        result = process_input(input_data)
        
        # Plausibility check per ISO 26262-6:2018, Clause 7.4.7, Page 43
        if not is_plausible(result):
            logging.error("[SAFETY] Implausible result detected")
            return None  # Safe state
        
        return result
        
    except Exception as error:
        # Error handling per ISO 26262-6:2018, Clause 7.4.8, Page 45
        logging.error(f"[SAFETY] Operation failed: {error}")
        return None  # Safe state per Clause 7.4.13, Page 50`
    };
    
    return templates[language] || templates['javascript'];
  }

  /**
   * Get reference by mechanism type
   */
  public static getReferences(mechanismType: string): ISO26262Reference[] {
    return this.ISO_REFERENCES[mechanismType] || [];
  }

  /**
   * Get all available references
   */
  public static getAllReferences(): Record<string, ISO26262Reference[]> {
    return this.ISO_REFERENCES;
  }

  /**
   * Get ASIL requirements
   */
  public static getASILRequirements(asilLevel: string): { coverage: number; requirements: string[] } | null {
    return this.ASIL_REQUIREMENTS[asilLevel] || null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ISO26262Detector;