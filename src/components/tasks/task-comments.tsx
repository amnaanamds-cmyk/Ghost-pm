"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { addComment, deleteComment, listComments, type CommentView } from "@/app/actions/tasks";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TaskComments({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await listComments(taskId);
    if (res.ok) setComments(res.data);
    else toast.error(res.error);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await addComment(taskId, body);
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      await load();
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Comments {comments && comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}</h3>
      {comments === null ? (
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="group flex gap-2 text-sm" data-comment>
              <Avatar person={c.author ?? { name: "Deleted user" }} className="mt-0.5 size-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-medium">{c.author?.name ?? "Deleted user"}</span>{" "}
                  <span className="text-muted-foreground" suppressHydrationWarning>
                    {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </p>
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {c.canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete comment"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteComment(c.id);
                      if (!res.ok) return void toast.error(res.error);
                      await load();
                    })
                  }
                >
                  <X className="size-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Add a comment…"
          className="min-h-10 text-sm"
          rows={1}
          maxLength={5000}
        />
        <Button size="icon" onClick={submit} disabled={pending || !body.trim()} aria-label="Post comment">
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
