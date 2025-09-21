import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { generateId } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage } from "@/lib/types";

export function useChat() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || 'Usuario';
  
  const initialMessage = useMemo(() => ({
    id: generateId(),
    text: `¡Hola ${firstName}! Soy tu asistente financiero de Open Doors. Puedo ayudarte con consultas sobre facturas, análisis de datos, y generar reportes personalizados. ¿En qué puedo ayudarte hoy?`,
    sender: "assistant" as const,
    timestamp: new Date(),
  }), [firstName]);

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isOpen, setIsOpen] = useState(false);

  const sendMessageMutation = useMutation({
    mutationFn: api.sendChatMessage,
    onSuccess: (data, message) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        text: message,
        sender: "user",
        timestamp: new Date(),
      };

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        text: data.response,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    },
  });

  const sendMessage = (message: string) => {
    sendMessageMutation.mutate(message);
  };

  const toggleDrawer = () => {
    console.log('useChat: toggleDrawer called, current isOpen:', isOpen, 'setting to:', !isOpen);
    setIsOpen(!isOpen);
  };

  const closeDrawer = () => {
    console.log('useChat: closeDrawer called, current isOpen:', isOpen, 'setting to false');
    setIsOpen(false);
  };

  return {
    messages,
    isOpen,
    isLoading: sendMessageMutation.isPending,
    sendMessage,
    toggleDrawer,
    closeDrawer,
  };
}
