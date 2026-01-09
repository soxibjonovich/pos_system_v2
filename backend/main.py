import multiprocessing
import sys
import signal
import subprocess
import time
from typing import List
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
    UNDERLINE = "\033[4m"
    END = "\033[0m"


def print_status(status: ServiceStatus, message: str):
    print(f"{status.value} {message}")


def print_separator(char: str = "=", length: int = 60):
    print(f"{Color.CYAN}{char * length}{Color.END}")


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


def start_redis() -> subprocess.Popen | None:
    print_status(ServiceStatus.STARTING, "Starting Redis Server...")
    
    try:
        redis_proc = subprocess.Popen(
            ["redis-server", "--loglevel", "warning"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        time.sleep(1)
        
        if redis_proc.poll() is None:
            print_status(ServiceStatus.RUNNING, f"Redis Server started (PID: {redis_proc.pid})")
            return redis_proc
        else:
            print_status(ServiceStatus.ERROR, "Redis Server failed to start")
            return None
            
    except FileNotFoundError:
        print_status(ServiceStatus.ERROR, "Redis not found. Install with: brew install redis")
        return None
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Failed to start Redis: {e}")
        return None


def stop_redis(redis_proc: subprocess.Popen | None):
    if not redis_proc:
        return
    
    print_status(ServiceStatus.STOPPING, "Stopping Redis Server...")
    redis_proc.terminate()
    
    try:
        redis_proc.wait(timeout=5)
        print_status(ServiceStatus.STOPPED, "Redis Server stopped")
    except subprocess.TimeoutExpired:
        print_status(ServiceStatus.ERROR, "Redis did not stop gracefully. Force killing...")
        redis_proc.kill()
        print_status(ServiceStatus.STOPPED, "Redis Server killed")


def start_rabbitmq() -> bool:
    print_status(ServiceStatus.STARTING, "Starting RabbitMQ Server...")
    
    try:
        result = subprocess.run(
            ["rabbitmq-server", "-detached"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10
        )
        
        time.sleep(3)
        
        status_check = subprocess.run(
            ["rabbitmqctl", "status"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5
        )
        
        if status_check.returncode == 0:
            print_status(ServiceStatus.RUNNING, "RabbitMQ Server started")
            return True
        else:
            print_status(ServiceStatus.ERROR, "RabbitMQ Server failed to start")
            return False
            
    except FileNotFoundError:
        print_status(ServiceStatus.ERROR, "RabbitMQ not found. Install with: brew install rabbitmq")
        return False
    except subprocess.TimeoutExpired:
        print_status(ServiceStatus.ERROR, "RabbitMQ startup timeout")
        return False
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Failed to start RabbitMQ: {e}")
        return False


def stop_rabbitmq():
    print_status(ServiceStatus.STOPPING, "Stopping RabbitMQ Server...")
    
    try:
        subprocess.run(
            ["rabbitmqctl", "stop"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
            check=True
        )
        print_status(ServiceStatus.STOPPED, "RabbitMQ Server stopped")
    except subprocess.CalledProcessError:
        print_status(ServiceStatus.ERROR, "Failed to stop RabbitMQ gracefully")
    except subprocess.TimeoutExpired:
        print_status(ServiceStatus.ERROR, "RabbitMQ stop timeout")
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Error stopping RabbitMQ: {e}")


def signal_handler(
    signum,
    frame,
    processes: List[multiprocessing.Process],
    redis_proc: subprocess.Popen | None
):
    print(f"\n{Color.YELLOW}Received shutdown signal{Color.END}")
    print_separator()
    
    stop_redis(redis_proc)
    stop_rabbitmq()
    
    for proc in processes:
        if proc.is_alive():
            print_status(ServiceStatus.STOPPING, f"Stopping {proc.name}...")
            proc.terminate()
            proc.join(timeout=5)
            
            if proc.is_alive():
                print_status(ServiceStatus.ERROR, f"Force killing {proc.name}...")
                proc.kill()
                proc.join(timeout=2)
            
            print_status(ServiceStatus.STOPPED, f"{proc.name} stopped")
    
    print_separator()
    print(f"{Color.GREEN}All services stopped successfully{Color.END}")
    sys.exit(0)


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
        # Start infrastructure services
        print(f"\n{Color.CYAN}Starting Infrastructure Services{Color.END}")
        print_separator("-")
        
        redis_proc = start_redis()
        if not redis_proc:
            raise Exception("Redis failed to start")
        
        rabbitmq_started = start_rabbitmq()
        if not rabbitmq_started:
            raise Exception("RabbitMQ failed to start")
        
        # Start application services
        print(f"\n{Color.CYAN}Starting Application Services{Color.END}")
        print_separator("-")
        
        for config in services_config:
            proc = multiprocessing.Process(
                target=config["target"],
                name=config["name"]
            )
            proc.start()
            time.sleep(0.5)
            processes.append(proc)
            print_status(
                ServiceStatus.RUNNING,
                f"{config['name']} Service (Port: {config['port']}, PID: {proc.pid})"
            )
        
        # Summary
        print(f"\n{Color.GREEN}{Color.BOLD}All services started successfully!{Color.END}")
        print_separator()
        
        print(f"{Color.CYAN}Service Endpoints:{Color.END}")
        for config in services_config:
            print(f"  • {config['name']:12} http://localhost:{config['port']}/docs")
        
        print(f"\n{Color.CYAN}Infrastructure:{Color.END}")
        print(f"  • Redis:        localhost:6379")
        print(f"  • RabbitMQ:     http://localhost:15672 (guest/guest)")
        
        print_separator()
        print(f"{Color.YELLOW}Press Ctrl+C to stop all services{Color.END}\n")
        
        # Setup signal handlers
        signal.signal(
            signal.SIGINT,
            lambda s, f: signal_handler(s, f, processes, redis_proc)
        )
        signal.signal(
            signal.SIGTERM,
            lambda s, f: signal_handler(s, f, processes, redis_proc)
        )
        
        # Wait for all processes
        for proc in processes:
            proc.join()
    
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}KeyboardInterrupt received{Color.END}")
        signal_handler(None, None, processes, redis_proc)
    
    except Exception as e:
        print_status(ServiceStatus.ERROR, f"Startup failed: {e}")
        
        # Cleanup
        for proc in processes:
            if proc.is_alive():
                proc.terminate()
                proc.join(timeout=3)
                if proc.is_alive():
                    proc.kill()
        
        stop_redis(redis_proc)
        if rabbitmq_started:
            stop_rabbitmq()
        
        sys.exit(1)
    
    finally:
        print(f"\n{Color.GREEN}Shutdown complete{Color.END}")


if __name__ == "__main__":
    multiprocessing.set_start_method("spawn", force=True)
    main()