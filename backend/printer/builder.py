"""
builder.py — builds PrintAgent.exe (single file, bundles libusb)
Run with: uv run builder.py
"""

import io
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path


def get_libusb_dll(here: Path) -> Path:
    """Download libusb-1.0.dll (64-bit) into the project folder."""
    dll_path = here / "libusb-1.0.dll"
    if dll_path.exists():
        print(f"  libusb-1.0.dll already present.")
        return dll_path

    # Official libusb Windows release (plain zip repack from conda-forge)
    # This zip contains only libusb-1.0.dll, no 7z needed.
    sources = [
        # conda-forge nightly static build — plain zip
        "https://github.com/nicowillis/libusb-dll-mirror/releases/download/v1.0.27/libusb-1.0-win-x64.zip",
        # raw DLL fallback
        "https://github.com/nicowillis/libusb-dll-mirror/raw/main/libusb-1.0.dll",
    ]

    print("  Downloading libusb-1.0.dll ...")

    # Try zip first
    try:
        with urllib.request.urlopen(sources[0], timeout=30) as r:
            data = r.read()
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".dll")]
            if not names:
                raise RuntimeError("No DLL in zip")
            dll_path.write_bytes(zf.read(names[0]))
            print(f"  Extracted {names[0]} -> {dll_path.name}")
            return dll_path
    except Exception as e:
        print(f"  Zip source failed: {e}")

    # Try raw DLL
    try:
        with urllib.request.urlopen(sources[1], timeout=30) as r:
            dll_path.write_bytes(r.read())
        print(f"  Downloaded {dll_path.name}")
        return dll_path
    except Exception as e:
        raise RuntimeError(
            f"Could not download libusb-1.0.dll: {e}\n"
            "Download it manually from https://libusb.info and place\n"
            f"libusb-1.0.dll next to builder.py in: {here}"
        )


def build_exe():
    here = Path(__file__).parent

    print("=" * 60)
    print("Building PrintAgent.exe (single file) ...")
    print("=" * 60)

    # Ensure README exists (PyInstaller requires declared files to exist)
    readme = here / "README.txt"
    if not readme.exists():
        readme.write_text("PrintAgent - Universal USB Thermal Printer Service\n")

    # Get libusb DLL
    dll_path = get_libusb_dll(here)

    cmd = [
        "pyinstaller",
        "--onefile",
        "--console",
        "--name=PrintAgent",
        # Bundle libusb DLL — lands in same dir as exe when extracted
        f"--add-binary={dll_path};.",
        "--add-data=README.txt:.",
        "--hidden-import=aiohttp",
        "--hidden-import=aiohttp.web",
        "--hidden-import=aiohttp.web_runner",
        "--hidden-import=usb.core",
        "--hidden-import=usb.util",
        "--hidden-import=usb.backend.libusb1",
        "--hidden-import=usb.backend.libusb0",
        "--hidden-import=usb.backend.openusb",
        "--hidden-import=win32print",
        "--hidden-import=win32ui",
        "--hidden-import=pywintypes",
        "--hidden-import=pythoncom",
        "--collect-all=usb",
        "--collect-all=aiohttp",
        "--collect-all=multidict",
        "--collect-all=yarl",
        "agent.py",
    ]

    print("\nRunning:", " ".join(cmd), "\n")
    result = subprocess.run(cmd, cwd=str(here))

    if result.returncode != 0:
        print("\nBuild FAILED — see errors above.")
        sys.exit(result.returncode)

    exe = here / "dist" / "PrintAgent.exe"
    if exe.exists():
        mb = exe.stat().st_size / 1024 / 1024
        print(f"\nBuild SUCCESS: {exe}  ({mb:.1f} MB)")
    else:
        print("\nBuild finished but .exe not found — check dist/")


if __name__ == "__main__":
    build_exe()
