/**
 * 🤖 AI-POWERED SVN FILE ANALYTICS
 * Uses real SVN data + AI to generate insights, patterns, and recommendations
 */

import { svnManager, SvnFileStatus } from './svnManager';
import { svnHistoryManager, SvnLogEntry } from './svnHistoryManager';
import { callGenericAPI } from '../aiAssistant/apiProviderManager';

export interface AIFileAnalytics {
    // Real SVN Data
    filePath: string;
    fileName: string;
    created: Date;
    lastModified: Date;
    totalCommits: number;
    linesAdded: number;
    linesDeleted: number;
    netLines: number;
    fileSize: number;
    
    // Calculated Metrics
    ageInDays: number;
    hoursSinceModified: number;
    avgCommitSize: number;
    churnRate: number;
    activityLevel: 'Low' | 'Medium' | 'High';
    
    // Contributors
    contributors: Array<{author: string; commits: number; percentage: number}>;
    primaryAuthor: string;
    
    // AI-Generated Insights
    aiSummary: string;
    aiPatterns: string[];
    aiRecommendations: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
    codeQualityScore: number; // 0-100
}

export class AIFileAnalyticsGenerator {
    /**
     * Generate AI-powered analytics for a file
     */
    async generateAnalytics(filePath: string): Promise<AIFileAnalytics> {
        console.log('🤖 Generating AI-powered analytics for:', filePath);
        
        // Step 1: Get real SVN data
        const svnData = await this.getRealSVNData(filePath);
        
        // Step 2: Calculate metrics
        const metrics = this.calculateMetrics(svnData);
        
        // Step 3: Use AI to generate insights
        const aiInsights = await this.generateAIInsights(filePath, svnData, metrics);
        
        return {
            ...svnData,
            ...metrics,
            ...aiInsights
        };
    }

    /**
     * Get real data from SVN
     */
    private async getRealSVNData(filePath: string): Promise<Partial<AIFileAnalytics>> {
        try {
            console.log('📊 Getting real SVN data for:', filePath);
            
            // Get file history using svnHistoryManager
            const history = await svnHistoryManager.getFileHistory(filePath, 100);
            
            console.log(`📊 Got ${history?.length || 0} history entries`);
            
            if (!history || history.length === 0) {
                console.warn('⚠️ No history found, returning default data');
                return this.getDefaultData(filePath);
            }

            // Parse history data
            const firstCommit = history[history.length - 1];
            const lastCommit = history[0];
            
            console.log('First commit:', firstCommit);
            console.log('Last commit:', lastCommit);
            
            let totalLinesAdded = 0;
            let totalLinesDeleted = 0;
            const contributorMap = new Map<string, number>();
            
            // Analyze each commit
            for (const commit of history) {
                // Count contributor commits
                const author = commit.author || 'Unknown';
                contributorMap.set(author, (contributorMap.get(author) || 0) + 1);
                
                // Try to get diff for line counts (best effort)
                try {
                    const diff = await svnHistoryManager.getRevisionDiff(commit.revision, filePath);
                    if (diff) {
                        const stats = this.parseDiffStats(diff);
                        totalLinesAdded += stats.added;
                        totalLinesDeleted += stats.deleted;
                    }
                } catch (e) {
                    // Skip if diff fails, not critical
                    console.debug(`Could not get diff for r${commit.revision}`);
                }
            }

            // Build contributors list
            const totalCommits = history.length;
            const contributors = Array.from(contributorMap.entries())
                .map(([author, commits]) => ({
                    author,
                    commits,
                    percentage: (commits / totalCommits) * 100
                }))
                .sort((a, b) => b.commits - a.commits);

            const primaryAuthor = contributors[0]?.author || 'Unknown';

            // Get file info (size)
            let fileSize: number | undefined = undefined;
            try {
                const info = await svnManager.getInfo(filePath);
                fileSize = info?.size || undefined;
            } catch (e) {
                console.debug('Could not get file info');
            }

            const result = {
                filePath,
                fileName: this.getFileName(filePath),
                created: new Date(firstCommit.date),
                lastModified: new Date(lastCommit.date),
                totalCommits: history.length,
                linesAdded: totalLinesAdded > 0 ? totalLinesAdded : undefined,
                linesDeleted: totalLinesDeleted > 0 ? totalLinesDeleted : undefined,
                netLines: totalLinesAdded > 0 ? totalLinesAdded - totalLinesDeleted : undefined,
                fileSize,
                contributors,
                primaryAuthor
            };

            console.log('✅ Successfully got real SVN data:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error getting SVN data:', error);
            return this.getDefaultData(filePath);
        }
    }

    /**
     * Calculate metrics from SVN data
     */
    private calculateMetrics(data: Partial<AIFileAnalytics>): Partial<AIFileAnalytics> {
        const now = Date.now();
        const created = data.created?.getTime();
        const lastModified = data.lastModified?.getTime();
        
        const ageInDays = created ? Math.floor((now - created) / (1000 * 60 * 60 * 24)) : undefined;
        const hoursSinceModified = lastModified ? Math.floor((now - lastModified) / (1000 * 60 * 60)) : undefined;
        
        const totalLines = (data.linesAdded || 0) + (data.linesDeleted || 0);
        const avgCommitSize = (data.totalCommits && totalLines > 0) 
            ? totalLines / data.totalCommits 
            : undefined;
        
        const churnRate = (totalLines > 0 && data.netLines) 
            ? totalLines / Math.max(data.netLines, 1)
            : undefined;
        
        // Activity level based on commits per day
        let activityLevel: 'Low' | 'Medium' | 'High' | undefined = undefined;
        if (data.totalCommits && ageInDays) {
            const commitsPerDay = data.totalCommits / Math.max(ageInDays, 1);
            if (commitsPerDay > 0.1) activityLevel = 'High';
            else if (commitsPerDay > 0.05) activityLevel = 'Medium';
            else activityLevel = 'Low';
        }

        return {
            ageInDays,
            hoursSinceModified,
            avgCommitSize,
            churnRate,
            activityLevel
        };
    }

    /**
     * Generate AI insights using the configured AI provider
     */
    private async generateAIInsights(
        filePath: string, 
        svnData: Partial<AIFileAnalytics>,
        metrics: Partial<AIFileAnalytics>
    ): Promise<Partial<AIFileAnalytics>> {
        try {
            const prompt = this.buildAnalyticsPrompt(filePath, svnData, metrics);
            
            console.log('🤖 Asking AI to analyze file...');
            
            // Use callGenericAPI (same as svnAIDiffAnalyzer)
            const response = await callGenericAPI(prompt);

            // Parse AI response
            const insights = this.parseAIResponse(response);
            
            return insights;
        } catch (error) {
            console.error('Error generating AI insights:', error);
            return this.getDefaultAIInsights();
        }
    }

    /**
     * Build prompt for AI analysis
     */
    private buildAnalyticsPrompt(
        filePath: string,
        svnData: Partial<AIFileAnalytics>,
        metrics: Partial<AIFileAnalytics>
    ): string {
        const dataAvailable = svnData.totalCommits !== undefined;
        
        if (!dataAvailable) {
            return `You are a code analytics expert. The SVN history for this file is unavailable.

FILE: ${filePath}

STATUS: SVN data unavailable or file not in version control

Provide a JSON response with:
{
  "summary": "Brief note that SVN data is unavailable",
  "patterns": ["Pattern based on file name/type if applicable"],
  "recommendations": ["General recommendations for this file type"],
  "riskLevel": "Low",
  "codeQualityScore": 50
}

Keep it brief and note that detailed analysis requires SVN history.
Respond ONLY with valid JSON, no other text.`;
        }

        return `You are a code analytics expert. Analyze this file based on available metrics.

FILE: ${filePath}

AVAILABLE METRICS:
${metrics.ageInDays !== undefined ? `- Age: ${metrics.ageInDays} days` : '- Age: Unknown'}
${metrics.hoursSinceModified !== undefined ? `- Last modified: ${metrics.hoursSinceModified} hours ago` : '- Last modified: Unknown'}
${svnData.totalCommits !== undefined ? `- Total commits: ${svnData.totalCommits}` : '- Total commits: Unknown'}
${svnData.linesAdded !== undefined ? `- Lines added: ${svnData.linesAdded}` : '- Lines added: Unknown'}
${svnData.linesDeleted !== undefined ? `- Lines deleted: ${svnData.linesDeleted}` : '- Lines deleted: Unknown'}
${svnData.netLines !== undefined ? `- Net lines: ${svnData.netLines}` : '- Net lines: Unknown'}
${metrics.avgCommitSize !== undefined ? `- Average commit size: ${metrics.avgCommitSize.toFixed(1)} lines` : '- Average commit size: Unknown'}
${metrics.churnRate !== undefined ? `- Churn rate: ${metrics.churnRate.toFixed(2)}` : '- Churn rate: Unknown'}
${metrics.activityLevel !== undefined ? `- Activity level: ${metrics.activityLevel}` : '- Activity level: Unknown'}
${svnData.primaryAuthor ? `- Primary author: ${svnData.primaryAuthor}` : '- Primary author: Unknown'}
${svnData.contributors?.length ? `- Contributors: ${svnData.contributors.length}` : '- Contributors: Unknown'}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary based on AVAILABLE data only",
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "riskLevel": "Low|Medium|High",
  "codeQualityScore": 0-100
}

IMPORTANT: Base analysis ONLY on available metrics. If many metrics are unknown, acknowledge limited data in your summary.

Consider:
${metrics.churnRate !== undefined ? `- Churn rate (${metrics.churnRate.toFixed(2)}) ${metrics.churnRate > 2 ? 'suggests code instability' : 'appears stable'}` : '- Churn rate unknown'}
${metrics.activityLevel ? `- ${metrics.activityLevel} activity level` : '- Activity level unknown'}
${svnData.contributors?.length ? `- ${svnData.contributors.length} contributors ${svnData.contributors.length === 1 ? '(knowledge concentration risk)' : '(good for knowledge sharing)'}` : '- Contributors unknown'}

Respond ONLY with valid JSON, no other text.`;
    }

    /**
     * Parse AI response to extract insights
     */
    private parseAIResponse(response: string): Partial<AIFileAnalytics> {
        try {
            // Try to extract JSON from response
            let jsonStr = response.trim();
            
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Find JSON object
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            
            const parsed = JSON.parse(jsonStr);
            
            return {
                aiSummary: parsed.summary || 'No summary available',
                aiPatterns: parsed.patterns || [],
                aiRecommendations: parsed.recommendations || [],
                riskLevel: parsed.riskLevel || 'Medium',
                codeQualityScore: parsed.codeQualityScore || 70
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return this.getDefaultAIInsights();
        }
    }

    /**
     * Parse diff to get line statistics
     */
    private parseDiffStats(diff: string): { added: number; deleted: number } {
        const lines = diff.split('\n');
        let added = 0;
        let deleted = 0;

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) added++;
            if (line.startsWith('-') && !line.startsWith('---')) deleted++;
        }

        return { added, deleted };
    }

    /**
     * Get default data when SVN fails
     */
    private getDefaultData(filePath: string): Partial<AIFileAnalytics> {
        const now = new Date();
        return {
            filePath,
            fileName: this.getFileName(filePath),
            created: undefined, // Unknown
            lastModified: undefined, // Unknown
            totalCommits: undefined, // Unknown
            linesAdded: undefined, // Unknown
            linesDeleted: undefined, // Unknown
            netLines: undefined, // Unknown
            fileSize: undefined, // Unknown
            contributors: [], // Unknown
            primaryAuthor: undefined // Unknown
        };
    }

    /**
     * Get default AI insights when AI fails
     */
    private getDefaultAIInsights(): Partial<AIFileAnalytics> {
        return {
            aiSummary: 'AI analysis unavailable. Configure your AI provider in settings to enable AI-powered insights.',
            aiPatterns: [
                'Frequent modifications detected',
                'Active development in progress',
                'Single primary contributor'
            ],
            aiRecommendations: [
                'Consider adding unit tests for stability',
                'Review code for potential refactoring',
                'Add documentation for complex logic'
            ],
            riskLevel: 'Medium',
            codeQualityScore: 70
        };
    }

    /**
     * Get file name from path
     */
    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }
}

// Export singleton instance
export const aiFileAnalytics = new AIFileAnalyticsGenerator();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    (window as any).aiFileAnalytics = aiFileAnalytics;
    console.log('🔍 aiFileAnalytics exposed to window for debugging');
}