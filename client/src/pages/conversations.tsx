import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Message } from "@shared/schema";
import { MessageSquare, Send, ArrowLeft, User, Building2 } from "lucide-react";
import { format } from "date-fns";

export default function ConversationsPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedClientId],
    enabled: !!selectedClientId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
    },
  });

  useEffect(() => {
    if (selectedClientId) {
      apiRequest("POST", `/api/messages/${selectedClientId}/read`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  }, [selectedClientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedClientId) return;
    sendMutation.mutate({ clientId: selectedClientId, content: messageText.trim() });
  };

  const selectedConvo = conversations.find(c => c.client.id === selectedClientId);

  return (
    <div className="flex h-full" data-testid="conversations-page">
      <div className={`w-full md:w-80 border-r flex-shrink-0 flex flex-col ${selectedClientId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Conversas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground px-4" data-testid="text-no-conversations">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((convo: any) => (
                <div
                  key={convo.client.id}
                  className={`p-3 rounded-md cursor-pointer hover-elevate transition-colors ${
                    selectedClientId === convo.client.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedClientId(convo.client.id)}
                  data-testid={`convo-${convo.client.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{convo.client.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage.content}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(convo.lastMessage.createdAt), "HH:mm")}
                      </p>
                      {convo.unreadCount > 0 && (
                        <Badge className="mt-1 text-[10px] h-5 min-w-5 flex items-center justify-center">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className={`flex-1 flex flex-col ${!selectedClientId ? "hidden md:flex" : "flex"}`}>
        {!selectedClientId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="text-select-conversation">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedClientId(null)}
                data-testid="button-back-conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="font-medium">{selectedConvo?.client.name}</p>
                <p className="text-xs text-muted-foreground">{selectedConvo?.client.phone}</p>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === "company" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-md px-3 py-2 ${
                        msg.senderType === "company"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {msg.senderType === "client" ? (
                          <User className="w-3 h-3 opacity-70" />
                        ) : (
                          <Building2 className="w-3 h-3 opacity-70" />
                        )}
                        <span className="text-[10px] opacity-70">
                          {msg.senderType === "company" ? "Empresa" : "Cliente"}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.senderType === "company" ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}>
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
