import { queuePendingChatAction } from "@/lib/chat-events";

interface RouterLike {
  push: (href: string) => void;
}

export function openChatWithMessage(router: RouterLike, message: string) {
  queuePendingChatAction(message);
  router.push("/chat");
}
