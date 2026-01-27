#!/bin/bash
set -e

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
N='\033[0m'

SERVICES=("admin_api" "database_api" "auth_api" "order_api" "staff_api" "frontend" "rabbitmq" "redis")
LABELS=("Admin API" "Database API" "Auth API" "Order API" "Staff API" "Frontend" "RabbitMQ" "Redis")

ph() {
    clear
    printf "${C}╔════════════════════════════════════════════════════════════╗${N}\n"
    printf "${C}║           POS System Docker Manager                       ║${N}\n"
    printf "${C}╚════════════════════════════════════════════════════════════╝${N}\n\n"
}

ps() { printf "${G}✓${N} $1\n"; }
pe() { printf "${R}✗${N} $1\n"; }
pi() { printf "${B}ℹ${N} $1\n"; }
pw() { printf "${Y}⚠${N} $1\n"; }
pd() { printf "${C}────────────────────────────────────────────────────────────${N}\n"; }

cd() {
    command -v docker &>/dev/null || { pe "Docker not installed!"; printf "\nhttps://docs.docker.com/get-docker/\n"; exit 1; }
    docker info &>/dev/null || { pe "Docker not running!"; printf "\nStart Docker Desktop\n"; exit 1; }
    command -v docker-compose &>/dev/null || { pe "Docker Compose not installed!"; exit 1; }
}

mm() {
    ph
    printf "${C}Main Menu:${N}\n"
    pd
    printf "\n  ${G}[1]${N}  Start all\n  ${G}[2]${N}  Stop all\n  ${G}[3]${N}  Restart all\n  ${G}[4]${N}  Build all\n\n"
    printf "  ${Y}[5]${N}  Manage service\n  ${Y}[6]${N}  View logs\n\n"
    printf "  ${B}[7]${N}  Status\n  ${B}[8]${N}  Shell access\n\n"
    printf "  ${R}[9]${N}  Clean all\n  ${R}[0]${N}  Exit\n\n"
    pd
}

sm() {
    printf "\n${C}Select service:${N}\n\n"
    for i in "${!SERVICES[@]}"; do
        printf "  ${G}[$((i+1))]${N}  ${LABELS[$i]}\n"
    done
    printf "  ${R}[0]${N}  Cancel\n\n"
}

sam() {
    printf "\n${C}Actions for ${M}$1${C}:${N}\n\n"
    printf "  ${G}[1]${N}  Start\n  ${G}[2]${N}  Stop\n  ${G}[3]${N}  Restart\n  ${Y}[4]${N}  Rebuild\n  ${B}[5]${N}  Logs\n  ${B}[6]${N}  Shell\n  ${R}[0]${N}  Back\n\n"
}

ss() {
    while true; do
        sm
        read -p "Choice [0-${#SERVICES[@]}]: " c
        [[ "$c" == "0" ]] && return 1
        [[ "$c" =~ ^[1-9][0-9]*$ ]] && [ "$c" -le "${#SERVICES[@]}" ] && {
            i=$((c-1))
            SS="${SERVICES[$i]}"
            SL="${LABELS[$i]}"
            return 0
        }
        pe "Invalid choice!"
        sleep 1
    done
}

sa() {
    pi "Starting all..."
    printf "\n"
    docker-compose up -d && {
        printf "\n"
        ps "All started!"
        printf "\n${C}Available at:${N}\n"
        printf "  • Admin:    http://localhost:8001/docs\n"
        printf "  • Database: http://localhost:8002/docs\n"
        printf "  • Auth:     http://localhost:8003/docs\n"
        printf "  • Order:    http://localhost:8004/docs\n"
        printf "  • Staff:    http://localhost:8005/docs\n"
        printf "  • Frontend: http://localhost:80\n"
        printf "  • RabbitMQ: http://localhost:15672\n"
    } || { printf "\n"; pe "Start failed!"; }
}

sta() {
    pi "Stopping all..."
    printf "\n"
    docker-compose down && { printf "\n"; ps "Stopped!"; } || { printf "\n"; pe "Stop failed!"; }
}

ra() {
    pi "Restarting all..."
    printf "\n"
    docker-compose restart && { printf "\n"; ps "Restarted!"; } || { printf "\n"; pe "Restart failed!"; }
}

ba() {
    pi "Building all..."
    printf "\n"
    docker-compose up -d --build && { printf "\n"; ps "Built!"; } || { printf "\n"; pe "Build failed!"; }
}

cs() {
    pi "Status:"
    pd
    printf "\n"
    docker-compose ps
    printf "\n"
    pd
    pi "Resources:"
    printf "\n"
    ids=$(docker-compose ps -q 2>/dev/null)
    [ -n "$ids" ] && docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $ids || printf "No containers\n"
}

val() {
    pi "Logs (Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    docker-compose logs -f
}

ca() {
    printf "\n"
    pw "Remove all containers, networks, volumes!"
    pw "All data will be lost!"
    printf "\n"
    read -p "Type 'yes' to confirm: " cf
    [ "$cf" != "yes" ] && { pi "Cancelled."; return; }
    printf "\n"
    pi "Cleaning..."
    docker-compose down -v && { printf "\n"; ps "Clean!"; } || { printf "\n"; pe "Clean failed!"; }
}

sts() {
    pi "Starting $2..."
    printf "\n"
    docker-compose start "$1" && { printf "\n"; ps "$2 started!"; } || { printf "\n"; pe "Start failed!"; }
}

sps() {
    pi "Stopping $2..."
    printf "\n"
    docker-compose stop "$1" && { printf "\n"; ps "$2 stopped!"; } || { printf "\n"; pe "Stop failed!"; }
}

rs() {
    pi "Restarting $2..."
    printf "\n"
    docker-compose restart "$1" && { printf "\n"; ps "$2 restarted!"; } || { printf "\n"; pe "Restart failed!"; }
}

rbs() {
    printf "\n"
    pw "Rebuild $2"
    read -p "Continue? (y/n): " cf
    [[ "$cf" != [yY] ]] && { pi "Cancelled."; return; }
    printf "\n"
    pi "1/4: Stopping..."
    docker-compose stop "$1"
    pi "2/4: Removing..."
    docker-compose rm -f "$1"
    pi "3/4: Building..."
    docker-compose build "$1"
    pi "4/4: Starting..."
    docker-compose up -d "$1" && { printf "\n"; ps "Rebuilt!"; } || { printf "\n"; pe "Rebuild failed!"; return; }
    printf "\n"
    read -p "View logs? (y/n): " sl
    [[ "$sl" == [yY] ]] && { printf "\n"; pi "Logs (Ctrl+C to stop)..."; printf "\n"; sleep 1; docker-compose logs -f "$1"; }
}

vsl() {
    pi "Logs for $2 (Ctrl+C to exit)..."
    printf "\n"
    sleep 1
    docker-compose logs -f "$1"
}

ash() {
    pi "Shell for $2..."
    pi "Type 'exit' to return"
    printf "\n"
    sleep 1
    docker exec -it "$1" sh 2>/dev/null || docker exec -it "$1" bash 2>/dev/null || { printf "\n"; pe "Shell failed!"; pi "Container not running"; return 1; }
}

ms() {
    ss || return
    while true; do
        ph
        sam "$SL"
        read -p "Choice [0-6]: " a
        case $a in
            1) sts "$SS" "$SL" ;;
            2) sps "$SS" "$SL" ;;
            3) rs "$SS" "$SL" ;;
            4) rbs "$SS" "$SL" ;;
            5) vsl "$SS" "$SL" ;;
            6) ash "$SS" "$SL" ;;
            0) return ;;
            *) pe "Invalid!" ;;
        esac
        printf "\n"
        read -p "Press Enter..."
    done
}

vlm() { ss && vsl "$SS" "$SL"; }
asm() { ss && ash "$SS" "$SL"; }

main() {
    cd
    while true; do
        mm
        read -p "Choice [0-9]: " c
        case $c in
            1) sa ;;
            2) sta ;;
            3) ra ;;
            4) ba ;;
            5) ms ;;
            6) vlm ;;
            7) cs ;;
            8) asm ;;
            9) ca ;;
            0) printf "\n"; ps "Goodbye!"; printf "\n"; exit 0 ;;
            *) pe "Invalid!" ;;
        esac
        [ "$c" != "5" ] && { printf "\n"; read -p "Press Enter..."; }
    done
}

main