import { Menu, LogOut, User, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();

  if (!user) return null;

  const initials = user.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabels = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visor',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 h-auto"
          data-testid="user-menu-button"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-medium text-foreground">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
          </div>
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
            <AvatarImage src={user.avatar || undefined} alt={user.displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-xs sm:text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 shadow-lg">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile" target="_self">
          <DropdownMenuItem
            className="cursor-pointer"
            data-testid="profile-settings-button"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configuración de Perfil
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="text-red-600 focus:text-red-600"
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps = {}) {
  return (
    <header className="bg-card border-b border-border px-3 sm:px-4 md:px-6 py-3 sm:py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {setSidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-1.5 sm:p-2 h-auto w-auto"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-foreground leading-tight truncate" data-testid="page-title">
              Centro de Control Financiero
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate" data-testid="page-subtitle">
              Gestión integral de facturas e IVA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
