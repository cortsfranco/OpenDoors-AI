import { Link, useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Users,
  BarChart3,
  Trash2,
  Activity,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  Send,
  TrendingUp,
  Settings,
  Shield,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { usePendingInvoiceCount } from "@/hooks/usePendingInvoiceCount";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Cargar Facturas",
    href: "/upload",
    icon: Upload,
  },
  {
    name: "Historial Facturas",
    href: "/invoices",
    icon: FileText,
  },
  {
    name: "Ventas vs Compras",
    href: "/invoices-separated",
    icon: BarChart3,
  },
  {
    name: "Cola de Revisión",
    href: "/review-queue",
    icon: AlertTriangle,
  },
  {
    name: "Clientes/Proveedores",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Analytics Ejecutivos",
    href: "/analytics",
    icon: TrendingUp,
  },
  {
    name: "Registro Actividades",
    href: "/activity-logs",
    icon: Activity,
  },
  {
    name: "Archivos",
    href: "/files",
    icon: FileText,
  },
  {
    name: "Importar Datos",
    href: "/import",
    icon: Download,
  },
  {
    name: "Papelera",
    href: "/trash",
    icon: Trash2,
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { messages, isLoading, sendMessage } = useChat();
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState("");
  const { data: pendingCount = 0 } = usePendingInvoiceCount();

  // Add admin panel to navigation for admin users
  const navigationWithAdmin = user?.role === 'admin' 
    ? [...navigation, {
        name: "Panel de Administración",
        href: "/admin",
        icon: Shield,
      }]
    : navigation;

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside className="w-64 h-screen bg-white md:bg-gradient-to-br md:from-blue-600/10 md:via-blue-500/8 md:to-blue-400/5 md:backdrop-blur-sm border-r border-blue-200/30 sidebar-transition flex flex-col" data-testid="sidebar">
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6 sm:mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">OD</span>
          </div>
          <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-blue-700 to-blue-600 bg-clip-text text-transparent">Open Doors</span>
        </div>
        
        <nav className="space-y-2">
          {navigationWithAdmin.map((item) => {
            const isActive = location === item.href;
            
            const handleNavigation = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              window.history.pushState({}, '', item.href);
              window.dispatchEvent(new PopStateEvent('popstate'));
            };
            
            return (
              <a 
                key={item.name} 
                href={item.href}
                onClick={handleNavigation}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer no-underline relative",
                  isActive
                    ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg transform scale-[1.02]"
                    : "text-gray-700 hover:text-gray-900 hover:bg-white/30 hover:backdrop-blur-sm"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                {item.name === "Cola de Revisión" && pendingCount > 0 && (
                  <span 
                    className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium min-w-[1.5rem] text-center"
                    data-testid="pending-count-badge"
                  >
                    {pendingCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        
        {/* Chat Assistant Section - Now visible on all screen sizes */}
        <div className="mt-4 sm:mt-6 border-t border-border pt-4 sm:pt-6">
          <Collapsible
            open={isChatOpen}
            onOpenChange={setIsChatOpen}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 text-foreground border border-purple-500/20"
                data-testid="chat-toggle-button"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <MessageCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-semibold truncate">Asistente IA</span>
                </div>
                {isChatOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              <div className="bg-gradient-to-br from-purple-50/5 to-blue-50/5 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-500/20 rounded-lg p-2 sm:p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent truncate">Asistente Financiero IA</span>
                </div>
                
                <ScrollArea className="h-32 sm:h-48 mb-2 sm:mb-3 pr-1 sm:pr-2">
                  <div className="space-y-2 sm:space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "text-xs p-1.5 sm:p-2 rounded-md sm:rounded-lg max-w-[90%] break-words",
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted"
                        )}
                      >
                        {message.text}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="text-xs text-muted-foreground animate-pulse p-1">
                        Escribiendo...
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-1 sm:gap-2">
                  <Input
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-xs h-7 sm:h-8 flex-1 min-w-0"
                    disabled={isLoading}
                    data-testid="chat-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                    data-testid="send-message"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </aside>
  );
}
