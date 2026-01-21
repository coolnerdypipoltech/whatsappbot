#!/bin/bash

# Scripts de utilidad para el proyecto WhatsApp Bot

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}WhatsApp Ticket Bot - Utility Scripts${NC}\n"

# Función para setup inicial
setup() {
    echo -e "${YELLOW}🔧 Setting up project...${NC}"
    
    # Instalar dependencias
    npm install
    
    # Copiar .env
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} .env file created"
        echo -e "${YELLOW}⚠${NC}  Please edit .env with your credentials"
    else
        echo -e "${YELLOW}⚠${NC}  .env already exists"
    fi
    
    # Crear directorio de logs
    mkdir -p logs
    echo -e "${GREEN}✓${NC} Logs directory created"
    
    echo -e "\n${GREEN}✓ Setup complete!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Edit .env file with your credentials"
    echo "2. Create database: createdb whatsapp_bot"
    echo "3. Run migrations: npm run db:migrate"
    echo "4. Start server: npm run dev"
}

# Función para reset de base de datos
reset_db() {
    echo -e "${RED}⚠ WARNING: This will delete all data!${NC}"
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}Dropping database...${NC}"
        dropdb whatsapp_bot 2>/dev/null || true
        
        echo -e "${YELLOW}Creating database...${NC}"
        createdb whatsapp_bot
        
        echo -e "${YELLOW}Running migrations...${NC}"
        npm run db:migrate
        
        echo -e "${GREEN}✓ Database reset complete!${NC}"
    else
        echo -e "${YELLOW}Cancelled.${NC}"
    fi
}

# Función para backup de base de datos
backup_db() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/backup_${TIMESTAMP}.sql"
    
    mkdir -p backups
    
    echo -e "${YELLOW}Creating backup...${NC}"
    pg_dump whatsapp_bot > "$BACKUP_FILE"
    
    echo -e "${GREEN}✓ Backup created: ${BACKUP_FILE}${NC}"
}

# Función para ver logs
view_logs() {
    echo -e "${YELLOW}Select log to view:${NC}"
    echo "1. Combined logs"
    echo "2. Error logs only"
    echo "3. PM2 logs (if running)"
    read -p "Choice: " choice
    
    case $choice in
        1)
            tail -f combined.log
            ;;
        2)
            tail -f error.log
            ;;
        3)
            pm2 logs whatsapp-bot
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Función para verificar configuración
check_config() {
    echo -e "${YELLOW}Checking configuration...${NC}\n"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
    else
        echo -e "${RED}✗${NC} Node.js not found"
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | awk '{print $3}')
        echo -e "${GREEN}✓${NC} PostgreSQL: $PSQL_VERSION"
    else
        echo -e "${RED}✗${NC} PostgreSQL not found"
    fi
    
    # Check .env
    if [ -f .env ]; then
        echo -e "${GREEN}✓${NC} .env file exists"
        
        # Check required variables
        required_vars=("WHATSAPP_ACCESS_TOKEN" "OPENAI_API_KEY" "DATABASE_URL")
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" .env; then
                echo -e "  ${GREEN}✓${NC} $var configured"
            else
                echo -e "  ${RED}✗${NC} $var missing"
            fi
        done
    else
        echo -e "${RED}✗${NC} .env file not found"
    fi
    
    # Check database connection
    if psql whatsapp_bot -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Database connection successful"
    else
        echo -e "${RED}✗${NC} Cannot connect to database"
    fi
}

# Función para test de webhook
test_webhook() {
    PORT=${PORT:-3000}
    
    echo -e "${YELLOW}Testing webhook endpoints...${NC}\n"
    
    # Test health
    echo -e "${YELLOW}1. Health check:${NC}"
    curl -s http://localhost:$PORT/health | jq '.' || echo -e "${RED}Failed${NC}"
    
    echo -e "\n${YELLOW}2. Webhook verification:${NC}"
    curl -s "http://localhost:$PORT/api/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=12345"
    
    echo -e "\n\n${YELLOW}3. Simulate text message:${NC}"
    curl -X POST http://localhost:$PORT/api/webhook \
        -H "Content-Type: application/json" \
        -d '{
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messages": [{
                            "from": "1234567890",
                            "id": "test123",
                            "type": "text",
                            "text": {"body": "Hola"}
                        }]
                    }
                }]
            }]
        }'
    
    echo -e "\n${GREEN}✓ Tests complete${NC}"
}

# Función para deploy
deploy() {
    echo -e "${YELLOW}Deploying to production...${NC}"
    
    # Pull latest
    git pull origin main
    
    # Install dependencies
    npm install --production
    
    # Run migrations
    npm run db:migrate
    
    # Restart PM2
    pm2 restart whatsapp-bot || pm2 start src/index.js --name whatsapp-bot
    
    echo -e "${GREEN}✓ Deployment complete!${NC}"
}

# Menú principal
show_menu() {
    echo -e "\n${GREEN}Available commands:${NC}"
    echo "1. setup          - Initial project setup"
    echo "2. reset-db       - Reset database (DANGER!)"
    echo "3. backup-db      - Backup database"
    echo "4. check-config   - Check configuration"
    echo "5. test-webhook   - Test webhook endpoints"
    echo "6. view-logs      - View application logs"
    echo "7. deploy         - Deploy to production"
    echo "8. exit"
    echo ""
}

# Main loop
if [ $# -eq 0 ]; then
    while true; do
        show_menu
        read -p "Choose an option: " choice
        
        case $choice in
            1) setup ;;
            2) reset_db ;;
            3) backup_db ;;
            4) check_config ;;
            5) test_webhook ;;
            6) view_logs ;;
            7) deploy ;;
            8) exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
    done
else
    # Ejecutar comando directamente
    case $1 in
        setup) setup ;;
        reset-db) reset_db ;;
        backup-db) backup_db ;;
        check-config) check_config ;;
        test-webhook) test_webhook ;;
        view-logs) view_logs ;;
        deploy) deploy ;;
        *) echo -e "${RED}Unknown command: $1${NC}" ;;
    esac
fi
