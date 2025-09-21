import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface UserSelectorProps {
  value: string;
  otherUserName: string;
  onValueChange: (value: string) => void;
  onOtherUserNameChange: (name: string) => void;
}

export default function UserSelector({ 
  value, 
  otherUserName, 
  onValueChange, 
  onOtherUserNameChange 
}: UserSelectorProps) {
  return (
    <Card data-testid="user-selector">
      <CardContent className="p-6">
        <Label className="text-sm font-medium text-foreground mb-2 block">
          Usuario que carga la factura *
        </Label>
        <Select value={value} onValueChange={onValueChange} required>
          <SelectTrigger data-testid="user-select">
            <SelectValue placeholder="Seleccionar usuario..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Joni Tagua">Joni Tagua</SelectItem>
            <SelectItem value="Hernán Pagani">Hernán Pagani</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
        
        {value === 'other' && (
          <div className="mt-3">
            <Input
              type="text"
              placeholder="Ingrese nombre del usuario"
              value={otherUserName}
              onChange={(e) => onOtherUserNameChange(e.target.value)}
              data-testid="other-user-input"
              required
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
