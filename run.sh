#!/bin/bash
# start.sh - Unix Docker Compose Launcher
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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

print_service() {
    echo -e "${MAGENTA}[SERVICE]${NC} $1"
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
    echo "1.  Start all services"
    echo "2.  Stop all services"
    echo "3.  Restart all services"
    echo "4.  View logs"
    echo "5.  Build and start all services"
    echo "6.  Rebuild specific service"
    echo "7.  Restart specific service"
    echo "8.  Clean everything (remove volumes)"
    echo "9.  Check service status"
    echo "10. Access service shell"
    echo "11. View logs of specific service"
    echo "12. Exit"
    echo ""
}

select_service() {
    echo ""
    echo "Select service:"
    echo "1. Admin API"
    echo "2. Database API"
    echo "3. Auth API"
    echo "4. Order API"
    echo "5. RabbitMQ"
    echo "6. Cancel"
    echo ""
    read -p "Enter choice (1-6): " service_choice
    
    case $service_choice in
        1) echo "admin_api" ;;
        2) echo "database_api" ;;
        3) echo "auth_api" ;;
        4) echo "order_api" ;;
        5) echo "rabbitmq" ;;
        6) echo "cancel" ;;
        *) echo "invalid" ;;
    esac
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
    print_info "Building and starting all services..."
    docker-compose up -d --build
    print_success "Build complete and services started"
}

rebuild_specific_service() {
    local service
    service=$(select_service)
    
    if [ "$service" = "cancel" ]; then
        echo "Cancelled."
        return
    fi
    
    if [ "$service" = "invalid" ]; then
        print_error "Invalid choice!"
        return
    fi
    
    print_info "Rebuilding $service..."
    
    # Stop the service
    print_service "Stopping $service..."
    docker-compose stop "$service"
    
    # Remove the container
    print_service "Removing old container..."
    docker-compose rm -f "$service"
    
    # Rebuild and start
    print_service "Building and starting $service..."
    docker-compose up -d --build "$service"
    
    print_success "$service rebuilt and started successfully!"
    
    # Show logs
    echo ""
    read -p "View logs for $service? (y/n): " show_logs
    if [ "$show_logs" = "y" ] || [ "$show_logs" = "Y" ]; then
        docker-compose logs -f "$service"
    fi
}

restart_specific_service() {
    local service
    service=$(select_service)
    
    if [ "$service" = "cancel" ]; then
        echo "Cancelled."
        return
    fi
    
    if [ "$service" = "invalid" ]; then
        print_error "Invalid choice!"
        return
    fi
    
    print_info "Restarting $service..."
    docker-compose restart "$service"
    print_success "$service restarted successfully"
    
    # Show logs
    echo ""
    read -p "View logs for $service? (y/n): " show_logs
    if [ "$show_logs" = "y" ] || [ "$show_logs" = "Y" ]; then
        docker-compose logs -f "$service"
    fi
}

view_specific_logs() {
    local service
    service=$(select_service)
    
    if [ "$service" = "cancel" ]; then
        echo "Cancelled."
        return
    fi
    
    if [ "$service" = "invalid" ]; then
        print_error "Invalid choice!"
        return
    fi
    
    print_info "Showing logs for $service (Press Ctrl+C to exit)..."
    docker-compose logs -f "$service"
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
    echo ""
    
    # Show resource usage
    print_info "Resource Usage:"
    echo ""
    local container_ids
    container_ids=$(docker-compose ps -q)
    if [ -n "$container_ids" ]; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $container_ids
    else
        echo "No running containers"
    fi
}

access_shell() {
    local service
    service=$(select_service)
    
    if [ "$service" = "cancel" ]; then
        echo "Cancelled."
        return
    fi
    
    if [ "$service" = "invalid" ]; then
        print_error "Invalid choice!"
        return
    fi
    
    print_info "Accessing shell for $service..."
    echo "Type 'exit' to return to menu"
    echo ""
    
    # Try sh first, fallback to bash
    docker exec -it "$service" sh 2>/dev/null || docker exec -it "$service" bash
}

main() {
    print_header
    check_docker
    
    while true; do
        show_menu
        read -p "Enter your choice (1-12): " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) view_logs ;;
            5) build_services ;;
            6) rebuild_specific_service ;;
            7) restart_specific_service ;;
            8) clean_all ;;
            9) check_status ;;
            10) access_shell ;;
            11) view_specific_logs ;;
            12) 
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