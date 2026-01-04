import multiprocessing
import sys
import signal
from typing import List

def start_admin():
    """Запуск админ сервиса на порту 8004"""
    from admin import run_admin
    
    print("[*] Starting Admin Service on port 8004...")
    run_admin()

def start_db():
    """Запуск базы данных на порту 8003"""
    from database import run_database

    print("[*] Starting Database Service on port 8003...")
    run_database()


def start_auth():
    """Запуск сервиса авторизации на порту 8001"""
    from auth import run_auth

    print("[*] Starting Auth Service on port 8001...")
    run_auth()


def signal_handler(signum, frame, processes: List[multiprocessing.Process]):
    """Обработчик сигналов для graceful shutdown"""
    print("\n[*] Received shutdown signal. Terminating services...")
    for proc in processes:
        if proc.is_alive():
            proc.terminate()
            proc.join(timeout=3)
            if proc.is_alive():
                proc.kill()
    sys.exit(0)


def main():
    """Основная функция запуска микросервисов"""
    print("=" * 60)
    print("🚀 Launching Micro Services")
    print("=" * 60)

    # Создаем процессы
    db_proc = multiprocessing.Process(target=start_db, name="database")
    auth_proc = multiprocessing.Process(target=start_auth, name="auth")
    admin_proc = multiprocessing.Process(target=start_admin, name="admin")
    processes = [db_proc, auth_proc, admin_proc]

    try:
        # Запускаем сервисы
        auth_proc.start()
        db_proc.start()
        admin_proc.start()

        print("✅ All services started successfully!")
        for service in [db_proc, auth_proc, admin_proc]:
            print(f"[*] {service.name} -> {service.pid}")

        # Регистрируем обработчик сигналов
        signal.signal(signal.SIGINT, lambda s, f: signal_handler(s, f, processes))
        signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s, f, processes))

        # Ждем завершения процессов
        for proc in processes:
            proc.join()

    except KeyboardInterrupt:
        print("\n[*] KeyboardInterrupt received. Shutting down...")
    except Exception as e:
        print(f"❌ Error starting services: {e}")
    finally:
        # Graceful shutdown
        print("[*] Shutting down services...")
        for proc in processes:
            if proc.is_alive():
                proc.terminate()
                proc.join(timeout=5)
                if proc.is_alive():
                    proc.kill()

        print("👋 All services stopped.")
        sys.exit(0)


if __name__ == "__main__":
    multiprocessing.set_start_method("spawn", force=True)  # Для совместимости
    main()
