/**
 * 🤖 IMPROVED AI Commit Message Generator
 * Generates highly relevant, professional commit messages like a senior developer
 */

import { svnManager, SvnFileStatus } from './svnManager';
import { getCurrentApiConfiguration } from '../../state';

interface CommitMessageFormat {
    category: 'Feature' | 'Improvement' | 'Bug Fix' | 'Refactor' | 'Documentation' | 'Maintenance' | 'Others';
    title: string;
    explanation: string[];
    files?: string[];
}

export class SvnAICommitGenerator {
    private static instance: SvnAICommitGenerator;
    private isGenerating: boolean = false;

    // User can choose their preferred format
    private messageFormat: 'structured' | 'conventional' | 'simple' = 'structured';

    private constructor() {}

    static getInstance(): SvnAICommitGenerator {
        if (!SvnAICommitGenerator.instance) {
            SvnAICommitGenerator.instance = new SvnAICommitGenerator();
        }
        return SvnAICommitGenerator.instance;
    }

    /**
     * Set preferred message format
     */
    setMessageFormat(format: 'structured' | 'conventional' | 'simple'): void {
        this.messageFormat = format;
        console.log('📝 Commit message format set to:', format);
    }

    /**
     * Generate commit message based on file changes
     */
    async generateCommitMessage(files: SvnFileStatus[]): Promise<string> {
        if (this.isGenerating) {
            throw new Error('Already generating a commit message');
        }

        if (files.length === 0) {
            throw new Error('No changes to analyze');
        }

        this.isGenerating = true;

        try {
            // Get API configuration
            const apiConfig = getCurrentApiConfiguration();
            if (!apiConfig || !apiConfig.apiKey) {
                throw new Error('Please configure AI provider in settings first');
            }

            // Analyze changes with better context
            const changesSummary = await this.analyzeChanges(files);

            // Generate commit message using AI
            const commitMessage = await this.callAI(changesSummary, apiConfig);

            return commitMessage;

        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Analyze SVN changes and create intelligent summary for AI
     */
    private async analyzeChanges(files: SvnFileStatus[]): Promise<string> {
        const summary: string[] = [];

        // Categorize changes
        const modified = files.filter(f => f.status === 'M');
        const added = files.filter(f => f.status === 'A');
        const deleted = files.filter(f => f.status === 'D');

        // Detect change patterns
        const patterns = this.detectChangePatterns(files);
        
        // Add focused context
        summary.push('=== CODE CHANGES ANALYSIS ===');
        summary.push('');
        summary.push(`📊 Files Changed: ${files.length} total`);
        summary.push(`   - ${modified.length} modified (M)`);
        summary.push(`   - ${added.length} added (A)`);
        summary.push(`   - ${deleted.length} deleted (D)`);
        summary.push('');

        // Add intelligent context about what type of work this is
        if (patterns.length > 0) {
            summary.push('🎯 Detected Changes:');
            patterns.forEach(pattern => summary.push(`   ${pattern}`));
            summary.push('');
        }

        // Analyze file types and their context
        const fileContext = this.analyzeFileContext(files);
        if (fileContext.length > 0) {
            summary.push('📁 Affected Areas:');
            fileContext.forEach(context => summary.push(`   ${context}`));
            summary.push('');
        }

        // ✅ NEW: Detailed per-file analysis (all files, not just 3)
        summary.push('📝 DETAILED FILE-BY-FILE CHANGES:');
        summary.push('');

        // Analyze each modified/added file
        const filesToAnalyze = [...modified, ...added];
        
        for (const file of filesToAnalyze) {
            const fileName = file.path.split(/[\\/]/).pop() || file.path;
            summary.push(`━━━ ${fileName} (${file.status === 'M' ? 'Modified' : 'Added'}) ━━━`);
            summary.push(`Full Path: ${file.path}`);
            
            try {
                const diff = await svnManager.getDiff(file.path);
                
                if (diff && diff.length > 0) {
                    // Get line statistics
                    const diffLines = diff.split('\n');
                    const addedLines = diffLines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
                    const removedLines = diffLines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;
                    
                    summary.push(`Lines Changed: +${addedLines} / -${removedLines}`);
                    
                    // Extract meaningful code changes
                    const meaningfulChanges = this.extractMeaningfulChanges(diff);
                    if (meaningfulChanges.length > 0) {
                        summary.push('Key Changes Detected:');
                        meaningfulChanges.forEach(change => summary.push(`  • ${change}`));
                    }
                    
                    // Include relevant code sample (first 20 lines of diff)
                    const relevantDiff = diffLines
                        .filter(l => l.startsWith('+') || l.startsWith('-'))
                        .filter(l => !l.startsWith('+++') && !l.startsWith('---'))
                        .slice(0, 20)
                        .join('\n');
                    
                    if (relevantDiff) {
                        summary.push('Code Sample:');
                        summary.push(relevantDiff);
                    }
                } else {
                    summary.push('Status: New file or binary file');
                }
            } catch (error) {
                summary.push(`Status: Unable to analyze (${error})`);
            }
            
            summary.push('');
        }

        // List deleted files
        if (deleted.length > 0) {
            summary.push('🗑️ DELETED FILES:');
            deleted.forEach(f => {
                const fileName = f.path.split(/[\\/]/).pop() || f.path;
                summary.push(`   ${fileName} (${f.path})`);
            });
            summary.push('');
        }

        // Add summary instruction for AI
        summary.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        summary.push('INSTRUCTIONS FOR COMMIT MESSAGE:');
        summary.push('1. Write an "Overall Purpose" that explains the main goal');
        summary.push('2. List each file with SPECIFIC changes made to that file');
        summary.push('3. Explain WHY each change was needed, not just what changed');
        summary.push('4. Be concise but informative');
        summary.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return summary.join('\n');
    }

    /**
     * Detect patterns in changes to understand the type of work
     */
    private detectChangePatterns(files: SvnFileStatus[]): string[] {
        const patterns: string[] = [];
        const paths = files.map(f => f.path.toLowerCase());
        const fileNames = files.map(f => f.path.split(/[\\/]/).pop()?.toLowerCase() || '');

        // Detect UI/styling changes
        if (paths.some(p => p.includes('.css') || p.includes('.scss') || p.includes('style'))) {
            patterns.push('UI/Styling updates');
        }

        // Detect new feature (multiple new files)
        if (files.filter(f => f.status === 'A').length >= 2) {
            patterns.push('New feature implementation');
        }

        // Detect refactoring (many modifications, few additions)
        const modRatio = files.filter(f => f.status === 'M').length / files.length;
        if (modRatio > 0.7 && files.length >= 3) {
            patterns.push('Code refactoring');
        }

        // Detect configuration changes
        if (fileNames.some(n => n.includes('config') || n.includes('.json') || n.includes('.yml'))) {
            patterns.push('Configuration update');
        }

        // Detect documentation
        if (fileNames.some(n => n.includes('readme') || n.includes('.md') || n.includes('doc'))) {
            patterns.push('Documentation update');
        }

        // Detect testing
        if (fileNames.some(n => n.includes('test') || n.includes('spec'))) {
            patterns.push('Test updates');
        }

        // Detect API/backend changes
        if (paths.some(p => p.includes('api') || p.includes('service') || p.includes('controller'))) {
            patterns.push('API/Backend changes');
        }

        // Detect database/migration
        if (paths.some(p => p.includes('migration') || p.includes('schema') || p.includes('model'))) {
            patterns.push('Database/Schema update');
        }

        return patterns;
    }

    /**
     * Analyze file context to understand what areas are affected
     */
    private analyzeFileContext(files: SvnFileStatus[]): string[] {
        const contexts: Set<string> = new Set();
        
        files.forEach(file => {
            const path = file.path.toLowerCase();
            const fileName = file.path.split(/[\\/]/).pop()?.toLowerCase() || '';
            
            // Identify component/module from path
            const pathParts = file.path.split(/[\\/]/);
            if (pathParts.length > 1) {
                // Get meaningful parent directory
                const meaningfulDir = pathParts[pathParts.length - 2];
                if (meaningfulDir && !['src', 'lib', 'app', 'components'].includes(meaningfulDir.toLowerCase())) {
                    contexts.add(`${meaningfulDir} module`);
                }
            }

            // Detect specific areas
            if (path.includes('auth')) contexts.add('Authentication system');
            if (path.includes('user')) contexts.add('User management');
            if (path.includes('payment')) contexts.add('Payment processing');
            if (path.includes('admin')) contexts.add('Admin panel');
            if (path.includes('dashboard')) contexts.add('Dashboard');
            if (path.includes('api')) contexts.add('API layer');
            if (path.includes('database') || path.includes('db')) contexts.add('Database');
            if (path.includes('ui') || path.includes('component')) contexts.add('UI components');
            
            // File-type based context
            const ext = fileName.split('.').pop();
            if (ext === 'css' || ext === 'scss') contexts.add('Styling');
            if (fileName.includes('test') || fileName.includes('spec')) contexts.add('Tests');
            if (fileName.includes('config')) contexts.add('Configuration');
        });

        return Array.from(contexts);
    }

    /**
     * Extract meaningful changes from diff (function names, important additions)
     */
    private extractMeaningfulChanges(diff: string): string[] {
        const changes: string[] = [];
        const lines = diff.split('\n');
        
        // Look for function/method definitions
        const functionPattern = /(function|const|let|var|class|interface|type|async|export)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip unchanged and removed lines
            if (!trimmed.startsWith('+') || trimmed.startsWith('+++')) continue;
            
            const codeLine = trimmed.substring(1).trim();
            
            // Detect new functions
            const funcMatch = codeLine.match(functionPattern);
            if (funcMatch) {
                changes.push(`Added ${funcMatch[1]} ${funcMatch[2]}`);
                if (changes.length >= 3) break;
            }
            
            // Detect imports/exports
            if (codeLine.startsWith('import ') || codeLine.startsWith('export ')) {
                const importMatch = codeLine.match(/import.*from ['"](.+)['"]/);
                if (importMatch) {
                    changes.push(`Imported ${importMatch[1]}`);
                    if (changes.length >= 3) break;
                }
            }
            
            // Detect component definitions (React/Vue)
            if (codeLine.includes('component') || codeLine.includes('Component')) {
                changes.push('Added/modified component');
                if (changes.length >= 3) break;
            }
        }
        
        return changes.slice(0, 3); // Limit to 3 meaningful changes
    }

    /**
     * Format file list compactly
     */
    private formatFileList(files: SvnFileStatus[], limit: number): string {
        const fileNames = files.slice(0, limit).map(f => f.path.split(/[\\/]/).pop()).join(', ');
        const extra = files.length > limit ? ` (+${files.length - limit} more)` : '';
        return fileNames + extra;
    }

    /**
     * Analyze file types to help determine commit category
     */
    private analyzeFileTypes(files: SvnFileStatus[]): Record<string, number> {
        const types: Record<string, number> = {};

        files.forEach(file => {
            const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown';
            
            // Group by meaningful categories
            let category = 'Other';
            if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) category = 'Code';
            else if (['css', 'scss', 'less', 'sass'].includes(ext)) category = 'Styles';
            else if (['html', 'htm'].includes(ext)) category = 'Templates';
            else if (['json', 'yaml', 'yml', 'xml'].includes(ext)) category = 'Config';
            else if (['md', 'txt', 'doc', 'docx'].includes(ext)) category = 'Documentation';
            else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'].includes(ext)) category = 'Assets';
            else if (['test.ts', 'test.js', 'spec.ts', 'spec.js'].some(test => file.path.includes(test))) category = 'Tests';
            
            types[category] = (types[category] || 0) + 1;
        });

        return types;
    }

    /**
     * Build IMPROVED AI prompt with better instructions
     */
    private buildPrompt(changesSummary: string): string {
        const baseInstructions = `You are a senior software developer writing a commit message. Your message should be:
- Professional and concise
- Focused on WHAT changed and WHY (not HOW)
- Written as if explaining to a team member
- Free of unnecessary technical jargon

Analyze the code changes below and write a clear, relevant commit message.`;

        if (this.messageFormat === 'structured') {
            return `${baseInstructions}

**FORMAT REQUIREMENTS:**

[CATEGORY]: Clear, specific title (max 60 chars)

Overall Purpose:
- Main goal or reason for this commit

Changes by File:
- filename.ext: Specific change made and why
- filename2.ext: Specific change made and why
- (continue for each file, max 5)

**IMPORTANT:**
- If 1 file changed: Focus on that file's changes
- If 2+ files changed: Provide "Overall Purpose" + individual file breakdown
- Each file bullet should explain WHAT changed in that specific file and WHY

**CATEGORIES:**
- Feature: New functionality added
- Improvement: Enhancement to existing feature  
- Bug Fix: Fixed a specific bug/issue
- Refactor: Code restructure (no behavior change)
- Docs: Documentation or comments
- Build: Dependencies, config, tooling
- Style: UI/CSS changes

**CRITICAL RULES:**
1. Title must describe the main change specifically (not "update files" or "various changes")
2. Use present tense: "Add feature" not "Added feature"
3. Be specific about each file's purpose
4. Explain WHY each change was needed, not just what was changed
5. If refactoring, mention the benefit
6. If fixing a bug, mention what was broken
7. Focus on user-facing or developer-relevant impact

**EXAMPLE FOR SINGLE FILE:**

Improvement: Optimize SVN status detection

Overall Purpose:
- Reduce CPU usage during continuous file monitoring

Changes by File:
- svnAutoDetector.ts: Reduced polling interval from 500ms to 2s and added result caching to minimize redundant filesystem checks

---

**EXAMPLE FOR MULTIPLE FILES:**

Feature: Add selective file commit functionality

Overall Purpose:
- Allow users to choose specific files to commit instead of committing all changes at once

Changes by File:
- svnUIEnhanced.ts: Added checkbox selection logic, event handlers for file/group selection, and modified commit to only process selected files
- svnUIEnhanced.css: Added checkbox styling, selected state indicators, and compact layout for better file list presentation

---

**EXAMPLE FOR BUG FIX:**

Bug Fix: Resolve commit button state synchronization

Overall Purpose:
- Fix issue where commit button remained disabled even after selecting files

Changes by File:
- svnUIEnhanced.ts: Fixed updateSelectionDisplay() to properly update button disabled state based on selectedFiles.size
- svnUIEnhanced.css: Updated button disabled opacity to provide clearer visual feedback

---

**NOW ANALYZE:**

${changesSummary}

**WRITE COMMIT MESSAGE (follow format exactly, include per-file breakdown if multiple files):**`;
        }

        if (this.messageFormat === 'conventional') {
            return `${baseInstructions}

**FORMAT:** Conventional Commits

<type>(<scope>): <description>

Overall:
- Main purpose of this commit

Files:
- filename.ext: specific change and reason
- filename2.ext: specific change and reason

**TYPES:** feat, fix, refactor, docs, style, test, build, ci, perf, chore

**RULES:**
1. Description: lowercase, present tense, max 60 chars, no period
2. Scope: specific module/component (optional)
3. Overall: One line explaining the main goal
4. Files: Break down changes per file with WHY (max 5 files)
5. Be specific about each file's changes

**EXAMPLE FOR MULTIPLE FILES:**

feat(svn): add selective file commit

Overall:
- Enable users to select specific files for commit instead of committing everything

Files:
- svnUIEnhanced.ts: Added checkbox selection state management, event handlers, and filtered commit to selected files only
- svnUIEnhanced.css: Implemented checkbox styling with checked/unchecked states and selection highlights

---

**EXAMPLE FOR SINGLE FILE:**

fix(ui): resolve button disabled state

Overall:
- Fix commit button not enabling when files are selected

Files:
- svnUIEnhanced.ts: Corrected updateSelectionDisplay() to update button state based on actual selection count

---

**ANALYZE:**

${changesSummary}

**GENERATE (include per-file breakdown):**`;
        }

        // Simple format
        return `${baseInstructions}

**FORMAT:** Simple and professional

[Clear description of main change]

Purpose:
- Main goal of this commit

Files Changed:
- filename.ext: What changed and why
- filename2.ext: What changed and why
- (list all files with specific changes, max 5)

**RULES:**
1. First line: Specific, present tense, max 60 chars
2. Purpose: One clear line explaining the overall goal
3. Files: Break down each file's specific changes with reasons
4. Be concrete: explain WHAT and WHY for each file

**EXAMPLE FOR MULTIPLE FILES:**

Add selective file commit functionality

Purpose:
- Enable users to choose which files to commit rather than committing all changes

Files Changed:
- svnUIEnhanced.ts: Implemented checkbox selection tracking, click handlers, and modified commit method to filter selected files
- svnUIEnhanced.css: Added checkbox UI elements, selection highlighting, and compact file list styling

---

**EXAMPLE FOR SINGLE FILE:**

Optimize SVN status detection performance

Purpose:
- Reduce CPU usage during continuous file system monitoring

Files Changed:
- svnAutoDetector.ts: Increased polling interval and added 2-second result caching to minimize redundant checks

---

**ANALYZE:**

${changesSummary}

**GENERATE (include per-file breakdown):**`;
    }

    /**
     * Call AI API (compatible with multiple providers)
     */
    private async callAIApi(prompt: string, config: any): Promise<string> {
        const url = `${config.apiBaseUrl}/chat/completions`;

        const requestBody = {
            model: config.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior software developer who writes clear, specific, professional commit messages. Always be relevant and avoid generic descriptions. Focus on what changed and why it matters.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: config.maxTokens || 350,
            temperature: 0.5 // Lower for more focused, consistent output
        };

        console.log('📤 Sending request to:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data.choices[0].message?.content || data.choices[0].text || '';
        }

        throw new Error('Unexpected API response format');
    }

    /**
     * Call AI to generate commit message
     */
    private async callAI(changesSummary: string, apiConfig: any): Promise<string> {
        const prompt = this.buildPrompt(changesSummary);

        console.log('🤖 Calling AI to generate commit message...');
        console.log('Provider:', apiConfig.provider);
        console.log('Model:', apiConfig.model);
        console.log('Format:', this.messageFormat);

        try {
            const response = await this.callAIApi(prompt, apiConfig);
            const commitMessage = this.extractCommitMessage(response);
            
            console.log('✅ AI generated commit message:', commitMessage);
            return commitMessage;

        } catch (error) {
            console.error('❌ AI API call failed:', error);
            throw new Error('Failed to generate commit message: ' + error);
        }
    }

    /**
     * Extract clean commit message from AI response
     */
    private extractCommitMessage(response: string): string {
        // Remove markdown code blocks
        let message = response
            .replace(/```[a-z]*\n?/g, '')
            .replace(/\*\*/g, '')
            .trim();

        // Remove common AI response prefixes
        message = message
            .replace(/^(commit message:|message:|here's the commit message:|here is the commit message:|here's a commit message:|generated commit message:)/i, '')
            .trim();

        // If message has example separator or analysis, remove it
        if (message.includes('---')) {
            message = message.split('---')[0].trim();
        }
        
        if (message.includes('ANALYSIS:') || message.includes('Analysis:')) {
            message = message.split(/ANALYSIS:|Analysis:/i)[0].trim();
        }

        // Clean up extra whitespace but preserve structure
        message = message.replace(/\n{3,}/g, '\n\n');
        
        // Ensure proper spacing after category/type
        message = message.replace(/^([A-Za-z\s]+:)([^\n])/, '$1 $2');

        return message;
    }

    /**
     * Check if currently generating
     */
    isCurrentlyGenerating(): boolean {
        return this.isGenerating;
    }

    /**
     * Get current message format
     */
    getMessageFormat(): string {
        return this.messageFormat;
    }
}

// Export singleton instance
export const svnAICommitGenerator = SvnAICommitGenerator.getInstance();

// Expose to window for easy format switching
if (typeof window !== 'undefined') {
    (window as any).svnAICommitGenerator = svnAICommitGenerator;
    (window as any).setCommitFormat = (format: 'structured' | 'conventional' | 'simple') => {
        svnAICommitGenerator.setMessageFormat(format);
        console.log('✅ Commit format changed to:', format);
    };
}