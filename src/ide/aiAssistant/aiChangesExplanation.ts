// ============================================================================
// FILE: src/ide/aiAssistant/aiChangesExplanation.ts
// PURPOSE: Generate detailed professional explanations for code changes
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================

import { getCurrentApiConfigurationForced, callGenericAPI } from './apiProviderManager';
import { ISO26262Detector } from './iso26262Detector';
import { HTMLViewerGenerator } from './htmlViewerGenerator';

// ============================================================================
// EXPLANATION GENERATOR CLASS
// ============================================================================

export class ChangesExplanationGenerator {
  private originalCode: string = '';
  private modifiedCode: string = '';
  private fileName: string = 'untitled';
  private changesSummary: string = '';
  
  /**
   * Set the code context for analysis
   */
  public setChangesContext(original: string, modified: string, fileName: string): void {
    this.originalCode = original;
    this.modifiedCode = modified;
    this.fileName = fileName;
  }
  
  /**
   * Set changes summary
   */
  public setChangesSummary(summary: string): void {
    this.changesSummary = summary;
  }
  
  /**
   * Generate detailed professional explanation
   */
  public async generateDetailedExplanation(): Promise<string> {
    // ========================================================================
    // Detect ISO 26262 / ASIL context
    // ========================================================================
    const combinedCode = this.originalCode + '\n' + this.modifiedCode;
    const asilContext = ISO26262Detector.detectASILContext(combinedCode, this.fileName);
    
    console.log('🛡️ ASIL Detection:', asilContext.isASIL, asilContext.asilLevel);
    
    // ========================================================================
    // Choose prompt template based on ASIL detection
    // ========================================================================
    const prompt = asilContext.isASIL 
      ? this.generateISO26262Prompt(asilContext)
      : this.generateStandardPrompt();
    
    try {
      const config = getCurrentApiConfigurationForced();
      
      if (!config.apiKey || !config.apiBaseUrl) {
        throw new Error('API configuration is incomplete');
      }
      
      console.log('🌐 Calling AI for detailed explanation...');
      
      const response = await callGenericAPI(prompt, config);
      
      console.log('✅ Detailed explanation generated');
      
      // ========================================================================
      // Append safety analysis if ASIL detected
      // ========================================================================
      if (asilContext.isASIL) {
        const safetyAnalysis = ISO26262Detector.generateSafetyAnalysis(
          asilContext, 
          this.modifiedCode,
          this.originalCode
        );
        return `${response}\n\n${safetyAnalysis}`;
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Failed to generate detailed explanation:', error);
      throw error;
    }
  }
  
  /**
   * Generate standard prompt for regular code (non-ISO 26262)
   */
  private generateStandardPrompt(): string {
    return `You are a senior software architect and code review expert specializing in professional code analysis.

# Context
File: ${this.fileName}

# Changes Summary
${this.changesSummary}

# Original Code (BEFORE)
\`\`\`
${this.originalCode}
\`\`\`

# Modified Code (AFTER)
\`\`\`
${this.modifiedCode}
\`\`\`

# Your Task
Provide a comprehensive, professional analysis of these code changes in markdown format following the EXACT structure below.

---

# 1. EXECUTIVE SUMMARY

Provide a concise overview (3-5 sentences) covering:
- Primary improvement objective
- Key changes at a glance
- Expected impact on the codebase

---

# 2. TECHNICAL IMPLEMENTATION DETAILS

For EACH significant change, provide a detailed breakdown:

## Change 1: [Descriptive Title]
* **What was changed**: Specific code modification
* **Why it was changed**: Technical reasoning
* **How it improves the code**: Direct benefits

## Change 2: [Descriptive Title]
* **What was changed**: Specific code modification
* **Why it was changed**: Technical reasoning
* **How it improves the code**: Direct benefits

[Continue for all major changes...]

---

# 3. CODE STANDARDS COMPLIANCE

## Clean Code Principles
* **Meaningful naming conventions**: Analysis
* **Function/method single responsibility**: Assessment
* **Code readability improvements**: Details
* **DRY (Don't Repeat Yourself) adherence**: Evaluation
* **KISS (Keep It Simple, Stupid) principle**: Review

## SOLID Principles
* **Single Responsibility Principle**: How it's applied
* **Open/Closed Principle**: Evaluation
* **Liskov Substitution Principle**: Assessment (if applicable)
* **Interface Segregation**: Analysis (if applicable)
* **Dependency Inversion**: Review (if applicable)

## General Best Practices
* **Type safety enhancements** (TypeScript/strongly-typed languages): Details
* **Error handling improvements**: Assessment
* **Performance optimizations**: Analysis
* **Security considerations**: Review
* **Maintainability gains**: Evaluation

---

# 4. ARCHITECTURAL IMPACT

Explain how these changes affect:
- Overall architecture patterns
- Module/component relationships
- Scalability considerations
- System reliability
- Future maintenance

---

# 5. BEFORE/AFTER COMPARISON

Create a comparison table:

| ASPECT | BEFORE | AFTER | IMPROVEMENT |
|--------|--------|-------|-------------|
| Error Handling | [Description] | [Description] | [Impact] |
| Code Readability | [Rating] | [Rating] | [Impact] |
| Maintainability | [Rating] | [Rating] | [Impact] |
| Performance | [Rating] | [Rating] | [Impact] |
| [Other relevant aspects...] | | | |

---

# 6. RECOMMENDATIONS

Provide 3-5 actionable recommendations for:
- Unit testing requirements
- Integration testing considerations
- Documentation needs
- Additional improvements
- Best practices to follow

**Format each recommendation as:**
- [Recommendation with specific details]

---

**IMPORTANT GUIDELINES:**
- Be specific and technical, not generic
- Reference actual code changes
- Provide concrete examples
- Use professional terminology
- Keep explanations clear and actionable
- Focus on practical value for developers`;
  }
  
  /**
   * Generate ISO 26262 prompt for safety-critical code
   */
 private generateISO26262Prompt(asilContext: any): string {
  const safetyPrompt = ISO26262Detector.generateCompliancePrompt(asilContext);
  const coverage = asilContext.asilLevel === 'ASIL-D' || asilContext.asilLevel === 'ASIL-C' ? 100 : 
                   asilContext.asilLevel === 'ASIL-B' ? 95 : 
                   asilContext.asilLevel === 'ASIL-A' ? 90 : 90;
  
  return `You are a functional safety expert and senior software architect specializing in ISO 26262 automotive safety-critical systems.

# Context
File: ${this.fileName}
ASIL Level: ${asilContext.asilLevel || 'Safety-Critical'}
Required Test Coverage: ${coverage}%

${safetyPrompt}

# Changes Summary
${this.changesSummary}

# Original Code (BEFORE)
\`\`\`
${this.originalCode}
\`\`\`

# Modified Code (AFTER)
\`\`\`
${this.modifiedCode}
\`\`\`

# Your Task
Provide a comprehensive ISO 26262 compliant analysis in markdown format following this EXACT structure.

**CRITICAL: For EVERY claim, requirement, or recommendation, you MUST provide complete ISO 26262 references in this EXACT format:**
- **Version**: ISO 26262-[Part]:[Year] (e.g., ISO 26262-6:2018)
- **Chapter**: Chapter [X] (e.g., Chapter 7)
- **Clause**: Clause [X.X.X] (e.g., Clause 7.4.8)
- **Page**: Page [X] (e.g., Page 45)
- **Test Scope**: Specific test scope from Clause 9.4.5 (e.g., Error injection testing per Clause 9.4.5.3)

---

# 1. EXECUTIVE SUMMARY

Provide a concise overview covering:
- **Safety Objective**: Primary safety goal of these changes
- **ASIL Level Impact**: How changes affect ${asilContext.asilLevel || 'safety-critical'} classification
- **Compliance Status**: ISO 26262 compliance assessment
- **Risk Assessment**: Overall safety risk level (Low/Medium/High/Critical)
- **Key Safety Improvements**: Top 3-5 safety enhancements

For each item, cite the relevant ISO 26262 reference with version, chapter, clause, and page.

---

# 2. TECHNICAL IMPLEMENTATION DETAILS

Provide detailed change-by-change analysis with COMPLETE ISO 26262 references:

## Change 1: [Descriptive Title]

* **What was changed**: [Specific code modification with line numbers]

* **Why it was changed**: [Technical and safety reasoning]

* **How it improves safety**: [Direct safety benefits]

* **ISO 26262 References**:
  - **Primary Requirement**:
    - Version: ISO 26262-[Part]:[Year]
    - Chapter: Chapter [X]
    - Clause: Clause [X.X.X]
    - Page: Page [X]
    - Requirement: [Full requirement title]
    - Description: [What this clause requires]
  
  - **Test Requirements**:
    - Version: ISO 26262-6:2018
    - Chapter: Chapter 9
    - Clause: Clause 9.4.5.[X]
    - Page: Page [X]
    - Test Scope: [Specific test type required]
    - Description: [What must be tested]

* **Safety Mechanism**: [Type: error detection/handling/monitoring/redundancy]

* **Verification Method**: 
  - Test Type: [Unit/Integration/System]
  - Coverage Required: ${coverage}%
  - Test Scope Reference: ISO 26262-6:2018, Clause 9.4.5.[X], Page [X]
  - Acceptance Criteria: [Specific pass/fail criteria]

* **Diagnostic Coverage Impact**:
  - Previous: [%]
  - New: [%]
  - Reference: ISO 26262-5:2018, Clause 8.4.9, Page 59

## Change 2: [Descriptive Title]
[Same detailed structure as Change 1...]

[Continue for ALL significant changes with complete ISO references...]

---

# 3. ISO 26262 COMPLIANCE ANALYSIS

## Applicable Standards & Requirements

For EACH relevant ISO 26262 requirement, provide COMPLETE details:

### Requirement 1: [Full Requirement Title from Standard]

* **Complete Reference**:
  - **Version**: ISO 26262-[Part]:[Year]
  - **Part**: Part [X]
  - **Chapter**: Chapter [X]
  - **Clause**: Clause [X.X.X]
  - **Page**: Page [X]
  - **Table**: [If applicable, e.g., Table 10]

* **Requirement Description**: [Exact requirement from standard]

* **How Changes Address This**: [Specific implementation details]

* **Compliance Level**: [Fully Compliant / Partially Compliant / Not Applicable]

* **Evidence Required**: 
  - Documentation: [Specific documents needed]
  - Test Evidence: [Test results required]
  - Review: [Review type required per ISO 26262-8:2018, Clause 9.4.6]

* **Verification Test Scope**:
  - Reference: ISO 26262-6:2018, Chapter 9, Clause 9.4.5.[X], Page [X]
  - Test Type: [Specific test approach]
  - Coverage Target: ${coverage}%

### Requirement 2: [Full Requirement Title]
[Same complete structure...]

[Include ALL relevant requirements with complete references]

---

# 4. BEFORE/AFTER COMPARISON

Create a detailed comparison table with COMPLETE ISO 26262 references:

| ASPECT | BEFORE | AFTER | SAFETY IMPROVEMENT | ISO 26262 REFERENCE | TEST SCOPE |
|--------|--------|-------|-------------------|---------------------|------------|
| Error Detection Coverage | [%] | [%] | [Description] | ISO 26262-6:2018, Ch 7, Cl 7.4.8, p45 | Cl 9.4.5.3, p74 |
| Error Handling | [Description] | [Description] | [Impact] | ISO 26262-6:2018, Ch 7, Cl 7.4.8, p45 | Cl 9.4.5.3, p74 |
| Diagnostic Coverage | [%] | [%] | [Impact] | ISO 26262-5:2018, Ch 8, Cl 8.4.9, p59 | Cl 9.4.6, p78 |
| Input Validation | [Description] | [Description] | [Impact] | ISO 26262-6:2018, Ch 7, Cl 7.4.6, p42 | Cl 9.4.5.4, p74 |
| Safe State Handling | [Description] | [Description] | [Impact] | ISO 26262-6:2018, Ch 7, Cl 7.4.13, p50 | Cl 9.4.5.7, p76 |
| Redundancy | [Level] | [Level] | [Impact] | ISO 26262-6:2018, Ch 7, Cl 7.4.11, p48 | Cl 9.4.5.8, p77 |
| Code Complexity | [Metric] | [Metric] | [Impact] | ISO 26262-6:2018, Ch 8, Cl 8.4.4, p58 | Cl 9.4.5.1, p72 |
| Testability | [Rating] | [Rating] | [Impact] | ISO 26262-6:2018, Ch 9, Cl 9.4.5, p72 | Table 10, p73 |
| FTTI Compliance | [Status] | [Status] | [Impact] | ISO 26262-3:2018, Ch 8, Cl 8.4.3, p38 | Cl 9.4.5.7, p76 |

**Key Metrics with References:**
- Diagnostic Coverage: [X]% → [Y]% (Target: ${coverage}% per ISO 26262-6:2018, Table 10, Page 73)
- Safety Mechanisms Added: [Number] (per ISO 26262-6:2018, Chapter 7, Pages 42-50)
- Test Coverage: [Before]% → [After]% (Target: ${coverage}% per ISO 26262-6:2018, Clause 9.4.5, Table 10, Page 73)
- Code Review: [Required per ISO 26262-6:2018, Clause 8.4.3, Page 57]

---

# 5. SAFETY MECHANISMS IMPLEMENTED

Detail all safety mechanisms per ISO 26262-6:2018, Chapter 7:

## Error Detection (ISO 26262-6:2018, Clause 7.4.8, Page 45)

* **Standard Reference**:
  - Version: ISO 26262-6:2018
  - Chapter: Chapter 7
  - Clause: Clause 7.4.8
  - Page: Page 45
  - Requirement: Detection and handling of errors

* **Methods Implemented**: [List all detection methods]
* **Coverage Achieved**: [Percentage]
* **Detection Time**: [Maximum time to detect errors]

* **Test Scope Reference**:
  - Version: ISO 26262-6:2018
  - Clause: Clause 9.4.5.3
  - Page: Page 74
  - Test Type: Error injection testing

* **Verification**: 
  - Test approach per Clause 9.4.5.3, Page 74
  - Required coverage: ${coverage}%
  - Acceptance criteria: [Specific criteria]

## Error Handling (ISO 26262-6:2018, Clause 7.4.8, Page 45)

* **Standard Reference**:
  - Version: ISO 26262-6:2018
  - Clause: Clause 7.4.8
  - Page: Page 45

* **Handling Procedures**: [Describe error response]
* **Safe State Transition**: [How system reaches safe state]
  - FTTI Requirement: [Time per ISO 26262-3:2018, Clause 8.4.3, Page 38]
* **Response Time**: [Maximum error handling time]

* **Test Scope**:
  - Reference: ISO 26262-6:2018, Clause 9.4.5.7, Page 76
  - Test: Safe state verification within FTTI

## Monitoring (ISO 26262-5:2018, Clause 8.4.2, Page 52)

* **Standard Reference**:
  - Version: ISO 26262-5:2018
  - Clause: Clause 8.4.2
  - Page: Page 52
  - Requirement: Monitoring of program execution

* **Watchdog Implementation**: [Details if applicable]
* **Timing Constraints**: [Monitored parameters]

* **Test Scope**:
  - Reference: ISO 26262-6:2018, Clause 9.4.5.6, Page 76
  - Test: Timing verification and watchdog triggering

${asilContext.asilLevel === 'ASIL-C' || asilContext.asilLevel === 'ASIL-D' ? `
## Redundancy (ISO 26262-6:2018, Clause 7.4.11, Page 48) - MANDATORY for ${asilContext.asilLevel}

* **Standard Reference**:
  - Version: ISO 26262-6:2018
  - Clause: Clause 7.4.11
  - Page: Page 48
  - Requirement: Use of redundancy (homogeneous or diverse)

* **Redundancy Type**: [Homogeneous/Heterogeneous/Diverse]
* **Implementation Details**: [How redundancy is achieved]
* **Fault Coverage**: [Percentage of faults detected]

* **Test Scope**:
  - Reference: ISO 26262-6:2018, Clause 9.4.5.8, Page 77
  - Test: Redundancy verification with fault injection
` : ''}

## Plausibility Checks (ISO 26262-6:2018, Clause 7.4.7, Page 43)

* **Standard Reference**:
  - Version: ISO 26262-6:2018
  - Clause: Clause 7.4.7
  - Page: Page 43

* **Checks Implemented**: [List all plausibility checks]
* **Test Scope**: ISO 26262-6:2018, Clause 9.4.5.5, Page 75

## Range Checks (ISO 26262-6:2018, Clause 7.4.6, Page 42)

* **Standard Reference**:
  - Version: ISO 26262-6:2018
  - Clause: Clause 7.4.6
  - Page: Page 42

* **Parameters Checked**: [List all checked parameters]
* **Valid Ranges**: [Min/max values with units]
* **Test Scope**: 
  - Reference: ISO 26262-6:2018, Clause 9.4.5.4, Page 74
  - Test: Boundary value analysis (min, max, below min, above max)

---

# 6. VERIFICATION REQUIREMENTS (ISO 26262-6:2018, Chapter 9)

## Test Coverage Requirements (Table 10, Page 73)

* **Reference**: ISO 26262-6:2018, Chapter 9, Table 10, Page 73
* **Statement Coverage**: ${coverage}% required for ${asilContext.asilLevel}
* **Branch Coverage**: ${coverage}% required for ${asilContext.asilLevel}
* **MC/DC Coverage**: ${asilContext.asilLevel === 'ASIL-D' || asilContext.asilLevel === 'ASIL-C' ? '100% required (Highly Recommended ++)' : 'Recommended (+)'}

## Required Test Cases (ISO 26262-6:2018, Clause 9.4.5, Pages 72-77)

### Unit Tests (Clause 9.4.5.1, Page 72)
1. **Normal Operation Tests**: 
   - Reference: ISO 26262-6:2018, Clause 9.4.5.1, Page 72
   - Description: [What to test]

2. **Boundary Value Tests**:
   - Reference: ISO 26262-6:2018, Clause 9.4.5.4, Page 74
   - Test: Min, Max, Below Min, Above Max values
   - Description: [Specific test cases]

3. **Error Injection Tests**:
   - Reference: ISO 26262-6:2018, Clause 9.4.5.3, Page 74
   - Faults to inject: [List specific faults]
   - Expected behavior: [System response]

4. **Timing Tests**:
   - Reference: ISO 26262-6:2018, Clause 9.4.5.6, Page 76
   - FTTI verification per ISO 26262-3:2018, Clause 8.4.3, Page 38

### Integration Tests (Clause 9.4.5.2, Page 73)
[Same detailed structure with references...]

### System Tests (Clause 9.4.5, Pages 72-77)
[Same detailed structure with references...]

${asilContext.asilLevel === 'ASIL-D' || asilContext.asilLevel === 'ASIL-C' ? `
### Back-to-Back Testing (Required for ${asilContext.asilLevel})
* **Reference**: ISO 26262-6:2018, Table 10, Clause 9.4.5
* **Requirement Level**: Highly Recommended (++) for ${asilContext.asilLevel}
* **Implementation**: [How to implement]
` : ''}

## Plausibility Checks (Clause 7.4.7)
* **Checks Implemented**: List all plausibility checks
* **Validation Criteria**: What makes data plausible
* **Action on Failure**: What happens if check fails

## Range Checks (Clause 7.4.6)
* **Parameters Checked**: List all checked parameters
* **Valid Ranges**: Min/max values
* **Boundary Handling**: What happens at limits
* **Test Cases**: Boundary test requirements

---

# 6. VERIFICATION REQUIREMENTS (ISO 26262-6:2018, Chapter 9)

## Test Coverage Requirements (Table 10)
* **Statement Coverage**: ${coverage}% required for ${asilContext.asilLevel}
* **Branch Coverage**: ${coverage}% required
* **MC/DC Coverage**: ${asilContext.asilLevel === 'ASIL-D' || asilContext.asilLevel === 'ASIL-C' ? '100% required' : 'Recommended'}

## Required Test Cases

### Unit Tests
1. **Normal Operation Tests**: [Description]
2. **Boundary Value Tests**: [Specific values to test]
3. **Error Injection Tests**: [Fault scenarios]
4. **Timing Tests**: [Performance requirements]

### Integration Tests
1. **Interface Tests**: [All interfaces]
2. **Error Propagation Tests**: [Cross-module error handling]
3. **Safe State Tests**: [Verify safe state reachable]

### System Tests
1. **End-to-End Safety Tests**: [Complete safety scenarios]
2. **FTTI Verification**: [Timing measurements]
3. **Diagnostic Coverage Tests**: [Measure actual coverage]

${asilContext.asilLevel === 'ASIL-D' || asilContext.asilLevel === 'ASIL-C' ? `
### Back-to-Back Testing (Required for ${asilContext.asilLevel})
* **Reference Implementation**: [Details]
* **Comparison Method**: [How to compare]
* **Acceptance Criteria**: [When test passes]
` : ''}

## Fault Injection Requirements
* **Fault Types**: [Hardware/software faults to inject]
* **Injection Points**: [Where to inject faults]
* **Expected Behavior**: [System response to each fault]
* **Coverage Target**: [Percentage of faults to cover]

---

# 7. ARCHITECTURAL SAFETY IMPACT

## Impact on Safety Architecture
* **Safety Functions Affected**: List all affected safety functions
* **Safety Goals Impact**: How changes affect system safety goals
* **Safety Concept Changes**: Required updates to technical safety concept

## FMEA/FTA Implications
* **New Failure Modes**: Any new failure modes introduced
* **Failure Mode Changes**: Modified failure modes
* **Failure Rate Impact**: Effect on overall failure rate
* **Single Point Faults**: Analysis of single point failures
* **Latent Faults**: Analysis of latent fault detection

## Diagnostic Coverage Assessment
* **Previous Coverage**: [Percentage]
* **New Coverage**: [Percentage]
* **Improvement**: [Delta]
* **Target Met**: Yes/No (Target: ${coverage}%)

## FTTI (Fault Tolerant Time Interval) Analysis
* **FTTI Requirement**: [Time from specification]
* **Detection Time**: [Maximum detection time]
* **Handling Time**: [Maximum handling time]
* **Total Time**: [Detection + Handling]
* **Compliance**: [Met/Not Met]

---

# 8. TRACEABILITY & DOCUMENTATION

## Required Documentation Updates

### Safety Requirements Specification (ISO 26262-6:2018, Clause 6.4.5)
* **Changes Required**: [Specific updates needed]
* **New Requirements**: [Any new safety requirements]
* **Traceability Matrix**: [Which requirements are affected]

### Technical Safety Concept (ISO 26262-4:2018)
* **Updates Required**: [Changes to safety concept]
* **Safety Mechanisms**: [Document new mechanisms]

### Software Safety Requirements (ISO 26262-6:2018, Clause 7.4)
* **Updates Required**: [Specific requirement updates]
* **Verification Criteria**: [How to verify each requirement]

### Design Documentation (ISO 26262-6:2018, Chapter 7)
* **Architectural Design**: [Updates needed]
* **Detailed Design**: [Module-level changes]
* **Interface Specifications**: [Interface changes]

### Test Specifications (ISO 26262-6:2018, Chapter 9)
* **Test Plan Updates**: [What to add to test plan]
* **Test Cases**: [New test cases required]
* **Test Coverage Reports**: [Expected coverage]

### Work Products Requiring Update
- [ ] Hazard Analysis and Risk Assessment (HARA)
- [ ] Functional Safety Concept
- [ ] Technical Safety Concept
- [ ] Software Safety Requirements
- [ ] Software Architectural Design
- [ ] Software Detailed Design
- [ ] Software Unit Test Specification
- [ ] Software Integration Test Specification
- [ ] Software Safety Analysis Report
- [ ] Verification Report
- [ ] Configuration Management Records

---

# 9. REVIEW & APPROVAL REQUIREMENTS (ISO 26262-8:2018)

## Required Reviews (Clause 9.4.6)
* **Code Review**: Required reviewers and qualifications
* **Safety Review**: Safety manager approval required
* **Architecture Review**: System architect approval
${asilContext.asilLevel === 'ASIL-D' ? '* **Independent Review**: Required for ASIL-D (Clause 8.4.5)' : ''}

## Configuration Management (Chapter 6)
* **Version Control**: Branching and tagging strategy
* **Change Documentation**: Change request number and description
* **Impact Analysis**: Documented impact on safety
* **Regression Testing**: Full test suite execution required

---

# 10. RECOMMENDATIONS

Provide specific, actionable recommendations:

## Immediate Actions (Before Release)
1. **[Action]**: [Detailed description with ISO reference]
2. **[Action]**: [Detailed description with ISO reference]
3. **[Action]**: [Detailed description with ISO reference]

## Testing Requirements
1. **[Test requirement]**: [Specific test details]
2. **[Test requirement]**: [Specific test details]

## Documentation Requirements
1. **[Documentation need]**: [What to document]
2. **[Documentation need]**: [What to document]

## Additional Safety Improvements
1. **[Improvement]**: [How to implement]
2. **[Improvement]**: [How to implement]

## Risk Mitigation
1. **[Risk]**: [How to mitigate]
2. **[Risk]**: [How to mitigate]

---

**CRITICAL REQUIREMENTS:**
- Reference EXACT ISO 26262 clauses: ISO 26262-[Part]:[Year], Part [X], Chapter [X], Clause [X.X.X], Page [X]
- Be specific about ${asilContext.asilLevel} requirements
- Include diagnostic coverage percentage (${coverage}% required)
- Address FTTI requirements explicitly
- Specify all verification methods
- Provide concrete, measurable criteria
- Reference actual code changes
- Use professional safety engineering terminology`;
  }
}

// ============================================================================
// UI CLASS
// ============================================================================

export class ChangesExplanationUI {
  public generator: ChangesExplanationGenerator;
  private explanationPanel: HTMLElement | null = null;
  
  constructor() {
    this.generator = new ChangesExplanationGenerator();
  }

  /**
   * Add "Detailed Explanation" button to changes panel
   */
  public addExplanationButton(changesPanel: HTMLElement, changesSummary: string): void {
    // Remove existing button if any
    const existingBtn = changesPanel.querySelector('.detailed-explanation-btn');
    if (existingBtn) existingBtn.remove();

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'explanation-button-container';
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    `;

    // Create detailed explanation button
    const detailedBtn = document.createElement('button');
    detailedBtn.className = 'detailed-explanation-btn';
    detailedBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
      </svg>
      <span>Get Detailed Professional Analysis</span>
    `;
    detailedBtn.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    `;

    // Hover effect
    detailedBtn.addEventListener('mouseenter', () => {
      detailedBtn.style.transform = 'translateY(-2px)';
      detailedBtn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.5)';
    });

    detailedBtn.addEventListener('mouseleave', () => {
      detailedBtn.style.transform = 'translateY(0)';
      detailedBtn.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
    });

    // Click handler
    detailedBtn.addEventListener('click', async () => {
      await this.showDetailedExplanation(detailedBtn, changesSummary);
    });

    buttonContainer.appendChild(detailedBtn);

    // Insert button at the end of changes panel
    changesPanel.appendChild(buttonContainer);
  }

  /**
   * Show detailed explanation
   */
  private async showDetailedExplanation(button: HTMLElement, changesSummary: string): Promise<void> {
    // Set loading state
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px; animation: spin 1s linear infinite;">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM2.5 8a5.5 5.5 0 0 0 11 0h-3a2.5 2.5 0 0 1-5 0h-3z"/>
      </svg>
      <span>Generating Professional Analysis...</span>
    `;
    button.style.pointerEvents = 'none';
    button.style.opacity = '0.8';

    // Add spin animation
    if (!document.getElementById('spin-animation-style')) {
      const style = document.createElement('style');
      style.id = 'spin-animation-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    try {
      // Set changes summary
      this.generator.setChangesSummary(changesSummary);

      // Generate explanation
      const explanation = await this.generator.generateDetailedExplanation();

      // Display explanation
      this.displayExplanation(explanation, button);

    } catch (error) {
      console.error('Failed to generate explanation:', error);
      
      // Show error
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = `
        padding: 12px;
        margin: 12px 16px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 6px;
        color: #ff6b6b;
        font-size: 13px;
      `;
      errorMsg.textContent = `⚠️ Failed to generate explanation: ${(error as Error).message}`;
      
      button.parentElement?.parentElement?.appendChild(errorMsg);
      
      setTimeout(() => errorMsg.remove(), 5000);
    } finally {
      // Reset button
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 6px;">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
        </svg>
        <span>Get Detailed Professional Analysis</span>
      `;
      button.style.pointerEvents = 'auto';
      button.style.opacity = '1';
    }
  }

  /**
   * Display explanation in a beautiful panel
   */
  private displayExplanation(explanation: string, button: HTMLElement): void {
    // Remove existing panel
    if (this.explanationPanel) {
      this.explanationPanel.remove();
    }

    // Create explanation panel
    const panel = document.createElement('div');
    panel.className = 'detailed-explanation-panel';
    panel.style.cssText = `
      margin: 16px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      overflow: hidden;
      animation: slideDown 0.4s ease-out;
    `;

    // Add slide down animation
    if (!document.getElementById('slidedown-animation-style')) {
      const style = document.createElement('style');
      style.id = 'slidedown-animation-style';
      style.textContent = `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Panel header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414a1 1 0 0 0-.707.293L.854 15.146A.5.5 0 0 1 0 14.793V2zm5 4a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm4 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
        <span style="font-weight: 600; font-size: 14px; color: white;">Professional Code Analysis</span>
        <span style="
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          color: white;
          font-weight: 500;
        ">Standards Reference</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="open-html-viewer-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
          font-size: 12px;
          font-weight: 500;
        " title="Open in HTML Viewer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path d="M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0v-6z"/>
          </svg>
          <span>Open in Viewer</span>
        </button>
        <button class="close-explanation-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        ">×</button>
      </div>
    `;

    // Close button handler
    const closeBtn = header.querySelector('.close-explanation-btn') as HTMLElement;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeBtn.addEventListener('click', () => {
      panel.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => panel.remove(), 300);
    });

    // HTML Viewer button handler
    const htmlViewerBtn = header.querySelector('.open-html-viewer-btn') as HTMLElement;
    htmlViewerBtn.addEventListener('mouseenter', () => {
      htmlViewerBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    htmlViewerBtn.addEventListener('mouseleave', () => {
      htmlViewerBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    htmlViewerBtn.addEventListener('click', () => {
      HTMLViewerGenerator.openInNewWindow(explanation, 'Professional Code Analysis');
    });

    // Panel content
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.7;
      max-height: 600px;
      overflow-y: auto;
    `;

    // Convert markdown to HTML
    content.innerHTML = this.markdownToHtml(explanation);

    // Apply styles to rendered content
    this.styleRenderedContent(content);

    panel.appendChild(header);
    panel.appendChild(content);

    // Insert after button container
    button.parentElement?.parentElement?.appendChild(panel);

    this.explanationPanel = panel;
  }

  /**
   * Basic Markdown to HTML converter
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Tables
    html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, (match, header, rows) => {
      const headerCells = header.split('|').filter((cell: string) => cell.trim());
      const headerRow = '<tr>' + headerCells.map((cell: string) => `<th>${cell.trim()}</th>`).join('') + '</tr>';
      
      const bodyRows = rows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((cell: string) => cell.trim());
        return '<tr>' + cells.map((cell: string) => `<td>${cell.trim()}</td>`).join('') + '</tr>';
      }).join('');
      
      return `<table>${headerRow}${bodyRows}</table>`;
    });

    // Lists
    html = html.replace(/^[•\-\*] (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, match => '<ul>' + match + '</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');

    return html;
  }

  /**
   * Style rendered content
   */
  private styleRenderedContent(container: HTMLElement): void {
    // Headers
    container.querySelectorAll('h1').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #6366f1;
        font-size: 20px;
        font-weight: 700;
        margin: 24px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid rgba(99, 102, 241, 0.3);
      `;
    });

    container.querySelectorAll('h2').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #8b5cf6;
        font-size: 18px;
        font-weight: 600;
        margin: 20px 0 10px 0;
      `;
    });

    container.querySelectorAll('h3').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #a78bfa;
        font-size: 16px;
        font-weight: 600;
        margin: 16px 0 8px 0;
      `;
    });

    container.querySelectorAll('h4').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #c4b5fd;
        font-size: 14px;
        font-weight: 600;
        margin: 14px 0 6px 0;
      `;
    });

    // Code blocks
    container.querySelectorAll('pre').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
        margin: 12px 0;
      `;
    });

    container.querySelectorAll('code').forEach(el => {
      const parent = el.parentElement;
      if (parent?.tagName !== 'PRE') {
        (el as HTMLElement).style.cssText = `
          background: rgba(99, 102, 241, 0.2);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          color: #c4b5fd;
        `;
      }
    });

    // Lists
    container.querySelectorAll('ul').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 8px 0;
        padding-left: 24px;
      `;
    });

    container.querySelectorAll('li').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 4px 0;
        line-height: 1.6;
      `;
    });

    // Tables
    container.querySelectorAll('table').forEach(el => {
      (el as HTMLElement).style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        overflow: hidden;
      `;
    });

    container.querySelectorAll('th').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: rgba(99, 102, 241, 0.3);
        padding: 10px;
        border: 1px solid rgba(99, 102, 241, 0.2);
        text-align: left;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 11px;
        color: #a78bfa;
      `;
    });

    container.querySelectorAll('td').forEach(el => {
      (el as HTMLElement).style.cssText = `
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #d0d0d0;
      `;
    });

    // Strong/Bold
    container.querySelectorAll('strong').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #c4b5fd;
        font-weight: 600;
      `;
    });

    // Paragraphs
    container.querySelectorAll('p').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 8px 0;
        line-height: 1.7;
      `;
    });

    // Scrollbar styling
    container.style.scrollbarWidth = 'thin';
    container.style.scrollbarColor = '#6366f1 rgba(255, 255, 255, 0.1)';
  }
}

// ============================================================================
// INITIALIZATION AND EXPORT
// ============================================================================

let explanationUI: ChangesExplanationUI | null = null;

/**
 * Initialize the explanation UI system
 */
export function initializeChangesExplanation(): void {
  if (!explanationUI) {
    explanationUI = new ChangesExplanationUI();
    console.log('✅ AI Changes Explanation System Initialized');
  }
}

/**
 * Add explanation button to changes panel
 */
export function addExplanationToChangesPanel(panel: HTMLElement, changesSummary: string): void {
  if (!explanationUI) {
    initializeChangesExplanation();
  }
  
  explanationUI?.addExplanationButton(panel, changesSummary);
}

// Global window exports for easy access
if (typeof window !== 'undefined') {
  (window as any).initializeChangesExplanation = initializeChangesExplanation;
  (window as any).addExplanationToChangesPanel = addExplanationToChangesPanel;
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChangesExplanation);
} else {
  initializeChangesExplanation();
}