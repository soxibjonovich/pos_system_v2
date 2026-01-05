import multiprocessing
import sys
import signal
import subprocess
from typing import List


def start_admin():
    """Запуск админ сервиса на порту 8001"""
    from admin import run_admin

    run_admin()


def start_db():
    """Запуск базы данных на порту 8002"""
    from database import run_database

    run_database()


def start_auth():
    """Запуск сервиса авторизации на порту 8003"""
    from auth import run_auth

    run_auth()


def start_order():
    """Запуск сервиса ордеров на порту 8004"""
    from order import run_order

    run_order()


def start_redis():
    """Запуск Redis сервиса"""
    print("\033[92m[*] Starting Redis Server...\033[0m")  # Green for success
    redis_proc = subprocess.Popen(
        ["redis-server", "--loglevel", "warning"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    redis_proc.wait()
    return redis_proc


def stop_redis(redis_proc):
    """Gracefully stop Redis"""
    if redis_proc:
        print("\033[91m[*] Stopping Redis Server...\033[0m")  # Red for action
        redis_proc.terminate()  # Attempt graceful shutdown
        try:
            redis_proc.wait(timeout=5)  # Wait for termination
        except subprocess.TimeoutExpired:
            print(
                "\033[91m[*] Redis did not shut down gracefully. Force killing...\033[0m"
            )
            redis_proc.kill()  # Force kill if not terminated
        print("\033[92m[*] Redis Server stopped.\033[0m")  # Green for success


def signal_handler(signum, frame, processes: List[multiprocessing.Process], redis_proc):
    """Обработчик сигналов для graceful shutdown"""
    print("\n\033[93m[*] Received shutdown signal. Terminating services...\033[0m")

    # Stop Redis before terminating other processes
    stop_redis(redis_proc)

    for proc in processes:
        if proc.is_alive():
            print(f"\033[93m[*] Stopping {proc.name}...\033[0m")
            proc.terminate()
            proc.join(timeout=3)
            if proc.is_alive():
                proc.kill()  # Force kill if not terminated
            print(f"\033[92m[*] {proc.name} stopped.\033[0m")

    print("\033[92m[*] All services stopped.\033[0m")
    sys.exit(0)


def main():
    """Основная функция запуска микросервисов"""
    print("=" * 60)
    print("\033[94m🚀 Launching Micro Services...\033[0m")
    print("=" * 60)

    # Create processes for each service
    db_proc = multiprocessing.Process(target=start_db, name="Database")
    auth_proc = multiprocessing.Process(target=start_auth, name="Auth")
    admin_proc = multiprocessing.Process(target=start_admin, name="Admin")
    order_proc = multiprocessing.Process(target=start_order, name="Order")

    # Redis will be handled separately (start and stop)
    redis_proc = None

    processes = [db_proc, auth_proc, admin_proc, order_proc]

    try:
        # Start Redis first
        redis_proc = start_redis()

        # Start all other services
        db_proc.start()
        auth_proc.start()
        admin_proc.start()
        order_proc.start()

        print("\033[92m✅ All services started successfully!\033[0m")
        for service in [db_proc, auth_proc, admin_proc, order_proc]:
            print(f"\033[94m[*] {service.name} -> PID: {service.pid}\033[0m")

        # Register signal handlers
        signal.signal(
            signal.SIGINT, lambda s, f: signal_handler(s, f, processes, redis_proc)
        )
        signal.signal(
            signal.SIGTERM, lambda s, f: signal_handler(s, f, processes, redis_proc)
        )

        # Wait for all processes to finish
        for proc in processes:
            proc.join()

    except KeyboardInterrupt:
        print("\n\033[93m[*] KeyboardInterrupt received. Shutting down...\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Error starting services: {e}\033[0m")
    finally:
        # Graceful shutdown
        print("\033[93m[*] Shutting down services...\033[0m")
        for proc in processes:
            if proc.is_alive():
                proc.terminate()
                proc.join(timeout=5)
                if proc.is_alive():
                    proc.kill()

        # Ensure Redis is also shut down
        stop_redis(redis_proc)

        print("\033[92m👋 All services stopped.\033[0m")
        sys.exit(0)


if __name__ == "__main__":
    # Set the start method for multiprocessing (necessary on macOS)
    multiprocessing.set_start_method("spawn", force=True)
    main()
