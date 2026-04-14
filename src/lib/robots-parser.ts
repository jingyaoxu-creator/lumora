/**
 * Lightweight robots.txt parser focused on AI crawler access detection.
 * Fetches and parses robots.txt, then checks allow/disallow per bot.
 */

/** All known AI crawler user-agent strings grouped by platform */
export const AI_BOTS = {
  // ─── Tier 1: Major AI Search ───
  google: {
    name: "Google AI Overview",
    agents: ["Google-Extended", "Googlebot"],
    icon: "google",
  },
  chatgpt: {
    name: "ChatGPT / SearchGPT",
    agents: ["GPTBot", "OAI-SearchBot", "ChatGPT-User"],
    icon: "openai",
  },
  perplexity: {
    name: "Perplexity",
    agents: ["PerplexityBot"],
    icon: "perplexity",
  },
  copilot: {
    name: "Microsoft Copilot",
    agents: ["bingbot"],
    icon: "microsoft",
  },

  // ─── Tier 2: Platform AI ───
  claude: {
    name: "Claude",
    agents: ["ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai"],
    icon: "anthropic",
  },
  apple: {
    name: "Apple Intelligence",
    agents: ["Applebot-Extended", "Applebot"],
    icon: "apple",
  },
  meta: {
    name: "Meta AI",
    agents: ["Meta-ExternalAgent", "Meta-ExternalFetcher", "FacebookBot"],
    icon: "meta",
  },

  // ─── Tier 3: Chinese AI ───
  baidu: {
    name: "百度 / 文心一言",
    agents: ["Baiduspider"],
    icon: "baidu",
  },
  bytedance: {
    name: "字节 / 豆包",
    agents: ["Bytespider"],
    icon: "bytedance",
  },
  deepseek: {
    name: "DeepSeek",
    agents: ["DeepSeekBot"],
    icon: "deepseek",
  },

  // ─── Tier 4: Other ───
  cohere: {
    name: "Cohere",
    agents: ["cohere-ai", "cohere-training-data-crawler"],
    icon: "cohere",
  },
  amazon: {
    name: "Amazon / Alexa",
    agents: ["Amazonbot"],
    icon: "amazon",
  },
  you: {
    name: "You.com",
    agents: ["YouBot"],
    icon: "you",
  },
  ccbot: {
    name: "Common Crawl",
    agents: ["CCBot"],
    icon: "ccbot",
  },
} as const;

export type PlatformKey = keyof typeof AI_BOTS;

export interface RobotsTxtResult {
  /** Raw robots.txt content (null if fetch failed) */
  raw: string | null;
  /** Per-bot access status */
  botAccess: Record<string, "allowed" | "blocked" | "restricted" | "unknown">;
  /** Per-platform summary (best access among that platform's agents) */
  platformAccess: Record<PlatformKey, "allowed" | "blocked" | "restricted" | "unknown">;
  /** Whether robots.txt was successfully fetched */
  found: boolean;
}

interface RobotsRule {
  agent: string; // lowercase
  disallow: string[];
  allow: string[];
}

/**
 * Fetch and parse robots.txt for a given URL.
 * Returns access status for all known AI bots.
 */
export async function fetchRobotsTxt(siteUrl: string): Promise<RobotsTxtResult> {
  const result: RobotsTxtResult = {
    raw: null,
    botAccess: {},
    platformAccess: {} as Record<PlatformKey, "allowed" | "blocked" | "restricted" | "unknown">,
    found: false,
  };

  try {
    const origin = new URL(siteUrl).origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LumoraBot/1.0)",
        Accept: "text/plain",
      },
    });
    clearTimeout(timeout);

    if (!res.ok || !res.headers.get("content-type")?.includes("text")) {
      // No robots.txt — all bots allowed by default
      result.found = false;
      setAllAllowed(result);
      return result;
    }

    const raw = await res.text();
    result.raw = raw;
    result.found = true;

    const rules = parseRobotsTxt(raw);

    // Check each AI bot
    for (const [platformKey, platform] of Object.entries(AI_BOTS)) {
      const statuses: string[] = [];

      for (const agent of platform.agents) {
        const status = checkBotAccess(rules, agent, "/");
        result.botAccess[agent] = status;
        statuses.push(status);
      }

      // Platform access = best access among its agents
      if (statuses.includes("allowed")) {
        result.platformAccess[platformKey as PlatformKey] = "allowed";
      } else if (statuses.includes("restricted")) {
        result.platformAccess[platformKey as PlatformKey] = "restricted";
      } else if (statuses.includes("blocked")) {
        result.platformAccess[platformKey as PlatformKey] = "blocked";
      } else {
        result.platformAccess[platformKey as PlatformKey] = "allowed"; // No mention = allowed
      }
    }
  } catch {
    // Fetch failed — assume all allowed
    setAllAllowed(result);
  }

  return result;
}

/** Parse robots.txt into structured rules */
function parseRobotsTxt(raw: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentAgents: string[] = [];

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.split("#")[0].trim(); // Remove comments
    if (!line) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const directive = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();

    if (directive === "user-agent") {
      if (currentAgents.length > 0) {
        // Check if previous group had any rules, if not, reset
        const lastRule = rules[rules.length - 1];
        if (lastRule && lastRule.disallow.length === 0 && lastRule.allow.length === 0) {
          // Still accumulating agents
          currentAgents.push(value.toLowerCase());
          lastRule.agent = value.toLowerCase(); // Will be overwritten, but we track in array
          continue;
        }
      }
      currentAgents = [value.toLowerCase()];
      // Create a rule for each agent
      for (const agent of currentAgents) {
        rules.push({ agent, disallow: [], allow: [] });
      }
    } else if (directive === "disallow" && currentAgents.length > 0) {
      // Apply to all current agent rules
      for (const rule of rules) {
        if (currentAgents.includes(rule.agent)) {
          rule.disallow.push(value || ""); // Empty disallow = allow all
        }
      }
    } else if (directive === "allow" && currentAgents.length > 0) {
      for (const rule of rules) {
        if (currentAgents.includes(rule.agent)) {
          rule.allow.push(value);
        }
      }
    }
  }

  return rules;
}

/** Check if a specific bot can access a given path */
function checkBotAccess(
  rules: RobotsRule[],
  botName: string,
  path: string,
): "allowed" | "blocked" | "restricted" | "unknown" {
  const botLower = botName.toLowerCase();

  // Find specific rules for this bot
  const specificRules = rules.filter((r) => r.agent === botLower);
  // Find wildcard rules
  const wildcardRules = rules.filter((r) => r.agent === "*");

  const applicableRules = specificRules.length > 0 ? specificRules : wildcardRules;

  if (applicableRules.length === 0) return "allowed"; // No rules = allowed

  for (const rule of applicableRules) {
    // Check if root path is completely blocked
    if (rule.disallow.includes("/") && rule.allow.length === 0) {
      return "blocked";
    }

    // Check for broad blocks with some allows (restricted)
    if (rule.disallow.includes("/") && rule.allow.length > 0) {
      return "restricted";
    }

    // Check for specific path blocks
    for (const disallowed of rule.disallow) {
      if (disallowed && path.startsWith(disallowed)) {
        // Check if there's a more specific allow
        const isAllowed = rule.allow.some(
          (a) => path.startsWith(a) && a.length > disallowed.length,
        );
        if (!isAllowed) return "restricted";
      }
    }

    // Empty disallow = explicitly allowed
    if (rule.disallow.length === 1 && rule.disallow[0] === "") {
      return "allowed";
    }
  }

  return "allowed";
}

function setAllAllowed(result: RobotsTxtResult) {
  for (const [key, platform] of Object.entries(AI_BOTS)) {
    result.platformAccess[key as PlatformKey] = "allowed";
    for (const agent of platform.agents) {
      result.botAccess[agent] = "allowed";
    }
  }
}
