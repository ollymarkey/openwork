import { useState } from "react";

type Tab = "prompt" | "skills" | "settings";

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [agentName, setAgentName] = useState("My Agent");

  return (
    <div className="flex flex-col h-full">
      {/* Agent Header */}
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Agent Configuration</h2>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:border-primary-500"
          placeholder="Agent Name"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <TabButton active={activeTab === "prompt"} onClick={() => setActiveTab("prompt")}>
          Prompt
        </TabButton>
        <TabButton active={activeTab === "skills"} onClick={() => setActiveTab("skills")}>
          Skills
        </TabButton>
        <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
          Settings
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "prompt" && <PromptTab />}
        {activeTab === "skills" && <SkillsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded text-sm font-medium transition-colors">
          Save Agent
        </button>
        <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
          Test Agent
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "text-primary-400 border-b-2 border-primary-400"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PromptTab() {
  const [systemPrompt, setSystemPrompt] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full h-64 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm font-mono resize-none focus:outline-none focus:border-primary-500"
          placeholder="You are a helpful assistant..."
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>or</span>
        <button className="text-primary-400 hover:text-primary-300">load from file</button>
      </div>
    </div>
  );
}

function SkillsTab() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        Add skills to enhance your agent's capabilities.
      </div>
      <button className="w-full px-3 py-6 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded border border-dashed border-slate-600 transition-colors">
        + Add Skill
      </button>
      <div className="text-xs text-slate-500">
        Skills are markdown files that define specialized behaviors and instructions.
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-4">
      {/* LLM Provider */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">LLM Provider</label>
        <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:border-primary-500">
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="google">Google</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Model</label>
        <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:border-primary-500">
          <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
          <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
        </select>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Temperature</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue="0.7"
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>
    </div>
  );
}
