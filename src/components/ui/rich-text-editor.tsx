"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Quote,
  // Removed unused Type import
} from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Rédigez votre message...",
  className = "",
}: // Removed unused rows parameter
RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      onChange(editorRef.current?.innerHTML || "");
    },
    [onChange]
  );

  const formatButtons = useMemo(
    () => [
      {
        command: "bold",
        icon: Bold,
        label: "Gras",
        shortcut: "Ctrl+B",
      },
      {
        command: "italic",
        icon: Italic,
        label: "Italique",
        shortcut: "Ctrl+I",
      },
      {
        command: "underline",
        icon: Underline,
        label: "Souligné",
        shortcut: "Ctrl+U",
      },
      {
        command: "insertUnorderedList",
        icon: List,
        label: "Liste à puces",
      },
      {
        command: "insertOrderedList",
        icon: ListOrdered,
        label: "Liste numérotée",
      },
      {
        command: "formatBlock",
        icon: Quote,
        label: "Citation",
        value: "blockquote",
      },
    ],
    []
  );

  const isCommandActive = useCallback((command: string) => {
    return document.queryCommandState(command);
  }, []);

  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  const updateActiveCommands = useCallback(() => {
    const active = new Set<string>();
    formatButtons.forEach((button) => {
      if (isCommandActive(button.command)) {
        active.add(button.command);
      }
    });
    setActiveCommands(active);
  }, [isCommandActive, formatButtons]);

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      // Sanitize URL and text to prevent XSS
      const sanitizedUrl = DOMPurify.sanitize(linkUrl, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
      const sanitizedText = DOMPurify.sanitize(linkText, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
      const linkHtml = `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${sanitizedText}</a>`;
      executeCommand("insertHTML", linkHtml);
      setLinkUrl("");
      setLinkText("");
      setIsLinkModalOpen(false);
    }
  }, [linkUrl, linkText, executeCommand]);

  const handleInput = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
    updateActiveCommands();
  }, [onChange, updateActiveCommands]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Ctrl+B for bold, Ctrl+I for italic, etc.
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            executeCommand("bold");
            break;
          case "i":
            e.preventDefault();
            executeCommand("italic");
            break;
          case "u":
            e.preventDefault();
            executeCommand("underline");
            break;
        }
      }
    },
    [executeCommand]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/50">
        {formatButtons.map((button) => {
          const isActive = activeCommands.has(button.command);
          return (
            <Button
              key={button.command}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => executeCommand(button.command, button.value)}
              className={`h-8 w-8 p-0 ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`}
              title={`${button.label}${
                button.shortcut ? ` (${button.shortcut})` : ""
              }`}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          );
        })}

        {/* Link Button */}
        <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Insérer un lien"
            >
              <Link className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] animate-in fade-in-0 zoom-in-95">
            <DialogHeader>
              <DialogTitle>Insérer un lien</DialogTitle>
              <DialogDescription>
                Ajoutez un lien cliquable dans votre message.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link-text" className="text-right">
                  Texte
                </Label>
                <Input
                  id="link-text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="col-span-3"
                  placeholder="Texte du lien"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link-url" className="text-right">
                  URL
                </Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="col-span-3"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLinkModalOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={insertLink} disabled={!linkUrl || !linkText}>
                Insérer le lien
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          !value ? "text-muted-foreground" : ""
        }`}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [
              "p",
              "br",
              "strong",
              "em",
              "u",
              "b",
              "i",
              "a",
              "ul",
              "ol",
              "li",
              "blockquote",
            ],
            ALLOWED_ATTR: ["href", "target", "rel"],
            ALLOW_DATA_ATTR: false,
          }),
        }}
      />
      data-placeholder={placeholder}
      {/* Character Count */}
      <div className="text-sm text-muted-foreground">
        {value.replace(/<[^>]*>/g, "").length} caractères
      </div>
    </div>
  );
}
