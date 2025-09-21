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
          className="flex items-center gap-2 px-2 h-auto"
          data-testid="user-menu-button"
        >
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
          </div>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar || undefined} alt={user.displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
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
    <header className="bg-card border-b border-border px-4 md:px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          {setSidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground" data-testid="page-title">
              Centro de Control Financiero
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground" data-testid="page-subtitle">
              Gestión integral de facturas e IVA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
