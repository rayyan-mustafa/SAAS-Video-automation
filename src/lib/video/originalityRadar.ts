import { getDb } from '../db';
import { NARRATIVE_FRAMEWORKS } from '../providers/personalCreatorScriptService';

export interface OriginalityCheckResult {
  passed: boolean;
  maxSimilarity: number;
  matchedProjectId?: string;
  matchedTitle?: string;
  alert?: string;
  frameworkRotation: {
    framework: string;
    recentlyUsedCount: number;
    recommendedFrameworks: string[];
    isWellRotated: boolean;
    recommendation: string;
  };
}

export class OriginalityRadar {
  /**
   * Computes word token Jaccard similarity between two strings (0.0 to 1.0)
   */
  public calculateTextSimilarity(a: string, b: string): number {
    const tokenize = (text: string): Set<string> => {
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      return new Set(words);
    };

    const setA = tokenize(a);
    const setB = tokenize(b);

    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersectionSize = 0;
    setA.forEach((item) => {
      if (setB.has(item)) {
        intersectionSize++;
      }
    });

    const union = new Set<string>();
    setA.forEach((item) => union.add(item));
    setB.forEach((item) => union.add(item));

    return union.size === 0 ? 0 : intersectionSize / union.size;
  }

  /**
   * Pre-publish check: compares hook and title structure against the last 10 published videos
   * for the user/channel. Flags repetitiveness if similarity exceeds 80%.
   */
  public checkOriginality(params: {
    userId: string;
    channelId?: string;
    proposedTitle: string;
    proposedHook?: string;
    proposedFramework?: string;
  }): OriginalityCheckResult {
    const db = getDb();

    let query = `
      SELECT id, topic, metadata_json, created_at
      FROM content_projects
      WHERE user_id = ? AND publishing_status = 'PUBLISHED'
    `;
    const args: any[] = [params.userId];
    if (params.channelId) {
      query += ` AND channel_id = ?`;
      args.push(params.channelId);
    }
    query += ` ORDER BY created_at DESC LIMIT 10`;

    const recentVideos = db.prepare(query).all(...args) as {
      id: string;
      topic: string;
      metadata_json: string | null;
      created_at: string;
    }[];

    let maxSimilarity = 0;
    let matchedProjectId: string | undefined;
    let matchedTitle: string | undefined;

    const frameworksUsed: Record<string, number> = {};

    for (const vid of recentVideos) {
      let pastTitle = vid.topic;
      let pastHook = '';
      let pastFramework = '';

      if (vid.metadata_json) {
        try {
          const meta = JSON.parse(vid.metadata_json);
          if (meta.youtubeTitle) pastTitle = meta.youtubeTitle;
          if (meta.hookNarration) pastHook = meta.hookNarration;
          if (meta.framework) pastFramework = meta.framework;
        } catch {}
      }

      if (pastFramework) {
        frameworksUsed[pastFramework] = (frameworksUsed[pastFramework] || 0) + 1;
      }

      // Title similarity
      const titleSim = this.calculateTextSimilarity(params.proposedTitle, pastTitle);

      // Hook similarity (if available)
      let hookSim = 0;
      if (params.proposedHook && pastHook) {
        hookSim = this.calculateTextSimilarity(params.proposedHook, pastHook);
      }

      const combinedSim = Math.max(titleSim, hookSim);
      if (combinedSim > maxSimilarity) {
        maxSimilarity = combinedSim;
        matchedProjectId = vid.id;
        matchedTitle = pastTitle;
      }
    }

    const currentFramework = params.proposedFramework || 'UNKNOWN';
    const recentFrameworkCount = frameworksUsed[currentFramework] || 0;

    const allFrameworkIds = NARRATIVE_FRAMEWORKS.map((fw) => fw.id);

    const recommendedFrameworks = allFrameworkIds
      .filter((fwId) => (frameworksUsed[fwId] || 0) === 0)
      .slice(0, 3);

    const isWellRotated = recentFrameworkCount <= 2;
    const frameworkRecommendation = isWellRotated
      ? `Framework "${currentFramework}" is well-rotated (${recentFrameworkCount} recent uses).`
      : `Framework "${currentFramework}" was used ${recentFrameworkCount} times recently. Consider rotating to: ${recommendedFrameworks.join(', ')}.`;

    const passed = maxSimilarity <= 0.80;
    const alert = !passed
      ? `Originality Alert: High similarity (${Math.round(maxSimilarity * 100)}%) detected with published video "${matchedTitle}". Title or hook phrasing is too repetitive.`
      : undefined;

    return {
      passed,
      maxSimilarity: Math.round(maxSimilarity * 100) / 100,
      matchedProjectId,
      matchedTitle,
      alert,
      frameworkRotation: {
        framework: currentFramework,
        recentlyUsedCount: recentFrameworkCount,
        recommendedFrameworks,
        isWellRotated,
        recommendation: frameworkRecommendation,
      },
    };
  }

  /**
   * Computes semantic cosine similarity using Cloudflare Workers AI BGE-M3 Multilingual Embeddings.
   * Falls back to token Jaccard similarity if Cloudflare is not configured or fails.
   */
  public async computeSemanticSimilarityWithBgeM3(a: string, b: string): Promise<number> {
    const { isCloudflareConfigured, runCloudflareJson } = await import('../providers/cloudflareAiClient');
    if (!isCloudflareConfigured() || !a?.trim() || !b?.trim()) {
      return this.calculateTextSimilarity(a, b);
    }

    try {
      const res = await runCloudflareJson<any>('@cf/baai/bge-m3', {
        text: [a.trim(), b.trim()],
      });

      const vectors = res?.data || res;
      if (Array.isArray(vectors) && vectors.length >= 2 && Array.isArray(vectors[0]) && Array.isArray(vectors[1])) {
        const vA: number[] = vectors[0];
        const vB: number[] = vectors[1];
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vA.length; i++) {
          dot += vA[i] * vB[i];
          normA += vA[i] * vA[i];
          normB += vB[i] * vB[i];
        }
        if (normA > 0 && normB > 0) {
          const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
          return Math.max(0, Math.min(1, Math.round(sim * 100) / 100));
        }
      }
    } catch (err: any) {
      console.warn(`[OriginalityRadar] BGE-M3 semantic similarity check bypassed (${err.message})`);
    }

    return this.calculateTextSimilarity(a, b);
  }
}

export const originalityRadar = new OriginalityRadar();

export async function computeSemanticSimilarityWithBgeM3(a: string, b: string): Promise<number> {
  return originalityRadar.computeSemanticSimilarityWithBgeM3(a, b);
}
