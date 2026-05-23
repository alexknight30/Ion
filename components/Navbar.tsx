"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = ["Time", "Workstation", "Chat", "Settings"] as const;
export type Tab = (typeof tabs)[number];

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.header
      animate={{ height: collapsed ? 20 : 52 }}
      transition={{ duration: 0.4, ease }}
      className="fixed top-0 left-0 right-0 z-50 overflow-hidden rounded-b-[12px] border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-glass)] backdrop-blur-[20px] backdrop-saturate-[1.8]"
    >
      <div className="h-full overflow-hidden">
        <AnimatePresence>
          {!collapsed && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="flex h-[52px] items-center px-8"
            >
              <div className="flex items-center gap-8">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={cn(
                      "relative text-[14px] font-medium tracking-[-0.01em] transition-colors duration-200",
                      activeTab === tab
                        ? "text-[var(--color-glacier)]"
                        : "text-[var(--color-pumice)] hover:text-[var(--color-steam)]"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-[var(--color-glacier)]"
                        transition={{ duration: 0.3, ease }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute right-4 top-0 z-10 flex h-full w-6 justify-center text-[var(--color-pumice)] transition-colors duration-200 hover:text-[var(--color-steam)]",
          collapsed ? "items-center" : "items-end pb-2"
        )}
        aria-label={collapsed ? "Expand navbar" : "Collapse navbar"}
      >
        {collapsed ? (
          <ChevronDown size={14} strokeWidth={1.5} />
        ) : (
          <ChevronUp size={14} strokeWidth={1.5} />
        )}
      </button>
    </motion.header>
  );
}
