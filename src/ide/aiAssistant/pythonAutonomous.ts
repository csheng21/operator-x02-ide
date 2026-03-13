// pythonAutonomous.ts - Complete Python Autonomous System with Auto-Fix Integration

export class PythonAutonomousSystem {
    private aiAssistant: any; // Your existing AI assistant
    private fileOperations: any; // Your existing file operations
    private terminal: any; // Your existing terminal
    private editor: any; // Monaco editor instance
    private isAutoFixEnabled: boolean = false;
    private typingSpeed: number = 50; // ms per character for typing animation
    private autoFixHistory: AutoFixEntry[] = [];

    constructor(aiAssistant: any, fileOperations: any, terminal: any) {
        this.aiAssistant = aiAssistant;
        this.fileOperations = fileOperations;
        this.terminal = terminal;
        this.editor = null;
        this.initializeEditor();
    }

    /**
     * Initialize Monaco editor reference
     */
    private initializeEditor(): void {
        // Wait for Monaco to be available
        const checkEditor = setInterval(() => {
            if (window.monaco?.editor?.getEditors) {
                const editors = window.monaco.editor.getEditors();
                if (editors && editors.length > 0) {
                    this.editor = editors[0];
                    clearInterval(checkEditor);
                    console.log('🤖 Editor initialized for autonomous system');
                }
            }
        }, 100);
    }

    /**
     * Enable/disable auto-fix functionality
     */
    public setAutoFixEnabled(enabled: boolean): void {
        this.isAutoFixEnabled = enabled;
        console.log(`Auto-fix ${enabled ? 'enabled' : 'disabled'} in autonomous system`);
    }

    /**
     * Main autonomous decorator handler
     */
    async processAutonomousDecorators(filePath: string): Promise<void> {
        try {
            console.log(`🤖 Processing autonomous decorators in: ${filePath}`);
            const content = await this.fileOperations.readFile(filePath);
            const decoratorMatches = this.findAutonomousDecorators(content);
            
            if (decoratorMatches.length === 0) {
                console.log('No autonomous decorators found');
                return;
            }
            
            console.log(`Found ${decoratorMatches.length} autonomous decorators`);
            this.showNotification(`🤖 Processing ${decoratorMatches.length} autonomous decorators...`, 'info');
            
            for (const match of decoratorMatches) {
                await this.executeAutonomousTask(match, filePath);
                
                // Small delay between tasks
                await this.delay(500);
            }
            
            this.showNotification(`✅ All autonomous tasks completed!`, 'success');
        } catch (error) {
            console.error('Autonomous processing failed:', error);
            this.showNotification('❌ Autonomous processing failed', 'error');
        }
    }

    /**
     * Find all autonomous decorators in code
     */
    private findAutonomousDecorators(content: string): AutonomousMatch[] {
        const decoratorPatterns = [
            /@auto_generate\((.*?)\)/g,
            /@auto_debug\((.*?)\)/g,
            /@auto_improve\((.*?)\)/g,
            /@auto_test\((.*?)\)/g,
            /@auto_complete\((.*?)\)/g,
            /@auto_fix\((.*?)\)/g, // New auto-fix decorator
            /@auto_document\((.*?)\)/g, // New documentation decorator
            /@auto_optimize\((.*?)\)/g // New optimization decorator
        ];

        const matches: AutonomousMatch[] = [];
        const decoratorTypes = ['generate', 'debug', 'improve', 'test', 'complete', 'fix', 'document', 'optimize'];
        
        decoratorPatterns.forEach((pattern, index) => {
            let match;
            pattern.lastIndex = 0; // Reset regex
            
            while ((match = pattern.exec(content)) !== null) {
                matches.push({
                    type: decoratorTypes[index],
                    params: match[1],
                    position: match.index,
                    fullMatch: match[0],
                    lineNumber: this.getLineNumber(content, match.index)
                });
            }
        });

        return matches.sort((a, b) => a.position - b.position);
    }

    /**
     * Execute autonomous task based on decorator
     */
    private async executeAutonomousTask(match: AutonomousMatch, filePath: string): Promise<void> {
        console.log(`🤖 Autonomous ${match.type} starting on line ${match.lineNumber}...`);
        this.showNotification(`🤖 ${match.type} in progress...`, 'info');

        try {
            switch (match.type) {
                case 'generate':
                    await this.autoGenerate(match, filePath);
                    break;
                case 'debug':
                    await this.autoDebug(match, filePath);
                    break;
                case 'improve':
                    await this.autoImprove(match, filePath);
                    break;
                case 'test':
                    await this.autoTest(match, filePath);
                    break;
                case 'complete':
                    await this.autoComplete(match, filePath);
                    break;
                case 'fix':
                    await this.autoFix(match, filePath);
                    break;
                case 'document':
                    await this.autoDocument(match, filePath);
                    break;
                case 'optimize':
                    await this.autoOptimize(match, filePath);
                    break;
            }

            console.log(`✅ Autonomous ${match.type} completed!`);
            this.showNotification(`✅ ${match.type} completed successfully`, 'success');
        } catch (error) {
            console.error(`❌ Autonomous ${match.type} failed:`, error);
            this.showNotification(`❌ ${match.type} failed: ${error.message}`, 'error');
        }
    }

    /**
     * @auto_generate("function_name", "description")
     */
    private async autoGenerate(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const params = this.parseParams(match.params);
            const functionName = params[0];
            const description = params[1];

            if (!functionName || !description) {
                throw new Error('auto_generate requires function name and description');
            }

            const prompt = `Generate a Python function named '${functionName}' that ${description}. 
                          Include proper docstring, type hints, and basic error handling.
                          Make it production-ready and well-documented.`;

            const generatedCode = await this.generateCodeWithAI(prompt);
            
            if (generatedCode) {
                // Animate code insertion with typing effect
                await this.insertCodeWithAnimation(filePath, match, generatedCode);
                
                // Auto-test the generated function
                await this.runQuickTest(filePath, functionName);
            }
            
        } catch (error) {
            console.error('Auto-generate failed:', error);
            throw error;
        }
    }

    /**
     * @auto_debug("fix_errors")
     */
    private async autoDebug(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            console.log('🔧 Running auto-debug...');
            
            // Run the file and capture errors
            const result = await this.executeInTerminal(`python "${filePath}"`);
            
            if (result.exitCode !== 0 && result.stderr) {
                console.log('Errors detected, analyzing...');
                
                const content = await this.fileOperations.readFile(filePath);
                const errors = this.parseErrorsFromOutput(result.stderr);
                
                // If auto-fix is enabled, apply fixes automatically
                if (this.isAutoFixEnabled) {
                    console.log('🔧 Auto-fix enabled, applying fixes...');
                    
                    for (const error of errors) {
                        const fixed = await this.applyErrorFix(filePath, error, content);
                        if (fixed) {
                            this.recordAutoFix(filePath, error.line, error.description, 'auto-debug');
                        }
                    }
                    
                    // Re-run to verify fixes
                    const verifyResult = await this.executeInTerminal(`python "${filePath}"`);
                    if (verifyResult.exitCode === 0) {
                        console.log('✅ All errors fixed successfully!');
                        this.showNotification('✅ All errors fixed!', 'success');
                    } else {
                        console.log('⚠️ Some errors remain after auto-fix');
                        this.showNotification('⚠️ Some errors remain', 'warning');
                    }
                } else {
                    // Just analyze and report errors
                    const prompt = `Analyze this Python code and fix the following error:
                    
                    Error: ${result.stderr}
                    
                    Code:
                    \`\`\`python
                    ${content}
                    \`\`\`
                    
                    Please provide the corrected code with the errors fixed.`;

                    const fixedCode = await this.generateCodeWithAI(prompt);
                    
                    if (fixedCode) {
                        await this.createBackup(filePath);
                        await this.fileOperations.writeFile(filePath, fixedCode);
                        console.log('🔧 Debug fixes applied');
                    }
                }
            } else {
                console.log('🔧 No errors found or file ran successfully');
                this.showNotification('✅ No errors found!', 'success');
            }
        } catch (error) {
            console.error('Auto-debug failed:', error);
            throw error;
        }
    }

    /**
     * @auto_fix() - New decorator for automatic error fixing
     */
    private async autoFix(match: AutonomousMatch, filePath: string): Promise<void> {
        if (!this.isAutoFixEnabled) {
            this.showNotification('⚠️ Auto-fix requires autonomous mode to be active', 'warning');
            return;
        }

        try {
            console.log('⚡ Running auto-fix...');
            
            // Get current code
            const content = await this.fileOperations.readFile(filePath);
            
            // Analyze code for all types of issues
            const issues = await this.analyzeCodeForIssues(content, filePath);
            
            if (issues.length === 0) {
                this.showNotification('✅ No issues found to fix!', 'success');
                return;
            }
            
            console.log(`Found ${issues.length} issues to fix`);
            
            // Apply fixes one by one with animation
            let fixedCount = 0;
            for (const issue of issues) {
                const fixed = await this.applyIssueFixWithAnimation(filePath, issue);
                if (fixed) {
                    fixedCount++;
                    await this.delay(300); // Small delay between fixes
                }
            }
            
            this.showNotification(`⚡ Fixed ${fixedCount}/${issues.length} issues`, 'success');
            
        } catch (error) {
            console.error('Auto-fix failed:', error);
            throw error;
        }
    }

    /**
     * @auto_improve("optimize", "readability")
     */
    private async autoImprove(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const content = await this.fileOperations.readFile(filePath);
            const improvements = this.parseParams(match.params);
            
            for (const improvement of improvements) {
                console.log(`📈 Improving: ${improvement}`);
                
                const prompt = `Improve this Python code for ${improvement}:
                
                \`\`\`python
                ${content}
                \`\`\`
                
                Focus on ${improvement} improvements while maintaining functionality.
                Return the improved code.`;

                const improvedCode = await this.generateCodeWithAI(prompt);
                
                if (improvedCode && improvedCode !== content) {
                    await this.createBackup(filePath);
                    
                    // Apply improvements with animation
                    await this.applyCodeChangesWithAnimation(filePath, content, improvedCode);
                    
                    console.log(`📈 Auto-improved: ${improvement}`);
                    this.showNotification(`📈 Improved ${improvement}`, 'success');
                }
            }
        } catch (error) {
            console.error('Auto-improve failed:', error);
            throw error;
        }
    }

    /**
     * @auto_test("unit_tests")
     */
    private async autoTest(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const content = await this.fileOperations.readFile(filePath);
            
            const prompt = `Generate comprehensive unit tests for this Python code:
            
            \`\`\`python
            ${content}
            \`\`\`
            
            Create a complete test file with:
            - Import statements
            - Test class using unittest
            - Multiple test methods covering different scenarios
            - Edge cases and error conditions
            - Proper assertions
            - Use pytest if appropriate`;

            const testCode = await this.generateCodeWithAI(prompt);
            
            if (testCode) {
                const testFilePath = filePath.replace('.py', '_test.py');
                
                // Write test file with animation
                await this.writeFileWithAnimation(testFilePath, testCode);
                
                console.log(`🧪 Test file created: ${testFilePath}`);
                
                // Run tests
                const result = await this.executeInTerminal(`python -m pytest "${testFilePath}" -v`);
                if (result.stdout) {
                    console.log('🧪 Test results:', result.stdout);
                    
                    // Parse test results and show summary
                    const passed = (result.stdout.match(/passed/g) || []).length;
                    const failed = (result.stdout.match(/failed/g) || []).length;
                    
                    if (failed === 0) {
                        this.showNotification(`🧪 All ${passed} tests passed!`, 'success');
                    } else {
                        this.showNotification(`🧪 ${passed} passed, ${failed} failed`, 'warning');
                    }
                }
            }
            
        } catch (error) {
            console.error('Auto-test failed:', error);
            throw error;
        }
    }

    /**
     * @auto_complete("function_signature")
     */
    private async autoComplete(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const content = await this.fileOperations.readFile(filePath);
            const functionSignature = match.params.replace(/['"]/g, '');
            
            const prompt = `Complete this Python function based on the signature and surrounding context:
            
            Function signature: ${functionSignature}
            
            Context:
            \`\`\`python
            ${content}
            \`\`\`
            
            Provide a complete implementation with proper docstring, error handling, and type hints.`;
            
            const completedFunction = await this.generateCodeWithAI(prompt);
            
            if (completedFunction) {
                await this.insertCodeWithAnimation(filePath, match, completedFunction);
                this.showNotification('✅ Function completed!', 'success');
            }
            
        } catch (error) {
            console.error('Auto-complete failed:', error);
            throw error;
        }
    }

    /**
     * @auto_document() - Generate documentation
     */
    private async autoDocument(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const content = await this.fileOperations.readFile(filePath);
            
            const prompt = `Add comprehensive documentation to this Python code:
            
            \`\`\`python
            ${content}
            \`\`\`
            
            Include:
            - Module-level docstring
            - Function/class docstrings
            - Parameter descriptions
            - Return value descriptions
            - Example usage
            - Type hints where missing`;

            const documentedCode = await this.generateCodeWithAI(prompt);
            
            if (documentedCode) {
                await this.createBackup(filePath);
                await this.applyCodeChangesWithAnimation(filePath, content, documentedCode);
                this.showNotification('📚 Documentation added!', 'success');
            }
            
        } catch (error) {
            console.error('Auto-document failed:', error);
            throw error;
        }
    }

    /**
     * @auto_optimize() - Optimize code performance
     */
    private async autoOptimize(match: AutonomousMatch, filePath: string): Promise<void> {
        try {
            const content = await this.fileOperations.readFile(filePath);
            
            const prompt = `Optimize this Python code for performance:
            
            \`\`\`python
            ${content}
            \`\`\`
            
            Focus on:
            - Algorithm optimization
            - Memory efficiency
            - Removing redundant operations
            - Using built-in functions where appropriate
            - Caching/memoization where beneficial`;

            const optimizedCode = await this.generateCodeWithAI(prompt);
            
            if (optimizedCode) {
                await this.createBackup(filePath);
                
                // Benchmark before and after if possible
                await this.benchmarkComparison(filePath, content, optimizedCode);
                
                await this.applyCodeChangesWithAnimation(filePath, content, optimizedCode);
                this.showNotification('⚡ Code optimized!', 'success');
            }
            
        } catch (error) {
            console.error('Auto-optimize failed:', error);
            throw error;
        }
    }

    /**
     * Analyze code for various issues
     */
    private async analyzeCodeForIssues(content: string, filePath: string): Promise<CodeIssue[]> {
        const issues: CodeIssue[] = [];
        
        // Check for syntax errors
        const syntaxResult = await this.executeInTerminal(`python -m py_compile "${filePath}"`);
        if (syntaxResult.exitCode !== 0) {
            const syntaxErrors = this.parseErrorsFromOutput(syntaxResult.stderr);
            syntaxErrors.forEach(error => {
                issues.push({
                    type: 'syntax',
                    line: error.line,
                    description: error.description,
                    severity: 'error',
                    fix: error.fix
                });
            });
        }
        
        // Check for style issues (PEP 8)
        const styleResult = await this.executeInTerminal(`python -m pycodestyle "${filePath}"`);
        if (styleResult.stdout) {
            const styleIssues = this.parseStyleIssues(styleResult.stdout);
            issues.push(...styleIssues);
        }
        
        // Check for logical issues using pylint
        const lintResult = await this.executeInTerminal(`python -m pylint "${filePath}" --output-format=json`);
        if (lintResult.stdout) {
            try {
                const lintIssues = JSON.parse(lintResult.stdout);
                lintIssues.forEach((issue: any) => {
                    issues.push({
                        type: 'logical',
                        line: issue.line,
                        description: issue.message,
                        severity: issue.type === 'error' ? 'error' : 'warning',
                        fix: `Fix ${issue.symbol}: ${issue.message}`
                    });
                });
            } catch (e) {
                console.log('Could not parse pylint output');
            }
        }
        
        return issues;
    }

    /**
     * Apply fix for a specific issue with animation
     */
    private async applyIssueFixWithAnimation(filePath: string, issue: CodeIssue): Promise<boolean> {
        try {
            if (!this.editor) return false;
            
            const model = this.editor.getModel();
            if (!model) return false;
            
            // Highlight the problematic line
            this.highlightLine(issue.line, 'error');
            await this.delay(500);
            
            // Generate fix
            const lineContent = model.getLineContent(issue.line);
            const fixedLine = await this.generateFixForLine(lineContent, issue);
            
            if (fixedLine && fixedLine !== lineContent) {
                // Apply fix with typing animation
                await this.replaceLineWithAnimation(issue.line, fixedLine);
                
                // Highlight as fixed
                this.highlightLine(issue.line, 'success');
                await this.delay(300);
                
                // Record the fix
                this.recordAutoFix(filePath, issue.line, issue.description, 'auto-fix');
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to apply fix:', error);
            return false;
        }
    }

    /**
     * Insert code with typing animation
     */
    private async insertCodeWithAnimation(filePath: string, match: AutonomousMatch, code: string): Promise<void> {
        if (!this.editor) {
            // Fallback to direct insertion
            await this.insertCodeAfterDecorator(filePath, match, code);
            return;
        }
        
        const lines = code.split('\n');
        let currentLine = match.lineNumber;
        
        for (const line of lines) {
            currentLine++;
            
            // Insert empty line first
            this.editor.executeEdits('autonomous-insert', [{
                range: new monaco.Range(currentLine, 1, currentLine, 1),
                text: '\n'
            }]);
            
            // Type the line character by character
            for (let i = 0; i < line.length; i++) {
                this.editor.executeEdits('autonomous-type', [{
                    range: new monaco.Range(currentLine, i + 1, currentLine, i + 1),
                    text: line[i]
                }]);
                
                // Add typing delay
                await this.delay(this.typingSpeed);
            }
        }
        
        // Highlight the inserted code
        for (let i = match.lineNumber + 1; i <= currentLine; i++) {
            this.highlightLine(i, 'success');
        }
    }

    /**
     * Replace a line with animation
     */
    private async replaceLineWithAnimation(lineNumber: number, newContent: string): Promise<void> {
        if (!this.editor) return;
        
        const model = this.editor.getModel();
        if (!model) return;
        
        const currentContent = model.getLineContent(lineNumber);
        
        // Delete current content character by character
        for (let i = currentContent.length; i > 0; i--) {
            this.editor.executeEdits('autonomous-delete', [{
                range: new monaco.Range(lineNumber, i, lineNumber, i + 1),
                text: ''
            }]);
            await this.delay(this.typingSpeed / 2); // Faster deletion
        }
        
        // Type new content character by character
        for (let i = 0; i < newContent.length; i++) {
            this.editor.executeEdits('autonomous-type', [{
                range: new monaco.Range(lineNumber, i + 1, lineNumber, i + 1),
                text: newContent[i]
            }]);
            await this.delay(this.typingSpeed);
        }
    }

    /**
     * Apply code changes with diff animation
     */
    private async applyCodeChangesWithAnimation(filePath: string, oldCode: string, newCode: string): Promise<void> {
        if (!this.editor) {
            await this.fileOperations.writeFile(filePath, newCode);
            return;
        }
        
        const oldLines = oldCode.split('\n');
        const newLines = newCode.split('\n');
        const diffs = this.computeDiff(oldLines, newLines);
        
        for (const diff of diffs) {
            switch (diff.type) {
                case 'add':
                    // Highlight and add new lines
                    for (const line of diff.lines) {
                        await this.insertLineWithAnimation(diff.lineNumber, line);
                        this.highlightLine(diff.lineNumber, 'success');
                        await this.delay(200);
                    }
                    break;
                    
                case 'remove':
                    // Highlight and remove lines
                    for (let i = 0; i < diff.lines.length; i++) {
                        this.highlightLine(diff.lineNumber, 'error');
                        await this.delay(200);
                        await this.removeLineWithAnimation(diff.lineNumber);
                    }
                    break;
                    
                case 'modify':
                    // Highlight and modify lines
                    for (let i = 0; i < diff.lines.length; i++) {
                        this.highlightLine(diff.lineNumber + i, 'warning');
                        await this.delay(200);
                        await this.replaceLineWithAnimation(diff.lineNumber + i, diff.lines[i]);
                        this.highlightLine(diff.lineNumber + i, 'success');
                    }
                    break;
            }
        }
    }

    /**
     * Write file with typing animation
     */
    private async writeFileWithAnimation(filePath: string, content: string): Promise<void> {
        // Create new file
        await this.fileOperations.writeFile(filePath, '');
        
        // Open in editor if possible
        if (this.editor) {
            // TODO: Open the new file in editor
            console.log(`Created file: ${filePath}`);
        }
        
        // Write content with animation
        const lines = content.split('\n');
        let currentContent = '';
        
        for (const line of lines) {
            currentContent += line + '\n';
            await this.fileOperations.writeFile(filePath, currentContent);
            await this.delay(50); // Quick animation
        }
    }

    /**
     * Highlight a line in the editor
     */
    private highlightLine(lineNumber: number, type: 'error' | 'warning' | 'success'): void {
        if (!this.editor) return;
        
        const className = type === 'error' ? 'error-highlight' : 
                         type === 'warning' ? 'warning-highlight' : 
                         'success-highlight';
        
        const decoration = this.editor.deltaDecorations([], [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: className
            }
        }]);
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
            this.editor.deltaDecorations(decoration, []);
        }, 2000);
    }

    /**
     * Parse errors from Python output
     */
    private parseErrorsFromOutput(stderr: string): ErrorInfo[] {
        const errors: ErrorInfo[] = [];
        const lines = stderr.split('\n');
        
        for (const line of lines) {
            // Parse Python error format: File "filename", line X
            const match = line.match(/File ".*", line (\d+)/);
            if (match) {
                const lineNumber = parseInt(match[1], 10);
                const description = lines[lines.indexOf(line) + 1] || 'Syntax error';
                
                errors.push({
                    line: lineNumber,
                    description: description.trim(),
                    fix: `Fix syntax error on line ${lineNumber}`
                });
            }
        }
        
        return errors;
    }

    /**
     * Parse style issues from pycodestyle output
     */
    private parseStyleIssues(output: string): CodeIssue[] {
        const issues: CodeIssue[] = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            // Format: filename:line:column: error_code message
            const match = line.match(/:(\d+):(\d+): (\w+) (.+)/);
            if (match) {
                issues.push({
                    type: 'style',
                    line: parseInt(match[1], 10),
                    description: `${match[3]}: ${match[4]}`,
                    severity: 'warning',
                    fix: match[4]
                });
            }
        }
        
        return issues;
    }

    /**
     * Apply error fix
     */
    private async applyErrorFix(filePath: string, error: ErrorInfo, content: string): Promise<boolean> {
        try {
            const lines = content.split('\n');
            
            if (error.line > 0 && error.line <= lines.length) {
                const problematicLine = lines[error.line - 1];
                
                // Generate fix using AI
                const fixedLine = await this.generateFixForLine(problematicLine, {
                    type: 'syntax',
                    line: error.line,
                    description: error.description,
                    severity: 'error',
                    fix: error.fix
                });
                
                if (fixedLine && fixedLine !== problematicLine) {
                    lines[error.line - 1] = fixedLine;
                    const fixedContent = lines.join('\n');
                    
                    await this.fileOperations.writeFile(filePath, fixedContent);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Failed to apply error fix:', error);
            return false;
        }
    }

    /**
     * Generate fix for a specific line
     */
    private async generateFixForLine(line: string, issue: CodeIssue): Promise<string | null> {
        const prompt = `Fix this Python line that has the following issue:
        
        Issue: ${issue.description}
        Current line: ${line}
        
        Return ONLY the fixed line of code, no explanations.`;
        
        try {
            const fixed = await this.generateCodeWithAI(prompt);
            return fixed ? fixed.trim() : null;
        } catch (error) {
            console.error('Failed to generate fix:', error);
            return null;
        }
    }

    /**
     * Compute diff between old and new lines
     */
    private computeDiff(oldLines: string[], newLines: string[]): DiffEntry[] {
        const diffs: DiffEntry[] = [];
        
        // Simple diff algorithm (can be improved with proper diff library)
        let i = 0, j = 0;
        
        while (i < oldLines.length || j < newLines.length) {
            if (i >= oldLines.length) {
                // Remaining new lines
                diffs.push({
                    type: 'add',
                    lineNumber: i + 1,
                    lines: newLines.slice(j)
                });
                break;
            } else if (j >= newLines.length) {
                // Remaining old lines to remove
                diffs.push({
                    type: 'remove',
                    lineNumber: i + 1,
                    lines: oldLines.slice(i)
                });
                break;
            } else if (oldLines[i] === newLines[j]) {
                // Lines match, continue
                i++;
                j++;
            } else {
                // Lines differ
                diffs.push({
                    type: 'modify',
                    lineNumber: i + 1,
                    lines: [newLines[j]]
                });
                i++;
                j++;
            }
        }
        
        return diffs;
    }

    /**
     * Insert line with animation
     */
    private async insertLineWithAnimation(lineNumber: number, content: string): Promise<void> {
        if (!this.editor) return;
        
        // Insert empty line
        this.editor.executeEdits('autonomous-insert', [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            text: '\n'
        }]);
        
        // Type content
        for (let i = 0; i < content.length; i++) {
            this.editor.executeEdits('autonomous-type', [{
                range: new monaco.Range(lineNumber, i + 1, lineNumber, i + 1),
                text: content[i]
            }]);
            await this.delay(this.typingSpeed);
        }
    }

    /**
     * Remove line with animation
     */
    private async removeLineWithAnimation(lineNumber: number): Promise<void> {
        if (!this.editor) return;
        
        const model = this.editor.getModel();
        if (!model) return;
        
        const lineContent = model.getLineContent(lineNumber);
        
        // Delete character by character
        for (let i = lineContent.length; i > 0; i--) {
            this.editor.executeEdits('autonomous-delete', [{
                range: new monaco.Range(lineNumber, i, lineNumber, i + 1),
                text: ''
            }]);
            await this.delay(this.typingSpeed / 2);
        }
        
        // Remove the line itself
        this.editor.executeEdits('autonomous-delete-line', [{
            range: new monaco.Range(lineNumber, 1, lineNumber + 1, 1),
            text: ''
        }]);
    }

    /**
     * Benchmark comparison between old and new code
     */
    private async benchmarkComparison(filePath: string, oldCode: string, newCode: string): Promise<void> {
        try {
            // Create temporary files
            const oldFile = `${filePath}.old.tmp`;
            const newFile = `${filePath}.new.tmp`;
            
            await this.fileOperations.writeFile(oldFile, oldCode);
            await this.fileOperations.writeFile(newFile, newCode);
            
            // Run simple benchmark
            const oldTime = await this.measureExecutionTime(oldFile);
            const newTime = await this.measureExecutionTime(newFile);
            
            // Clean up temp files
            await this.fileOperations.deleteFile(oldFile);
            await this.fileOperations.deleteFile(newFile);
            
            if (oldTime > 0 && newTime > 0) {
                const improvement = ((oldTime - newTime) / oldTime * 100).toFixed(2);
                console.log(`⚡ Performance improvement: ${improvement}%`);
                this.showNotification(`⚡ Performance improved by ${improvement}%`, 'success');
            }
        } catch (error) {
            console.log('Could not benchmark performance');
        }
    }

    /**
     * Measure execution time of a Python file
     */
    private async measureExecutionTime(filePath: string): Promise<number> {
        const startTime = Date.now();
        await this.executeInTerminal(`python "${filePath}"`);
        return Date.now() - startTime;
    }

    /**
     * Record auto-fix for history
     */
    private recordAutoFix(filePath: string, line: number, issue: string, source: string): void {
        this.autoFixHistory.push({
            filePath,
            line,
            issue,
            source,
            timestamp: Date.now()
        });
        
        // Keep only last 100 fixes
        if (this.autoFixHistory.length > 100) {
            this.autoFixHistory.shift();
        }
    }

    /**
     * AI Code Generation wrapper
     */
    private async generateCodeWithAI(prompt: string): Promise<string | null> {
        try {
            if (this.aiAssistant && typeof this.aiAssistant.generateCode === 'function') {
                return await this.aiAssistant.generateCode(prompt);
            } else if (this.aiAssistant && typeof this.aiAssistant.sendMessage === 'function') {
                const response = await this.aiAssistant.sendMessage(prompt);
                return this.extractCodeFromResponse(response);
            } else {
                // Use callGenericAPI if available
                if (typeof (window as any).callGenericAPI === 'function') {
                    const response = await (window as any).callGenericAPI(prompt);
                    return this.extractCodeFromResponse(response);
                }
                
                // Fallback to mock
                return this.generateMockCode(prompt);
            }
        } catch (error) {
            console.error('AI code generation failed:', error);
            return null;
        }
    }

    /**
     * Extract code from AI response
     */
    private extractCodeFromResponse(response: string): string {
        // Look for code blocks
        const codeBlockMatch = response.match(/```python\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1];
        }
        
        const genericCodeMatch = response.match(/```\n([\s\S]*?)\n```/);
        if (genericCodeMatch) {
            return genericCodeMatch[1];
        }
        
        return response;
    }

    /**
     * Mock code generation for testing
     */
    private generateMockCode(prompt: string): string {
        if (prompt.includes('factorial')) {
            return `def factorial(n: int) -> int:
    """Calculates factorial of a number.
    
    Args:
        n: Number to calculate factorial for
        
    Returns:
        Factorial of n
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n <= 1:
        return 1
    return n * factorial(n - 1)`;
        }
        
        return `# Generated code\ndef generated_function():\n    pass`;
    }

    /**
     * Terminal execution wrapper
     */
    private async executeInTerminal(command: string): Promise<{stdout: string, stderr: string, exitCode: number}> {
        try {
            if (this.terminal && typeof this.terminal.executeCommand === 'function') {
                return await this.terminal.executeCommand(command);
            } else {
                console.log(`🖥️ Mock terminal: ${command}`);
                return {
                    stdout: 'Mock output',
                    stderr: '',
                    exitCode: 0
                };
            }
        } catch (error) {
            return {
                stdout: '',
                stderr: error.message,
                exitCode: 1
            };
        }
    }

    /**
     * Utility methods
     */
    private parseParams(paramString: string): string[] {
        return paramString
            .split(',')
            .map(p => p.trim().replace(/['"]/g, ''));
    }

    private getLineNumber(content: string, position: number): number {
        return content.substring(0, position).split('\n').length;
    }

    private async insertCodeAfterDecorator(filePath: string, match: AutonomousMatch, code: string): Promise<void> {
        const content = await this.fileOperations.readFile(filePath);
        const lines = content.split('\n');
        
        lines.splice(match.lineNumber, 0, '', code, '');
        
        const newContent = lines.join('\n');
        await this.fileOperations.writeFile(filePath, newContent);
        
        console.log(`📝 Code inserted after decorator on line ${match.lineNumber}`);
    }

    private async runQuickTest(filePath: string, functionName: string): Promise<void> {
        const testCode = `
import sys
import os
sys.path.insert(0, os.path.dirname('${filePath}'))
from ${filePath.replace(/^.*[/\\]/, '').replace('.py', '')} import ${functionName}

try:
    print(f"✅ Function '{functionName}' imported successfully")
    # Try to get function info
    import inspect
    sig = inspect.signature(${functionName})
    print(f"Signature: {sig}")
except Exception as e:
    print(f"❌ Error: {e}")
`;
        
        await this.executeInTerminal(`python -c "${testCode}"`);
    }

    private async createBackup(filePath: string): Promise<void> {
        try {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            const originalContent = await this.fileOperations.readFile(filePath);
            await this.fileOperations.writeFile(backupPath, originalContent);
            console.log(`💾 Backup created: ${backupPath}`);
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    }

    private showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        if (typeof (window as any).showNotification === 'function') {
            (window as any).showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get auto-fix history
     */
    public getAutoFixHistory(): AutoFixEntry[] {
        return [...this.autoFixHistory];
    }

    /**
     * Clear auto-fix history
     */
    public clearAutoFixHistory(): void {
        this.autoFixHistory = [];
    }
}

// Types
interface AutonomousMatch {
    type: string;
    params: string;
    position: number;
    fullMatch: string;
    lineNumber: number;
}

interface ErrorInfo {
    line: number;
    description: string;
    fix: string;
}

interface CodeIssue {
    type: 'syntax' | 'logical' | 'style';
    line: number;
    description: string;
    severity: 'error' | 'warning';
    fix: string;
}

interface DiffEntry {
    type: 'add' | 'remove' | 'modify';
    lineNumber: number;
    lines: string[];
}

interface AutoFixEntry {
    filePath: string;
    line: number;
    issue: string;
    source: string;
    timestamp: number;
}

// Integration with your existing IDE
export class AutonomousIntegration {
    private autonomousSystem: PythonAutonomousSystem;
    private isWatching: boolean = false;
    private debounceTimeout: NodeJS.Timeout | null = null;

    constructor(aiAssistant: any, fileOperations: any, terminal: any) {
        this.autonomousSystem = new PythonAutonomousSystem(
            aiAssistant, 
            fileOperations, 
            terminal
        );
    }

    /**
     * Start watching for autonomous decorators
     */
    startAutonomousMode(): void {
        this.isWatching = true;
        this.autonomousSystem.setAutoFixEnabled(true);
        console.log('🤖 Autonomous Python mode activated with auto-fix!');
        
        this.watchFileChanges();
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('autonomous-mode-changed', {
            detail: { active: true }
        }));
        
        // Update global flag
        (window as any).__isAutonomousModeActive = true;
    }

    /**
     * Stop autonomous mode
     */
    stopAutonomousMode(): void {
        this.isWatching = false;
        this.autonomousSystem.setAutoFixEnabled(false);
        console.log('🛑 Autonomous Python mode deactivated');
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('autonomous-mode-changed', {
            detail: { active: false }
        }));
        
        // Update global flag
        (window as any).__isAutonomousModeActive = false;
    }

    /**
     * Check if autonomous mode is active
     */
    isActive(): boolean {
        return this.isWatching;
    }

    /**
     * Watch for file changes
     */
    private watchFileChanges(): void {
        // Listen to file save events
        document.addEventListener('fileSaved', async (event: any) => {
            if (!this.isWatching) return;
            
            const filePath = event.detail?.filePath;
            if (filePath && filePath.endsWith('.py')) {
                console.log(`📁 File saved: ${filePath}, checking for decorators...`);
                await this.autonomousSystem.processAutonomousDecorators(filePath);
            }
        });
        
        // Listen for editor content changes
        document.addEventListener('editorContentChanged', async (event: any) => {
            if (!this.isWatching) return;
            
            const filePath = event.detail?.filePath;
            if (filePath && filePath.endsWith('.py')) {
                this.debounceProcess(filePath);
            }
        });
    }

    /**
     * Process current file manually
     */
    async processCurrentFile(filePath?: string): Promise<void> {
        if (!filePath) {
            const activeTab = (window as any).tabManager?.getActiveTab();
            filePath = activeTab?.path;
        }
        
        if (filePath && filePath.endsWith('.py')) {
            await this.autonomousSystem.processAutonomousDecorators(filePath);
        } else {
            throw new Error('No Python file is currently open');
        }
    }

    /**
     * Get autonomous system instance
     */
    getAutonomousSystem(): PythonAutonomousSystem {
        return this.autonomousSystem;
    }

    /**
     * Debounced processing
     */
    private debounceProcess(filePath: string): void {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.debounceTimeout = setTimeout(async () => {
            try {
                await this.autonomousSystem.processAutonomousDecorators(filePath);
            } catch (error) {
                console.error('Debounced processing failed:', error);
            }
        }, 3000);
    }
}

/**
 * Factory function for initialization
 */
export function initializeAutonomousCoding(
    aiAssistant: any, 
    fileOperations: any, 
    terminal: any
): AutonomousIntegration {
    console.log('🏭 Initializing Autonomous Coding Integration with Auto-Fix...');
    
    const integration = new AutonomousIntegration(aiAssistant, fileOperations, terminal);
    
    // Make available globally
    (window as any).__autonomousCoding = {
        integration,
        system: integration.getAutonomousSystem()
    };
    
    console.log('✅ Autonomous Coding Integration initialized with Auto-Fix support');
    return integration;
}