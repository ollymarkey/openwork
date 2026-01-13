import { useState } from "react";

type Section = "integrations" | "mcp" | "builtin";

export function RightSidebar() {
  const [expandedSection, setExpandedSection] = useState<Section | null>("integrations");

  const toggleSection = (section: Section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300">Tools & Integrations</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Integrations Section */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => toggleSection("integrations")}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm font-medium">Integrations</span>
            <svg
              className={`w-4 h-4 transition-transform ${expandedSection === "integrations" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === "integrations" && (
            <div className="px-3 pb-3 space-y-1">
              <IntegrationItem name="Google Calendar" connected={false} />
              <IntegrationItem name="Gmail" connected={false} />
              <IntegrationItem name="Google Docs" connected={false} />
              <IntegrationItem name="Outlook Calendar" connected={false} />
              <IntegrationItem name="Outlook Mail" connected={false} />
            </div>
          )}
        </div>

        {/* MCP Servers Section */}
        <div className="border-b border-slate-700">
          <button
            onClick={() => toggleSection("mcp")}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm font-medium">MCP Servers</span>
            <svg
              className={`w-4 h-4 transition-transform ${expandedSection === "mcp" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === "mcp" && (
            <div className="px-3 pb-3 space-y-1">
              <button className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded border border-dashed border-slate-600 transition-colors">
                + Add MCP Server
              </button>
            </div>
          )}
        </div>

        {/* Built-in Tools Section */}
        <div>
          <button
            onClick={() => toggleSection("builtin")}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-sm font-medium">Built-in Tools</span>
            <svg
              className={`w-4 h-4 transition-transform ${expandedSection === "builtin" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === "builtin" && (
            <div className="px-3 pb-3 space-y-1">
              <ToolItem name="Code Write" enabled={true} />
              <ToolItem name="Code Read" enabled={true} />
              <ToolItem name="Bash Execute" enabled={true} />
              <ToolItem name="File Search" enabled={true} />
              <ToolItem name="Web Search" enabled={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationItem({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded hover:bg-slate-700/50 transition-colors">
      <span className="text-sm">{name}</span>
      <button
        className={`text-xs px-2 py-1 rounded ${
          connected
            ? "bg-green-500/20 text-green-400"
            : "bg-slate-600 text-slate-300 hover:bg-slate-500"
        }`}
      >
        {connected ? "Connected" : "Connect"}
      </button>
    </div>
  );
}

function ToolItem({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded hover:bg-slate-700/50 transition-colors">
      <span className="text-sm">{name}</span>
      <div
        className={`w-8 h-4 rounded-full cursor-pointer transition-colors ${
          enabled ? "bg-primary-500" : "bg-slate-600"
        }`}
      >
        <div
          className={`w-3 h-3 mt-0.5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}
