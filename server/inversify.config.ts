/**
 * InversifyJS Configuration
 * Dependency Injection Container Setup
 */
import "reflect-metadata";
import { Container } from "inversify";

// Import interfaces
import { IUserRepository } from "./auth/domain/repositories/user.repository";
import { IInvoiceRepository } from "./billing/domain/repositories/invoice.repository";
import { IFileStorageRepository } from "./billing/domain/repositories/file-storage.repository";
import { IAIProcessorRepository } from "./billing/domain/repositories/ai-processor.repository";

// Import implementations
import { DrizzleUserRepository } from "./auth/infrastructure/repositories/drizzle-user.repository";
import { DrizzleInvoiceRepository } from "./billing/infrastructure/repositories/drizzle-invoice.repository";
import { LocalFileStorageService } from "./billing/infrastructure/services/file-storage.service";
import { AzureAIService } from "./billing/infrastructure/services/azure-ai.service";

// Import use cases
import { LoginUseCase } from "./auth/application/use-cases/login.usecase";
import { RegisterUseCase } from "./auth/application/use-cases/register.usecase";
import { CheckSessionUseCase } from "./auth/application/use-cases/check-session.usecase";
import { ProcessInvoiceUseCase } from "./billing/application/use-cases/process-invoice.usecase";

// Create container
export const container = new Container();

// Repository bindings
container.bind<IUserRepository>("UserRepository").to(DrizzleUserRepository);
container.bind<IInvoiceRepository>("InvoiceRepository").to(DrizzleInvoiceRepository);
container.bind<IFileStorageRepository>("FileStorageRepository").to(LocalFileStorageService);
container.bind<IAIProcessorRepository>("AIProcessorRepository").to(AzureAIService);

// Use case bindings
container.bind<LoginUseCase>("LoginUseCase").to(LoginUseCase);
container.bind<RegisterUseCase>("RegisterUseCase").to(RegisterUseCase);
container.bind<CheckSessionUseCase>("CheckSessionUseCase").to(CheckSessionUseCase);
container.bind<ProcessInvoiceUseCase>("ProcessInvoiceUseCase").to(ProcessInvoiceUseCase);
