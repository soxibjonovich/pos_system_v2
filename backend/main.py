import multiprocessing
import signal
import socket
import subprocess
import sys
import time
from enum import Enum


class ServiceStatus(Enum):
    STARTING = "\033[93m⏳\033[0m"
    RUNNING = "\033[92m✅\033[0m"
    STOPPING = "\033[91m⏹\033[0m"
    STOPPED = "\033[90m⬛\033[0m"
    ERROR = "\033[91m❌\033[0m"

class Color:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    END = "\033[0m"

# --- Utility Helpers ---

def is_port_in_use(port: int) -> bool:
    """Checks if a local port is currently being used."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def print_status(status: ServiceStatus, message: str):
    print(f"{status.value} {message}")

def print_separator(char: str = "=", length: int = 60):
    print(f"{Color.CYAN}{char * length}{Color.END}")

# --- Service Wrappers ---

def start_admin():
    from admin import run_admin
    run_admin()

def start_db():
    from database import run_database
    run_database()

def start_auth():
    from auth import run_auth
    run_auth()

def start_order():
    from order import run_order
    run_order()

# --- Infrastructure Management ---

def stop_redis():
    """Attempts to stop any running Redis instance gracefully."""
    try:
        # Try using redis-cli for a graceful shutdown first
        subprocess.run(["redis-cli", "shutdown"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        # If redis-cli fails, we'll try to find and kill the process as a fallback
        subprocess.run(["pkill", "redis-server"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def start_redis() -> subprocess.Popen | None:
    if is_port_in_use(6379):
        print_status(ServiceStatus.STOPPING, "Redis already running. Restarting...")
        stop_redis()
        time.sleep(1) # Give OS time to release the port

    print_status(ServiceStatus.STARTING, "Starting Redis Server...")
    try:
        redis_proc = subprocess.Popen(
            ["redis-server", "--loglevel", "warning"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        time.sleep(1.5)
        
        if redis_proc.poll() is None:
            print_status(ServiceStatus.RUNNING, f"Redis Server started (PID: {redis_proc.pid})")
            return redis_proc
        else:
            print_status(ServiceStatus.ERROR, "Redis Server failed to start")
            return None
    except FileNotFoundError:
        print_status(ServiceStatus.ERROR, "Redis not found. Install with: brew install redis")
        return None

def stop_rabbitmq():
    """Stops RabbitMQ using rabbitmqctl."""
    print_status(ServiceStatus.STOPPING, "Stopping RabbitMQ Server...")
    try:
        subprocess.run(
            ["rabbitmqctl", "stop"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
            check=False
        )
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Error stopping RabbitMQ: {e}")

def start_rabbitmq() -> bool:
    # Check if RabbitMQ is already responding
    status_check = subprocess.run(
        ["rabbitmqctl", "status"], 
        stdout=subprocess.DEVNULL, 
        stderr=subprocess.DEVNULL
    )
    
    if status_check.returncode == 0:
        print_status(ServiceStatus.STOPPING, "RabbitMQ already running. Restarting...")
        stop_rabbitmq()
        time.sleep(2)

    print_status(ServiceStatus.STARTING, "Starting RabbitMQ Server...")
    try:
        subprocess.run(
            ["rabbitmq-server", "-detached"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )
        
        # Wait and verify
        for _ in range(5):
            time.sleep(2)
            check = subprocess.run(["rabbitmqctl", "status"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if check.returncode == 0:
                print_status(ServiceStatus.RUNNING, "RabbitMQ Server started")
                return True
        
        print_status(ServiceStatus.ERROR, "RabbitMQ took too long to start")
        return False
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Failed to start RabbitMQ: {e}")
        return False

# --- Signal Handling ---

def signal_handler(signum, frame, processes, redis_proc):
    print(f"\n{Color.YELLOW}Received shutdown signal{Color.END}")
    print_separator("-")
    
    # Close application processes first
    for proc in processes:
        if proc.is_alive():
            print_status(ServiceStatus.STOPPING, f"Stopping {proc.name}...")
            proc.terminate()
            proc.join(timeout=3)

    # Close infrastructure
    if redis_proc:
        print_status(ServiceStatus.STOPPING, "Stopping Redis...")
        redis_proc.terminate()
    
    stop_rabbitmq()
    
    print_separator()
    print(f"{Color.GREEN}All services stopped successfully{Color.END}")
    sys.exit(0)

# --- Main Entry ---

def main():
    print_separator()
    print(f"{Color.BOLD}{Color.BLUE}🚀 Launching POS System Microservices{Color.END}")
    print_separator()
    
    services_config = [
        {"name": "Database", "target": start_db, "port": 8002},
        {"name": "Auth", "target": start_auth, "port": 8003},
        {"name": "Admin", "target": start_admin, "port": 8001},
        {"name": "Order", "target": start_order, "port": 8004},
    ]
    
    processes = []
    redis_proc = None
    rabbitmq_started = False
    
    try:
        # 1. Infrastructure
        print(f"\n{Color.CYAN}Step 1: Infrastructure Setup{Color.END}")
        redis_proc = start_redis()
        if not redis_proc: raise Exception("Critical failure: Redis")
        
        rabbitmq_started = start_rabbitmq()
        if not rabbitmq_started: raise Exception("Critical failure: RabbitMQ")
        
        # 2. Application Services
        print(f"\n{Color.CYAN}Step 2: Application Services{Color.END}")
        for config in services_config:
            proc = multiprocessing.Process(target=config["target"], name=config["name"])
            proc.start()
            processes.append(proc)
            print_status(ServiceStatus.RUNNING, f"{config['name']} Service (PID: {proc.pid})")
            time.sleep(0.3)
        
        # 3. Success Info
        print(f"\n{Color.GREEN}{Color.BOLD}All systems online!{Color.END}")
        print("• Redis: 6379 | RabbitMQ: 5672 | Admin: http://localhost:8001/docs")
        print_separator()
        
        # Signal Management
        handler = lambda s, f: signal_handler(s, f, processes, redis_proc)
        signal.signal(signal.SIGINT, handler)
        signal.signal(signal.SIGTERM, handler)
        
        for proc in processes:
            proc.join()
            
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Startup Aborted: {e}")
        # Basic cleanup logic here or call signal_handler
        sys.exit(1)

if __name__ == "__main__":
    # Use 'spawn' for consistency across OSs (especially macOS/Windows)
    multiprocessing.set_start_method("spawn", force=True)
    main()