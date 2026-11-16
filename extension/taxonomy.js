'use strict';
const TOPICS = {
  "ai": {
    "label": "Artificial intelligence",
    "terms": [
      "artificial intelligence",
      "machine learning",
      "llm",
      "neural",
      "pytorch",
      "tensorflow",
      "huggingface",
      "openai",
      "langchain",
      "ollama",
      "deep learning"
    ],
    "github": [
      "ai",
      "machine-learning",
      "llm",
      "deep-learning"
    ]
  },
  "web": {
    "label": "Web development",
    "terms": [
      "react",
      "nextjs",
      "next.js",
      "frontend",
      "javascript",
      "typescript",
      "css",
      "html",
      "vue",
      "svelte",
      "angular",
      "webdev"
    ],
    "github": [
      "javascript",
      "typescript",
      "react",
      "web",
      "frontend",
      "nextjs"
    ]
  },
  "tools": {
    "label": "Developer tools",
    "terms": [
      "developer tools",
      "vscode",
      "neovim",
      "terminal",
      "cli",
      "git",
      "productivity",
      "automation",
      "devtools"
    ],
    "github": [
      "cli",
      "developer-tools",
      "productivity",
      "automation",
      "terminal"
    ]
  },
  "data": {
    "label": "Data & analytics",
    "terms": [
      "data science",
      "analytics",
      "pandas",
      "jupyter",
      "database",
      "sql",
      "postgres",
      "visualization",
      "statistics"
    ],
    "github": [
      "data-science",
      "database",
      "analytics",
      "visualization"
    ]
  },
  "systems": {
    "label": "Systems & infrastructure",
    "terms": [
      "linux",
      "rust",
      "golang",
      "docker",
      "kubernetes",
      "devops",
      "self hosted",
      "self-hosted",
      "server",
      "network"
    ],
    "github": [
      "linux",
      "rust",
      "go",
      "docker",
      "devops",
      "self-hosted"
    ]
  },
  "design": {
    "label": "Design & creative",
    "terms": [
      "figma",
      "design",
      "animation",
      "three.js",
      "blender",
      "creative",
      "graphics",
      "ui",
      "ux",
      "video"
    ],
    "github": [
      "design",
      "animation",
      "graphics",
      "ui",
      "creative-coding"
    ]
  },
  "mobile": {
    "label": "Mobile apps",
    "terms": [
      "flutter",
      "android",
      "swift",
      "kotlin",
      "ios",
      "react native",
      "mobile"
    ],
    "github": [
      "flutter",
      "android",
      "ios",
      "mobile",
      "react-native"
    ]
  },
  "security": {
    "label": "Security",
    "terms": [
      "cybersecurity",
      "pentest",
      "security",
      "ctf",
      "cryptography",
      "privacy",
      "owasp"
    ],
    "github": [
      "security",
      "privacy",
      "hacking",
      "cryptography"
    ]
  }
};
function classify(text) {
  const s = String(text).toLowerCase().replace(/[^a-z0-9.+-]+/g,' ');
  const result = {};
  for (const [key,t] of Object.entries(TOPICS)) {
    const hits = t.terms.filter(term => (` ${s} `).includes(` ${term} `)).length;
    if (hits) result[key] = Math.min(hits,4);
  }
  return result;
}
