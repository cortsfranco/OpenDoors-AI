import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/hooks/useChat";

export default function FloatingButton() {
  const { toggleDrawer } = useChat();

  return (
    <div className="chat-floating">
      <Button
        size="lg"
        className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        onClick={toggleDrawer}
        data-testid="chat-floating-button"
        title="Asistente de IA"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  );
}
