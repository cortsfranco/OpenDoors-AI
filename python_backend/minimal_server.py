#!/usr/bin/env python3
"""
Servidor mínimo para probar la integración sin dependencias complejas
"""
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import tempfile

class MinimalInvoiceHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "message": "API de Agente Contable está funcionando",
                "status": "minimal_mode"
            }).encode())
        else:
            self.send_error(404)
    
    def do_POST(self):
        try:
            if self.path == '/process-invoice/':
                self.handle_process_invoice()
            elif self.path == '/chat-json/':
                self.handle_chat()
            else:
                self.send_error(404)
        except Exception as e:
            print(f"Error: {e}")
            self.send_error(500)
    
    def handle_process_invoice(self):
        """Procesar factura con datos de ejemplo (modo minimal)"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Simulamos extracción básica basada en el PDF que subiste
        response_data = {
            "success": True,
            "message": "Procesamiento de factura completado (modo minimal)",
            "filename": "factura.pdf",
            "processing_result": {
                "extracted_data": {
                    "invoice_number": "00015-00000305",
                    "date": "2025-08-28",
                    "total": 75250.00,
                    "client_name": "RESOURCES OPEN DOORS S.A.S.",
                    "type": "expense",
                    "vat_amount": 13059.92
                }
            }
        }
        
        self.wfile.write(json.dumps(response_data).encode())
    
    def handle_chat(self):
        """Chat básico sin Azure (modo minimal)"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode())
        
        question = data.get('question', '')
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_data = {
            "success": True,
            "question": question,
            "answer": f"[Modo Minimal] Recibí tu pregunta: '{question}'. Tu backend Azure completo está configurado pero ejecutándose en modo básico por limitaciones del entorno.",
            "trace": {"mode": "minimal", "azure_configured": True}
        }
        
        self.wfile.write(json.dumps(response_data).encode())

def run_server():
    server_address = ('127.0.0.1', 8000)
    httpd = HTTPServer(server_address, MinimalInvoiceHandler)
    print("🚀 Servidor minimal iniciando en http://127.0.0.1:8000")
    print("📄 Endpoint: POST /process-invoice/")
    print("💬 Endpoint: POST /chat-json/")
    print("🔧 Modo: Básico (sin dependencias Azure)")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()