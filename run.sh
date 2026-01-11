#!/bin/bash
# start.sh - Unix Docker Compose Launcher

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${CYAN}   POS System Docker Launcher${NC}"
    echo -e "${CYAN}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        echo "Please install Docker and try again."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running!"
        echo "Please start Docker and try again."
        exit 1
    fi

    print_success "Docker is running"
    echo ""
}

show_menu() {
    echo ""
    echo "Choose an option:"
    echo ""
    echo "1. Start all services"
    echo "2. Stop all services"
    echo "3. Restart all services"
    echo "4. View logs"
    echo "5. Build and start"
    echo "6. Clean everything (remove volumes)"
    echo "7. Check service status"
    echo "8. Access service shell"
    echo "9. Exit"
    echo ""
}

start_services() {
    print_info "Starting all services..."
    docker-compose up -d
    
    print_success "All services started successfully!"
    echo ""
    echo "Services are available at:"
    echo "  - Admin API:    http://localhost:8001/docs"
    echo "  - Database API: http://localhost:8002/docs"
    echo "  - Auth API:     http://localhost:8003/docs"
    echo "  - Order API:    http://localhost:8004/docs"
    echo "  - RabbitMQ UI:  http://localhost:15672 (admin/pos_password_2024)"
    echo ""
}

stop_services() {
    print_info "Stopping all services..."
    docker-compose down
    print_success "All services stopped"
}

restart_services() {
    print_info "Restarting all services..."
    docker-compose restart
    print_success "All services restarted"
}

view_logs() {
    print_info "Showing logs (Press Ctrl+C to exit)..."
    docker-compose logs -f
}

build_services() {
    print_info "Building and starting services..."
    docker-compose up -d --build
    print_success "Build complete and services started"
}

clean_all() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled."
        return
    fi
    
    print_info "Cleaning up..."
    docker-compose down -v
    print_success "Cleanup complete"
}

check_status() {
    print_info "Service Status:"
    echo ""
    docker-compose ps
}

access_shell() {
    echo ""
    echo "Select service:"
    echo "1. Admin"
    echo "2. Database"
    echo "3. Auth"
    echo "4. Order"
    echo ""
    read -p "Enter choice (1-4): " service_choice
    
    case $service_choice in
        1) docker exec -it admin_api sh ;;
        2) docker exec -it database_api sh ;;
        3) docker exec -it auth_api sh ;;
        4) docker exec -it order_api sh ;;
        *) echo "Invalid choice" ;;
    esac
}

main() {
    print_header
    check_docker
    
    while true; do
        show_menu
        read -p "Enter your choice (1-9): " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) view_logs ;;
            5) build_services ;;
            6) clean_all ;;
            7) check_status ;;
            8) access_shell ;;
            9) 
                echo ""
                echo "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid choice! Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

main