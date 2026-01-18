#!/bin/bash
# run.sh - POS System Docker Manager
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Service names array
SERVICES=("admin_api" "database_api" "auth_api" "order_api" "rabbitmq")
SERVICE_LABELS=("Admin API" "Database API" "Auth API" "Order API" "RabbitMQ")

#=============================================================================
# Print Functions
#=============================================================================

print_header() {
    clear
    printf "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${CYAN}║           POS System Docker Manager                       ║${NC}\n"
    printf "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
    printf "\n"
}

print_success() {
    printf "${GREEN}✓${NC} $1\n"
}

print_error() {
    printf "${RED}✗${NC} $1\n"
}

print_info() {
    printf "${BLUE}ℹ${NC} $1\n"
}

print_warning() {
    printf "${YELLOW}⚠${NC} $1\n"
}

print_divider() {
    printf "${CYAN}────────────────────────────────────────────────────────────${NC}\n"
}

#=============================================================================
# Docker Check
#=============================================================================

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        printf "\n"
        printf "Please install Docker from: https://docs.docker.com/get-docker/\n"
        exit 1
    fi
    
    if ! docker info &> /dev/null 2>&1; then
        print_error "Docker is not running!"
        printf "\n"
        printf "Please start Docker Desktop and try again.\n"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"
        printf "\n"
        printf "Please install Docker Compose and try again.\n"
        exit 1
    fi
}

#=============================================================================
# Menu Display
#=============================================================================

show_main_menu() {
    print_header
    printf "${CYAN}Main Menu:${NC}\n"
    print_divider
    printf "\n"
    printf "  ${GREEN}[1]${NC}  Start all services\n"
    printf "  ${GREEN}[2]${NC}  Stop all services\n"
    printf "  ${GREEN}[3]${NC}  Restart all services\n"
    printf "  ${GREEN}[4]${NC}  Build and start all services\n"
    printf "\n"
    printf "  ${YELLOW}[5]${NC}  Manage specific service\n"
    printf "  ${YELLOW}[6]${NC}  View service logs\n"
    printf "\n"
    printf "  ${BLUE}[7]${NC}  Check service status\n"
    printf "  ${BLUE}[8]${NC}  Access service shell\n"
    printf "\n"
    printf "  ${RED}[9]${NC}  Clean everything (⚠️  removes volumes)\n"
    printf "  ${RED}[0]${NC}  Exit\n"
    printf "\n"
    print_divider
}

show_service_menu() {
    printf "\n"
    printf "${CYAN}Select a service:${NC}\n"
    printf "\n"
    for i in "${!SERVICES[@]}"; do
        local num=$((i + 1))
        printf "  ${GREEN}[$num]${NC}  ${SERVICE_LABELS[$i]}\n"
    done
    printf "  ${RED}[0]${NC}  Cancel\n"
    printf "\n"
}

show_service_action_menu() {
    local service_label="$1"
    printf "\n"
    printf "${CYAN}Actions for ${MAGENTA}${service_label}${CYAN}:${NC}\n"
    printf "\n"
    printf "  ${GREEN}[1]${NC}  Start\n"
    printf "  ${GREEN}[2]${NC}  Stop\n"
    printf "  ${GREEN}[3]${NC}  Restart\n"
    printf "  ${YELLOW}[4]${NC}  Rebuild (stop, remove, build, start)\n"
    printf "  ${BLUE}[5]${NC}  View logs\n"
    printf "  ${BLUE}[6]${NC}  Access shell\n"
    printf "  ${RED}[0]${NC}  Back to menu\n"
    printf "\n"
}

#=============================================================================
# Service Selection
#=============================================================================

select_service() {
    while true; do
        show_service_menu
        read -p "Enter choice [0-${#SERVICES[@]}]: " choice
        
        if [[ "$choice" == "0" ]]; then
            return 1
        fi
        
        if [[ "$choice" =~ ^[1-9][0-9]*$ ]] && [ "$choice" -le "${#SERVICES[@]}" ]; then
            local index=$((choice - 1))
            SELECTED_SERVICE="${SERVICES[$index]}"
            SELECTED_SERVICE_LABEL="${SERVICE_LABELS[$index]}"
            return 0
        fi
        
        print_error "Invalid choice! Please enter a number between 0 and ${#SERVICES[@]}"
        sleep 1
    done
}

#=============================================================================
# Docker Operations
#=============================================================================

start_all_services() {
    print_info "Starting all services..."
    printf "\n"
    
    if docker-compose up -d; then
        printf "\n"
        print_success "All services started successfully!"
        printf "\n"
        printf "${CYAN}Services are available at:${NC}\n"
        printf "  • Admin API:     http://localhost:8001/docs\n"
        printf "  • Database API:  http://localhost:8002/docs\n"
        printf "  • Auth API:      http://localhost:8003/docs\n"
        printf "  • Order API:     http://localhost:8004/docs\n"
        printf "  • RabbitMQ UI:   http://localhost:15672 (admin/pos_password_2024)\n"
    else
        printf "\n"
        print_error "Failed to start services!"
    fi
}

stop_all_services() {
    print_info "Stopping all services..."
    printf "\n"
    
    if docker-compose down; then
        printf "\n"
        print_success "All services stopped successfully!"
    else
        printf "\n"
        print_error "Failed to stop services!"
    fi
}

restart_all_services() {
    print_info "Restarting all services..."
    printf "\n"
    
    if docker-compose restart; then
        printf "\n"
        print_success "All services restarted successfully!"
    else
        printf "\n"
        print_error "Failed to restart services!"
    fi
}

build_all_services() {
    print_info "Building and starting all services..."
    printf "\n"
    
    if docker-compose up -d --build; then
        printf "\n"
        print_success "Build completed and all services started!"
    else
        printf "\n"
        print_error "Build failed!"
    fi
}

check_status() {
    print_info "Service Status:"
    print_divider
    printf "\n"
    docker-compose ps
    printf "\n"
    
    print_divider
    print_info "Resource Usage:"
    printf "\n"
    
    local container_ids=$(docker-compose ps -q 2>/dev/null)
    if [ -n "$container_ids" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $container_ids
    else
        printf "No running containers\n"
    fi
}

view_all_logs() {
    print_info "Showing logs for all services (Press Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    docker-compose logs -f
}

clean_all() {
    printf "\n"
    print_warning "This will remove all containers, networks, and volumes!"
    print_warning "All data will be lost!"
    printf "\n"
    read -p "Are you absolutely sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled."
        return
    fi
    
    printf "\n"
    print_info "Cleaning up..."
    
    if docker-compose down -v; then
        printf "\n"
        print_success "Cleanup complete!"
    else
        printf "\n"
        print_error "Cleanup failed!"
    fi
}

#=============================================================================
# Single Service Operations
#=============================================================================

start_service() {
    local service="$1"
    local label="$2"
    
    print_info "Starting ${label}..."
    printf "\n"
    
    if docker-compose start "$service"; then
        printf "\n"
        print_success "${label} started successfully!"
    else
        printf "\n"
        print_error "Failed to start ${label}!"
    fi
}

stop_service() {
    local service="$1"
    local label="$2"
    
    print_info "Stopping ${label}..."
    printf "\n"
    
    if docker-compose stop "$service"; then
        printf "\n"
        print_success "${label} stopped successfully!"
    else
        printf "\n"
        print_error "Failed to stop ${label}!"
    fi
}

restart_service() {
    local service="$1"
    local label="$2"
    
    print_info "Restarting ${label}..."
    printf "\n"
    
    if docker-compose restart "$service"; then
        printf "\n"
        print_success "${label} restarted successfully!"
    else
        printf "\n"
        print_error "Failed to restart ${label}!"
    fi
}

rebuild_service() {
    local service="$1"
    local label="$2"
    
    printf "\n"
    print_warning "This will rebuild ${label}"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "Cancelled."
        return
    fi
    
    printf "\n"
    print_info "Step 1/4: Stopping ${label}..."
    docker-compose stop "$service"
    
    print_info "Step 2/4: Removing container..."
    docker-compose rm -f "$service"
    
    print_info "Step 3/4: Building ${label}..."
    docker-compose build "$service"
    
    print_info "Step 4/4: Starting ${label}..."
    if docker-compose up -d "$service"; then
        printf "\n"
        print_success "${label} rebuilt successfully!"
    else
        printf "\n"
        print_error "Failed to rebuild ${label}!"
        return
    fi
    
    printf "\n"
    read -p "View logs? (y/n): " show_logs
    if [ "$show_logs" == "y" ] || [ "$show_logs" == "Y" ]; then
        printf "\n"
        print_info "Showing logs (Press Ctrl+C to stop)..."
        printf "\n"
        sleep 1
        docker-compose logs -f "$service"
    fi
}

view_service_logs() {
    local service="$1"
    local label="$2"
    
    print_info "Showing logs for ${label} (Press Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    docker-compose logs -f "$service"
}

access_service_shell() {
    local service="$1"
    local label="$2"
    
    print_info "Accessing shell for ${label}..."
    print_info "Type 'exit' to return to menu"
    printf "\n"
    sleep 1
    
    # Try sh first, then bash
    docker exec -it "$service" sh 2>/dev/null || docker exec -it "$service" bash 2>/dev/null || {
        printf "\n"
        print_error "Failed to access shell for ${label}"
        print_info "The container might not be running"
        return 1
    }
}

#=============================================================================
# Service Management
#=============================================================================

manage_service() {
    if ! select_service; then
        return
    fi
    
    while true; do
        print_header
        show_service_action_menu "$SELECTED_SERVICE_LABEL"
        
        read -p "Enter choice [0-6]: " action
        
        case $action in
            1) start_service "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            2) stop_service "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            3) restart_service "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            4) rebuild_service "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            5) view_service_logs "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            6) access_service_shell "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL" ;;
            0) return ;;
            *) print_error "Invalid choice!" ;;
        esac
        
        printf "\n"
        read -p "Press Enter to continue..."
    done
}

view_logs_menu() {
    if ! select_service; then
        return
    fi
    
    view_service_logs "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL"
}

access_shell_menu() {
    if ! select_service; then
        return
    fi
    
    access_service_shell "$SELECTED_SERVICE" "$SELECTED_SERVICE_LABEL"
}

#=============================================================================
# Main Loop
#=============================================================================

main() {
    # Check Docker
    check_docker
    
    while true; do
        show_main_menu
        read -p "Enter your choice [0-9]: " choice
        
        case $choice in
            1) start_all_services ;;
            2) stop_all_services ;;
            3) restart_all_services ;;
            4) build_all_services ;;
            5) manage_service ;;
            6) view_logs_menu ;;
            7) check_status ;;
            8) access_shell_menu ;;
            9) clean_all ;;
            0) 
                printf "\n"
                print_success "Goodbye!"
                printf "\n"
                exit 0
                ;;
            *)
                print_error "Invalid choice! Please enter a number between 0 and 9"
                ;;
        esac
        
        if [ "$choice" != "5" ]; then
            printf "\n"
            read -p "Press Enter to continue..."
        fi
    done
}

# Run the script
main