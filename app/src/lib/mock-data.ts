export interface Shark {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
  stakedAmount: number;
  sectors: string[];
  stage: string;
  valuationRange: string;
  dealType: string;
  dealsCompleted: number;
  successRate: number;
  totalDeployed: number;
  joinedDate: string;
  thesis: string;
  socials: { twitter?: string; lens?: string };
}

export interface Deal {
  id: string;
  sharkName: string;
  projectName: string;
  amount: number;
  timestamp: string;
  status: "funded" | "pitched" | "reviewing";
}

export const sharks: Shark[] = [
  {
    id: "alex-wang",
    name: "Alex Wang",
    avatar: "🦈",
    title: "Partner @ Paradigm Ventures",
    bio: "Ex-Binance engineer. Investing in DeFi infrastructure since 2019. Looking for teams building the next generation of on-chain finance.",
    stakedAmount: 10000,
    sectors: ["DeFi", "Infrastructure"],
    stage: "Pre-seed",
    valuationRange: "$1M - $5M",
    dealType: "Token Warrant",
    dealsCompleted: 12,
    successRate: 85,
    totalDeployed: 125000,
    joinedDate: "2024-01",
    thesis: "I believe in funding teams that are building real infrastructure for DeFi. Not looking for another fork — show me something novel.",
    socials: { twitter: "@alexw_crypto" },
  },
  {
    id: "sarah-kim",
    name: "Sarah Kim",
    avatar: "🐋",
    title: "Angel Investor & AI Researcher",
    bio: "PhD in ML from Stanford. Focused on the intersection of AI and Web3. Previously led AI at a top-5 crypto exchange.",
    stakedAmount: 5000,
    sectors: ["AI + Web3", "Data"],
    stage: "Seed",
    valuationRange: "$2M - $8M",
    dealType: "SAFE",
    dealsCompleted: 8,
    successRate: 90,
    totalDeployed: 78000,
    joinedDate: "2024-03",
    thesis: "AI agents will need on-chain infrastructure. I'm looking for teams building at this intersection with real technical depth.",
    socials: { twitter: "@sarahk_ai" },
  },
  {
    id: "david-liu",
    name: "David Liu",
    avatar: "🦑",
    title: "Founding Partner @ Onchain Capital",
    bio: "Serial entrepreneur. Built and sold 2 crypto startups. Now deploying capital into early-stage Web3 projects with clear PMF.",
    stakedAmount: 25000,
    sectors: ["Consumer", "Gaming", "Social"],
    stage: "Pre-seed",
    valuationRange: "$500K - $3M",
    dealType: "Token Warrant",
    dealsCompleted: 23,
    successRate: 78,
    totalDeployed: 340000,
    joinedDate: "2023-11",
    thesis: "Consumer crypto is the next big wave. Looking for products people actually want to use, not financial engineering.",
    socials: { twitter: "@davidliu_oc", lens: "@david.lens" },
  },
  {
    id: "maria-santos",
    name: "Maria Santos",
    avatar: "🐬",
    title: "GP @ Latam Crypto Fund",
    bio: "Bridging Latam and global crypto ecosystems. Focus on real-world use cases in emerging markets.",
    stakedAmount: 8000,
    sectors: ["RWA", "Payments", "DeFi"],
    stage: "Seed",
    valuationRange: "$1M - $4M",
    dealType: "SAFE + Token Warrant",
    dealsCompleted: 15,
    successRate: 82,
    totalDeployed: 195000,
    joinedDate: "2024-02",
    thesis: "Crypto's biggest impact will be in emerging markets. Show me real users solving real problems.",
    socials: { twitter: "@maria_latamcrypto" },
  },
  {
    id: "james-chen",
    name: "James Chen",
    avatar: "🦈",
    title: "CTO turned Angel",
    bio: "Former CTO at a DeFi blue chip. Now angel investing in infrastructure and dev tooling. Technical due diligence is my edge.",
    stakedAmount: 15000,
    sectors: ["Infrastructure", "Dev Tools", "ZK"],
    stage: "Pre-seed",
    valuationRange: "$1M - $6M",
    dealType: "Token Warrant",
    dealsCompleted: 18,
    successRate: 88,
    totalDeployed: 210000,
    joinedDate: "2024-01",
    thesis: "If you're building picks and shovels for crypto developers, I want to talk. Bonus points for ZK applications.",
    socials: { twitter: "@jamesc_tech" },
  },
  {
    id: "nina-patel",
    name: "Nina Patel",
    avatar: "🐋",
    title: "Solo GP @ Patel Ventures",
    bio: "Ex-a16z scout. Now running my own micro-fund focused on crypto-native social and creator economy.",
    stakedAmount: 3000,
    sectors: ["Social", "Creator Economy", "NFT"],
    stage: "Pre-seed",
    valuationRange: "$500K - $2M",
    dealType: "SAFE",
    dealsCompleted: 6,
    successRate: 92,
    totalDeployed: 45000,
    joinedDate: "2024-05",
    thesis: "The next Instagram will be built on-chain. Looking for social apps with viral loops and real engagement.",
    socials: { twitter: "@ninapatel_vc" },
  },
];

export const liveFeed: Deal[] = [
  { id: "1", sharkName: "Alex Wang", projectName: "LiquidSwap", amount: 10000, timestamp: "2 min ago", status: "funded" },
  { id: "2", sharkName: "Sarah Kim", projectName: "NeuralChain", amount: 5000, timestamp: "8 min ago", status: "funded" },
  { id: "3", sharkName: "David Liu", projectName: "PlayVerse", amount: 15000, timestamp: "15 min ago", status: "pitched" },
  { id: "4", sharkName: "Maria Santos", projectName: "PagoCrypto", amount: 8000, timestamp: "23 min ago", status: "reviewing" },
  { id: "5", sharkName: "James Chen", projectName: "ZKBridge", amount: 12000, timestamp: "31 min ago", status: "funded" },
  { id: "6", sharkName: "Nina Patel", projectName: "Frenzy Social", amount: 3000, timestamp: "45 min ago", status: "funded" },
  { id: "7", sharkName: "Alex Wang", projectName: "YieldMax", amount: 10000, timestamp: "1h ago", status: "pitched" },
  { id: "8", sharkName: "David Liu", projectName: "CryptoQuest", amount: 20000, timestamp: "2h ago", status: "funded" },
];

export const stats = {
  totalStaked: "$456,000",
  activeTermSheets: 42,
  dealsCompleted: 89,
  avgDealTime: "3.2 days",
};
