-- Constraints de integridad para la base de datos
-- Ejecutar estos comandos en PostgreSQL

-- Constraints para la tabla invoices
ALTER TABLE invoices 
ADD CONSTRAINT check_positive_total 
CHECK (total_amount > 0);

ALTER TABLE invoices 
ADD CONSTRAINT check_positive_subtotal 
CHECK (subtotal >= 0);

ALTER TABLE invoices 
ADD CONSTRAINT check_positive_iva 
CHECK (iva_amount >= 0);

ALTER TABLE invoices 
ADD CONSTRAINT check_valid_date 
CHECK (date <= CURRENT_DATE + INTERVAL '1 day');

ALTER TABLE invoices 
ADD CONSTRAINT check_valid_invoice_class 
CHECK (invoice_class IN ('A', 'B', 'C'));

ALTER TABLE invoices 
ADD CONSTRAINT check_valid_type 
CHECK (type IN ('income', 'expense'));

ALTER TABLE invoices 
ADD CONSTRAINT check_valid_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled'));

-- Constraints para la tabla users
ALTER TABLE users 
ADD CONSTRAINT check_valid_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('admin', 'editor', 'viewer'));

-- Constraints para la tabla clients_providers
ALTER TABLE clients_providers 
ADD CONSTRAINT check_valid_cuit 
CHECK (cuit IS NULL OR cuit ~ '^[0-9]{2}-[0-9]{8}-[0-9]{1}$');

ALTER TABLE clients_providers 
ADD CONSTRAINT check_valid_type 
CHECK (type IN ('client', 'provider'));

-- Índices para mejorar el rendimiento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_date 
ON invoices(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_type 
ON invoices(type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_owner_name 
ON invoices(owner_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_provider 
ON invoices(client_provider_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_payment_status 
ON invoices(payment_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_compound 
ON invoices(date, type, owner_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id 
ON activity_logs(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_timestamp 
ON activity_logs(timestamp);

-- Triggers para auditoría
CREATE OR REPLACE FUNCTION audit_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      user_id, 
      user_name, 
      action_type, 
      entity_type, 
      entity_id, 
      description, 
      timestamp
    ) VALUES (
      NEW.uploaded_by,
      NEW.uploaded_by_name,
      'create',
      'invoice',
      NEW.id,
      'Factura creada: ' || NEW.client_provider_name || ' - $' || NEW.total_amount,
      CURRENT_TIMESTAMP
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (
      user_id, 
      user_name, 
      action_type, 
      entity_type, 
      entity_id, 
      description, 
      timestamp
    ) VALUES (
      NEW.uploaded_by,
      NEW.uploaded_by_name,
      'update',
      'invoice',
      NEW.id,
      'Factura actualizada: ' || NEW.client_provider_name,
      CURRENT_TIMESTAMP
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (
      user_id, 
      user_name, 
      action_type, 
      entity_type, 
      entity_id, 
      description, 
      timestamp
    ) VALUES (
      OLD.uploaded_by,
      OLD.uploaded_by_name,
      'delete',
      'invoice',
      OLD.id,
      'Factura eliminada: ' || OLD.client_provider_name,
      CURRENT_TIMESTAMP
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_invoice_changes
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_invoice_changes();

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM session 
  WHERE expire < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Crear job para limpiar sesiones expiradas (ejecutar cada hora)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');
