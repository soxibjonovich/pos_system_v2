# Makefile
.PHONY: build up down logs restart clean

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

clean:
	docker-compose down -v
	rm -rf data/*.db

shell-db:
	docker exec -it pos_database sh

shell-auth:
	docker exec -it pos_auth sh

shell-admin:
	docker exec -it pos_admin sh

shell-order:
	docker exec -it pos_order sh

ps:
	docker-compose ps

health:
	@echo "Checking services health..."
	@curl -s http://localhost:8002/health | jq
	@curl -s http://localhost:8003/health | jq
	@curl -s http://localhost:8004/health | jq
	@curl -s http://localhost:8005/health | jq