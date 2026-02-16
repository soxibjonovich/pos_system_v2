#!/bin/bash
set -e

# =========================
# POS System v2 - Improved Docker Manager
# =========================

# Colors
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
W='\033[1;37m'
N='\033[0m'

# Services configuration
SERVICES=(
    "database_api"
    "auth_api"
    "admin_api"
    "order_api"
    "printer_api"
    "frontend"
    "rabbitmq"
    "redis"
)

LABELS=(
    "Database API"
    "Auth API"
    "Admin API"
    "Order API"
    "Printer API"
    "Frontend"
    "RabbitMQ"
    "Redis"
)

PORTS=(
    "8002"
    "8003"
    "8001"
    "8004"
    "8005"
    "80"
    "15672"
    "6379"
)

# Print helpers
print_header() {
    clear
    printf "${C}╔════════════════════════════════════════════════════════════╗${N}\n"
    printf "${C}║${W}              POS System v2 Docker Manager                ${C}║${N}\n"
    printf "${C}╚════════════════════════════════════════════════════════════╝${N}\n\n"
}

print_success() { printf "${G}✓${N} $1\n"; }
print_error() { printf "${R}✗${N} $1\n"; }
print_info() { printf "${B}ℹ${N} $1\n"; }
print_warning() { printf "${Y}⚠${N} $1\n"; }
print_divider() { printf "${C}────────────────────────────────────────────────────────────${N}\n"; }

# Check dependencies
check_dependencies() {
    local missing=0
    
    if ! command -v docker &>/dev/null; then
        print_error "Docker is not installed!"
        printf "\n${Y}Install from:${N} https://docs.docker.com/get-docker/\n"
        missing=1
    fi
    
    if ! docker info &>/dev/null; then
        print_error "Docker daemon is not running!"
        printf "\n${Y}Start Docker Desktop or run:${N} sudo systemctl start docker\n"
        missing=1
    fi
    
    if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
        print_error "Docker Compose is not installed!"
        printf "\n${Y}Install from:${N} https://docs.docker.com/compose/install/\n"
        missing=1
    fi
    
    [ $missing -eq 1 ] && exit 1
    
    # Set compose command
    if docker compose version &>/dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
}

# Check .env file
check_env() {
    if [ ! -f .env ]; then
        print_warning "No .env file found!"
        if [ -f .env.example ]; then
            printf "\n${Y}Create .env from .env.example?${N} (y/n): "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                cp .env.example .env
                print_success ".env file created"
                print_info "Please edit .env file with your configuration"
                printf "\n"
                read -p "Press Enter to continue..."
            fi
        else
            print_warning "Running with default values"
        fi
    fi
}

# Main menu
main_menu() {
    print_header
    printf "${C}Main Menu:${N}\n"
    print_divider
    printf "\n  ${G}[1]${N}  🚀 Start all services\n"
    printf "  ${G}[2]${N}  🛑 Stop all services\n"
    printf "  ${G}[3]${N}  🔄 Restart all services\n"
    printf "  ${G}[4]${N}  🔨 Build & start all\n\n"
    printf "  ${Y}[5]${N}  ⚙️  Manage individual service\n"
    printf "  ${Y}[6]${N}  📋 View logs\n"
    printf "  ${Y}[7]${N}  📊 System status\n\n"
    printf "  ${B}[8]${N}  🐚 Shell access\n"
    printf "  ${B}[9]${N}  🔍 Health check\n\n"
    printf "  ${M}[10]${N} 🗑️  Clean volumes\n"
    printf "  ${M}[11]${N} 🧹 Clean everything\n\n"
    printf "  ${R}[0]${N}  ❌ Exit\n\n"
    print_divider
}

# Service selection menu
service_menu() {
    printf "\n${C}Select service:${N}\n\n"
    for i in "${!SERVICES[@]}"; do
        printf "  ${G}[$((i+1))]${N}  ${LABELS[$i]} ${W}(port ${PORTS[$i]})${N}\n"
    done
    printf "  ${R}[0]${N}  ← Back\n\n"
}

# Service action menu
service_action_menu() {
    printf "\n${C}Actions for ${M}$1${C}:${N}\n\n"
    printf "  ${G}[1]${N}  ▶️  Start\n"
    printf "  ${G}[2]${N}  ⏸️  Stop\n"
    printf "  ${G}[3]${N}  🔄 Restart\n"
    printf "  ${Y}[4]${N}  🔨 Rebuild\n"
    printf "  ${B}[5]${N}  📋 View logs\n"
    printf "  ${B}[6]${N}  📋 Follow logs\n"
    printf "  ${B}[7]${N}  🐚 Shell access\n"
    printf "  ${R}[0]${N}  ← Back\n\n"
}

# Select service
select_service() {
    while true; do
        service_menu
        read -p "Choice [0-${#SERVICES[@]}]: " choice
        
        [[ "$choice" == "0" ]] && return 1
        
        if [[ "$choice" =~ ^[1-9][0-9]*$ ]] && [ "$choice" -le "${#SERVICES[@]}" ]; then
            local index=$((choice-1))
            SELECTED_SERVICE="${SERVICES[$index]}"
            SELECTED_LABEL="${LABELS[$index]}"
            SELECTED_PORT="${PORTS[$index]}"
            return 0
        fi
        
        print_error "Invalid choice!"
        sleep 1
    done
}

# Start all services
start_all() {
    print_info "Starting all services..."
    printf "\n"
    
    if $COMPOSE_CMD up -d; then
        printf "\n"
        print_success "All services started!"
        printf "\n${C}Services are available at:${N}\n"
        printf "  • ${W}Admin API:${N}    http://localhost:8001/docs\n"
        printf "  • ${W}Database API:${N} http://localhost:8002/docs\n"
        printf "  • ${W}Auth API:${N}     http://localhost:8003/docs\n"
        printf "  • ${W}Order API:${N}    http://localhost:8004/docs\n"
        printf "  • ${W}Printer API:${N}  http://localhost:8005/docs\n"
        printf "  • ${W}Frontend:${N}     http://localhost\n"
        printf "  • ${W}RabbitMQ:${N}     http://localhost:15672 (guest/guest)\n"
    else
        printf "\n"
        print_error "Failed to start services!"
        printf "\n${Y}Check logs with option [6] for details${N}\n"
    fi
}

# Stop all services
stop_all() {
    print_info "Stopping all services..."
    printf "\n"
    
    if $COMPOSE_CMD down; then
        printf "\n"
        print_success "All services stopped!"
    else
        printf "\n"
        print_error "Failed to stop services!"
    fi
}

# Restart all services
restart_all() {
    print_info "Restarting all services..."
    printf "\n"
    
    if $COMPOSE_CMD restart; then
        printf "\n"
        print_success "All services restarted!"
    else
        printf "\n"
        print_error "Failed to restart services!"
    fi
}

# Build and start all
build_all() {
    print_info "Building and starting all services..."
    print_warning "This may take several minutes..."
    printf "\n"
    
    if $COMPOSE_CMD up -d --build; then
        printf "\n"
        print_success "All services built and started!"
    else
        printf "\n"
        print_error "Failed to build services!"
    fi
}

# System status
system_status() {
    print_header
    print_info "System Status"
    print_divider
    printf "\n"
    
    $COMPOSE_CMD ps
    
    printf "\n"
    print_divider
    print_info "Resource Usage"
    printf "\n"
    
    local ids=$($COMPOSE_CMD ps -q 2>/dev/null)
    if [ -n "$ids" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $ids
    else
        print_warning "No containers running"
    fi
}

# View all logs
view_all_logs() {
    print_info "Viewing all logs (Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    $COMPOSE_CMD logs -f --tail=100
}

# Health check
health_check() {
    print_header
    print_info "Health Check Results"
    print_divider
    printf "\n"
    
    for i in "${!SERVICES[@]}"; do
        local service="${SERVICES[$i]}"
        local label="${LABELS[$i]}"
        local port="${PORTS[$i]}"
        
        printf "${W}${label}:${N} "
        
        if docker ps --filter "name=${service}" --filter "status=running" | grep -q "$service"; then
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null)
            
            if [ "$health" == "healthy" ]; then
                print_success "Healthy ✓"
            elif [ "$health" == "unhealthy" ]; then
                print_error "Unhealthy ✗"
            elif [ -z "$health" ]; then
                # No healthcheck defined, try port check
                if nc -z localhost "$port" 2>/dev/null; then
                    print_success "Running ✓"
                else
                    print_warning "No response on port $port"
                fi
            else
                print_warning "Status: $health"
            fi
        else
            print_error "Not running ✗"
        fi
    done
}

# Clean volumes
clean_volumes() {
    printf "\n"
    print_warning "This will remove all volumes and data!"
    print_warning "All database data, receipts, and logs will be lost!"
    printf "\n"
    read -p "Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return
    fi
    
    printf "\n"
    print_info "Cleaning volumes..."
    
    if $COMPOSE_CMD down -v; then
        printf "\n"
        print_success "Volumes cleaned!"
    else
        printf "\n"
        print_error "Failed to clean volumes!"
    fi
}

# Clean everything
clean_all() {
    printf "\n"
    print_warning "This will remove EVERYTHING:"
    printf "  • All containers\n"
    printf "  • All volumes and data\n"
    printf "  • All networks\n"
    printf "  • All images\n"
    printf "\n"
    read -p "Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return
    fi
    
    printf "\n"
    print_info "Cleaning everything..."
    
    $COMPOSE_CMD down -v --rmi all --remove-orphans && {
        printf "\n"
        print_success "Everything cleaned!"
    } || {
        printf "\n"
        print_error "Failed to clean!"
    }
}

# Start single service
start_service() {
    print_info "Starting $2..."
    printf "\n"
    
    if $COMPOSE_CMD start "$1"; then
        printf "\n"
        print_success "$2 started!"
    else
        printf "\n"
        print_error "Failed to start $2!"
    fi
}

# Stop single service
stop_service() {
    print_info "Stopping $2..."
    printf "\n"
    
    if $COMPOSE_CMD stop "$1"; then
        printf "\n"
        print_success "$2 stopped!"
    else
        printf "\n"
        print_error "Failed to stop $2!"
    fi
}

# Restart single service
restart_service() {
    print_info "Restarting $2..."
    printf "\n"
    
    if $COMPOSE_CMD restart "$1"; then
        printf "\n"
        print_success "$2 restarted!"
    else
        printf "\n"
        print_error "Failed to restart $2!"
    fi
}

# Rebuild single service
rebuild_service() {
    printf "\n"
    print_warning "Rebuild $2?"
    read -p "Continue? (y/n): " confirm
    
    if [[ "$confirm" != [yY] ]]; then
        print_info "Cancelled"
        return
    fi
    
    printf "\n"
    print_info "1/4: Stopping..."
    $COMPOSE_CMD stop "$1"
    
    print_info "2/4: Removing container..."
    $COMPOSE_CMD rm -f "$1"
    
    print_info "3/4: Building image..."
    $COMPOSE_CMD build "$1"
    
    print_info "4/4: Starting..."
    if $COMPOSE_CMD up -d "$1"; then
        printf "\n"
        print_success "$2 rebuilt successfully!"
        
        printf "\n"
        read -p "View logs? (y/n): " view_logs
        if [[ "$view_logs" == [yY] ]]; then
            printf "\n"
            print_info "Logs (Ctrl+C to stop)..."
            printf "\n"
            sleep 1
            $COMPOSE_CMD logs -f --tail=100 "$1"
        fi
    else
        printf "\n"
        print_error "Failed to rebuild $2!"
    fi
}

# View service logs
view_service_logs() {
    print_info "Recent logs for $2..."
    printf "\n"
    $COMPOSE_CMD logs --tail=50 "$1"
}

# Follow service logs
follow_service_logs() {
    print_info "Following logs for $2 (Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    $COMPOSE_CMD logs -f --tail=100 "$1"
}

# Service shell access
service_shell() {
    print_info "Opening shell for $2..."
    print_info "Type 'exit' to return"
    printf "\n"
    sleep 1
    
    docker exec -it "$1" sh 2>/dev/null || \
    docker exec -it "$1" bash 2>/dev/null || {
        printf "\n"
        print_error "Failed to open shell!"
        print_info "Container may not be running"
        return 1
    }
}

# Manage single service
manage_service() {
    select_service || return
    
    while true; do
        print_header
        service_action_menu "$SELECTED_LABEL"
        read -p "Choice [0-7]: " action
        
        case $action in
            1) start_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            2) stop_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            3) restart_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            4) rebuild_service "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            5) view_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            6) follow_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            7) service_shell "$SELECTED_SERVICE" "$SELECTED_LABEL" ;;
            0) return ;;
            *) print_error "Invalid choice!" ;;
        esac
        
        if [ "$action" != "6" ] && [ "$action" != "7" ]; then
            printf "\n"
            read -p "Press Enter to continue..."
        fi
    done
}

# View logs menu
view_logs_menu() {
    select_service && follow_service_logs "$SELECTED_SERVICE" "$SELECTED_LABEL"
}

# Shell access menu
shell_menu() {
    select_service && service_shell "$SELECTED_SERVICE" "$SELECTED_LABEL"
}

# Main function
main() {
    check_dependencies
    check_env
    
    while true; do
        main_menu
        read -p "Choice [0-11]: " choice
        
        case $choice in
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
            0) printf "\n"; print_success "Goodbye!"; printf "\n"; exit 0 ;;
            *) print_error "Invalid choice!" ;;
        esac
        
        if [ "$choice" != "5" ] && [ "$choice" != "6" ] && [ "$choice" != "8" ]; then
            printf "\n"
            read -p "Press Enter to continue..."
        fi
    done
}

# Run main
main