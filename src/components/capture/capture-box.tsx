"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Mic, MicOff, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createCapture } from "@/app/actions/captures";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { fileToDataUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function CaptureBox({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechRecognition(
    (phrase) => {
      setUsedVoice(true);
      setText((t) => (t ? `${t.trimEnd()} ${phrase}` : phrase));
    },
    (msg) => toast.error(msg)
  );

  async function addImage(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      void addImage(file);
    }
  }

  function submit() {
    if (speech.listening) speech.stop();
    if (!text.trim() && !image) return void toast.error("Dump something first — text, voice, or a screenshot.");
    startTransition(async () => {
      const res = await createCapture(projectId, { text, imageUrl: image, usedVoice });
      if (!res.ok) return void toast.error(res.error);
      const { taskCount, aiError, limitReached, dropped } = res.data;
      const upgrade = { label: "See plans", onClick: () => window.open("/#pricing", "_blank") };
      if (limitReached && aiError) toast.warning("Captured — monthly task limit reached", { description: aiError, action: upgrade });
      else if (aiError) toast.warning("Captured, but the AI organizer failed", { description: aiError });
      else if (limitReached)
        toast.warning(`Captured → ${taskCount} task${taskCount === 1 ? "" : "s"}`, {
          description: `${dropped} more didn't fit in your Free plan's monthly limit.`,
          action: upgrade,
        });
      else if (taskCount === 0) toast.info("Captured — nothing actionable found");
      else toast.success(`Captured → ${taskCount} task${taskCount === 1 ? "" : "s"}`);
      setText("");
      setImage(null);
      setUsedVoice(false);
    });
  }

  return (
    <Card
      className="gap-3 p-3 sm:p-4"
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addImage(e.dataTransfer.files[0]);
      }}
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="Dump anything — bugs, ideas, feedback, a rant about onboarding… Paste or drop a screenshot too."
        className="min-h-32 resize-none border-0 bg-transparent p-1 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        disabled={pending}
      />
      {speech.interim && <p className="text-muted-foreground px-1 text-sm italic">{speech.interim}…</p>}
      {image && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Attached screenshot" className="max-h-40 rounded-md border" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute -top-2 -right-2 size-6 rounded-full"
            onClick={() => setImage(null)}
            aria-label="Remove image"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void addImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Attach screenshot" disabled={pending}>
            <ImagePlus />
          </Button>
          <Button
            type="button"
            variant={speech.listening ? "destructive" : "ghost"}
            size="icon"
            onClick={speech.listening ? speech.stop : speech.start}
            aria-label={speech.listening ? "Stop recording" : "Record voice"}
            title={speech.supported ? undefined : "Voice input isn't supported in this browser — try Chrome, Edge or Safari"}
            className={cn(speech.listening && "animate-pulse")}
            disabled={pending || !speech.supported}
          >
            {speech.listening ? <MicOff /> : <Mic />}
          </Button>
          <span className="text-muted-foreground hidden text-xs sm:inline">⌘/Ctrl + Enter to submit</span>
        </div>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          {pending ? "Organizing…" : "Capture"}
        </Button>
      </div>
    </Card>
  );
}
