import { useState } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { ChatContainer } from "../chat/ChatContainer";
import { Header } from "./Header";

export function MainLayout() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <Header
        onToggleLeft={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRight={() => setRightSidebarOpen(!rightSidebarOpen)}
        leftOpen={leftSidebarOpen}
        rightOpen={rightSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools & Integrations */}
        {leftSidebarOpen && (
          <aside className="w-64 border-r border-slate-700 flex flex-col bg-slate-800/50">
            <LeftSidebar />
          </aside>
        )}

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatContainer />
        </main>

        {/* Right Sidebar - Agent Configuration */}
        {rightSidebarOpen && (
          <aside className="w-80 border-l border-slate-700 flex flex-col bg-slate-800/50">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  );
}
