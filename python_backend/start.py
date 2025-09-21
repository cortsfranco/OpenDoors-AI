#!/usr/bin/env python3
"""
Script para inicializar y ejecutar el backend Python con Azure AI
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Verificar que tenemos Python 3.8 o superior"""
    if sys.version_info < (3, 8):
        print("❌ Error: Se requiere Python 3.8 o superior")
        print(f"Versión actual: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version} - OK")

def create_env_file():
    """Crear archivo .env con valores por defecto si no existe"""
    env_path = Path(".env")
    env_example_path = Path("env.example")
    
    if not env_path.exists() and env_example_path.exists():
        print("📝 Creando archivo .env desde env.example...")
        with open(env_example_path, 'r') as source:
            content = source.read()
        
        # Agregar valores por defecto para desarrollo local
        content += """
# ============================================================================
# VALORES POR DEFECTO PARA DESARROLLO LOCAL
# ============================================================================
DEBUG=True
LOG_LEVEL=INFO
"""
        
        with open(env_path, 'w') as target:
            target.write(content)
        
        print("✅ Archivo .env creado")
        print("⚠️  IMPORTANTE: Configure las variables de Azure en .env para funcionalidad completa")
    else:
        print("✅ Archivo .env existe")

def install_dependencies():
    """Instalar dependencias de Python"""
    print("📦 Instalando dependencias...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        print("✅ Dependencias instaladas")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error instalando dependencias: {e}")
        print("Salida del error:", e.stderr.decode())
        return False
    return True

def check_azure_config():
    """Verificar configuración de Azure (opcional)"""
    required_vars = [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY', 
        'AZURE_SEARCH_ENDPOINT',
        'AZURE_SEARCH_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("⚠️  Variables de Azure faltantes (funcionalidad limitada):")
        for var in missing_vars:
            print(f"   - {var}")
        print("💡 Configure estas variables en .env para funcionalidad completa de IA")
        return False
    else:
        print("✅ Configuración de Azure - OK")
        return True

def start_server():
    """Iniciar el servidor FastAPI"""
    print("🚀 Iniciando servidor...")
    print("📍 Servidor disponible en: http://127.0.0.1:8000")
    print("📚 Documentación API en: http://127.0.0.1:8000/docs")
    print("🛑 Presiona Ctrl+C para detener")
    
    try:
        import uvicorn
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
    except KeyboardInterrupt:
        print("\n👋 Servidor detenido")
    except ImportError:
        print("❌ uvicorn no encontrado, intentando instalación...")
        subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn[standard]"])
        import uvicorn
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

def main():
    """Función principal"""
    print("🔧 Inicializando backend Python con Azure AI...")
    print("=" * 50)
    
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    print(f"📂 Directorio de trabajo: {script_dir}")
    
    # Verificaciones
    check_python_version()
    create_env_file()
    
    # Cargar variables de entorno
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("✅ Variables de entorno cargadas")
    except ImportError:
        print("⚠️  python-dotenv no encontrado, instalando...")
        subprocess.run([sys.executable, "-m", "pip", "install", "python-dotenv"])
        from dotenv import load_dotenv
        load_dotenv()
    
    # Instalar dependencias
    if not install_dependencies():
        print("❌ Fallo en instalación de dependencias")
        return
    
    # Verificar configuración de Azure
    azure_ok = check_azure_config()
    
    if not azure_ok:
        response = input("¿Continuar sin configuración completa de Azure? (s/n): ")
        if response.lower() not in ['s', 'y', 'yes', 'sí']:
            print("👋 Configure Azure y ejecute nuevamente")
            return
    
    print("=" * 50)
    start_server()

if __name__ == "__main__":
    main()