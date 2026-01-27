#!/bin/bash

# run.sh - POS System Docker Manager
set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Конфигурация сервисов
SERVICES=("admin_api" "database_api" "auth_api" "order_api" "rabbitmq")
SERVICE_LABELS=("Admin API" "Database API" "Auth API" "Order API" "RabbitMQ")

#=============================================================================
# Определение команды Compose
#=============================================================================
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD=""
fi

#=============================================================================
# Функции вывода
#=============================================================================
print_header() {
    clear
    printf "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${CYAN}║           POS System Docker Manager                       ║${NC}\n"
    printf "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
    printf "  Используется: ${MAGENTA}$COMPOSE_CMD${NC}\n\n"
}

print_success() { printf "${GREEN}✓${NC} $1\n"; }
print_error() { printf "${RED}✗${NC} $1\n"; }
print_info() { printf "${BLUE}ℹ${NC} $1\n"; }
print_warning() { printf "${YELLOW}⚠${NC} $1\n"; }
print_divider() { printf "${CYAN}────────────────────────────────────────────────────────────${NC}\n"; }

#=============================================================================
# Проверки окружения
#=============================================================================
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        exit 1
    fi
    
    if [ -z "$COMPOSE_CMD" ]; then
        print_error "Docker Compose не найден (нужен плагин или docker-compose)!"
        exit 1
    fi

    if ! [ -f "docker-compose-local.yml" ] && ! [ -f "docker-compose.yaml" ]; then
        print_error "Файл docker-compose.yml не найден в текущей директории!"
        exit 1
    fi
}

#=============================================================================
# Меню
#=============================================================================
show_main_menu() {
    print_header
    printf "${CYAN}Главное меню:${NC}\n"
    print_divider
    printf "  ${GREEN}[1]${NC}  Запустить все сервисы\n"
    printf "  ${GREEN}[2]${NC}  Остановить все сервисы\n"
    printf "  ${GREEN}[3]${NC}  Перезапустить все сервисы\n"
    printf "  ${GREEN}[4]${NC}  Собрать (build) и запустить всё\n\n"
    printf "  ${YELLOW}[5]${NC}  Управление конкретным сервисом\n"
    printf "  ${YELLOW}[6]${NC}  Логи всех сервисов\n\n"
    printf "  ${BLUE}[7]${NC}  Статус и ресурсы\n"
    printf "  ${BLUE}[8]${NC}  Войти в терминал (shell) сервиса\n\n"
    printf "  ${RED}[9]${NC}  Полная очистка (удаление volumes!)\n"
    printf "  ${RED}[0]${NC}  Выход\n"
    print_divider
}

show_service_menu() {
    printf "\n${CYAN}Выберите сервис:${NC}\n"
    for i in "${!SERVICES[@]}"; do
        printf "  ${GREEN}[$((i + 1))]${NC}  ${SERVICE_LABELS[$i]}\n"
    done
    printf "  ${RED}[0]${NC}  Отмена\n"
}

select_service() {
    while true; do
        show_service_menu
        read -p "Ваш выбор: " choice
        [[ "$choice" == "0" ]] && return 1
        if [[ "$choice" =~ ^[1-9]$ ]] && [ "$choice" -le "${#SERVICES[@]}" ]; then
            local index=$((choice - 1))
            SELECTED_SERVICE="${SERVICES[$index]}"
            SELECTED_SERVICE_LABEL="${SERVICE_LABELS[$index]}"
            return 0
        fi
        print_error "Неверный выбор."
    done
}

#=============================================================================
# Операции
#=============================================================================
start_all() {
    print_info "Запуск..."
    if $COMPOSE_CMD up -d; then
        print_success "Сервисы запущены!"
        printf "  • Admin API: http://localhost:8001/docs\n"
        printf "  • RabbitMQ UI: http://localhost:15672\n"
    fi
}

clean_all() {
    print_warning "Удалить ВСЕ данные и контейнеры?"
    read -p "Введите 'yes' для подтверждения: " confirm
    if [ "$confirm" = "yes" ]; then
        $COMPOSE_CMD down -v
        print_success "Очищено."
    else
        print_info "Отменено."
    fi
}

#=============================================================================
# Основной цикл
#=============================================================================
check_docker

while true; do
    show_main_menu
    read -p "Выберите действие: " main_choice
    case $main_choice in
        1) start_all ;;
        2) $COMPOSE_CMD down ;;
        3) $COMPOSE_CMD restart ;;
        4) $COMPOSE_CMD up -d --build ;;
        5) 
            if select_service; then
                printf "\n[1] Start [2] Stop [3] Restart [4] Build [5] Logs [0] Back\n"
                read -p "Действие для $SELECTED_SERVICE_LABEL: " svc_act
                case $svc_act in
                    1) $COMPOSE_CMD start "$SELECTED_SERVICE" ;;
                    2) $COMPOSE_CMD stop "$SELECTED_SERVICE" ;;
                    3) $COMPOSE_CMD restart "$SELECTED_SERVICE" ;;
                    4) $COMPOSE_CMD up -d --build "$SELECTED_SERVICE" ;;
                    5) $COMPOSE_CMD logs -f "$SELECTED_SERVICE" ;;
                esac
            fi
            ;;
        6) $COMPOSE_CMD logs -f ;;
        7) $COMPOSE_CMD ps && print_divider && docker stats --no-stream ;;
        8) 
            if select_service; then
                $COMPOSE_CMD exec "$SELECTED_SERVICE" sh || $COMPOSE_CMD exec "$SELECTED_SERVICE" bash
            fi
            ;;
        9) clean_all ;;
        0) exit 0 ;;
        *) print_error "Неверный ввод" ;;
    esac
    printf "\n"
    read -p "Нажмите Enter, чтобы продолжить..."
done
