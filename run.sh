#!/bin/bash
set -euo pipefail

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
W='\033[1;37m'
N='\033[0m'

declare -a SERVICES=()
declare -a LABELS=()
declare -a PORTS=()

COMPOSE_CMD=""

label_for_service() {
    case "$1" in
        database_api) echo "Database API" ;;
        auth_api) echo "Auth API" ;;
        admin_api) echo "Admin API" ;;
        staff_api) echo "Staff API" ;;
        order_api) echo "Order API" ;;
        frontend) echo "Frontend" ;;
        rabbitmq) echo "RabbitMQ" ;;
        redis) echo "Redis" ;;
        *) echo "$1" ;;
    esac
}

port_for_service() {
    case "$1" in
        database_api) echo "8002" ;;
        auth_api) echo "8000" ;;
        admin_api) echo "8001" ;;
        staff_api) echo "8003" ;;
        order_api) echo "8004" ;;
        frontend) echo "80" ;;
        rabbitmq) echo "15672" ;;
        redis) echo "6379" ;;
        *) echo "-" ;;
    esac
}

print_header() {
    clear
    printf "${C}╔════════════════════════════════════════════════════════════╗${N}\n"
    printf "${C}║${W}              POS System v2 Docker Manager                ${C}║${N}\n"
    printf "${C}╚════════════════════════════════════════════════════════════╝${N}\n\n"
}

print_success() { printf "${G}✓${N} %s\n" "$1"; }
print_error() { printf "${R}✗${N} %s\n" "$1"; }
print_info() { printf "${B}ℹ${N} %s\n" "$1"; }
print_warning() { printf "${Y}⚠${N} %s\n" "$1"; }
print_divider() { printf "${C}────────────────────────────────────────────────────────────${N}\n"; }

check_dependencies() {
    local missing=0

    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed"
        missing=1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        missing=1
    fi

    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose is not installed"
        missing=1
    fi

    if [ "$missing" -eq 1 ]; then
        exit 1
    fi

}

check_env() {
    if [ ! -f .env ]; then
        print_warning "No .env file found"
        if [ -f .env.example ]; then
            printf "\n${Y}Create .env from .env.example?${N} (y/n): "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                cp .env.example .env
                print_success ".env created"
            fi
        fi
    fi
}

load_services() {
    SERVICES=()
    while IFS= read -r service; do
        [ -n "$service" ] && SERVICES+=("$service")
    done < <($COMPOSE_CMD config --services)
    if [ "${#SERVICES[@]}" -eq 0 ]; then
        print_error "No services found in docker-compose.yml"
        exit 1
    fi

    LABELS=()
    PORTS=()
    for service in "${SERVICES[@]}"; do
        LABELS+=("$(label_for_service "$service")")
        PORTS+=("$(port_for_service "$service")")
    done
}

show_known_urls() {
    printf "\n${C}Services are available at:${N}\n"
    for service in "${SERVICES[@]}"; do
        case "$service" in
            admin_api) printf "  • ${W}Admin API:${N}    http://localhost:8001/docs\n" ;;
            database_api) printf "  • ${W}Database API:${N} http://localhost:8002/docs\n" ;;
            auth_api) printf "  • ${W}Auth API:${N}     http://localhost:8000/docs\n" ;;
            staff_api) printf "  • ${W}Staff API:${N}    http://localhost:8003/docs\n" ;;
            order_api) printf "  • ${W}Order API:${N}    http://localhost:8004/docs\n" ;;
            frontend) printf "  • ${W}Frontend:${N}     http://localhost\n" ;;
            rabbitmq) printf "  • ${W}RabbitMQ:${N}     http://localhost:15672\n" ;;
        esac
    done
}

main_menu() {
    print_header
    printf "${C}Main Menu:${N}\n"
    print_divider
    printf "\n  ${G}[1]${N}  Start all services\n"
    printf "  ${G}[2]${N}  Stop all services\n"
    printf "  ${G}[3]${N}  Restart all services\n"
    printf "  ${G}[4]${N}  Build and start all\n\n"
    printf "  ${Y}[5]${N}  Manage single service\n"
    printf "  ${Y}[6]${N}  View logs\n"
    printf "  ${Y}[7]${N}  System status\n\n"
    printf "  ${B}[8]${N}  Shell access\n"
    printf "  ${B}[9]${N}  Health check\n\n"
    printf "  ${R}[10]${N} Clean volumes\n"
    printf "  ${R}[11]${N} Clean everything\n\n"
    printf "  ${R}[0]${N}  Exit\n\n"
    print_divider
}

service_menu() {
    printf "\n${C}Select service:${N}\n\n"
    for i in "${!SERVICES[@]}"; do
        printf "  ${G}[%d]${N}  %s ${W}(port %s)${N}\n" \
            "$((i + 1))" "${LABELS[$i]}" "${PORTS[$i]}"
    done
    printf "  ${R}[0]${N}  Back\n\n"
}

service_action_menu() {
    printf "\n${C}Actions for ${W}%s${C}:${N}\n\n" "$1"
    printf "  ${G}[1]${N}  Start\n"
    printf "  ${G}[2]${N}  Stop\n"
    printf "  ${G}[3]${N}  Restart\n"
    printf "  ${Y}[4]${N}  Rebuild\n"
    printf "  ${B}[5]${N}  View logs\n"
    printf "  ${B}[6]${N}  Follow logs\n"
    printf "  ${B}[7]${N}  Shell access\n"
    printf "  ${R}[0]${N}  Back\n\n"
}

select_service() {
    while true; do
        service_menu
        read -r -p "Choice [0-${#SERVICES[@]}]: " choice

        [[ "$choice" == "0" ]] && return 1

        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#SERVICES[@]}" ]; then
            local index=$((choice - 1))
            SELECTED_SERVICE="${SERVICES[$index]}"
            SELECTED_LABEL="${LABELS[$index]}"
            SELECTED_PORT="${PORTS[$index]}"
            return 0
        fi

        print_error "Invalid choice"
        sleep 1
    done
}

start_all() {
    print_info "Starting all services"
    printf "\n"
    if $COMPOSE_CMD up -d; then
        print_success "All services started"
        show_known_urls
    else
        print_error "Failed to start services"
    fi
}

stop_all() {
    print_info "Stopping all services"
    printf "\n"
    if $COMPOSE_CMD down; then
        print_success "All services stopped"
    else
        print_error "Failed to stop services"
    fi
}

restart_all() {
    print_info "Restarting all services"
    printf "\n"
    if $COMPOSE_CMD restart; then
        print_success "All services restarted"
    else
        print_error "Failed to restart services"
    fi
}

build_all() {
    print_info "Building and starting all services"
    printf "\n"
    if $COMPOSE_CMD up -d --build; then
        print_success "All services built and started"
        show_known_urls
    else
        print_error "Failed to build/start services"
    fi
}

system_status() {
    print_header
    print_info "System status"
    print_divider
    printf "\n"
    $COMPOSE_CMD ps
    printf "\n"

    local ids
    ids="$($COMPOSE_CMD ps -q 2>/dev/null || true)"
    if [ -n "$ids" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $ids
    else
        print_warning "No containers running"
    fi
}

view_all_logs() {
    print_info "Following logs (Ctrl+C to exit)"
    printf "\n"
    $COMPOSE_CMD logs -f --tail=100
}

health_check() {
    print_header
    print_info "Health check"
    print_divider
    printf "\n"

    for i in "${!SERVICES[@]}"; do
        local service="${SERVICES[$i]}"
        local label="${LABELS[$i]}"
        local container_id
        container_id="$($COMPOSE_CMD ps -q "$service" 2>/dev/null || true)"

        printf "${W}%s:${N} " "$label"

        if [ -z "$container_id" ]; then
            print_error "Not running"
            continue
        fi

        local health
        health="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

        if [ "$health" = "healthy" ]; then
            print_success "Healthy"
        elif [ "$health" = "unhealthy" ]; then
            print_error "Unhealthy"
        elif [ -n "$health" ]; then
            print_warning "Health: $health"
        else
            print_success "Running"
        fi
    done
}

clean_volumes() {
    print_warning "This removes all compose volumes and data"
    read -r -p "Type 'yes' to confirm: " confirm
    [ "$confirm" != "yes" ] && return
    $COMPOSE_CMD down -v
    print_success "Volumes removed"
}

clean_all() {
    print_warning "This removes containers, volumes, images, and orphans"
    read -r -p "Type 'yes' to confirm: " confirm
    [ "$confirm" != "yes" ] && return
    $COMPOSE_CMD down -v --rmi all --remove-orphans
    print_success "Everything cleaned"
}

start_service() {
    print_info "Starting $2"
    if $COMPOSE_CMD up -d "$1"; then
        print_success "$2 started"
    else
        print_error "Failed to start $2"
    fi
}

stop_service() {
    print_info "Stopping $2"
    if $COMPOSE_CMD stop "$1"; then
        print_success "$2 stopped"
    else
        print_error "Failed to stop $2"
    fi
}

restart_service() {
    print_info "Restarting $2"
    if $COMPOSE_CMD restart "$1"; then
        print_success "$2 restarted"
    else
        print_error "Failed to restart $2"
    fi
}

rebuild_service() {
    print_warning "Rebuild $2?"
    read -r -p "Continue? (y/n): " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && return

    print_info "Rebuilding $2"
    if $COMPOSE_CMD up -d --build "$1"; then
        print_success "$2 rebuilt"
    else
        print_error "Failed to rebuild $2"
    fi
}

view_service_logs() {
    print_info "Recent logs for $2"
    printf "\n"
    $COMPOSE_CMD logs --tail=50 "$1"
}

follow_service_logs() {
    print_info "Following logs for $2 (Ctrl+C to exit)"
    printf "\n"
    $COMPOSE_CMD logs -f --tail=100 "$1"
}

service_shell() {
    local container_id
    container_id="$($COMPOSE_CMD ps -q "$1" 2>/dev/null || true)"
    if [ -z "$container_id" ]; then
        print_error "$2 is not running"
        return 1
    fi

    print_info "Opening shell for $2"
    docker exec -it "$container_id" sh 2>/dev/null || docker exec -it "$container_id" bash
}

manage_service() {
    select_service || return

    while true; do
        print_header
        service_action_menu "$SELECTED_LABEL"
        read -r -p "Choice [0-7]: " action

        case "$action" in
            1) start_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            2) stop_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            3) restart_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            4) rebuild_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            5) view_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            6) follow_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            7) service_shell "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            0) return ;;
            *) print_error "Invalid choice" ;;
        esac

        if [ "$action" != "6" ] && [ "$action" != "7" ]; then
            printf "\n"
            read -r -p "Press Enter to continue..."
        fi
    done
}

view_logs_menu() {
    select_service && follow_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL"
}

shell_menu() {
    select_service && service_shell "$SELECTED_SERVICE" "$SELECTED_LABEL"
}

main() {
    check_dependencies
    check_env
    load_services

    while true; do
        main_menu
        read -r -p "Choice [0-11]: " choice

        case "$choice" in
            1) start_all ;;
            2) stop_all ;;
            3) restart_all ;;
            4) build_all ;;
            5) manage_service ;;
            6) view_logs_menu ;;
            7) system_status ;;
            8) shell_menu ;;
            9) health_check ;;
            10) clean_volumes ;;
            11) clean_all ;;
            0) printf "\n"; print_success "Goodbye"; printf "\n"; exit 0 ;;
            *) print_error "Invalid choice" ;;
        esac

        if [ "$choice" != "5" ] && [ "$choice" != "6" ] && [ "$choice" != "8" ]; then
            printf "\n"
            read -r -p "Press Enter to continue..."
        fi
    done
}

main
