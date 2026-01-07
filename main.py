import multiprocessing
import sys
import signal
import subprocess
from typing import List


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


def start_redis():
    """Запуск Redis сервиса"""
    print("\033[92m[*] Starting Redis Server...\033[0m")
    redis_proc = subprocess.Popen(
        ["redis-server", "--loglevel", "warning"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return redis_proc


def stop_redis(redis_proc):
    """Graceful stop Redis"""
    if redis_proc:
        print("\033[91m[*] Stopping Redis Server...\033[0m")
        redis_proc.terminate()
        try:
            redis_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("\033[91m[*] Redis did not shut down gracefully. Force killing...\033[0m")
            redis_proc.kill()
        print("\033[92m[*] Redis Server stopped.\033[0m")


def start_rabbitmq():
    """Запуск RabbitMQ сервера"""
    print("\033[92m[*] Starting RabbitMQ Server...\033[0m")
    rabbitmq_proc = subprocess.Popen(
        ["rabbitmq-server", "-detached"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    # Optional: wait a few seconds to ensure server starts
    import time
    time.sleep(3)
    print("\033[92m[*] RabbitMQ Server started.\033[0m")
    return rabbitmq_proc


def stop_rabbitmq():
    """Graceful stop RabbitMQ"""
    print("\033[91m[*] Stopping RabbitMQ Server...\033[0m")
    try:
        subprocess.run(["rabbitmqctl", "stop"], check=True)
    except subprocess.CalledProcessError:
        print("\033[91m❌ Failed to stop RabbitMQ gracefully.\033[0m")
    print("\033[92m[*] RabbitMQ Server stopped.\033[0m")


def signal_handler(signum, frame, processes: List[multiprocessing.Process], redis_proc):
    """Обработчик сигналов для graceful shutdown"""
    print("\n\033[93m[*] Received shutdown signal. Terminating services...\033[0m")

    stop_redis(redis_proc)
    stop_rabbitmq()

    for proc in processes:
        if proc.is_alive():
            print(f"\033[93m[*] Stopping {proc.name}...\033[0m")
            proc.terminate()
            proc.join(timeout=3)
            if proc.is_alive():
                proc.kill()
            print(f"\033[92m[*] {proc.name} stopped.\033[0m")

    print("\033[92m[*] All services stopped.\033[0m")
    sys.exit(0)


def main():
    print("=" * 60)
    print("\033[94m🚀 Launching Micro Services...\033[0m")
    print("=" * 60)

    db_proc = multiprocessing.Process(target=start_db, name="Database")
    auth_proc = multiprocessing.Process(target=start_auth, name="Auth")
    admin_proc = multiprocessing.Process(target=start_admin, name="Admin")
    order_proc = multiprocessing.Process(target=start_order, name="Order")

    processes = [db_proc, auth_proc, admin_proc, order_proc]

    redis_proc = None
    rabbitmq_proc = None

    try:
        # Start Redis and RabbitMQ
        redis_proc = start_redis()
        rabbitmq_proc = start_rabbitmq()

        # Start other services
        for proc in processes:
            proc.start()

        print("\033[92m✅ All services started successfully!\033[0m")
        for service in processes:
            print(f"\033[94m[*] {service.name} -> PID: {service.pid}\033[0m")

        # Signal handling
        signal.signal(signal.SIGINT, lambda s, f: signal_handler(s, f, processes, redis_proc))
        signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s, f, processes, redis_proc))

        for proc in processes:
            proc.join()

    except KeyboardInterrupt:
        print("\n\033[93m[*] KeyboardInterrupt received. Shutting down...\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Error starting services: {e}\033[0m")
    finally:
        for proc in processes:
            if proc.is_alive():
                proc.terminate()
                proc.join(timeout=5)
                if proc.is_alive():
                    proc.kill()

        stop_redis(redis_proc)
        stop_rabbitmq()

        print("\033[92m👋 All services stopped.\033[0m")
        sys.exit(0)


if __name__ == "__main__":
    multiprocessing.set_start_method("spawn", force=True)
    main()
