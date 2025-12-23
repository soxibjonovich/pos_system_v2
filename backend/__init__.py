import multiprocessing
import sys


def start_api():
    from .__main__ import run_app

    run_app()


def main():
    print("=" * 60)
    print("🚀 Launching Password Manager Microservices")
    print("=" * 60)

    api_proc = multiprocessing.Process(target=start_api)

    try:
        api_proc.start()

        print("✅ All services started successfully!")

        api_proc.join()
    except Exception as e:
        print(f"❌ Error starting services: {e}")

        api_proc.terminate()

        sys.exit(1)

    except KeyboardInterrupt as e:
        print(f"❌ Error starting services: {e}")

        api_proc.terminate()

        sys.exit(1)


if __name__ == "__main__":
    main()
