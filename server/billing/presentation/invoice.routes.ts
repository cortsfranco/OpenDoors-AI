/**
 * Invoice Routes - Presentation Layer
 * Express routes for invoice operations following Clean Architecture
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth'; // Existing auth middleware
import { container } from '../../inversify.config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import the use case
import { ProcessInvoiceUseCase } from '../application/use-cases/process-invoice.usecase';
import { IInvoiceRepository } from '../domain/repositories/invoice.repository';

const router = Router();

// Configure multer for file uploads (reusing existing configuration)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// --- Dependency Injection with InversifyJS ---
const processInvoiceUseCase = container.get<ProcessInvoiceUseCase>("ProcessInvoiceUseCase");
const invoiceRepository = container.get<IInvoiceRepository>("InvoiceRepository");
// ---

// POST /api/invoices - Upload and process invoice
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { uploadedBy, uploadedByName, ownerName, manualEntry, invoiceData, type } = req.body;

    if (!uploadedBy || !uploadedByName) {
      return res.status(400).json({ error: 'Usuario requerido' });
    }

    // Prepare input for use case
    const input = {
      fileBuffer: req.file ? fs.readFileSync(req.file.path) : undefined,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      uploadedBy,
      uploadedByName,
      ownerName: ownerName || uploadedByName,
      manualEntry: manualEntry === 'true',
      invoiceData,
      type: type as 'income' | 'expense' | undefined
    };

    // Execute use case
    const result = await processInvoiceUseCase.execute(input);

    if (!result.success) {
      if (result.error === 'duplicate' && result.duplicateInvoice) {
        // Clean up uploaded file since it's a duplicate
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(409).json({ 
          error: "duplicate", 
          message: `Esta factura ya fue cargada anteriormente por ${result.duplicateInvoice.uploadedBy} el ${new Date(result.duplicateInvoice.date).toLocaleDateString('es-ES')}`,
          existingInvoice: result.duplicateInvoice
        });
      }
      return res.status(400).json({ error: result.error });
    }

    // Clean up temporary file after successful processing
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(201).json(result.invoice);

  } catch (error) {
    console.error('Error processing invoice:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices - List invoices with filters
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      startMonth: req.query.startMonth ? parseInt(req.query.startMonth as string) : undefined,
      startYear: req.query.startYear ? parseInt(req.query.startYear as string) : undefined,
      endMonth: req.query.endMonth ? parseInt(req.query.endMonth as string) : undefined,
      endYear: req.query.endYear ? parseInt(req.query.endYear as string) : undefined,
      user: req.query.user as string,
      type: req.query.type as 'income' | 'expense' | 'neutral' | 'all',
      invoiceClass: req.query.invoiceClass as 'A' | 'B' | 'C' | 'all',
      paymentStatus: req.query.paymentStatus as 'pending' | 'paid' | 'overdue' | 'cancelled' | 'all',
      ownerName: req.query.ownerName as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      amountMin: req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined,
      amountMax: req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined,
      clientProvider: req.query.clientProvider as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as 'date' | 'amount' | 'client' | 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc'
    };

    const result = await invoiceRepository.getAllInvoices(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error al obtener las facturas' });
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceRepository.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: "Error al obtener la factura" });
  }
});

// PATCH /api/invoices/:id - Update invoice
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updatedInvoice = await invoiceRepository.updateInvoice(req.params.id, updates);
    
    if (!updatedInvoice) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: "Error al actualizar la factura" });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const deletedBy = req.session?.userId || '';
    const deletedByName = req.session?.userName || 'Usuario';
    
    const success = await invoiceRepository.deleteInvoice(req.params.id, deletedBy, deletedByName);
    
    if (!success) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }
    
    res.json({ success: true, message: "Factura eliminada correctamente" });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: "Error al eliminar la factura" });
  }
});

export default router;
