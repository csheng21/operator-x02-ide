// svnAIDiffAnalyzer.ts - AI-Powered Diff Analysis Service

import { callGenericAPI } from '../aiAssistant/apiProviderManager';

export interface DiffAnalysis {
    summary: string;
    explanation: string;
    purpose: string;
    potentialIssues: string[];
    suggestions: string[];
    codeQuality: {
        score: number; // 0-100
        aspects: {
            readability: number;
            maintainability: number;
            performance: number;
            security: number;
        };
        comments: string;
    };
    nextSteps: string[];
}

// ✨ NEW: Multi-file analysis interface
export interface FileChange {
    fileName: string;
    filePath: string;
    diffContent: string;
}

export interface MultiFileAnalysis {
    overallSummary: string;
    totalChanges: {
        filesModified: number;
        linesAdded: number;
        linesDeleted: number;
    };
    fileAnalyses: Array<{
        fileName: string;
        whatChanged: string;
        why: string;
        how: string;
        quality: {
            score: number;
            concerns: string[];
        };
    }>;
    relationships: Array<{
        files: string[];
        relationship: string;
        impact: string;
    }>;
    overallPurpose: string;
    crossFileIssues: string[];
    recommendations: string[];
}

class SvnAIDiffAnalyzer {
    /**
     * ✨ NEW: Analyze multiple files and their relationships
     */
    async analyzeMultipleFiles(fileChanges: FileChange[]): Promise<MultiFileAnalysis> {
        console.log('🤖 Multi-File AI Analysis: Starting for', fileChanges.length, 'files');

        const prompt = this.buildMultiFilePrompt(fileChanges);
        
        try {
            const response = await callGenericAPI(prompt);

            console.log('✅ Multi-File AI Analysis complete');
            return this.parseMultiFileResponse(response, fileChanges);

        } catch (error) {
            console.error('❌ Multi-File AI Analysis failed:', error);
            return this.getFallbackMultiFileAnalysis(fileChanges);
        }
    }

    /**
     * Analyze a diff and provide AI-powered insights
     */
    async analyzeDiff(
        fileName: string,
        diffContent: string,
        fullContext?: string
    ): Promise<DiffAnalysis> {
        console.log('🤖 AI Diff Analysis: Starting for', fileName);

        const prompt = this.buildAnalysisPrompt(fileName, diffContent, fullContext);
        
        try {
            const response = await callGenericAPI(prompt);

            console.log('✅ AI Analysis complete');
            return this.parseAnalysisResponse(response);

        } catch (error) {
            console.error('❌ AI Analysis failed:', error);
            return this.getFallbackAnalysis(fileName, diffContent);
        }
    }

    /**
     * Build the AI prompt for diff analysis
     */
    private buildAnalysisPrompt(fileName: string, diffContent: string, fullContext?: string): string {
        return `You are a senior code reviewer analyzing a code change. Analyze the following diff and provide detailed insights.

FILE: ${fileName}

DIFF:
\`\`\`diff
${diffContent}
\`\`\`

${fullContext ? `FULL FILE CONTEXT:\n\`\`\`\n${fullContext}\n\`\`\`\n` : ''}

Please analyze this change and respond in the following JSON format:

{
  "summary": "One-sentence summary of what changed",
  "explanation": "Detailed explanation of the changes (2-3 sentences)",
  "purpose": "The likely purpose or intent of these changes",
  "potentialIssues": [
    "Issue 1",
    "Issue 2"
  ],
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "codeQuality": {
    "score": 85,
    "aspects": {
      "readability": 90,
      "maintainability": 85,
      "performance": 80,
      "security": 90
    },
    "comments": "Overall quality assessment"
  },
  "nextSteps": [
    "Next step 1",
    "Next step 2"
  ]
}

Focus on:
1. What actually changed (be specific)
2. Why this change was likely made
3. Any bugs, security issues, or code smells
4. Suggestions for improvement
5. What should be done next (tests, documentation, etc.)

Respond ONLY with valid JSON. Do not include any text outside the JSON object.`;
    }

    /**
     * Parse AI response into DiffAnalysis object
     */
    private parseAnalysisResponse(response: string): DiffAnalysis {
        try {
            // Remove markdown code blocks if present
            let cleaned = response.trim();
            cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            const parsed = JSON.parse(cleaned);
            
            // Validate and return
            return {
                summary: parsed.summary || 'No summary available',
                explanation: parsed.explanation || 'No explanation available',
                purpose: parsed.purpose || 'Purpose unclear',
                potentialIssues: Array.isArray(parsed.potentialIssues) ? parsed.potentialIssues : [],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                codeQuality: {
                    score: parsed.codeQuality?.score || 75,
                    aspects: {
                        readability: parsed.codeQuality?.aspects?.readability || 75,
                        maintainability: parsed.codeQuality?.aspects?.maintainability || 75,
                        performance: parsed.codeQuality?.aspects?.performance || 75,
                        security: parsed.codeQuality?.aspects?.security || 75
                    },
                    comments: parsed.codeQuality?.comments || 'No quality comments'
                },
                nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.log('Raw response:', response);
            throw error;
        }
    }

    /**
     * Provide basic analysis when AI fails
     */
    private getFallbackAnalysis(fileName: string, diffContent: string): DiffAnalysis {
        const addedLines = (diffContent.match(/^\+/gm) || []).length;
        const removedLines = (diffContent.match(/^-/gm) || []).length;
        
        return {
            summary: `Modified ${fileName} with ${addedLines} additions and ${removedLines} deletions`,
            explanation: 'AI analysis is currently unavailable. This is a basic analysis of the diff statistics.',
            purpose: 'Unable to determine purpose without AI analysis',
            potentialIssues: [
                'AI analysis unavailable - manual review recommended'
            ],
            suggestions: [
                'Review changes manually',
                'Ensure tests are updated',
                'Update documentation if needed'
            ],
            codeQuality: {
                score: 70,
                aspects: {
                    readability: 70,
                    maintainability: 70,
                    performance: 70,
                    security: 70
                },
                comments: 'Manual review required - AI analysis unavailable'
            },
            nextSteps: [
                'Test the changes',
                'Review with team',
                'Update related documentation'
            ]
        };
    }

    /**
     * Quick analysis for multiple files
     */
    async analyzeBatch(files: Array<{ name: string; diff: string }>): Promise<Map<string, DiffAnalysis>> {
        console.log('🤖 Batch Analysis: Starting for', files.length, 'files');
        
        const results = new Map<string, DiffAnalysis>();
        
        for (const file of files) {
            try {
                const analysis = await this.analyzeDiff(file.name, file.diff);
                results.set(file.name, analysis);
            } catch (error) {
                console.error(`Failed to analyze ${file.name}:`, error);
                results.set(file.name, this.getFallbackAnalysis(file.name, file.diff));
            }
        }
        
        console.log('✅ Batch Analysis complete');
        return results;
    }

    /**
     * ✨ Build prompt for multi-file analysis
     */
    private buildMultiFilePrompt(fileChanges: FileChange[]): string {
        const filesSection = fileChanges.map((file, index) => `
FILE ${index + 1}: ${file.fileName}
Path: ${file.filePath}
Changes:
${file.diffContent}
${'='.repeat(80)}
`).join('\n');

        return `You are analyzing ${fileChanges.length} modified files from an SVN commit.

IMPORTANT: Respond with ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text.

${filesSection}

Analyze ALL these files and provide a comprehensive analysis in this EXACT JSON format:

{
  "overallSummary": "Brief summary of all changes across all files",
  "totalChanges": {
    "filesModified": ${fileChanges.length},
    "linesAdded": 0,
    "linesDeleted": 0
  },
  "fileAnalyses": [
    {
      "fileName": "file1.ts",
      "whatChanged": "Detailed description of what changed in this specific file",
      "why": "Why these changes were made (purpose/motivation)",
      "how": "How the changes work (technical explanation)",
      "quality": {
        "score": 85,
        "concerns": ["List any concerns for this file"]
      }
    }
  ],
  "relationships": [
    {
      "files": ["file1.ts", "file2.ts"],
      "relationship": "How these files relate to each other",
      "impact": "How changes in one affect the other"
    }
  ],
  "overallPurpose": "The overall purpose of all these changes working together",
  "crossFileIssues": ["Issues that span multiple files"],
  "recommendations": ["Recommendations for the entire changeset"]
}

Analyze:
1. For EACH file: What changed, Why, and How
2. Relationships BETWEEN files
3. How changes in different files relate to each other
4. The overall purpose of the changeset
5. Cross-file dependencies and impacts

Response must be valid JSON only.`;
    }

    /**
     * ✨ Parse multi-file analysis response
     */
    private parseMultiFileResponse(response: string, fileChanges: FileChange[]): MultiFileAnalysis {
        try {
            // Clean response
            let cleaned = response.trim();
            cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            const parsed = JSON.parse(cleaned);

            // Count total lines
            let linesAdded = 0;
            let linesDeleted = 0;
            fileChanges.forEach(file => {
                linesAdded += (file.diffContent.match(/^\+/gm) || []).length;
                linesDeleted += (file.diffContent.match(/^-/gm) || []).length;
            });

            return {
                overallSummary: parsed.overallSummary || 'Multiple files modified',
                totalChanges: {
                    filesModified: fileChanges.length,
                    linesAdded,
                    linesDeleted
                },
                fileAnalyses: parsed.fileAnalyses || fileChanges.map(f => ({
                    fileName: f.fileName,
                    whatChanged: 'Changes detected',
                    why: 'Unknown',
                    how: 'See diff',
                    quality: { score: 70, concerns: [] }
                })),
                relationships: parsed.relationships || [],
                overallPurpose: parsed.overallPurpose || 'Code modifications',
                crossFileIssues: parsed.crossFileIssues || [],
                recommendations: parsed.recommendations || []
            };
        } catch (error) {
            console.error('Failed to parse multi-file analysis:', error);
            return this.getFallbackMultiFileAnalysis(fileChanges);
        }
    }

    /**
     * ✨ Fallback for multi-file analysis
     */
    private getFallbackMultiFileAnalysis(fileChanges: FileChange[]): MultiFileAnalysis {
        let linesAdded = 0;
        let linesDeleted = 0;
        
        fileChanges.forEach(file => {
            linesAdded += (file.diffContent.match(/^\+/gm) || []).length;
            linesDeleted += (file.diffContent.match(/^-/gm) || []).length;
        });

        return {
            overallSummary: `Modified ${fileChanges.length} files with ${linesAdded} additions and ${linesDeleted} deletions`,
            totalChanges: {
                filesModified: fileChanges.length,
                linesAdded,
                linesDeleted
            },
            fileAnalyses: fileChanges.map(file => ({
                fileName: file.fileName,
                whatChanged: 'File modified - AI analysis unavailable',
                why: 'Manual review required',
                how: 'See diff for details',
                quality: {
                    score: 70,
                    concerns: ['AI analysis unavailable']
                }
            })),
            relationships: [],
            overallPurpose: 'AI analysis unavailable - manual review recommended',
            crossFileIssues: ['AI analysis unavailable - manual review recommended'],
            recommendations: [
                'Review all changes manually',
                'Test interactions between modified files',
                'Update documentation',
                'Ensure tests cover the changes'
            ]
        };
    }

    /**
     * ✨ Analyze evolution across multiple revisions
     */
    async analyzeRevisionEvolution(revisionData: Array<{
        revision: string;
        date: string;
        author: string;
        message: string;
        diff: string;
    }>, fileName: string): Promise<any> {
        console.log('🧠 Starting revision evolution analysis for:', fileName);
        console.log('📊 Number of revisions to analyze:', revisionData.length);
        console.log('📋 Revision data:', revisionData.map(r => `r${r.revision}`).join(', '));
        
        // Build the prompt for AI
        const revisionSummaries = revisionData.map(r => `
Revision ${r.revision}:
Date: ${new Date(r.date).toLocaleDateString()}
Author: ${r.author}
Message: ${r.message}
Changes:
${r.diff.substring(0, 5000)}${r.diff.length > 5000 ? '...(truncated)' : ''}
---
        `).join('\n');

        const prompt = `Analyze the evolution of ${fileName} across the following ${revisionData.length} revisions:

${revisionSummaries}

IMPORTANT: The diff content may be limited or unavailable. Focus your analysis on:
1. Commit messages and their implications
2. Patterns in the author's development approach
3. Timeline and frequency of changes
4. The progression suggested by commit messages

Provide a comprehensive analysis in JSON format with the following structure:
{
    "overallEvolution": "Summary of how the file evolved from first to last revision based on commit messages",
    "revisionChanges": [
        {
            "revision": "r516",
            "what": "What was changed in this revision (inferred from commit message)",
            "why": "Why these changes were likely made",
            "impact": "Impact on code quality/functionality"
        }
    ],
    "patterns": "Patterns observed across revisions (e.g., progressive refactoring, feature additions, bug fixes)",
    "trajectory": {
        "complexity": "Increasing/Decreasing/Stable",
        "functionality": "Increasing/Decreasing/Stable",
        "quality": "Improving/Degrading/Stable",
        "maintainability": "Improving/Degrading/Stable"
    },
    "improvements": ["List of improvements made across revisions (inferred from messages)"],
    "regressions": ["Any regressions or concerning changes"],
    "predictedNext": "Based on the pattern, predict what the next logical changes might be",
    "recommendations": ["Recommendations for future development"]
}

Focus on:
1. The overall arc of development shown by commit messages
2. Whether code is becoming better (based on message patterns)
3. What the developer seems to be working towards
4. What might come next based on the pattern

Return ONLY valid JSON, no markdown or explanation.`;

        console.log('📝 Prompt length:', prompt.length, 'characters');
        console.log('🚀 Calling AI API...');

        try {
            const response = await callGenericAPI(prompt, {
                temperature: 0.7,
                maxTokens: 8000
            });

            console.log('✅ AI API responded successfully');
            console.log('📦 Response length:', response.length, 'characters');
            console.log('🔍 First 200 chars of response:', response.substring(0, 200));

            const cleanedResponse = response.trim()
                .replace(/^```json\s*/gm, '')
                .replace(/^```\s*/gm, '')
                .trim();

            console.log('🧹 Cleaned response, attempting to parse...');
            
            const parsed = JSON.parse(cleanedResponse);
            console.log('✅ Successfully parsed JSON response');
            
            return parsed;
        } catch (error) {
            console.error('❌ Failed to analyze revision evolution:', error);
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                type: error instanceof Error ? error.constructor.name : typeof error
            });
            
            // Return fallback
            console.log('📋 Returning fallback analysis');
            return this.getFallbackRevisionEvolutionAnalysis(revisionData, fileName);
        }
    }

    /**
     * ✨ Fallback for revision evolution analysis
     */
    private getFallbackRevisionEvolutionAnalysis(revisionData: any[], fileName: string): any {
        return {
            overallEvolution: `The file ${fileName} has undergone ${revisionData.length} revisions. AI analysis is currently unavailable.`,
            revisionChanges: revisionData.map(r => ({
                revision: r.revision,
                what: 'Changes made - AI analysis unavailable',
                why: 'Manual review required',
                impact: 'Unknown'
            })),
            patterns: 'AI analysis unavailable - manual review recommended',
            trajectory: {
                complexity: 'Unknown',
                functionality: 'Unknown',
                quality: 'Unknown',
                maintainability: 'Unknown'
            },
            improvements: ['AI analysis unavailable - please review diffs manually'],
            regressions: [],
            predictedNext: 'Unable to predict without AI analysis',
            recommendations: [
                'Review each revision diff manually',
                'Track changes over time',
                'Ensure code quality is maintained',
                'Document significant changes'
            ]
        };
    }
}

// Export singleton instance
export const svnAIDiffAnalyzer = new SvnAIDiffAnalyzer();