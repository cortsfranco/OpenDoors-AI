import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload, Lock, Users, Edit, Trash2, Shield, Camera, Save, AlertCircle, Plus, UserPlus, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { userConfigSchema, type UserConfig } from "@shared/schema";

const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const userFormSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  displayName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  role: z.enum(["admin", "editor", "viewer"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;
type ConfigFormValues = z.infer<typeof userConfigSchema>;

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch all users (admin only)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
      email: user?.email || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // User form (for creating/editing)
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      role: "viewer",
    },
  });

  // Configuration form
  const configForm = useForm<ConfigFormValues>({
    resolver: zodResolver(userConfigSchema),
    defaultValues: {
      decimalSeparator: (user as any)?.decimalSeparator || ',',
      thousandSeparator: (user as any)?.thousandSeparator || '.',
      decimalPlaces: (user as any)?.decimalPlaces || 2,
      currencySymbol: (user as any)?.currencySymbol || '$',
      currencyPosition: (user as any)?.currencyPosition || 'before',
      roundingMode: (user as any)?.roundingMode || 'round',
      fiscalPeriod: (user as any)?.fiscalPeriod || 'calendar',
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => 
      apiRequest('PUT', '/api/auth/profile', data),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el perfil",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => 
      apiRequest('POST', '/api/auth/change-password', data),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Contraseña actualizada correctamente",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la contraseña",
        variant: "destructive",
      });
    },
  });

  // Update logo mutation
  const updateLogoMutation = useMutation({
    mutationFn: async (file: File | null) => {
      if (file) {
        const formData = new FormData();
        formData.append("logo", file);
        
        const res = await fetch('/api/auth/company-logo', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || res.statusText);
        }
        
        return res.json();
      } else {
        // Remove logo
        const res = await fetch('/api/auth/company-logo', {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || res.statusText);
        }
        
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Logo actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLogoPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el logo",
        variant: "destructive",
      });
    },
  });

  // Update avatar mutation
  const updateAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || res.statusText);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Avatar actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setAvatarPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el avatar",
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: ConfigFormValues) => 
      apiRequest('PUT', '/api/auth/configuration', data),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Configuración actualizada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormValues) => 
      apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreatingUser(false);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<UserFormValues>) => 
      apiRequest('PUT', `/api/users/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el usuario",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest('DELETE', `/api/users/${userId}`),
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el usuario",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo no puede superar los 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive",
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      updateAvatarMutation.mutate(file);
    }
  };

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate(data);
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo debe ser menor a 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    updateLogoMutation.mutate(file);
  };

  const handleRemoveLogo = () => {
    updateLogoMutation.mutate(null);
  };

  const onUserSubmit = (data: UserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, ...data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "editor":
        return "secondary";
      case "viewer":
        return "default";
      default:
        return "default";
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar la información del usuario
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Perfil</h2>
        <p className="text-muted-foreground">
          Administra tu información personal y configuración de seguridad
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="w-4 h-4 mr-2" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="configuration" data-testid="tab-configuration">
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
          {user.role === "admin" && (
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Usuarios
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Actualiza tu información de perfil y avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={avatarPreview || user.avatar || undefined}
                    alt={user.displayName}
                  />
                  <AvatarFallback>{getUserInitials(user.displayName || "User")}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updateAvatarMutation.isPending}
                    data-testid="upload-avatar-button"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Cambiar Avatar
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    data-testid="avatar-file-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o GIF. Max 5MB.
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center space-x-2">
                    <Label>Rol:</Label>
                    <Badge variant={getRoleBadgeColor(user.role)}>
                      {user.role === "admin" ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Administrador
                        </>
                      ) : user.role === "editor" ? (
                        "Editor"
                      ) : (
                        "Visor"
                      )}
                    </Badge>
                  </div>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="save-profile-button"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña de acceso al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña Actual</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            data-testid="input-current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            data-testid="input-new-password"
                          />
                        </FormControl>
                        <FormDescription>
                          Mínimo 6 caracteres
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    data-testid="change-password-button"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Actualizar Contraseña
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          {/* Company Logo Section - Admin Only */}
          {user.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Logo de la Empresa</CardTitle>
                <CardDescription>
                  Personaliza tu empresa con un logo que aparecerá en reportes y documentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  {(user as any)?.companyLogo ? (
                    <img 
                      src={(user as any).companyLogo} 
                      alt="Logo de la empresa" 
                      className="h-24 w-auto rounded border"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-input')?.click()}
                      disabled={updateLogoMutation?.isPending}
                      data-testid="upload-logo-button"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {(user as any)?.companyLogo ? 'Cambiar Logo' : 'Subir Logo'}
                    </Button>
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLogoUpload(file);
                        }
                      }}
                      className="hidden"
                      data-testid="logo-file-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG o SVG. Max 5MB. Recomendado: 200x200px
                    </p>
                    {(user as any)?.companyLogo && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveLogo}
                        data-testid="remove-logo-button"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar Logo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Configuración Numérica</CardTitle>
              <CardDescription>
                Ajusta el formato de números, decimales y moneda según tus preferencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit((data) => updateConfigMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={configForm.control}
                        name="decimalSeparator"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Separador Decimal</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-decimal-separator">
                                  <SelectValue placeholder="Seleccionar separador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=",">, (coma) - Formato argentino</SelectItem>
                                <SelectItem value=".">. (punto) - Formato internacional</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={configForm.control}
                        name="thousandSeparator"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Separador de Miles</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-thousand-separator">
                                  <SelectValue placeholder="Seleccionar separador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=".">. (punto) - Formato argentino</SelectItem>
                                <SelectItem value=",">, (coma) - Formato internacional</SelectItem>
                                <SelectItem value=" "> (espacio)</SelectItem>
                                <SelectItem value="none">Sin separador</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={configForm.control}
                        name="decimalPlaces"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Decimales</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-decimal-places">
                                  <SelectValue placeholder="Número de decimales" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0 decimales</SelectItem>
                                <SelectItem value="2">2 decimales (recomendado)</SelectItem>
                                <SelectItem value="3">3 decimales</SelectItem>
                                <SelectItem value="4">4 decimales</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={configForm.control}
                        name="fiscalPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Período Fiscal</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-fiscal-period">
                                  <SelectValue placeholder="Seleccionar período" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="calendar">Calendario (Enero - Diciembre)</SelectItem>
                                <SelectItem value="may_april">Fiscal Argentino (Mayo - Abril)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={configForm.control}
                        name="currencySymbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Símbolo de Moneda</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="Ej: $, ARS, USD"
                                maxLength={10}
                                data-testid="input-currency-symbol"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={configForm.control}
                        name="currencyPosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posición del Símbolo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-currency-position">
                                  <SelectValue placeholder="Posición" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="before">Antes ($100.00)</SelectItem>
                                <SelectItem value="after">Después (100.00$)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={configForm.control}
                        name="roundingMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modo de Redondeo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-rounding-mode">
                                  <SelectValue placeholder="Tipo de redondeo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="round">Normal (redondeo estándar)</SelectItem>
                                <SelectItem value="ceil">Hacia arriba</SelectItem>
                                <SelectItem value="floor">Hacia abajo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                
                  <div className="pt-4 border-t">
                    <div className="mb-4">
                      <Label>Vista Previa</Label>
                      <div className="mt-2 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Ejemplo con configuración actual:</p>
                        <p className="font-mono text-lg">
                          {configForm.watch('currencyPosition') === 'before' ? configForm.watch('currencySymbol') : ''}
                          12{configForm.watch('thousandSeparator') === 'none' ? '' : configForm.watch('thousandSeparator')}345{configForm.watch('decimalSeparator')}67
                          {configForm.watch('currencyPosition') === 'after' ? configForm.watch('currencySymbol') : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formato: {configForm.watch('currencyPosition') === 'before' ? 'símbolo-número' : 'número-símbolo'} • 
                          Decimales: {configForm.watch('decimalSeparator')} • 
                          Miles: {configForm.watch('thousandSeparator') === 'none' ? 'sin separador' : configForm.watch('thousandSeparator')} • 
                          Período: {configForm.watch('fiscalPeriod') === 'calendar' ? 'Calendario' : 'Fiscal Argentino'}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={updateConfigMutation.isPending}
                      data-testid="save-configuration-button"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === "admin" && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>
                      Administra los usuarios del sistema
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setCreatingUser(true);
                      userForm.reset({
                        username: "",
                        displayName: "",
                        email: "",
                        password: "",
                        role: "viewer",
                      });
                    }}
                    data-testid="create-user-button"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">Cargando usuarios...</div>
                ) : (
                  <Table>
                    <TableCaption>Lista de usuarios registrados en el sistema</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha de Registro</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && Array.isArray(users) ? users.map((u: any) => (
                        <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar} alt={u.displayName} />
                                <AvatarFallback>{getUserInitials(u.displayName || "User")}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{u.displayName}</div>
                                <div className="text-xs text-muted-foreground">@{u.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeColor(u.role)}>
                              {u.role === "admin" ? "Administrador" : u.role === "editor" ? "Editor" : "Visor"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.isActive ? "outline" : "secondary"}>
                              {u.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(u.createdAt).toLocaleDateString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(u);
                                  userForm.reset({
                                    username: u.username,
                                    displayName: u.displayName,
                                    email: u.email,
                                    role: u.role,
                                  });
                                }}
                                disabled={u.id === user.id}
                                data-testid={`edit-user-${u.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(u)}
                                disabled={u.id === user.id}
                                data-testid={`delete-user-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : null}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit User Dialog */}
      <Dialog open={creatingUser || !!editingUser} onOpenChange={(open) => {
        if (!open) {
          setCreatingUser(false);
          setEditingUser(null);
          userForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Modifica la información del usuario seleccionado"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" disabled={!!editingUser} />
                    </FormControl>
                    <FormDescription>
                      Este será el identificador único del usuario
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-displayname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!editingUser && (
                <FormField
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-user-password" />
                      </FormControl>
                      <FormDescription>
                        Mínimo 6 caracteres
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="viewer">Visor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Define los permisos del usuario en el sistema
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreatingUser(false);
                    setEditingUser(null);
                    userForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  data-testid="save-user-button"
                >
                  {editingUser ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar al usuario {deletingUser?.displayName}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingUser) {
                  deleteUserMutation.mutate(deletingUser.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="confirm-delete-user"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}