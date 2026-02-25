"""
Build PrintAgent.exe using PyInstaller
Run this script to create the executable
"""

import subprocess
import sys
import shutil
from pathlib import Path

def install_pyinstaller():
    """Install PyInstaller if not already installed"""
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

def build_exe():
    """Build the executable"""
    print("=" * 60)
    print("Building PrintAgent.exe...")
    print("=" * 60)
    
    # PyInstaller command
    cmd = [
        "pyinstaller",
        "--onefile",                    # Single exe file
        "--windowed",                   # No console window
        "--name=PrintAgent",            # Output name
        "--icon=NONE",                  # Can add icon later
        "--add-data=README.txt:.",      # Include README
        "--hidden-import=aiohttp",
        "--hidden-import=escpos",
        "--hidden-import=usb",
        "print-agent.py"
    ]
    
    subprocess.check_call(cmd)
    
    print("\n" + "=" * 60)
    print("✅ Build complete!")
    print("=" * 60)
    print(f"\nExecutable location: dist/PrintAgent.exe")
    print(f"Size: ~{Path('dist/PrintAgent.exe').stat().st_size / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    install_pyinstaller()
    build_exe()